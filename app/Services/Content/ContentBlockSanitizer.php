<?php

declare(strict_types=1);

namespace App\Services\Content;

class ContentBlockSanitizer
{
    private const ALLOWED_TAGS = '<p><br><strong><em><b><i><u><h3><h4><h5><ul><ol><li><a><blockquote><code>';

    /**
     * @param  array<mixed>  $blocks
     * @return list<array<string, mixed>>
     */
    public function sanitizeBlocks(array $blocks): array
    {
        $sanitized = [];

        foreach ($blocks as $block) {
            if (! is_array($block) || empty($block['type'])) {
                continue;
            }

            $type = (string) $block['type'];
            $data = is_array($block['data'] ?? null) ? $block['data'] : [];

            $cleanedData = match ($type) {
                'hero' => [
                    'badge' => isset($data['badge']) ? strip_tags((string) $data['badge']) : null,
                    'title' => strip_tags((string) ($data['title'] ?? '')),
                    'subtitle' => strip_tags((string) ($data['subtitle'] ?? '')),
                    'cta_text' => isset($data['cta_text']) ? strip_tags((string) $data['cta_text']) : null,
                    'cta_url' => isset($data['cta_url']) ? $this->sanitizeUrl((string) $data['cta_url']) : null,
                    'background_image' => isset($data['background_image']) ? $this->sanitizeUrl((string) $data['background_image']) : null,
                ],
                'text' => [
                    'heading' => isset($data['heading']) ? strip_tags((string) $data['heading']) : null,
                    'body' => $this->sanitizeHtml((string) ($data['body'] ?? $data['text'] ?? $data['html'] ?? '')),
                    'text' => $this->sanitizeHtml((string) ($data['text'] ?? $data['body'] ?? $data['html'] ?? '')),
                ],
                'image_text' => [
                    'heading' => strip_tags((string) ($data['heading'] ?? '')),
                    'body' => $this->sanitizeHtml((string) ($data['body'] ?? '')),
                    'image_url' => $this->sanitizeUrl((string) ($data['image_url'] ?? '')),
                    'image_alt' => strip_tags((string) ($data['image_alt'] ?? '')),
                    'image_position' => in_array($data['image_position'] ?? 'left', ['left', 'right'], true) ? $data['image_position'] : 'left',
                    'cta_text' => isset($data['cta_text']) ? strip_tags((string) $data['cta_text']) : null,
                    'cta_url' => isset($data['cta_url']) ? $this->sanitizeUrl((string) $data['cta_url']) : null,
                ],
                'feature_grid' => [
                    'heading' => strip_tags((string) ($data['heading'] ?? '')),
                    'items' => array_map(static fn (array $item): array => [
                        'title' => strip_tags((string) ($item['title'] ?? '')),
                        'description' => strip_tags((string) ($item['description'] ?? '')),
                        'icon_key' => strip_tags((string) ($item['icon_key'] ?? 'sparkles')),
                    ], is_array($data['items'] ?? null) ? $data['items'] : []),
                ],
                'benefits' => [
                    'heading' => strip_tags((string) ($data['heading'] ?? '')),
                    'items' => array_map(static fn (array $item): array => [
                        'title' => strip_tags((string) ($item['title'] ?? '')),
                        'description' => strip_tags((string) ($item['description'] ?? '')),
                        'badge' => isset($item['badge']) ? strip_tags((string) $item['badge']) : null,
                    ], is_array($data['items'] ?? null) ? $data['items'] : []),
                ],
                'faq_accordion' => [
                    'heading' => strip_tags((string) ($data['heading'] ?? 'Frequently Asked Questions')),
                    'items' => array_map(static fn (array $item): array => [
                        'question' => strip_tags((string) ($item['question'] ?? '')),
                        'answer' => strip_tags((string) ($item['answer'] ?? '')),
                    ], is_array($data['items'] ?? null) ? $data['items'] : []),
                ],
                'cta' => [
                    'heading' => strip_tags((string) ($data['heading'] ?? '')),
                    'description' => strip_tags((string) ($data['description'] ?? '')),
                    'button_text' => strip_tags((string) ($data['button_text'] ?? 'Explore Stays')),
                    'button_url' => $this->sanitizeUrl((string) ($data['button_url'] ?? '/search')),
                    'secondary_button_text' => isset($data['secondary_button_text']) ? strip_tags((string) $data['secondary_button_text']) : null,
                    'secondary_button_url' => isset($data['secondary_button_url']) ? $this->sanitizeUrl((string) $data['secondary_button_url']) : null,
                ],
                'property_collection' => [
                    'heading' => strip_tags((string) ($data['heading'] ?? 'Featured Accommodations')),
                    'city_id' => isset($data['city_id']) ? (int) $data['city_id'] : null,
                    'limit' => isset($data['limit']) ? min(12, max(1, (int) $data['limit'])) : 6,
                    'view_all_url' => isset($data['view_all_url']) ? $this->sanitizeUrl((string) $data['view_all_url']) : '/search',
                ],
                'city_discovery' => [
                    'heading' => strip_tags((string) ($data['heading'] ?? 'Explore Food-Inclusive Stays by City')),
                    'description' => strip_tags((string) ($data['description'] ?? '')),
                ],
                default => null,
            };

            if ($cleanedData !== null) {
                $sanitized[] = [
                    'type' => $type,
                    'data' => $cleanedData,
                ];
            }
        }

        return $sanitized;
    }

    private function sanitizeHtml(string $html): string
    {
        // Strip forbidden tags
        $clean = strip_tags($html, self::ALLOWED_TAGS);

        // Remove dangerous javascript: URIs or event handlers
        return (string) preg_replace('/(javascript:|on\w+=)/i', '', $clean);
    }

    private function sanitizeUrl(string $url): string
    {
        $url = trim($url);
        if (str_starts_with($url, 'javascript:') || str_starts_with($url, 'data:')) {
            return '#';
        }

        return $url;
    }
}
