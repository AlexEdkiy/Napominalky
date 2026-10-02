<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class SearchResultResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'type' => $this->type,
            'uuid' => $this->uuid,
            'title' => $this->title,
            'excerpt' => $this->excerpt((string) $this->content, $request->string('q')->toString()),
            'list_uuid' => $this->list_uuid,
            'list_title' => $this->list_title,
            'list_type' => $this->list_type,
            'is_completed' => (bool) $this->is_completed,
            'is_archived' => (bool) $this->is_archived,
            'updated_at' => CarbonImmutable::parse($this->updated_at)->toISOString(),
        ];
    }

    private function excerpt(string $text, string $query): string
    {
        // Tags are stored as JSON text; display them as readable text when applicable.
        $tags = json_decode($text, true);
        if (is_array($tags) && array_is_list($tags) && count(array_filter($tags, 'is_string')) === count($tags)) {
            $text = implode(', ', $tags);
        }
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
        $position = mb_stripos($text, $query);
        $start = $position === false ? 0 : max(0, $position - 60);
        $excerpt = mb_substr($text, $start, 236);

        return ($start > 0 ? '…' : '').$excerpt.(mb_strlen($text) > $start + 236 ? '…' : '');
    }
}
