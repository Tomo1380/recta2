<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('line_friends', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('line_user_id')->index();
            $table->string('display_name')->nullable();
            $table->string('picture_url')->nullable();
            $table->timestamp('followed_at')->nullable();
            $table->timestamp('unfollowed_at')->nullable();
            $table->boolean('is_following')->default(true);
            $table->timestamps();

            $table->unique('line_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('line_friends');
    }
};
