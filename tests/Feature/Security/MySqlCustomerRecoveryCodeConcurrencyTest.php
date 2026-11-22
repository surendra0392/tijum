<?php

declare(strict_types=1);

namespace Tests\Feature\Security;

use App\Http\Controllers\Api\V1\Auth\CustomerAuthController;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class MySqlCustomerRecoveryCodeConcurrencyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (DB::getDriverName() !== 'mysql'
            || ! str_ends_with((string) DB::getDatabaseName(), '_test')) {
            $this->markTestSkipped('Requires an isolated MySQL database ending in _test.');
        }
    }

    public function test_concurrent_mobile_logins_with_same_recovery_code_across_two_mysql_connections_issue_at_most_one_token(): void
    {
        $uniq = bin2hex(random_bytes(5));
        $secret = app(TwoFactorAuthenticationProvider::class)->generateSecretKey();
        $email = "rec_race_{$uniq}@example.test";

        $user = User::factory()->create([
            'email' => $email,
            'phone' => '9'.substr(str_pad((string) random_int(100000000, 999999999), 9, '0'), 0, 9),
            'password' => Hash::make('SecurePass123!'),
            'two_factor_secret' => encrypt($secret),
            'two_factor_recovery_codes' => encrypt(json_encode(['REC-MYSQL-1111', 'REC-MYSQL-2222'], JSON_THROW_ON_ERROR)),
            'two_factor_confirmed_at' => now(),
        ]);

        RateLimiter::clear('customer_login:'.strtolower($email).'|127.0.0.1');
        RateLimiter::clear('customer_login:'.strtolower($email).'|127.0.0.2');

        $defaultConnection = DB::getDefaultConnection();
        $secondConnection = 'mysql_recovery_race_'.$uniq;
        Config::set('database.connections.'.$secondConnection, Config::get('database.connections.'.$defaultConnection));

        $listenerActive = true;
        $hasRunSecond = false;
        $secondPayload = null;
        $secondStatus = null;

        Event::listen('eloquent.retrieved: '.User::class, function (mixed $model) use (
            &$listenerActive,
            &$hasRunSecond,
            &$secondPayload,
            &$secondStatus,
            $user,
            $email,
            $defaultConnection,
            $secondConnection,
        ): void {
            if (! $listenerActive || $hasRunSecond || ! $model instanceof User || $model->id !== $user->id) {
                return;
            }

            $hasRunSecond = true;

            try {
                DB::setDefaultConnection($secondConnection);

                $request2 = Request::create(
                    '/api/v1/auth/customer/login',
                    'POST',
                    [
                        'email' => $email,
                        'password' => 'SecurePass123!',
                        'recovery_code' => 'REC-MYSQL-1111',
                        'device_name' => 'Device-2',
                    ],
                    server: [
                        'REMOTE_ADDR' => '127.0.0.2',
                        'HTTP_ACCEPT' => 'application/json',
                    ],
                );

                $response2 = app(CustomerAuthController::class)->login($request2);
                $secondStatus = $response2->getStatusCode();
                $secondPayload = json_decode((string) $response2->getContent(), true);
            } finally {
                DB::setDefaultConnection($defaultConnection);
                DB::purge($secondConnection);
            }
        });

        try {
            $request1 = Request::create(
                '/api/v1/auth/customer/login',
                'POST',
                [
                    'email' => $email,
                    'password' => 'SecurePass123!',
                    'recovery_code' => 'REC-MYSQL-1111',
                    'device_name' => 'Device-1',
                ],
                server: [
                    'REMOTE_ADDR' => '127.0.0.1',
                    'HTTP_ACCEPT' => 'application/json',
                ],
            );

            $response1 = app(CustomerAuthController::class)->login($request1);
        } finally {
            $listenerActive = false;
        }

        $this->assertTrue($hasRunSecond, 'Concurrent connection must have executed during Request 1 retrieval.');

        $status1 = $response1->getStatusCode();
        $payload1 = json_decode((string) $response1->getContent(), true);

        $this->assertSame(200, $secondStatus);
        $this->assertNotEmpty($secondPayload['data']['token'] ?? null);

        $this->assertSame(422, $status1);
        $this->assertSame('INVALID_TWO_FACTOR_CODE', $payload1['error_code'] ?? null);
        $this->assertArrayNotHasKey('token', $payload1['data'] ?? []);

        $this->assertSame(
            1,
            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->where('tokenable_id', $user->id)
                ->count(),
        );

        // Sequential replay of the already-consumed code must also fail with 422
        $replayRequest = Request::create(
            '/api/v1/auth/customer/login',
            'POST',
            [
                'email' => $email,
                'password' => 'SecurePass123!',
                'recovery_code' => 'REC-MYSQL-1111',
                'device_name' => 'Device-3',
            ],
            server: [
                'REMOTE_ADDR' => '127.0.0.3',
                'HTTP_ACCEPT' => 'application/json',
            ],
        );

        $replayResponse = app(CustomerAuthController::class)->login($replayRequest);
        $this->assertSame(422, $replayResponse->getStatusCode());
        $this->assertSame(
            1,
            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->where('tokenable_id', $user->id)
                ->count(),
        );
    }

    public function test_recovery_code_consumption_acquires_innodb_row_lock_before_issuing_token_and_preserves_sequential_and_totp_logins(): void
    {
        $uniq = bin2hex(random_bytes(5));
        $secret = app(TwoFactorAuthenticationProvider::class)->generateSecretKey();
        $email = "rec_lock_{$uniq}@example.test";

        $user = User::factory()->create([
            'email' => $email,
            'phone' => '8'.substr(str_pad((string) random_int(100000000, 999999999), 9, '0'), 0, 9),
            'password' => Hash::make('SecurePass123!'),
            'two_factor_secret' => encrypt($secret),
            'two_factor_recovery_codes' => encrypt(json_encode(['REC-LOCK-1111', 'REC-LOCK-2222'], JSON_THROW_ON_ERROR)),
            'two_factor_confirmed_at' => now(),
        ]);

        RateLimiter::clear('customer_login:'.strtolower($email).'|127.0.0.1');

        $defaultConnection = DB::getDefaultConnection();
        $lockConnName = 'mysql_recovery_lock_'.$uniq;
        Config::set('database.connections.'.$lockConnName, Config::get('database.connections.'.$defaultConnection));
        $lockConnection = DB::connection($lockConnName);
        $lockConnection->beginTransaction();

        // Hold InnoDB row lock on the customer record from an independent connection
        $lockConnection->table('users')->where('id', $user->id)->lockForUpdate()->first();

        DB::statement('SET SESSION innodb_lock_wait_timeout = 1');

        $timedOut = false;

        try {
            $lockedRequest = Request::create(
                '/api/v1/auth/customer/login',
                'POST',
                [
                    'email' => $email,
                    'password' => 'SecurePass123!',
                    'recovery_code' => 'REC-LOCK-1111',
                    'device_name' => 'Locked-Device',
                ],
                server: [
                    'REMOTE_ADDR' => '127.0.0.1',
                    'HTTP_ACCEPT' => 'application/json',
                ],
            );

            app(CustomerAuthController::class)->login($lockedRequest);
        } catch (QueryException $e) {
            $timedOut = (int) ($e->errorInfo[1] ?? 0) === 1205
                || str_contains($e->getMessage(), '1205')
                || str_contains(strtolower($e->getMessage()), 'lock wait timeout');
        } finally {
            $lockConnection->rollBack();
            DB::purge($lockConnName);
            DB::statement('SET SESSION innodb_lock_wait_timeout = 50');
        }

        $this->assertTrue($timedOut, 'Recovery-code login must wait on the User InnoDB row lock before issuing any token.');
        $this->assertSame(
            0,
            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->where('tokenable_id', $user->id)
                ->count(),
        );

        // Sequential login with REC-LOCK-1111 succeeds once
        $seq1 = app(CustomerAuthController::class)->login(Request::create(
            '/api/v1/auth/customer/login',
            'POST',
            [
                'email' => $email,
                'password' => 'SecurePass123!',
                'recovery_code' => 'REC-LOCK-1111',
                'device_name' => 'Seq-1',
            ],
            server: ['REMOTE_ADDR' => '127.0.0.1', 'HTTP_ACCEPT' => 'application/json'],
        ));
        $this->assertSame(200, $seq1->getStatusCode());
        $this->assertSame(
            1,
            DB::table('personal_access_tokens')->where('tokenable_type', User::class)->where('tokenable_id', $user->id)->count(),
        );

        // Replay of REC-LOCK-1111 fails
        $replay = app(CustomerAuthController::class)->login(Request::create(
            '/api/v1/auth/customer/login',
            'POST',
            [
                'email' => $email,
                'password' => 'SecurePass123!',
                'recovery_code' => 'REC-LOCK-1111',
                'device_name' => 'Seq-Replay',
            ],
            server: ['REMOTE_ADDR' => '127.0.0.1', 'HTTP_ACCEPT' => 'application/json'],
        ));
        $this->assertSame(422, $replay->getStatusCode());
        $this->assertSame(
            1,
            DB::table('personal_access_tokens')->where('tokenable_type', User::class)->where('tokenable_id', $user->id)->count(),
        );

        // Second valid recovery code REC-LOCK-2222 succeeds once
        $seq2 = app(CustomerAuthController::class)->login(Request::create(
            '/api/v1/auth/customer/login',
            'POST',
            [
                'email' => $email,
                'password' => 'SecurePass123!',
                'recovery_code' => 'REC-LOCK-2222',
                'device_name' => 'Seq-2',
            ],
            server: ['REMOTE_ADDR' => '127.0.0.1', 'HTTP_ACCEPT' => 'application/json'],
        ));
        $this->assertSame(200, $seq2->getStatusCode());
        $this->assertSame(
            2,
            DB::table('personal_access_tokens')->where('tokenable_type', User::class)->where('tokenable_id', $user->id)->count(),
        );

        // Valid TOTP login also continues to work
        $totpCode = (new Google2FA)->getCurrentOtp($secret);
        $totpResponse = app(CustomerAuthController::class)->login(Request::create(
            '/api/v1/auth/customer/login',
            'POST',
            [
                'email' => $email,
                'password' => 'SecurePass123!',
                'code' => $totpCode,
                'device_name' => 'Totp-Device',
            ],
            server: ['REMOTE_ADDR' => '127.0.0.1', 'HTTP_ACCEPT' => 'application/json'],
        ));
        $this->assertSame(200, $totpResponse->getStatusCode());
        $this->assertSame(
            3,
            DB::table('personal_access_tokens')->where('tokenable_type', User::class)->where('tokenable_id', $user->id)->count(),
        );
    }
}
