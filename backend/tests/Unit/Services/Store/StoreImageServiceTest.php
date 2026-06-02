<?php

namespace Tests\Unit\Services\Store;

use App\Models\Store;
use App\Services\Store\StoreImageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StoreImageServiceTest extends TestCase
{
    use RefreshDatabase;

    private StoreImageService $service;

    protected function setUp(): void
    {
        parent::setUp();
        // MediaStorage は config('filesystems.media_disk') / .media_prefix を読む。
        // container env_file (AWS_MEDIA_PREFIX=dev/) が残っていると URL に
        // dev/ prefix が混ざってアサート失敗する。テストでは disk を public
        // に fake し、prefix も空に上書きする。
        Config::set('filesystems.media_disk', 'public');
        Config::set('filesystems.media_prefix', '');
        Storage::fake('public');
        $this->service = new StoreImageService();
    }

    private function makeStore(array $overrides = []): Store
    {
        return Store::create(array_merge([
            'name' => 'Test Store',
            'area' => '新宿',
            'category' => 'キャバクラ',
            'publish_status' => 'published',
        ], $overrides));
    }

    public function test_upload_image_appends_url_to_images_array(): void
    {
        $store = $this->makeStore(['images' => []]);
        $file = UploadedFile::fake()->create('photo.jpg', 100, 'image/jpeg');

        $result = $this->service->uploadImage($store, $file);

        $this->assertArrayHasKey('url', $result);
        $this->assertStringContainsString('/storage/stores/', $result['url']);
        $this->assertCount(1, $result['images']);
        // フロント / StoreResource が前提とする {url, order} 形で保存される。
        $this->assertSame(['url' => $result['url'], 'order' => 0], $result['images'][0]);

        $store->refresh();
        $this->assertCount(1, $store->images);
    }

    public function test_upload_image_appends_to_existing_images(): void
    {
        $store = $this->makeStore(['images' => ['/storage/stores/existing.jpg']]);
        $file = UploadedFile::fake()->create('new.png', 100, 'image/png');

        $result = $this->service->uploadImage($store, $file);

        $this->assertCount(2, $result['images']);
        $this->assertEquals('/storage/stores/existing.jpg', $result['images'][0]);
    }

    public function test_delete_image_returns_null_for_out_of_range_index(): void
    {
        $store = $this->makeStore(['images' => ['/storage/stores/a.jpg']]);

        $this->assertNull($this->service->deleteImage($store, 99));
        $this->assertNull($this->service->deleteImage($store, -1));
    }

    public function test_delete_image_removes_by_index(): void
    {
        $store = $this->makeStore(['images' => [
            '/storage/stores/a.jpg',
            '/storage/stores/b.jpg',
            '/storage/stores/c.jpg',
        ]]);

        $result = $this->service->deleteImage($store, 1);

        $this->assertCount(2, $result['images']);
        $this->assertEquals('/storage/stores/a.jpg', $result['images'][0]);
        $this->assertEquals('/storage/stores/c.jpg', $result['images'][1]);

        $store->refresh();
        $this->assertCount(2, $store->images);
    }

    public function test_sync_videos_replaces_all_videos(): void
    {
        $store = $this->makeStore();
        $store->videos()->create(['video_url' => 'https://old.example.com/v.mp4', 'display_order' => 0]);
        $store->videos()->create(['video_url' => 'https://old2.example.com/v.mp4', 'display_order' => 1]);

        $this->service->syncVideos($store, [
            ['video_url' => 'https://new.example.com/a.mp4', 'label' => '新動画'],
        ]);

        $store->refresh()->load('videos');
        $this->assertCount(1, $store->videos);
        $this->assertEquals('https://new.example.com/a.mp4', $store->videos[0]->video_url);
        $this->assertEquals('新動画', $store->videos[0]->label);
    }

    public function test_sync_videos_assigns_sequential_display_order(): void
    {
        $store = $this->makeStore();

        $this->service->syncVideos($store, [
            ['video_url' => 'https://a.example.com/v.mp4'],
            ['video_url' => 'https://b.example.com/v.mp4'],
            ['video_url' => 'https://c.example.com/v.mp4'],
        ]);

        $store->load('videos');
        $this->assertEquals([0, 1, 2], $store->videos->pluck('display_order')->all());
    }

    public function test_sync_videos_skips_empty_video_url(): void
    {
        $store = $this->makeStore();

        $this->service->syncVideos($store, [
            ['video_url' => 'https://a.example.com/v.mp4'],
            ['video_url' => ''],
            [],
            ['video_url' => 'https://c.example.com/v.mp4'],
        ]);

        $store->load('videos');
        $this->assertCount(2, $store->videos);
    }

    public function test_sync_staff_photos_replaces_all_photos(): void
    {
        $store = $this->makeStore();
        $store->staffPhotos()->create(['image_url' => 'https://old.example.com/p.jpg', 'display_order' => 0]);

        $this->service->syncStaffPhotos($store, [
            ['image_url' => 'https://new.example.com/x.jpg', 'caption' => 'A'],
        ]);

        $store->refresh()->load('staffPhotos');
        $this->assertCount(1, $store->staffPhotos);
        $this->assertEquals('A', $store->staffPhotos[0]->caption);
    }

    public function test_bridge_legacy_video_url_rewrites_when_no_videos(): void
    {
        $request = Request::create('/test', 'POST', ['video_url' => 'https://legacy.example.com/v.mp4']);

        $this->service->bridgeLegacyVideoUrl($request);

        $this->assertEquals([
            ['video_url' => 'https://legacy.example.com/v.mp4', 'label' => '店舗紹介動画'],
        ], $request->input('videos'));
    }

    public function test_bridge_legacy_video_url_preserves_existing_videos(): void
    {
        $request = Request::create('/test', 'POST', [
            'video_url' => 'https://legacy.example.com/v.mp4',
            'videos' => [
                ['video_url' => 'https://new.example.com/a.mp4'],
            ],
        ]);

        $this->service->bridgeLegacyVideoUrl($request);

        // videos が既にあるので legacy で書き換えない
        $this->assertCount(1, $request->input('videos'));
        $this->assertEquals('https://new.example.com/a.mp4', $request->input('videos')[0]['video_url']);
    }

    public function test_bridge_legacy_does_nothing_for_empty_legacy_field(): void
    {
        $request = Request::create('/test', 'POST', ['video_url' => '']);

        $this->service->bridgeLegacyVideoUrl($request);

        $this->assertNull($request->input('videos'));
    }
}
