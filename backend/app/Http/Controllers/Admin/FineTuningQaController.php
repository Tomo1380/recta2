<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreFineTuningQaRequest;
use App\Http\Requests\Admin\UpdateFineTuningQaRequest;
use App\Models\FineTuningQa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FineTuningQaController extends Controller
{
    /**
     * GET /admin/fine-tuning/qa
     *  ?category=&q=&status=&page=&per_page=
     */
    public function index(Request $request): JsonResponse
    {
        $query = FineTuningQa::query();

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        if ($status = $request->input('status')) {
            if (in_array($status, ['active', 'draft', 'archived'], true)) {
                $query->where('status', $status);
            }
        }

        if ($q = $request->input('q')) {
            $query->where(function ($w) use ($q) {
                $w->where('question', 'ilike', "%{$q}%")
                  ->orWhere('answer', 'ilike', "%{$q}%");
            });
        }

        $perPage = (int) $request->input('per_page', 50);
        $perPage = max(1, min($perPage, 200));

        // Sort options:
        //   id_asc       投入順（デフォルト・カテゴリブロックがまとまる）
        //   id_desc      新しく追加した行から
        //   updated_desc 最近編集した順
        //   question_asc 質問の五十音順
        $sort = (string) $request->input('sort', 'id_asc');
        switch ($sort) {
            case 'id_desc':
                $query->orderByDesc('id');
                break;
            case 'updated_desc':
                $query->orderByDesc('updated_at');
                break;
            case 'question_asc':
                $query->orderBy('question');
                break;
            case 'id_asc':
            default:
                $query->orderBy('id');
        }

        $items = $query->paginate($perPage);

        // Status counts (across the whole table, not just current filters)
        $statusCounts = FineTuningQa::selectRaw('status, COUNT(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status');

        // Distinct categories for filter dropdown
        $categories = FineTuningQa::query()
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->orderBy('category')
            ->pluck('category');

        return response()->json([
            'items' => $items,
            'status_counts' => [
                'active' => (int) ($statusCounts['active'] ?? 0),
                'draft' => (int) ($statusCounts['draft'] ?? 0),
                'archived' => (int) ($statusCounts['archived'] ?? 0),
            ],
            'categories' => $categories,
        ]);
    }

    public function show(FineTuningQa $qa): JsonResponse
    {
        return response()->json($qa);
    }

    public function store(StoreFineTuningQaRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['source'] = $data['source'] ?? 'manual';
        $data['status'] = $data['status'] ?? FineTuningQa::STATUS_ACTIVE;

        $qa = FineTuningQa::create($data);

        return response()->json($qa, 201);
    }

    public function update(UpdateFineTuningQaRequest $request, FineTuningQa $qa): JsonResponse
    {
        $qa->update($request->validated());

        return response()->json($qa->fresh());
    }

    /**
     * Soft-delete: set status=archived rather than removing the row.
     */
    public function destroy(FineTuningQa $qa): JsonResponse
    {
        $qa->update(['status' => FineTuningQa::STATUS_ARCHIVED]);
        return response()->json(['message' => 'archived']);
    }

    /**
     * Stream all active Q&A as ChatML JSONL for OpenAI fine-tuning upload.
     * GET /admin/fine-tuning/qa/export-jsonl
     */
    public function exportJsonl(Request $request): StreamedResponse
    {
        $statusFilter = $request->input('status', 'active');
        if (!in_array($statusFilter, ['active', 'draft', 'archived', 'all'], true)) {
            $statusFilter = 'active';
        }

        $systemPrompt = app(FineTuningController::class)
            ->buildPublicTrainingSystemPrompt();

        $timestamp = now()->format('Ymd-His');
        $filename = "questions-export-{$timestamp}.jsonl";

        $headers = [
            'Content-Type' => 'application/x-ndjson; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'no-store',
        ];

        return response()->stream(function () use ($statusFilter, $systemPrompt) {
            $query = FineTuningQa::query()->orderBy('id');
            if ($statusFilter !== 'all') {
                $query->where('status', $statusFilter);
            }

            $query->chunkById(200, function ($rows) use ($systemPrompt) {
                foreach ($rows as $row) {
                    $payload = [
                        'messages' => [
                            ['role' => 'system', 'content' => $systemPrompt],
                            ['role' => 'user', 'content' => $row->question],
                            ['role' => 'assistant', 'content' => $row->answer],
                        ],
                    ];
                    echo json_encode($payload, JSON_UNESCAPED_UNICODE) . "\n";
                    @ob_flush();
                    @flush();
                }
            });
        }, 200, $headers);
    }

}
