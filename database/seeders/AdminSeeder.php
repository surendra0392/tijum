<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AdminRole;
use App\Models\Admin;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Seed all system administrators with distinct operational roles.
     */
    public function run(): void
    {
        $admins = [
            [
                'name' => 'TIJUM Super Administrator',
                'email' => 'admin@tijum.com',
                'password' => 'Password123!',
                'role' => AdminRole::SuperAdmin,
            ],
            [
                'name' => 'Property Verification Officer',
                'email' => 'verification.admin@tijum.com',
                'password' => 'Password123!',
                'role' => AdminRole::PropertyVerification,
            ],
            [
                'name' => 'Operations Manager',
                'email' => 'operations.admin@tijum.com',
                'password' => 'Password123!',
                'role' => AdminRole::Operations,
            ],
            [
                'name' => 'Finance & Settlement Lead',
                'email' => 'finance.admin@tijum.com',
                'password' => 'Password123!',
                'role' => AdminRole::Finance,
            ],
            [
                'name' => 'Customer Support Lead',
                'email' => 'support.admin@tijum.com',
                'password' => 'Password123!',
                'role' => AdminRole::CustomerSupport,
            ],
        ];

        foreach ($admins as $adminData) {
            Admin::query()->updateOrCreate(
                ['email' => $adminData['email']],
                [
                    'name' => $adminData['name'],
                    'password' => Hash::make($adminData['password']),
                    'role' => $adminData['role'],
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}
