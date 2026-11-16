<?php

declare(strict_types=1);

namespace Tests\Feature\Auth\Admin;

use App\Enums\AdminRole;
use App\Models\Admin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_admin_registration_routes_return_404(): void
    {
        $this->get('/admin/register')->assertNotFound();

        $this->post('/admin/register', [
            'name' => 'Unauthorized Admin',
            'email' => 'rogue@tijum.in',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
        ])->assertNotFound();
    }

    public function test_create_admin_command_provisions_super_admin_interactively(): void
    {
        $secretPassword = 'SuperAdmin#Password2026!';

        $pending = $this->artisan('app:create-admin')
            ->expectsQuestion('Administrator full name', 'TIJUM Platform Lead')
            ->expectsQuestion('Administrator email address', 'SuperAdmin@tijum.in')
            ->expectsChoice('Select administrator role', AdminRole::SuperAdmin->value, AdminRole::values())
            ->expectsQuestion('Enter administrator password', $secretPassword)
            ->expectsQuestion('Confirm administrator password', $secretPassword)
            ->expectsOutputToContain('Administrator account provisioned successfully.')
            ->doesntExpectOutputToContain($secretPassword)
            ->assertSuccessful();

        $pending->execute();

        $admin = Admin::query()->where('email', 'superadmin@tijum.in')->firstOrFail();

        $this->assertSame('TIJUM Platform Lead', $admin->name);
        $this->assertSame(AdminRole::SuperAdmin, $admin->role);
        $this->assertTrue($admin->is_active);
        $this->assertNotNull($admin->email_verified_at);
        $this->assertNull($admin->two_factor_secret);
        $this->assertFalse($admin->hasTwoFactorEnabled());
        $this->assertTrue(Hash::check($secretPassword, $admin->password));
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('owners', 0);
    }

    public function test_create_admin_command_provisions_controlled_roles(): void
    {
        $this->artisan('app:create-admin', [
            '--name' => 'Verification Officer',
            '--email' => 'verify@tijum.in',
            '--role' => AdminRole::PropertyVerification->value,
        ])
            ->expectsQuestion('Enter administrator password', 'VerifyOfficer#2026!')
            ->expectsQuestion('Confirm administrator password', 'VerifyOfficer#2026!')
            ->assertSuccessful();

        $admin = Admin::query()->where('email', 'verify@tijum.in')->firstOrFail();

        $this->assertSame(AdminRole::PropertyVerification, $admin->role);
    }

    public function test_create_admin_command_rejects_duplicate_email_and_invalid_role(): void
    {
        Admin::factory()->create(['email' => 'existing-admin@tijum.in']);

        $this->artisan('app:create-admin', [
            '--name' => 'Duplicate Admin',
            '--email' => 'existing-admin@tijum.in',
            '--role' => 'non_existent_role',
        ])
            ->expectsQuestion('Enter administrator password', 'ValidPass#2026!')
            ->expectsQuestion('Confirm administrator password', 'ValidPass#2026!')
            ->assertFailed();
    }
}
