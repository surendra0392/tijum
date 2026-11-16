<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('reservation_room_allocations', function (Blueprint $table): void {
            $table->id();

            $table->foreignId('reservation_id')
                ->constrained('reservations', indexName: 'rra_reservation_id_fk')
                ->restrictOnDelete();
            $table->foreignId('property_room_id')
                ->constrained('property_rooms', indexName: 'rra_property_room_id_fk')
                ->restrictOnDelete();

            $table->unsignedSmallInteger('allocated_quantity');

            $table->timestamps();

            $table->unique(['reservation_id', 'property_room_id'], 'rra_reservation_room_unique');
            $table->index(['property_room_id'], 'rra_property_room_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservation_room_allocations');
    }
};
