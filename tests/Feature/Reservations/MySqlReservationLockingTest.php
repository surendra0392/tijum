<?php

declare(strict_types=1);

namespace Tests\Feature\Reservations;

use App\Actions\Reservations\CreateReservation;
use App\Enums\PropertyRoomTypeMode;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class MySqlReservationLockingTest extends TestCase
{
    use ReservationTestHelpers;

    public function test_concurrent_create_reservation_hits_real_room_type_lock_without_overselling(): void
    {
        if (DB::getDriverName() !== 'mysql'
            || ! str_ends_with((string) DB::getDatabaseName(), '_test')) {
            $this->markTestSkipped('Requires an isolated MySQL database ending in _test.');
        }

        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType(
            $property,
            mode: PropertyRoomTypeMode::Private,
            maxGuests: 1,
            dailyRate: 100000,
        );
        $this->createActiveRoom($property, $roomType, number: 'LK-1');
        $user = $this->createCustomerUser();
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->toDateString();
        $payload = $this->validReservationPayload(
            $property,
            $roomType,
            $checkIn,
            quantity: 1,
        );

        $lockConnectionName = 'mysql_phase12_lock';
        Config::set(
            'database.connections.'.$lockConnectionName,
            Config::get('database.connections.'.DB::getDefaultConnection()),
        );
        $lockConnection = DB::connection($lockConnectionName);
        $lockConnection->beginTransaction();
        $lockConnection->table('property_room_types')
            ->where('id', $roomType->id)
            ->lockForUpdate()
            ->firstOrFail();
        DB::statement('SET SESSION innodb_lock_wait_timeout = 1');

        $timedOut = false;
        try {
            app(CreateReservation::class)->execute($user, $payload);
        } catch (QueryException $exception) {
            $timedOut = str_contains($exception->getMessage(), '1205')
                || str_contains($exception->getMessage(), 'Lock wait timeout');
        } finally {
            $lockConnection->rollBack();
            DB::purge($lockConnectionName);
            DB::statement('SET SESSION innodb_lock_wait_timeout = 50');
        }

        $this->assertTrue($timedOut, 'CreateReservation did not contend on the locked room-type row.');
        $reservation = app(CreateReservation::class)->execute($user, $payload);

        $this->assertSame(Reservation::query()->whereKey($reservation->id)->value('id'), $reservation->id);
        $this->assertSame(1, Reservation::query()->where('property_room_type_id', $roomType->id)->consuming()->count());
    }
}
