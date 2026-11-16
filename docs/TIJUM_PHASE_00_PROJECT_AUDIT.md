# TIJUM — PHASE 00: EXISTING PROJECT AUDIT & ARCHITECTURE BASELINE

**Project:** TIJUM — Food-Inclusive Accommodation Marketplace  
**Tagline:** *"Stay easy. Eat well. Spend less."*  
**Supporting Descriptor:** *"Affordable, food-inclusive accommodation booking."*  
**Phase:** 00 — Existing Project Audit & Architecture Baseline  
**Execution Mode:** Audit and Documentation Only (Read-Only Inspection)  
**Baseline Status:** Pre-Phase 01  

---

## Section 1 — Executive Summary

The repository at `d:\Herd\tijum` is a clean, newly provisioned **Laravel 13 + React 19 + Inertia.js v3** starter-kit application (`laravel/react-starter-kit`). It currently ships with full customer authentication powered by **Laravel Fortify 1.42.0** (login, registration, password reset, email verification, password confirmation, TOTP two-factor authentication, and WebAuthn passkeys), **Laravel Wayfinder 0.1.23** for typed TypeScript route/action generation, **Tailwind CSS v4.3.5** with Radix UI primitives (`shadcn/ui` New York style), and strict static-analysis and quality tooling (Larastan/PHPStan level 7, Laravel Pint, TypeScript `tsc`, Vite+, and PHPUnit 12).

### Baseline Verification Results (Observed Read-Only)
- **PHPUnit (`php artisan test`)**: **42 passed, 0 failed** (147 assertions) against in-memory SQLite (`phpunit.xml`).
- **PHPStan / Larastan (`composer types:check`)**: **0 errors** at Level 7 (`phpstan.neon`).
- **Laravel Pint (`composer lint:check`)**: **Passed** (`laravel` preset).
- **TypeScript (`npm run types:check` / `tsc --noEmit`)**: **Passed** (`strict: true`).
- **Vite+ Lint (`npx vp lint resources/js`)**: **0 warnings, 0 errors** across 63 files.
- **Vite+ Format Check (`npx vp fmt --check resources/js`)**: **1 pre-existing formatting diff** in `resources/js/pages/settings/profile.tsx` (and running root `npm run check` currently scans `.ag-kit-backups/`, surfacing formatting noise there).
- **Dependency Security Audits**: `composer audit` reported **0 advisories**; `npm audit` reported **0 vulnerabilities**.

### Readiness Verdict for Phase 01
**Ready to begin Phase 01**, with three critical pre-implementation observations:
1. **No Git repository is initialized** in `d:\Herd\tijum` (`git status` fails with `not a git repository`). Version control should be initialized before Phase 01 code changes begin.
2. **Database configuration difference**: `.env` targets **MySQL 8.0.46** (`tijum` database with 10 migrated starter-kit tables), whereas `phpunit.xml` runs tests on **SQLite `:memory:`** and `database/database.sqlite` also exists on disk.
3. **Starter-kit feature installer still present**: `chisel.php`, `chisel-paths.php`, and `app/Console/Commands/InstallFeaturesCommand.php` remain in the repository. Any decision to disable or permanently remove optional Fortify features (e.g., 2FA, passkeys, email verification) must account for Wayfinder route pruning and TypeScript build dependencies.

The existing customer authentication stack (`users`, `App\Models\User`, `web` guard) is clean and suitable to preserve as **Authentication Domain A (Customers)**, while **Domain B (Property Owners)** and **Domain C (Administrators)** should be implemented in Phase 01 as completely isolated Eloquent models, database tables, authentication guards, password brokers, middleware boundaries, and React layout/page namespaces.

---

## Section 2 — Technology Stack

All versions below were verified directly via CLI inspection (`php -v`, `php artisan --version`, `php artisan about --json`, `composer show --direct`, `node -v`, `npm -v`, `npm list --depth=0`, `php artisan db:show`).

### 2.1 Runtime & Core Platform
| Layer | Technology | Exact Installed / Observed Version | Notes |
|---|---|---|---|
| **PHP** | PHP CLI (Herd / NTS VC++ 2022 x64) | `8.4.27` | `composer.json` constraint: `^8.3` |
| **Backend Framework** | `laravel/framework` | `13.42.0` | `composer.json` constraint: `^13.17` |
| **Composer** | Composer | `2.10.3` | Lockfile present (`composer.lock`) |
| **Node.js / NPM** | Node.js / npm | `v26.12.0` / `11.20.0` | CI uses Node `22` / PHP `8.3` |
| **Active Database** | MySQL | `8.0.46` | Active `.env` connection (`tijum` schema) |
| **Test Database** | SQLite | `:memory:` (via `phpunit.xml`) | `database/database.sqlite` also exists on disk |

### 2.2 Backend Composer Dependencies (`composer show --direct`)
| Package | Installed Version | Role |
|---|---|---|
| `laravel/framework` | `13.42.0` | Core application framework |
| `inertiajs/inertia-laravel` | `3.7.0` | Server-side Inertia v3 protocol & SSR bridge |
| `laravel/fortify` | `1.42.0` | Customer auth routes, actions, 2FA & passkey backend |
| `laravel/wayfinder` | `0.1.23` | TypeScript route & controller action generator |
| `laravel/chisel` | `0.1.1` | Starter-kit one-time feature removal toolkit |
| `laravel/tinker` | `3.1.0` | Artisan REPL |
| `mallardduck/blade-lucide-icons` | `2.0.43` | Blade Lucide icon support |
| `larastan/larastan` *(dev)* | `3.14.0` | Static analysis (configured at Level 7) |
| `laravel/boost` *(dev)* | `2.10.4` | AI/MCP dev assistance & browser log endpoint |
| `laravel/pint` *(dev)* | `1.32.2` | PHP code formatter (`laravel` preset) |
| `laravel/pail` *(dev)* | `1.3.0` | Log tailing |
| `laravel/pao` *(dev)* | `1.1.5` | Agent-optimized PHPUnit/tooling output |
| `laravel/sail` *(dev)* | `1.70.0` | Docker local dev scaffolding |
| `phpunit/phpunit` *(dev)* | `12.5.43` | Test runner |
| `fakerphp/faker` *(dev)* | `1.24.1` | Factory test data generation |
| `mockery/mockery` *(dev)* | `1.6.15` | Mocking framework |
| `nunomaduro/collision` *(dev)* | `8.9.6` | CLI error formatting |

### 2.3 Frontend NPM Dependencies (`npm list --depth=0`)
| Package | Installed Version | Role |
|---|---|---|
| `react` / `react-dom` | `19.3.1` | UI rendering (`strictMode: true`) |
| `@inertiajs/react` | `3.11.0` | Inertia v3 React adapter (`<Form>`, `<Link>`, `useHttp`, `setLayoutProps`) |
| `@inertiajs/vite` | `3.11.0` | Auto page-glob resolver & SSR Vite integration |
| `@laravel/passkeys` | `0.2.0` | WebAuthn passkey client hooks (`usePasskeyVerify`, `usePasskeyRegister`) |
| `@laravel/vite-plugin-wayfinder` | `0.1.11` | Regenerates Wayfinder TS modules on Vite dev/build |
| `typescript` | `5.9.3` | Static type checking (`strict: true`, `noImplicitAny: true`) |
| `tailwindcss` / `@tailwindcss/vite` | `4.3.5` | CSS-first Tailwind v4 engine |
| `vite-plus` (`vp`) | `1.4.0` | Unified Vite toolchain (`vite@npm:@voidzero-dev/vite-plus-core@1.4.0`) |
| `@vitejs/plugin-react` | `6.3.0` | React Vite integration |
| `babel-plugin-react-compiler` | `1.0.0` | React Compiler optimization via `@rolldown/plugin-babel` `0.2.4` |
| `lucide-react` | `0.475.0` | React icon library |
| `@radix-ui/react-*` | `1.x`–`2.x` | Accessible UI primitives (Avatar, Checkbox, Collapsible, Dialog, Dropdown Menu, Label, Navigation Menu, Select, Separator, Slot, Toggle, Toggle Group, Tooltip) |
| `sonner` | `2.0.8` | Toast notifications (`useFlashToast` integration) |
| `input-otp` | `1.5.0` | 6-digit OTP input for 2FA |
| `class-variance-authority` / `clsx` / `tailwind-merge` | `0.7.1` / `2.1.1` / `3.7.0` | Variant & class composition (`cn()`) |
| `tw-animate-css` | `1.4.0` | Tailwind animation utilities |
| `fontaine` | `1.0.3` | Font metrics fallback |
| `gsap` / `three` | `3.15.1` / `0.187.0` | Installed in `package.json` dependencies (currently unused in starter-kit pages) |
| `concurrently` | `10.0.7` | Process orchestration |

