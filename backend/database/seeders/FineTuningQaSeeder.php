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

        // Map of existing question => { id, answer } for this source.
        // Used to skip duplicates and to upgrade old (marker-less) answers
        // when the regenerated JSONL contains [STORE:ID] markers.
        $existing = FineTuningQa::where('source', $source)
            ->select('id', 'question', 'answer')
            ->get()
            ->keyBy('question')
            ->map(fn ($row) => ['id' => $row->id, 'answer' => $row->answer])
            ->all();

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
                // Question already exists. Update only when the new answer
                // contains a [STORE:ID] marker that the existing one lacks —
                // this lets us re-run the seeder to upgrade the answer text
                // (e.g. when generate.mjs regenerates with marker support)
                // without disturbing rows that were hand-edited via the
                // admin UI.
                $existingId = $existing[$question]['id'];
                $oldAnswer = $existing[$question]['answer'] ?? '';
                $hasNewMarker = str_contains($answer, '[STORE:');
                $hasOldMarker = str_contains((string) $oldAnswer, '[STORE:');
                if ($hasNewMarker && !$hasOldMarker) {
                    DB::table('fine_tuning_qa')
                        ->where('id', $existingId)
                        ->update(['answer' => $answer, 'updated_at' => $now]);
                }
                $skipped++;
                continue;
            }
            $existing[$question] = ['id' => 0, 'answer' => $answer]; // dummy

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
