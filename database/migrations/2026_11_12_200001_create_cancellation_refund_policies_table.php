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
        Schema::create('cancellation_refund_policies', function (Blueprint $table): void {
            $table->id();
            $table->string('version', 32)->unique();
            $table->string('name', 255);
            $table->timestamp('effective_from');
            $table->text('summary');
            $table->text('customer_explanation');
            $table->json('cancellation_terms');
            $table->boolean('is_published')->default(true);
            $table->foreignId('published_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamps();

            $table->index(['is_published', 'effective_from']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cancellation_refund_policies');
    }
};