### 2.4 Configured Drivers & Runtime Environment (`php artisan about --json` & `config/`)
- **App Environment**: `local`, `debug_mode: true`, `url: tijum.test/`, `timezone: UTC`, `locale: en`
- **Database**: `mysql` (default fallback in `config/database.php` is `sqlite`)
- **Session**: `database` (`sessions` table, `lifetime: 120`, `encrypt: false`, `http_only: true`, `same_site: lax`, `serialization: json`)
- **Cache**: `database` (`cache` / `cache_locks` tables, `serializable_classes: false`)
- **Queue**: `database` (`jobs` / `job_batches` / `failed_jobs` tables, `after_commit: false`)
- **Mail / Broadcasting / Logging**: `log` / `log` / `stack` (`single` -> `storage/logs/laravel.log`)
- **Filesystem**: `local` (`storage/app/private`, `'serve' => true`); `public` (`storage/app/public`, symlinked at `public/storage`); `s3` configured via env vars
- **Inertia SSR**: `enabled: true` (`http://127.0.0.1:13714`), `testing.ensure_pages_exist: true`

---

## Section 3 — Existing Project Structure

### 3.1 Root Directory Inventory
- Application & config directories: `app/`, `bootstrap/`, `config/`, `database/`, `public/`, `resources/`, `routes/`, `storage/`, `tests/`, `vendor/`, `node_modules/`
- CI & repository metadata: `.github/workflows/tests.yml`, `.github/dependabot.yml`
- Tooling & starter-kit files:
  - `composer.json`, `composer.lock`, `package.json`, `package-lock.json`, `pnpm-workspace.yaml`
  - `vite.config.ts`, `tsconfig.json`, `components.json`
  - `phpstan.neon`, `pint.json`, `phpunit.xml`, `.editorconfig`
  - `chisel.php`, `chisel-paths.php` (unused starter-kit feature trimmer)
  - `boost.json`, `opencode.json`, `AGENTS.md`, `.agents/`, `.ag-kit-backups/` (agent/tooling configuration)

### 3.2 Backend vs Frontend Layout
- **Backend (`app/`)**:
  - `app/Actions/Fortify/` (`CreateNewUser.php`, `ResetUserPassword.php`)
  - `app/Concerns/` (`PasswordValidationRules.php`, `ProfileValidationRules.php`)
  - `app/Console/Commands/` (`InstallFeaturesCommand.php`)
  - `app/Http/Controllers/` (`Controller.php`, `Settings/ProfileController.php`, `Settings/SecurityController.php`)
  - `app/Http/Middleware/` (`HandleAppearance.php`, `HandleInertiaRequests.php`)
  - `app/Http/Requests/Settings/` (`PasswordUpdateRequest.php`, `ProfileDeleteRequest.php`, `ProfileUpdateRequest.php`, `TwoFactorAuthenticationRequest.php`)
  - `app/Models/` (`User.php`)
  - `app/Providers/` (`AppServiceProvider.php`, `FortifyServiceProvider.php`)
  - **Absent directories** (not yet created): `app/Policies/`, `app/Services/`, `app/Jobs/`, `app/Events/`, `app/Listeners/`, `app/Notifications/`, `app/Enums/`, `app/Http/Resources/`
- **Frontend (`resources/js/`)**:
  - Entry point: `resources/js/app.tsx` (via `resources/views/app.blade.php`)
  - Pages: `resources/js/pages/` (`welcome.tsx`, `dashboard.tsx`, `auth/*`, `settings/*`)
  - Layouts: `resources/js/layouts/` (`app-layout.tsx`, `auth-layout.tsx`, `app/*`, `auth/*`, `settings/layout.tsx`)
  - Components: `resources/js/components/` (feature components + `ui/*` Radix wrappers)
  - Hooks & Utils: `resources/js/hooks/`, `resources/js/lib/utils.ts`
  - Types: `resources/js/types/` (`auth.ts`, `navigation.ts`, `ui.ts`, `global.d.ts`, `index.ts`, `vite-env.d.ts`)
  - Wayfinder generated outputs: `resources/js/actions/`, `resources/js/routes/`, `resources/js/wayfinder/`

---

## Section 4 — Existing Authentication Architecture

### 4.1 Starter-Kit Implementation
The project uses **Laravel Fortify `1.42.0`** (NOT Breeze or Jetstream) paired with **session-based authentication** (`web` guard) and **Inertia.js v3** for all auth views.

- **Guard & Provider (`config/auth.php`)**:
  - `defaults.guard` -> `'web'` (`AUTH_GUARD`)
  - `defaults.passwords` -> `'users'` (`AUTH_PASSWORD_BROKER`)
  - `guards.web` -> `driver: 'session'`, `provider: 'users'`
  - `providers.users` -> `driver: 'eloquent'`, `model: App\Models\User`
  - `passwords.users` -> `table: 'password_reset_tokens'`, `expire: 60`, `throttle: 60`
  - `password_timeout` -> `10800` seconds (3 hours)
- **Fortify Configuration (`config/fortify.php`)**:
  - `'guard' => 'web'`, `'passwords' => 'users'`, `'username' => 'email'`, `'email' => 'email'`, `'lowercase_usernames' => true`, `'home' => '/dashboard'`, `'views' => true`
  - Active `'features'`: `Features::registration()`, `Features::resetPasswords()`, `Features::emailVerification()`, `Features::twoFactorAuthentication(['confirm' => true, 'confirmPassword' => true])`, `Features::passkeys(['confirmPassword' => true])`.
  - Note: `Features::updateProfileInformation()` and `Features::updatePasswords()` are **not** enabled in Fortify; instead, custom routes/controllers in `routes/settings.php` (`ProfileController`, `SecurityController`) handle profile updates, account deletion, and password updates.
- **Fortify Service Provider (`app/Providers/FortifyServiceProvider.php`)**:
  - Binds `CreateNewUser` and `ResetUserPassword`.
  - Configures Inertia view responses for `login`, `reset-password`, `forgot-password`, `verify-email`, `register`, `two-factor-challenge`, and `confirm-password`.
  - Registers rate limiters: `login` (`5/min` by transliterated lowercased email + IP), `two-factor` (`5/min` by session `login.id`), and `passkeys` (`10/min` by `credential.id` or session ID + IP).
- **Customer Model (`app/Models/User.php`)**:
  - Extends `Illuminate\Foundation\Auth\User` (`Authenticatable`).
  - Implements `MustVerifyEmail` and `PasskeyUser`.
  - Uses `HasFactory`, `Notifiable`, `PasskeyAuthenticatable`, and `TwoFactorAuthenticatable`.

