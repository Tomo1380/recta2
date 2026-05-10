<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            // The "minna no soudan" feed on the top page renders question + answer
            // accordion, so we need the answer text alongside each consultation.
            $table->text('answer')->nullable()->after('question');
        });
    }

    public function down(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->dropColumn('answer');
        });
    }
};
