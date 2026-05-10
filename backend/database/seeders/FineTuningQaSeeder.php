<?php

namespace Database\Seeders;

use App\Models\FineTuningQa;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FineTuningQaSeeder extends Seeder
{
    /**
     * Load Q&A pairs from
     *   /home/isayama/recta2/scripts/fine-tuning/dataset/questions-1000.jsonl
     * into the fine_tuning_qa table. Idempotent: skips rows whose
     * (question, source) already exist.
     */
    public function run(): void
    {
        $candidates = [
            // Primary location: copy lives inside backend so the laravel
            // container can see it (the docker volume only mounts ./backend).
            database_path('seeders/data/questions-1000.jsonl'),
            // Repository layout fallbacks for non-docker / dev runs.
            base_path('../scripts/fine-tuning/dataset/questions-1000.jsonl'),
            base_path('scripts/fine-tuning/dataset/questions-1000.jsonl'),
            '/home/isayama/recta2/scripts/fine-tuning/dataset/questions-1000.jsonl',
        ];

        $path = null;
        foreach ($candidates as $p) {
            if ($p && is_file($p)) {
                $path = $p;
                break;
            }
        }

        if (!$path) {
            $this->command?->warn('FineTuningQaSeeder: questions-1000.jsonl not found, skipping');
            return;
        }

        $source = 'seed-1000';

        // Build a set of existing questions for this source so we don't dup.
        $existing = FineTuningQa::where('source', $source)
            ->pluck('question')
            ->flip();

        $fp = fopen($path, 'r');
        if (!$fp) {
            $this->command?->warn("FineTuningQaSeeder: could not open {$path}");
            return;
        }

        $now = now();
        $batch = [];
        $batchSize = 200;
        $inserted = 0;
        $skipped = 0;

        while (($line = fgets($fp)) !== false) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }

            $row = json_decode($line, true);
            if (!is_array($row) || empty($row['messages']) || !is_array($row['messages'])) {
                continue;
            }

            $question = null;
            $answer = null;
            foreach ($row['messages'] as $msg) {
                if (!is_array($msg)) continue;
                $role = $msg['role'] ?? null;
                $content = $msg['content'] ?? null;
                if ($role === 'user' && $question === null) {
                    $question = $content;
                } elseif ($role === 'assistant' && $answer === null) {
                    $answer = $content;
                }
            }

            if (!$question || !$answer) {
                continue;
            }

            if (isset($existing[$question])) {
                $skipped++;
                continue;
            }
            $existing[$question] = true;

            $batch[] = [
                'category' => null,
                'question' => $question,
                'answer' => $answer,
                'tags' => null,
                'source' => $source,
                'status' => FineTuningQa::STATUS_ACTIVE,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($batch) >= $batchSize) {
                DB::table('fine_tuning_qa')->insert($batch);
                $inserted += count($batch);
                $batch = [];
            }
        }
        fclose($fp);

        if (!empty($batch)) {
            DB::table('fine_tuning_qa')->insert($batch);
            $inserted += count($batch);
        }

        $this->command?->info("FineTuningQaSeeder: inserted {$inserted}, skipped {$skipped}");
    }
}