### 4.2 Important Constraint for Multi-Guard Extension
Inspecting `vendor/laravel/fortify/src/FortifyServiceProvider.php` and `vendor/laravel/fortify/routes/routes.php` confirms that Fortify:
1. Binds `Laravel\Fortify\Contracts\StatefulGuard` globally as a singleton-like closure resolving `Auth::guard(config('fortify.guard', null))` (`'web'`).
2. Registers a single set of global route names (`login`, `logout`, `register`, `password.request`, `password.reset`, `password.confirm`, etc.) hardwired to `config('fortify.guard')` and `config('fortify.passwords')`.

**Architectural Conclusion:** Preserving Fortify cleanly for **Customers (`web` guard)** is the safest approach. Attempting to overload Fortify to serve `owner` and `admin` guards simultaneously would cause route-name collisions, `StatefulGuard` binding conflicts, and brittle config overrides. Instead, **Owner (`owner`)** and **Admin (`admin`)** should use dedicated, guard-explicit Laravel session controllers and FormRequests (`Auth::guard('owner')`, `Auth::guard('admin')`) alongside Fortify-managed `web` customer auth.

---

## Section 5 — Three Authentication Domain Architecture

### 5.1 Domain Summary Table

| Authentication Domain | Database Table | Eloquent Model | Auth Guard | User Provider | Password Broker | Password Reset Table | Self-Registration |
|---|---|---|---|---|---|---|---|
| **Customers** | `users` | `App\Models\User` | `web` | `users` | `users` | `password_reset_tokens` | Yes (Fortify) |
| **Property Owners** | `owners` | `App\Models\Owner` | `owner` | `owners` | `owners` | `owner_password_reset_tokens` | Dedicated onboarding/registration flow |
| **Administrators** | `admins` | `App\Models\Admin` | `admin` | `admins` | `admins` | `admin_password_reset_tokens` | **No** (CLI/seeder/super-admin invite only) |

### 5.2 Configuration (`config/auth.php`)
- Add `owner` and `admin` session guards (`'driver' => 'session'`) backed by dedicated `owners` (`App\Models\Owner`) and `admins` (`App\Models\Admin`) Eloquent providers.
- Add separate `owners` and `admins` entries under `passwords` pointing to `owner_password_reset_tokens` and `admin_password_reset_tokens` (so a person using the same email as a customer and an owner never collides on the primary key of `password_reset_tokens`).
- Keep `defaults.guard => 'web'` and `defaults.passwords => 'users'` so Fortify and existing customer behavior remain 100% intact.

