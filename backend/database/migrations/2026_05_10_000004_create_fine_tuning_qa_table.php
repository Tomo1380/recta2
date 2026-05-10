<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fine_tuning_qa', function (Blueprint $table) {
            $table->id();
            $table->string('category')->nullable();
            $table->text('question');
            $table->text('answer');
            $table->jsonb('tags')->nullable();
            $table->string('source')->nullable();
            $table->string('status', 16)->default('active'); // active / draft / archived
            $table->timestamps();

            $table->index('status');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fine_tuning_qa');
    }
};
