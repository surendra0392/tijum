<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Models\Admin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminProfileTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(AdminRole $role = AdminRole::SuperAdmin): Admin
    {
        return Admin::factory()->role($role)->withTwoFactor()->create();
    }

    public function test_unauthenticated_user_cannot_access_admin_profile(): void
    {
        $response = $this->get(route('admin.profile.edit'));

        $response->assertRedirect(route('admin.login'));
    }

    public function test_admin_profile_page_is_accessible(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin, 'admin')->get(route('admin.profile.edit'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('admin/profile')
            ->where('admin.id', $admin->id)
            ->where('admin.email', $admin->email)
            ->where('admin.name', $admin->name)
            ->has('admin.permissions')
        );
    }

    public function test_admin_can_update_name_and_email(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin, 'admin')->patch(route('admin.profile.update'), [
            'name' => 'Updated Staff Name',
            'email' => 'updated.staff@tijum.com',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('status', 'profile-updated');

        $admin->refresh();
        $this->assertSame('Updated Staff Name', $admin->name);
        $this->assertSame('updated.staff@tijum.com', $admin->email);
    }

    public function test_admin_cannot_use_email_already_taken_by_another_admin(): void
    {
        $admin1 = $this->createAdmin();
        $admin2 = $this->createAdmin();

        $response = $this->actingAs($admin1, 'admin')->patch(route('admin.profile.update'), [
            'name' => 'Attempted Dupe',
            'email' => $admin2->email,
        ]);

        $response->assertSessionHasErrors('email');
    }

    public function test_admin_can_update_password(): void
    {
        $admin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create([
            'password' => Hash::make('OldPassword123!'),
        ]);

        $response = $this->actingAs($admin, 'admin')->put(route('admin.profile.password.update'), [
            'current_password' => 'OldPassword123!',
            'password' => 'NewSecretPassword456!',
            'password_confirmation' => 'NewSecretPassword456!',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('status', 'password-updated');

        $admin->refresh();
        $this->assertTrue(Hash::check('NewSecretPassword456!', $admin->password));
    }

    public function test_admin_cannot_update_password_with_incorrect_current_password(): void
    {
        $admin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create([
            'password' => Hash::make('CorrectPassword123!'),
        ]);

        $response = $this->actingAs($admin, 'admin')->put(route('admin.profile.password.update'), [
            'current_password' => 'WrongPassword999!',
            'password' => 'NewSecretPassword456!',
            'password_confirmation' => 'NewSecretPassword456!',
        ]);

        $response->assertSessionHasErrors('current_password');
    }
}
