<?php

declare(strict_types=1);

use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyAvailabilityBlockType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_availability_blocks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            $table->string('scope', 24)->default(PropertyAvailabilityBlockScope::Property->value)->index();
            $table->foreignId('property_room_type_id')->nullable()->constrained('property_room_types')->cascadeOnDelete();
            $table->foreignId('property_room_id')->nullable()->constrained('property_rooms')->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->string('block_type', 24)->default(PropertyAvailabilityBlockType::Closure->value);
            $table->text('reason')->nullable();
            $table->string('status', 24)->default(PropertyAvailabilityBlockStatus::Active->value)->index();
            $table->foreignId('created_by_owner_id')->nullable()->constrained('owners')->nullOnDelete();
            $table->foreignId('created_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->foreignId('cancelled_by_owner_id')->nullable()->constrained('owners')->nullOnDelete();
            $table->foreignId('cancelled_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->boolean('is_admin_restriction')->default(false)->index();
            $table->timestamps();

            $table->index(['property_id', 'start_date', 'end_date'], 'pab_property_dates_idx');
            $table->index(['property_room_type_id', 'start_date', 'end_date'], 'pab_room_type_dates_idx');
            $table->index(['property_room_id', 'start_date', 'end_date'], 'pab_room_dates_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_availability_blocks');
    }
};
