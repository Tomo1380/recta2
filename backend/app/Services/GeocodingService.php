<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin wrapper around the Google Geocoding API. Called from the admin shop edit
 * page when a curator presses 「住所から緯度経度を取得」, so the editor can verify
 * the result on the map preview before saving.
 *
 * We deliberately do NOT trigger geocoding on every save() — addresses change
 * rarely and silent auto-geocoding makes typos invisible. Manual + preview is
 * the safer contract.
 *
 * Env: GOOGLE_MAPS_SERVER_KEY (IP-restricted to the Laravel host).
 */
class GeocodingService
{
    private const ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

    /**
     * @return array{lat: float, lng: float, formatted_address: string}|null
     */
    public function geocode(string $address): ?array
    {
        $key = config('services.google_maps.server_key');
        if (!$key) {
            Log::warning('GOOGLE_MAPS_SERVER_KEY not configured; geocoding skipped.');
            return null;
        }

        $response = Http::timeout(5)->get(self::ENDPOINT, [
            'address' => $address,
            'key' => $key,
            'language' => 'ja',
            'region' => 'jp',
        ]);

        if (!$response->successful()) {
            Log::warning('Geocoding HTTP error', ['status' => $response->status(), 'address' => $address]);
            return null;
        }

        $data = $response->json();
        $status = $data['status'] ?? null;
        if ($status !== 'OK' || empty($data['results'])) {
            Log::info('Geocoding non-OK', ['status' => $status, 'address' => $address]);
            return null;
        }

        $first = $data['results'][0];
        $loc = $first['geometry']['location'] ?? null;
        if (!$loc) {
            return null;
        }

        return [
            'lat' => (float) $loc['lat'],
            'lng' => (float) $loc['lng'],
            'formatted_address' => $first['formatted_address'] ?? $address,
        ];
    }
}