### 5.3 Session Isolation & Logout Behavior
- Laravel's `SessionGuard` stores each guard's authenticated ID under a guard-specific session key (`login_{guard}_{sha1}`). A browser session can technically distinguish `web`, `owner`, and `admin` identities independently.
- **Critical Logout Caveat**: Calling `$request->session()->invalidate()` on logout destroys the entire Laravel session (clearing **all** guards logged into that browser cookie).
  - **Option 1 (Strict single-browser invalidation — simplest, most secure on shared computers)**: Each guard's logout calls `Auth::guard($guard)->logout(); $request->session()->invalidate(); $request->session()->regenerateToken();` and redirects to that portal's login route. Note that in local QA, testing two portals simultaneously requires separate browser profiles/incognito windows.
  - **Option 2 (Guard-scoped logout or subdomain-scoped session cookies)**: Calling `Auth::guard($guard)->logout()` + `$request->session()->regenerate(true)` (without wiping other guards' session keys) OR hosting portals on separate subdomains (`tijum.in`, `owner.tijum.in`, `admin.tijum.in`) with distinct session cookie names/domains. **Subdomain or guard-scoped handling must be decided before Phase 01** (logged in Section 17).

### 5.4 Guard-Specific Authentication, Password Reset & Redirects
- **Login & Guest Redirects (`bootstrap/app.php`)**:
  - Currently `bootstrap/app.php` does not customize guest or authenticated redirects; Laravel defaults `auth:*` unauthenticated redirects to `route('login')` (customer login) and `guest:*` redirects to `route('dashboard')` (customer dashboard).
  - Phase 01 must configure `$middleware->redirectGuestsTo(...)` and `$middleware->redirectUsersTo(...)` inspecting `$request->routeIs('owner.*') || $request->is('owner', 'owner/*')` and `$request->routeIs('admin.*') || $request->is('admin', 'admin/*')` so:
    - Unauthenticated `/owner/*` -> `route('owner.login')`
    - Unauthenticated `/admin/*` -> `route('admin.login')`
    - Unauthenticated customer routes -> `route('login')`
    - Authenticated `guest:owner` -> `route('owner.dashboard')`
    - Authenticated `guest:admin` -> `route('admin.dashboard')`
    - Authenticated `guest:web` -> `route('dashboard')`
- **Password Resets**:
  - Customer resets remain on Fortify (`Password::broker('users')`).
  - Owner and Admin resets use explicit `Password::broker('owners')` and `Password::broker('admins')` with custom `ResetPassword::createUrlUsing` or model-specific `sendPasswordResetNotification($token)` overrides so reset emails link to `route('owner.password.reset', ...)` and `route('admin.password.reset', ...)`.
- **Admin Registration Guardrail**:
  - Admins must never have a public registration route. Provisioning occurs via Artisan command / seeder / super-admin invitation flow, with mandatory strong password rules and active status checks (`is_active`).

### 5.5 Cross-Guard Access Prevention & Inertia Prop Isolation
- **Route Middleware**:
  - Customer protected routes: `auth:web` (plus `verified` if customer email verification remains active).
  - Owner protected routes: `auth:owner` (plus owner active/verified status middleware if required).
  - Admin protected routes: `auth:admin` (plus admin active/role middleware).
- **Inertia Shared Data (`app/Http/Middleware/HandleInertiaRequests.php`)**:
  - Currently line 42 shares `'auth' => ['user' => $request->user()]`. Because `HandleInertiaRequests` runs in the `web` middleware group (before route-level `auth:owner` calls `Auth::shouldUse('owner')`), `$request->user()` defaults to `web`! On `/owner/login` or `/owner/dashboard`, `$request->user()` would either be `null` or leak a logged-in Customer user!
  - Phase 01 must make `HandleInertiaRequests` resolve auth explicitly by portal (`$request->routeIs('owner.*')` -> `auth('owner')->user()`, `$request->routeIs('admin.*')` -> `auth('admin')->user()`, default -> `auth('web')->user()`), OR split portal-specific Inertia middleware (`HandleOwnerInertiaRequests`, `HandleAdminInertiaRequests`) so customer, owner, and admin props never cross domains.

### 5.6 Authentication Testing Architecture
- Feature tests in `tests/Feature/Auth/Owner/` and `tests/Feature/Auth/Admin/` must verify:
  - Login, invalid credentials, rate limiting, password reset, and logout per guard.
  - **Cross-guard negative matrix**:
    - Authenticated `User` (`web`) hitting `/owner/dashboard` or `/admin/dashboard` is redirected to `owner.login` / `admin.login` (not granted access!).
    - Authenticated `Owner` (`owner`) hitting `/dashboard` or `/admin/dashboard` is redirected to `login` / `admin.login`.
    - Authenticated `Admin` (`admin`) hitting `/dashboard` or `/owner/dashboard` is redirected to `login` / `owner.login`.
  - Using `$this->actingAs($owner, 'owner')` and `$this->actingAs($admin, 'admin')` explicitly in tests.

---

## Section 6 — Database Audit

### 6.1 Existing Schema (`tijum` MySQL 8.0.46 Database & `database/migrations/`)
Five migrations are recorded in `tijum.migrations` (all 10 tables verified via `php artisan db:show --counts`):

| Table | Migration File | Key Columns & Types | Constraints / Indexes | Notes |
|---|---|---|---|---|
| `users` | `0001_01_01_000000_create_users_table.php` + `2025_08_14_170933_add_two_factor_columns_to_users_table.php` | `id` (PK), `name`, `email`, `email_verified_at` (nullable), `password`, `two_factor_secret` (nullable text), `two_factor_recovery_codes` (nullable text), `two_factor_confirmed_at` (nullable timestamp), `remember_token` (nullable), `timestamps()` | `email` UNIQUE | No `role`, `is_owner`, `is_admin`, or soft deletes |
| `password_reset_tokens` | `0001_01_01_000000_create_users_table.php` | `email` (PK), `token`, `created_at` (nullable) | PK on `email` | Used by `users` broker only |
| `sessions` | `0001_01_01_000000_create_users_table.php` | `id` (PK string), `user_id` (nullable FK-less bigint), `ip_address` (45), `user_agent` (text), `payload` (longText), `last_activity` (int) | PK `id`, INDEX `user_id`, INDEX `last_activity` | Note: `DatabaseSessionHandler` writes `web` guard user_id here; multi-guard auth IDs reside in `payload` |
| `passkeys` | `2024_01_01_000000_create_passkeys_table.php` | `id` (PK), `user_id`, `name`, `credential_id`, `credential` (json), `last_used_at` (nullable), `timestamps()` | FK `user_id` -> `users.id` (`cascadeOnDelete`), UNIQUE `credential_id`, INDEX `user_id` | Bound specifically to `users` table |
| `cache` / `cache_locks` | `0001_01_01_000001_create_cache_table.php` | `key` (PK), `value`, `expiration` / `owner` | PK `key`, INDEX `expiration` | Used by default `database` cache store |
| `jobs` / `job_batches` / `failed_jobs` | `0001_01_01_000002_create_jobs_table.php` | Standard Laravel 13 queue schema | INDEX `queue`, UNIQUE `uuid`, composite index on `failed_jobs` | Used by `database` queue connection |

### 6.2 Existing Models & Conventions
- **Only `App\Models\User`** exists (`app/Models/User.php`), using PHP 8 attributes `#[Fillable([...])]` and `#[Hidden([...])]`, `casts()` method (Laravel 11+ style), `CarbonImmutable` (`Date::use(CarbonImmutable::class)` in `AppServiceProvider`), and standard `bigint unsigned` auto-increment primary keys.
- No soft deletes or UUID/ULID traits are present yet.

### 6.3 Conflict Analysis Against Three-Identity Design
- **`users`**: Clean—no role columns pollute it.
- **`password_reset_tokens`**: Keyed solely by `email` (no guard/broker discriminator). **Conflict if shared**: create `owner_password_reset_tokens` and `admin_password_reset_tokens` for complete isolation.
- **`passkeys`**: Has a hard FK `user_id -> users(id)`. Owners and admins should use separate credential policies/tables if passkeys are ever added for them; keep `passkeys` strictly for Customers (`users`).
- **`sessions`**: `sessions.user_id` is nullable and lacks a foreign key constraint, so it causes **no schema conflict**, though queries against `sessions.user_id` only track default-guard sessions.

### 6.4 Preliminary Future Database Domain Map (TIJUM Marketplace)

| Domain | Core Tables (Proposed) | Key Relationships & Design Notes |
|---|---|---|
| **Identities** | `users`, `owners`, `admins`, `owner_password_reset_tokens`, `admin_password_reset_tokens`, `cities` | Strict separation of identity tables. `cities` table/config manages launch cities (Hyderabad, Guntur, Vijayawada, Visakhapatnam) + activation flags. |
| **Property & Verification** | `property_categories`, `properties`, `property_verifications`, `property_documents`, `property_images` | `properties.owner_id -> owners.id`; `properties.category_id -> property_categories.id` (Phase 1 seeded with `hostel`, `pg`, `homestay`). `property_verifications.reviewed_by_admin_id -> admins.id`. Documents stored privately with signed/authorized access. |
| **Inventory (Rooms & Beds)** | `rooms`, `beds`, `bed_availability_blocks` | `rooms.property_id -> properties.id`; `beds.room_id -> rooms.id`. Properties configure `early_checkin_enabled` / `early_checkin_fee` at property/room/bed-category level (earliest 7:00 AM; default check-in 9:00 AM, checkout 8:00 AM next day = 23h; turnaround buffer tracked). |
| **Mandatory Food Packages** | `food_packages`, `meal_schedules`, `food_menus` | `food_packages.property_id -> properties.id` (mandatory before property can be published/bookable). Supports breakfast, lunch, dinner, evening snacks; veg/non-veg availability, food type, timings, food-service provider, arrival-day & departure-day rules, and inclusive pricing. |
| **Amenities Catalogue** | `amenity_categories`, `amenities`, `property_amenities`, `room_amenities` | Central master catalogue across 10 categories; pivot `status` enum (`available_included`, `available_extra_cost`, `not_available`, `not_verified`) + optional `extra_cost_amount` / `verified_by_admin_id`. |
| **Bookings & Check-In** | `bookings`, `booking_bed_allocations`, `booking_meal_snapshots`, `booking_status_histories` | `bookings.user_id -> users.id`, `bookings.property_id -> properties.id`. `booking_bed_allocations` locks exact bed(s) + occupancy window (`check_in_at` >= 7:00 AM, `check_out_at` 8:00 AM + buffer) using DB transactions & row locks (`SELECT ... FOR UPDATE`) to prevent double-booking. Stores immutable price/meal/policy snapshots at booking time. |
| **Payments, Refunds & Settlements** | `payments`, `payment_events`, `refunds`, `partner_commissions`, `partner_settlements`, `settlement_items`, `protection_reserve_entries` | 100% online payment only. Webhook events idempotent via unique gateway `event_id`/`transaction_id`. Settlement eligibility triggered after verified check-in + 48–72h hold (pending payment-aggregator escrow/nodal model confirmation). Immutable append-only ledger pattern recommended for financial entries. |
| **Trust, Support & Reviews** | `reviews`, `complaints`, `complaint_messages`, `relocation_offers`, `partner_violations`, `notifications` | Complaints linked to `bookings` & `users`, handled by `admins`. `relocation_offers` link failed booking -> replacement `property_id`, customer price parity, and `protection_reserve_entries` for eligible price difference. `partner_violations` tie to signed agreement evidence & dispute status. |

---

## Section 7 — Frontend Audit

### 7.1 React + Inertia + Vite Architecture
- **Entry & Bootstrapping (`resources/js/app.tsx`, `resources/views/app.blade.php`)**:
  - Uses `@inertiajs/react`'s `createInertiaApp()` with `@inertiajs/vite` auto-injecting `import.meta.glob('./pages/**/*.{tsx,jsx}')`.
  - Runs React 19 with `strictMode: true` and `babel-plugin-react-compiler`.
  - Applies persistent layouts via `layout: (name) => ...`:
    - `'welcome'` -> `null`
    - `name.startsWith('auth/')` -> `AuthLayout`
    - `name.startsWith('settings/')` -> `[AppLayout, SettingsLayout]`
    - default -> `AppLayout`
  - Wraps app in `<TooltipProvider>` + `<Toaster />` (`sonner`, wired to Inertia's `router.on('flash', ...)` via `useFlashToast()`).
- **Server-to-Client Data & Typed Routing**:
  - `HandleInertiaRequests::share()` injects `name`, `auth.user`, and `sidebarOpen`.
  - `resources/js/types/global.d.ts` augments `@inertiajs/core`'s `InertiaConfig['sharedPageProps']`.
  - **Laravel Wayfinder** (`vite.config.ts`: `wayfinder({ formVariants: true })`) auto-generates typed functions under `resources/js/actions/` and `resources/js/routes/`. Forms use `<Form {...Action.form()}>` (Inertia v3 declarative form component) or `useHttp` (for 2FA JSON fetches in `useTwoFactorAuth`).
- **Styling & Design System (`resources/css/app.css`, `components.json`)**:
  - Tailwind CSS v4 (`@import 'tailwindcss'`, `@theme` tokens with `Instrument Sans` via Bunny Fonts, `oklch` color tokens, `.dark` custom variant).
  - Radix UI primitives wrapped in `resources/js/components/ui/*` (`shadcn` New York style, `lucide-react` icons).

### 7.2 Existing Pages, Layouts & Components
- **Pages**: `welcome.tsx`, `dashboard.tsx`, `auth/{login,register,forgot-password,reset-password,verify-email,two-factor-challenge,confirm-password}.tsx`, `settings/{profile,security,appearance}.tsx`.
- **Layouts**: `app-layout.tsx` (wraps `AppSidebarLayout`, with `AppHeaderLayout` also available), `auth-layout.tsx` (wraps `AuthSimpleLayout`, with `AuthCardLayout` and `AuthSplitLayout` available), `settings/layout.tsx`.
- **Important Coupling Found**:
  - `resources/js/pages/auth/login.tsx` and `confirm-password.tsx` render `<PasskeyVerify />` unconditionally without checking a `canUsePasskeys` prop.
  - Because `@inertiajs/vite` globs all `resources/js/pages/**/*.{tsx,jsx}` and Wayfinder prunes disabled routes from `resources/js/routes/` and `resources/js/actions/`, disabling Fortify features requires updating/gating any TSX files importing pruned Wayfinder routes so `tsc` and `vp build` remain green.

### 7.3 Recommended Multi-Portal Frontend Organization
Keep a single Vite + Inertia SPA with strict directory and layout separation under `resources/js/`:
- `resources/js/pages/public/` — Customer discovery, city/search results, property detail, public info pages (Header layout, public SEO/SSR-friendly).
- `resources/js/pages/customer/` (plus existing `auth/` & `settings/` or moved cleanly as customer portal matures) — Customer dashboard, booking checkout, booking history, complaints/support.
- `resources/js/pages/owner/` — Independent Owner auth pages + Owner Portal layout (`OwnerLayout` with property, room/bed, meal package, amenity, availability, reservation, check-in, and settlement views).
- `resources/js/pages/admin/` — Independent Admin auth pages + Admin Portal layout (`AdminLayout` with approvals, verification queue, bookings, refunds, customer protection/relocations, settlements, violations, city/catalogue config).
- Shared UI (`components/ui/`, generic form/status primitives) stays shared; domain-specific components/hooks are scoped by portal (`components/owner/`, `components/admin/`, `components/booking/`).
- Update `app.tsx`'s `layout` resolver to map `owner/auth/*`, `owner/*`, `admin/auth/*`, `admin/*`, `public/*`, and customer pages to their respective layouts without mixing navigation shells.

---

## Section 8 — Backend Audit

### 8.1 Current Implementation Inventory
- **`app/Providers/AppServiceProvider.php`**:
  - Configures `Date::use(CarbonImmutable::class)`, `DB::prohibitDestructiveCommands(app()->isProduction())`, and production password defaults (`min(12)->mixedCase()->letters()->numbers()->symbols()->uncompromised()`).
- **`app/Providers/FortifyServiceProvider.php`**:
  - Wires Fortify actions, Inertia views, and rate limiters.
- **`app/Http/Controllers/Settings/`**:
  - `ProfileController`: `edit`, `update` (nullifies `email_verified_at` if email changed, flashes Inertia toast), `destroy` (logs out, deletes user, invalidates session).
  - `SecurityController`: `edit` (renders `settings/security` with `canManageTwoFactor`, `canManagePasskeys`, passkeys list, password rules), `update` (updates password).
- **`app/Http/Requests/Settings/`**:
  - `ProfileUpdateRequest` (lowercases `email` when `fortify.lowercase_usernames` is true, validates via `ProfileValidationRules`), `PasswordUpdateRequest`, `ProfileDeleteRequest`, `TwoFactorAuthenticationRequest` (uses Fortify's `InteractsWithTwoFactorState`).
- **`app/Http/Middleware/`**:
  - `HandleAppearance` (shares cookie `appearance` with Blade root view), `HandleInertiaRequests` (shares `name`, `auth.user`, `sidebarOpen`).
- **`bootstrap/app.php`**:
  - Registers `web` routes (`routes/web.php`), `commands` (`routes/console.php`), health route `/up`, unencrypted cookies `['appearance', 'sidebar_state']`, web middleware stack (`HandleAppearance`, `HandleInertiaRequests`, `AddLinkHeadersForPreloadedAssets`), and JSON exception rendering for `api/*` or `expectsJson()`.
- **Unused / Missing Layers**: No Policies, Services, Domain Actions (outside Fortify), Jobs, Events, Listeners, Notifications, API Resources, or Scheduled Tasks exist yet.

### 8.2 Maintainable Architecture Recommendation for TIJUM
Adopt a **modular domain-oriented structure inside standard Laravel (`app/`)** rather than premature microservices:
- **Thin Controllers** -> validate via dedicated **FormRequests**, authorize via **Policies** (guard-aware), delegate write operations/workflows to single-purpose **Actions / Services** (e.g., `app/Services/Booking/`, `app/Services/Inventory/`, `app/Services/Payment/`, `app/Services/Settlement/`, `app/Services/Protection/`).
- **Concurrency & Financial Safety**: Wrap bed inventory allocation, booking confirmation, payment capture, refund, and settlement batching in `DB::transaction()` with pessimistic row locks (`lockForUpdate()`).
- **Async Offloading**: Dispatch confirmation emails/SMS/WhatsApp notifications, image processing, and settlement reconciliations onto queued Jobs (`ShouldQueue` with `$afterCommit = true` / `after_commit` safety).
- **Strict Eloquent Discipline**: Enable `Model::shouldBeStrict(! app()->isProduction())` (or `preventLazyLoading()`, `preventSilentlyDiscardingAttributes()`) early in `AppServiceProvider` to catch N+1 queries and mass-assignment bugs during development.

---

## Section 9 — Route Audit

### 9.1 Existing Routes (`php artisan route:list` — 47 total, 27 non-vendor/app-and-auth)
- **Public**: `GET /` (`home`), `GET /up` (health check), `GET/PUT storage/{path}` (`storage.local` private file route), `GET .well-known/passkey-endpoints` (`well-known.passkeys`).
- **Fortify Customer Auth (`web`)**: `login`, `login.store`, `logout`, `register`, `register.store`, `password.request`, `password.email`, `password.reset`, `password.update`, `verification.notice`, `verification.verify`, `verification.send`, `password.confirm`, `password.confirm.store`, `password.confirmation`, `two-factor.*` (8 routes), `passkey.*` (7 routes).
- **Authenticated Customer (`['auth', 'verified']` / `['auth']`)**:
  - `GET /dashboard` (`dashboard`, `['auth', 'verified']`)
  - `ANY /settings` -> redirect `/settings/profile` (`['auth']`)
  - `GET/PATCH /settings/profile` (`['auth']`), `DELETE /settings/profile` (`['auth', 'verified']`)
  - `GET /settings/security` (`['auth', 'verified', RequirePassword::class]`)
  - `PUT /settings/password` (`['auth', 'verified', 'throttle:6,1']`)
  - `GET /settings/appearance` (`['auth', 'verified']`)
- **Dev Tooling**: `_boost/browser-logs`, `_inertia/devtools/entries/*` (local/dev only).
- **Conflicts**: None currently.

### 9.2 Recommended Future Route Architecture
Split routes cleanly into separate route files loaded from `bootstrap/app.php` (or included cleanly) with explicit prefix, route-name prefix, and guard middleware:

| Route Group / File | URL Prefix | Name Prefix | Middleware | Purpose |
|---|---|---|---|---|
| **Public Web (`routes/web.php`)** | `/` | *(none)* | `web` | Landing, city search, property discovery/detail, policies/FAQ |
| **Customer Portal (`routes/customer.php` + Fortify + `routes/settings.php`)** | `/`, `/dashboard`, `/bookings`, `/settings` | *(none)* / `customer.*` | `web`, `auth:web` (+ `verified` if enabled) | Fortify auth, customer dashboard, checkout, bookings, support, settings |
| **Owner Portal (`routes/owner.php`)** | `/owner` | `owner.` | `web`, `guest:owner` / `auth:owner` | Owner login/register/reset, onboarding, properties, rooms/beds, meals, amenities, availability, reservations, settlements |
| **Admin Portal (`routes/admin.php`)** | `/admin` | `admin.` | `web`, `guest:admin` / `auth:admin` | Admin login/reset (no public register), approvals, verification, bookings, refunds, protection/relocations, settlements, violations, platform config |
| **API & Webhooks (`routes/api.php`)** | `/api/v1` | `api.v1.` | `api` (+ Sanctum token abilities for mobile / signature middleware for webhooks) | Future customer & owner mobile apps, payment gateway webhooks (CSRF-exempt + HMAC signature verified) |

---

## Section 10 — Testing and Quality Assurance

### 10.1 Current Tooling & Results
| Check | Command | Current Result | Notes |
|---|---|---|---|
| **PHPUnit** | `php artisan test` | **Passed** (`42` tests, `147` assertions) | SQLite `:memory:`, `BCRYPT_ROUNDS=4`, `array` mail/cache/session, `sync` queue |
| **Static Analysis** | `composer types:check` (`phpstan analyse`) | **Passed** (`0` errors) | Larastan `3.14.0`, Level 7 (`app`, `bootstrap/app.php`, `config`, `database`, `routes`) |
| **PHP Formatting** | `composer lint:check` (`pint --parallel --test`) | **Passed** | `preset: laravel` |
| **TypeScript** | `npm run types:check` (`tsc --noEmit`) | **Passed** | `strict: true`, `noImplicitAny: true` |
| **JS/TS Linting** | `npx vp lint resources/js` | **Passed** (`0` warnings, `0` errors) | `oxlint --type-aware`, `denyWarnings: true` |
| **JS/TS Formatting** | `npx vp fmt --check resources/js` | **1 diff** (`settings/profile.tsx`) | Root `npm run check` also checks `.ag-kit-backups/` unless ignored |
| **CI Workflow** | `.github/workflows/tests.yml` | Configured | Runs `composer setup` + `composer ci:check` on PHP `8.3` & Node `22` |

### 10.2 Gaps & Future Testing Strategy
- **Existing Gaps**:
  - Tests run on SQLite `:memory:` while `.env` targets MySQL 8.0.46—MySQL-specific locking (`FOR UPDATE`), JSON indexing, and migrations should also be tested against MySQL in CI or staging.
  - No frontend React unit/component test runner (Vitest/RTL) or browser E2E runner (Playwright/Dusk) is installed yet.
  - CI targets PHP 8.3 / Node 22 while local runs PHP 8.4.27 / Node 26.12.0; `npm run check` in `composer ci:check` will fail unless `.ag-kit-backups/` is excluded/removed and `settings/profile.tsx` formatting is fixed when coding begins.
- **Required Strategy (Phase 01+)**:
  - Keep PHPUnit Feature tests as the primary suite (`RefreshDatabase`), adding comprehensive cross-guard isolation tests, policy/ownership tests, booking concurrency/turnaround overlap tests, payment webhook signature & idempotency tests, and settlement/refund ledger tests.
  - Require `composer ci:check` (`npm run check`, `npm run types:check`, Pint, PHPStan Level 7, PHPUnit) before merging every phase.

---

## Section 11 — Security Assessment

### 11.1 Current Security Strengths
- CSRF protection active on all `web` routes; Inertia handles `XSRF-TOKEN` automatically.
- Session cookies use `http_only: true`, `same_site: lax`, and safe JSON serialization (`'serialization' => 'json'`).
- Cache disables PHP object unserialization (`'serializable_classes' => false`).
- `AppServiceProvider` enforces `DB::prohibitDestructiveCommands(app()->isProduction())` and strong production `Password::defaults()` (min 12, mixedCase, letters, numbers, symbols, uncompromised).
- Auth rate limiters configured (`login`, `two-factor`, `passkeys`, `throttle:6,1` on password update).
- `User` uses explicit `#[Fillable]` and `#[Hidden]` attributes (`password`, `two_factor_secret`, `two_factor_recovery_codes`, `remember_token`).
- Zero known dependency CVEs (`composer audit` and `npm audit` clean).

### 11.2 Current Gaps & Marketplace Security Risks
1. **Session Hardening for Production (`config/session.php`)**: `SESSION_ENCRYPT` is `false` and `SESSION_SECURE_COOKIE` is unset (`null`). Production `.env` must enforce `SESSION_ENCRYPT=true`, `SESSION_SECURE_COOKIE=true`, `APP_DEBUG=false`.
2. **Multi-Guard Data Leakage Risk (`HandleInertiaRequests.php`)**: Currently calls `$request->user()` unconditionally; without guard-aware resolution in Phase 01, customer session data could be shared into owner/admin pages or fail to share owner/admin auth state.
3. **Guest/Auth Redirect Confusion (`bootstrap/app.php`)**: Without custom `redirectGuestsTo` and `redirectUsersTo` callbacks, unauthenticated owner/admin requests redirect to customer `/login`.
4. **Private Verification & KYC Document Exposure (`config/filesystems.php`)**: `local` disk has `'serve' => true`; KYC IDs, owner bank/tax docs, and property verification files must be stored on a private disk with explicit controller + Policy authorization (never placed on `public` disk or exposed via unauthenticated URLs).
5. **Payment Webhooks, Refunds & Settlements**:
   - Must verify webhook cryptographic signatures, enforce idempotency keys, validate currency/amount server-side against locked booking totals, and guard against race conditions.
   - Settlement bank-account changes, manual refunds, and partner penalty overrides require Admin authorization + immutable audit trail (who, when, reason, before/after).
6. **Guest & Partner PII Isolation**: Owners must only view guest booking details strictly needed for active/upcoming stays at their own verified properties; enforce Laravel Policies on every property, room, bed, booking, and payout endpoint to prevent IDOR.
7. **HTTP Security Headers & Strict Model Mode**: Add security response headers (CSP/HSTS/X-Frame-Options/X-Content-Type-Options via middleware or edge proxy) and enable `Model::shouldBeStrict(! app()->isProduction())`.

---

## Section 12 — TIJUM Domain Architecture

1. **Accommodation Categories (Phase 1)**: Seed `property_categories` with exactly `Independent Hostels`, `PG Accommodation`, and `Homestays` (`slug`, `name`, `is_active`, `sort_order`), allowing future categories (guest houses, dormitories, budget hotels, serviced apartments) via data/config without schema changes.
2. **Mandatory Food-Inclusive Invariant**:
   - Every publishable/bookable property requires an active `food_packages` configuration. Search queries, publish validation, and booking creation services must reject any property lacking an active food package.
   - Data model supports breakfast, lunch, dinner, evening snacks, veg/non-veg availability, food type, meal timings, menu info, food-service provider, and arrival-day / departure-day food rules, calculating a single transparent all-inclusive package price before payment.
3. **Booking Timing & Bed Inventory Engine**:
   - Constants/policy defaults: Standard check-in `09:00`, standard checkout `08:00` next day (`23h`), earliest early check-in `07:00` (hard lower bound enforced in validation & availability calculation).
   - Early check-in toggle & optional surcharge configurable at property/room/bed-category level and indexed for search filtering.
   - Availability checks concrete `beds` (occupied, vacant, blocked, existing reservations + cleaning/turnaround buffer + early arrival overlap) inside transactional row locks before confirmation.
4. **100% Online Payment & Settlement Ledger**:
   - No pay-at-property option in checkout state machine.
   - Funds flow: Customer Payment Intent -> Verified Gateway Capture -> Confirmed Booking -> Verified Check-In -> 48–72h Settlement Hold -> Partner Commission Deduction -> Eligible Settlement Payout.
   - **Compliance Flag**: Holding customer funds for 48–72 hours post-check-in and disbursing partner settlements requires a compliant payment-aggregator marketplace/escrow/split-settlement product (e.g., nodal/escrow flow); must not hold marketplace escrow funds in an ordinary operating bank account without legal & aggregator confirmation.
5. **Customer Protection & Relocation**:
   - Incident workflow: Booking flagged as property unable to honour -> support contacts original property -> queries comparable nearby available properties in the same city -> offers customer replacement at original price within published protection cap (debiting platform protection reserve for eligible price difference) -> or executes full refund if no suitable replacement exists.
   - Partner penalties recorded against signed partner agreement clauses with documented evidence and dispute review workflow.
6. **Central Amenities Master Catalogue**:
   - 10 categories (`room_accommodation`, `bathroom`, `food_dining`, `internet_technology`, `safety_security`, `housekeeping_laundry`, `parking_transportation`, `utilities`, `common_areas`, `accessibility_special`), supporting both `property_amenities` and `room_amenities` with status (`available_included`, `available_extra_cost`, `not_available`, `not_verified`).
7. **Geography**: `cities` table/config initialized with Hyderabad, Guntur, Vijayawada, and Visakhapatnam, supporting dynamic onboarding of new cities without code deployments.

---

## Section 13 — Recommended Folder Structure

### Backend (`app/`, `routes/`, `database/`)
```text
app/
├── Actions/
│   ├── Fortify/                  # Preserved Customer Fortify actions
│   ├── Owner/Auth/               # Owner login/register/reset actions
│   └── Admin/Auth/               # Admin login/reset actions
├── Concerns/                     # Shared validation traits
├── Console/Commands/             # Including future admin provisioning command
├── Enums/                        # PropertyCategorySlug, AmenityStatus, BookingStatus, etc.
├── Http/
│   ├── Controllers/
│   │   ├── Public/               # Search, property detail, landing
│   │   ├── Customer/             # Customer dashboard, bookings, complaints
│   │   ├── Settings/             # Existing customer settings controllers
│   │   ├── Owner/
│   │   │   ├── Auth/             # AuthenticatedSession, RegisteredOwner, PasswordReset
│   │   │   └── ...               # Dashboard, Properties, Rooms, Beds, Meals, Settlements
│   │   └── Admin/
│   │       ├── Auth/             # AuthenticatedSession, PasswordReset (no register)
│   │       └── ...               # Dashboard, Approvals, Verifications, Protection, Settlements
│   ├── Middleware/
│   │   ├── HandleAppearance.php
│   │   ├── HandleInertiaRequests.php   # Guard-aware auth sharing
│   │   └── EnsureOwnerActive.php / EnsureAdminActive.php
│   └── Requests/
│       ├── Customer/
│       ├── Owner/
│       ├── Admin/
│       └── Settings/
├── Models/                       # User, Owner, Admin, City, Property, Room, Bed, FoodPackage, Booking, etc.
├── Notifications/                # Guard-aware notifications
├── Policies/                     # PropertyPolicy, RoomPolicy, BookingPolicy, ComplaintPolicy, etc.
└── Services/                     # Inventory/, Booking/, Payment/, Settlement/, Protection/

routes/
├── web.php                       # Public routes + includes portal route files
├── settings.php                  # Existing customer settings
├── owner.php                     # /owner/* (name: owner.*)
├── admin.php                     # /admin/* (name: admin.*)
└── api.php                       # Future /api/v1/* mobile & webhook endpoints
```

### Frontend (`resources/js/`)
```text
resources/js/
├── layouts/
│   ├── app-layout.tsx            # Customer/shared app shell (existing)
│   ├── auth-layout.tsx           # Customer auth shell (existing)
│   ├── public-layout.tsx         # Future public marketplace layout
│   ├── owner-layout.tsx          # Future Owner portal shell
│   ├── admin-layout.tsx          # Future Admin dashboard shell
│   └── settings/layout.tsx
├── pages/
│   ├── welcome.tsx / dashboard.tsx
│   ├── auth/ & settings/         # Existing customer auth & settings
│   ├── public/                   # Search, property listing/details
│   ├── customer/                 # Bookings, complaints, protection
│   ├── owner/                    # auth/* + dashboard, properties, inventory, meals, settlements
│   └── admin/                    # auth/* + dashboard, approvals, verification, relocations, finance
├── components/
│   ├── ui/                       # Shared Radix + Tailwind v4 design system
│   ├── shared/                   # Reusable marketplace cards, badges, price breakdown
│   ├── owner/                    # Owner-portal-only components
│   └── admin/                    # Admin-portal-only components
├── hooks/                        # Portal/feature hooks
└── types/                        # auth.ts (User, Owner, Admin types), booking.ts, property.ts
```

---

## Section 14 — Risks and Dependencies

### Technical Risks
1. **No Git History**: Mistakes or destructive commands cannot currently be rolled back via Git.
2. **Wayfinder + `@inertiajs/vite` Coupling**: Disabling Fortify routes prunes `@/routes/*` and `@/actions/*` TS modules, breaking `tsc` and `vp build` if dormant TSX pages still import them.
3. **Single-Cookie Multi-Guard Invalidation**: Logging out of one guard with `$request->session()->invalidate()` invalidates other guards sharing the same browser session cookie.
4. **Inertia Shared Auth Leakage**: Leaving `$request->user()` in `HandleInertiaRequests` causes wrong-guard or null auth props on Owner/Admin portals.
5. **SQLite Test vs MySQL Production Drift**: MySQL row locks (`FOR UPDATE`), partial/JSON indexes, and strict SQL modes behave differently from SQLite `:memory:`.
6. **CI vs Local Runtime & Formatter Mismatch**: CI workflow uses PHP 8.3 & Node 22 while local uses PHP 8.4.27 & Node 26.12.0; `.ag-kit-backups/` and `settings/profile.tsx` currently fail `npm run check`.

### Business & Legal Dependencies
1. **Payment Aggregator Escrow/Marketplace Compliance**: Required before implementing 48–72h post-check-in holds and split settlements.
2. **Published Customer Protection Limit & SLA Terms**: Needed to parameterize replacement price-difference caps and reserve accounting.
3. **Partner Agreement Penalty & Dispute Rules**: Needed before enforcing automated or admin-triggered partner deductions.
4. **Tax / GST & Invoicing Structure**: Commission invoicing vs customer accommodation invoicing rules impact financial schema columns.

---

## Section 15 — Phase 01 Implementation Plan

**Goal of Phase 01:** Establish Version Control + Complete 3-Guard Authentication Isolation (`web`, `owner`, `admin`) + Portal Layouts/Shells + Multi-Guard Verification Suite (before building Property/Booking domain tables in later phases).

1. **Step 1 — Repository & Tooling Baseline**
   - Initialize Git (`git init`) and commit the clean starter-kit baseline.
   - Decide on `chisel.php` / `InstallFeaturesCommand` retention vs cleanup and align `vite.config.ts` / `.gitignore` so `npm run check` (`composer ci:check`) passes cleanly.
2. **Step 2 — Database Migrations for `owners` & `admins`**
   - Create `create_owners_table` (`id`, `name`, `email` unique, `phone` nullable/unique per decision, `email_verified_at`, `password`, `status`/`is_active`, `remember_token`, `timestamps`, optional `softDeletes`).
   - Create `create_admins_table` (`id`, `name`, `email` unique, `password`, `role`/`is_super_admin`, `is_active`, `remember_token`, `timestamps`).
   - Create `owner_password_reset_tokens` and `admin_password_reset_tokens` tables.
3. **Step 3 — Models & Factories**
   - Create `App\Models\Owner` and `App\Models\Admin` extending `Authenticatable` (with `Notifiable`, `HasFactory`, `#[Fillable]`, `#[Hidden]`, `casts()`, and guard-specific password reset notification URLs).
   - Create `OwnerFactory` and `AdminFactory`.
4. **Step 4 — Multi-Guard `config/auth.php` Configuration**
   - Register `owner` and `admin` guards, `owners` and `admins` Eloquent providers, and `owners` and `admins` password brokers.
   - Preserve `web` guard and `users` provider/broker untouched for Fortify customer auth.
5. **Step 5 — Guard-Aware Redirects & Inertia Prop Isolation**
   - Configure `$middleware->redirectGuestsTo(...)` and `$middleware->redirectUsersTo(...)` in `bootstrap/app.php` so each portal redirects to its own login and dashboard routes.
   - Update `HandleInertiaRequests` (or introduce portal-scoped sharing) so `/owner/*` shares `auth.owner`, `/admin/*` shares `auth.admin`, and customer routes share `auth.user` strictly.
   - Update `resources/js/types/auth.ts` and `global.d.ts` with typed `Owner` and `Admin` props.
6. **Step 6 — Owner & Admin Auth Controllers, FormRequests, Rate Limiters & Routes**
   - Implement `Owner\Auth` controllers (login, logout, register/onboarding, forgot/reset password) using `Auth::guard('owner')` and `Password::broker('owners')` + dedicated rate limiters.
   - Implement `Admin\Auth` controllers (login, logout, forgot/reset password; **no registration route**) using `Auth::guard('admin')` and `Password::broker('admins')` + Artisan command `app:create-admin` (or seeder for local dev).
   - Wire `routes/owner.php` and `routes/admin.php` into `bootstrap/app.php` (or `routes/web.php`) and regenerate Wayfinder TS routes.
7. **Step 7 — Separate Portal React Layouts & Auth Pages**
   - Create `OwnerLayout`, `AdminLayout`, and initial auth/dashboard Inertia pages under `resources/js/pages/owner/` and `resources/js/pages/admin/`.
   - Update `resources/js/app.tsx` layout resolver for `owner/*` and `admin/*`.
8. **Step 8 — Comprehensive Phase 01 Verification**
   - Write PHPUnit Feature tests covering Owner auth, Admin auth, Customer auth preservation, password resets per broker, rate limiting, and full cross-guard negative access tests.
   - Run full `composer ci:check` (`npm run check`, `npm run types:check`, Pint, PHPStan Level 7, PHPUnit) + `npm run build`.

---

## Section 16 — Phase 01 Acceptance Criteria

Phase 01 is complete ONLY when all of the following are verified via passing automated checks:

1. **Customer Auth Preserved**: All existing customer auth & settings tests continue to pass (`AuthenticationTest`, `RegistrationTest`, `PasswordResetTest`, `PasswordConfirmationTest`, `ProfileUpdateTest`, `SecurityTest`).
2. **Owner Auth Operational**: Owners can register (or onboard), log in, hit `/owner/dashboard`, request/complete password resets via `owners` broker, and log out via `owner` guard.
3. **Admin Auth Operational**: Admins provisioned via command/seeder can log in, hit `/admin/dashboard`, request/complete password resets via `admins` broker, and log out via `admin` guard; no public admin registration endpoint exists (`404`).
4. **Cross-Guard Isolation Verified by Automated Tests**:
   - Unauthenticated requests to `/dashboard`, `/owner/dashboard`, and `/admin/dashboard` redirect respectively to `login`, `owner.login`, and `admin.login`.
   - Customer (`web`) cannot access `/owner/*` or `/admin/*` protected routes.
   - Owner (`owner`) cannot access customer `/dashboard`/`/settings/*` or `/admin/*` protected routes.
   - Admin (`admin`) cannot access customer `/dashboard`/`/settings/*` or `/owner/*` protected routes.
   - Authenticated `guest:owner` redirects to `owner.dashboard`; `guest:admin` redirects to `admin.dashboard`; `guest:web` redirects to `dashboard`.
5. **Inertia Prop Isolation Verified**: Inertia responses on `/owner/*` and `/admin/*` never expose `auth.user` (Customer), and customer responses never expose `auth.owner` or `auth.admin`.
6. **Quality Gates Green**:
   - `php artisan test` passes with zero failures.
   - `composer types:check` (`phpstan analyse` Level 7) passes with 0 errors.
   - `composer lint:check` (`pint --parallel --test`) passes.
   - `npm run types:check` (`tsc --noEmit`) passes.
   - `npx vp lint resources/js` passes with 0 warnings/errors and `npm run build` succeeds.

---

## Section 17 — Unresolved Decisions

The following decisions are intentionally left open for product/architecture confirmation before Phase 01+ implementation:

1. **Customer Auth Features (Fortify)**: Should email verification, TOTP 2FA, and passkeys remain enabled for Customers (`users`), be temporarily disabled in `config/fortify.php` (with `MustVerifyEmail` & frontend bundling handled cleanly), or be stripped via `install:features`?
2. **Git & Starter-Kit Installer (`chisel.php`)**: Should Git be initialized before Phase 01, and should `chisel.php` / `InstallFeaturesCommand` be removed once starter-kit feature choices are finalized?
3. **Multi-Guard Browser Session Strategy**: Should portals share one domain (`tijum.in`, `tijum.in/owner`, `tijum.in/admin`) with single-session invalidation on logout (or guard-scoped logout preserving other active portal sessions), or run on separate subdomains with isolated session cookies?
4. **Owner Onboarding & Verification Timing**: Can property owners self-register and log into the Owner Portal immediately as `pending_verification`, or are owner accounts created only upon onboarding approval? Should owners also verify email/phone (OTP) in Phase 01?
5. **Admin Security Baseline**: Should Admin accounts require TOTP 2FA or IP/allowlist protections from Phase 01, and what initial admin roles are needed (e.g., Super Admin, Operations/Verification, Finance/Settlements, Customer Support)?
6. **Primary Key Strategy**: Retain standard auto-incrementing `bigint unsigned` IDs (matching starter kit) with public slugs/reference codes (e.g. `TIJ-XXXXXX`), or switch domain tables to ULIDs/UUIDs?
7. **Mobile API Authentication Strategy**: Confirm **Laravel Sanctum** token abilities for the future customer mobile app and owner management app (and whether `users` and `owners` will issue personal access tokens with distinct token guards/abilities).
8. **Production Database & CI Alignment**: Confirm whether production will run **MySQL 8.0+** (matching local `.env`) or PostgreSQL, and align `.github/workflows/tests.yml` PHP/Node versions (`8.4` / `22+` vs `8.3` / `22`) and MySQL test coverage.
9. **Payment Aggregator & Escrow Compliance**: Select the Indian payment aggregator supporting compliant marketplace/escrow/split-settlement accounts and confirm legally permitted hold windows for the 48–72h post-check-in settlement rule.
10. **Customer Protection & Penalty Parameters**: Finalize the published customer protection price-difference cap, refund rules (including arrival/departure meal pro-ration), and signed partner violation penalty schedule.
