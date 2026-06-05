<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTrackingLinkRequest;
use App\Http\Requests\Admin\UpdateTrackingLinkRequest;
use App\Http\Resources\TrackingLinkResource;
use App\Models\TrackingLink;
use App\Services\Analytics\TrackingLinkService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/**
 * 計測リンク（アフィリエイト / 店舗別LINE導線 / SNSキャンペーン）の管理。
 * 発行すると `https://<host>/r/{code}` をコピーして SNS 等に貼れる。
 */
class TrackingLinkController extends Controller
{
    public function __construct(
        private readonly TrackingLinkService $service
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $links = TrackingLink::query()
            ->with(['store:id,name', 'article:id,title'])
            ->withCount('clicks')
            ->when($request->query('target_type'), fn ($q, $t) => $q->where('target_type', $t))
            ->orderByDesc('created_at')
            ->get();

        return TrackingLinkResource::collection($links);
    }

    public function store(StoreTrackingLinkRequest $request): TrackingLinkResource
    {
        $link = $this->service->issue(
            $request->validated(),
            $request->user()?->id,
        );

        $link->loadCount('clicks')->load(['store:id,name', 'article:id,title']);

        return new TrackingLinkResource($link);
    }

    public function update(UpdateTrackingLinkRequest $request, TrackingLink $trackingLink): TrackingLinkResource
    {
        $trackingLink->update($request->validated());
        $trackingLink->loadCount('clicks')->load(['store:id,name', 'article:id,title']);

        return new TrackingLinkResource($trackingLink);
    }

    public function destroy(TrackingLink $trackingLink): Response
    {
        $trackingLink->delete();

        return response()->noContent();
    }
}
