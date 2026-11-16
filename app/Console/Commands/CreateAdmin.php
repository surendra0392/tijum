<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\AdminRole;
use App\Models\Admin;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Symfony\Component\Console\Attribute\AsCommand;

#[AsCommand(name: 'app:create-admin')]
class CreateAdmin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:create-admin
        {--name= : Full name of the administrator}
        {--email= : Unique email address for the administrator}
        {--role= : Administrator role value}
        {--inactive : Provision the administrator in a deactivated state}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Provision a new TIJUM administrator account securely without public registration';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $nameInput = $this->option('name');
        $emailInput = $this->option('email');
        $roleInput = $this->option('role');

        $name = is_string($nameInput) && trim($nameInput) !== ''
            ? trim($nameInput)
            : trim((string) $this->ask('Administrator full name'));

        $rawEmail = is_string($emailInput) && trim($emailInput) !== ''
            ? $emailInput
            : (string) $this->ask('Administrator email address');
        $email = Str::lower(trim($rawEmail));

        $selectedRole = is_string($roleInput) && trim($roleInput) !== ''
            ? trim($roleInput)
            : $this->choice(
                'Select administrator role',
                AdminRole::values(),
                AdminRole::SuperAdmin->value,
            );
        $role = is_string($selectedRole) ? trim($selectedRole) : '';

        $password = (string) $this->secret('Enter administrator password');
        $passwordConfirmation = (string) $this->secret('Confirm administrator password');

        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'role' => $role,
            'password' => $password,
            'password_confirmation' => $passwordConfirmation,
        ], [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique(Admin::class, 'email')],
            'role' => ['required', Rule::enum(AdminRole::class)],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $admin = new Admin;
        $admin->forceFill([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'role' => AdminRole::from($role),
            'is_active' => ! (bool) $this->option('inactive'),
            'email_verified_at' => now(),
        ])->save();

        $this->info('Administrator account provisioned successfully.');
        $this->table(
            ['ID', 'Name', 'Email', 'Role', 'Status', 'TOTP MFA'],
            [[
                (string) $admin->id,
                $admin->name,
                $admin->email,
                $admin->role->value,
                $admin->is_active ? 'Active' : 'Inactive',
                'Enrollment required on first sign-in',
            ]],
        );

        return self::SUCCESS;
    }
}
