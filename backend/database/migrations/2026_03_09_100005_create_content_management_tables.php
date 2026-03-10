<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pickup_shops', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_pr')->default(false);
            $table->boolean('visible')->default(true);
            $table->timestamps();
        });

        Schema::create('consultations', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->text('question');
            $table->string('tag', 100);
            $table->integer('count')->default(0);
            $table->boolean('visible')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('site_settings', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('key', 255)->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
        Schema::dropIfExists('consultations');
        Schema::dropIfExists('pickup_shops');
    }
};
