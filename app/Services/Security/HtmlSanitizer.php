<?php

declare(strict_types=1);

namespace App\Services\Security;

use DOMDocument;
use DOMElement;
use DOMNode;
use InvalidArgumentException;

class HtmlSanitizer
{
    /** @var list<string> */
    private const BASE_ALLOWED_TAGS = [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr',
        'a', 'div', 'span',
    ];

    /** @var list<string> */
    private const EXTENDED_ALLOWED_TAGS = [
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'img',
    ];

    /** @var list<string> */
    private const DROP_SUBTREE_TAGS = [
        'script', 'style', 'iframe', 'object', 'embed', 'applet',
        'svg', 'math', 'form', 'input', 'button', 'textarea', 'select',
        'option', 'meta', 'base', 'link',
    ];

    /** @var array<string, list<string>> */
    private const ALLOWED_ATTRIBUTES = [
        'a' => ['href', 'title', 'target', 'rel', 'class'],
        'img' => ['src', 'alt', 'title', 'width', 'height', 'loading', 'class'],
        'th' => ['colspan', 'rowspan', 'class'],
        'td' => ['colspan', 'rowspan', 'class'],
        '*' => ['class'],
    ];

    /**
     * Sanitize untrusted/CMS HTML using a strict DOM element and attribute allowlist.
     */
    public function sanitizeRichHtml(string $html, bool $allowImagesAndTables = true): string
    {
        $trimmed = trim($html);
        if ($trimmed === '') {
            return '';
        }

        $previousUseErrors = libxml_use_internal_errors(true);

        $dom = new DOMDocument('1.0', 'UTF-8');
        $wrapped = '<?xml encoding="utf-8" ?><div id="tijum-sanitizer-root">'.$trimmed.'</div>';
        $dom->loadHTML($wrapped, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET);

        libxml_clear_errors();
        libxml_use_internal_errors($previousUseErrors);

        $root = $dom->getElementById('tijum-sanitizer-root');
        if (! $root instanceof DOMElement) {
            return strip_tags($trimmed);
        }

        $allowedTags = $allowImagesAndTables
            ? array_merge(self::BASE_ALLOWED_TAGS, self::EXTENDED_ALLOWED_TAGS)
            : self::BASE_ALLOWED_TAGS;

        $this->sanitizeChildren($root, $dom, $allowedTags);

        $result = '';
        foreach ($root->childNodes as $child) {
            $result .= (string) $dom->saveHTML($child);
        }

        return trim($result);
    }

    /**
     * Sanitize URLs for links, CTAs, and media sources, rejecting script/data schemes.
     */
    public function sanitizeUrl(string $url): string
    {
        $decoded = html_entity_decode($url, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $cleaned = preg_replace('/[\x00-\x20\x7F]+/', '', trim($decoded)) ?? '';

        if ($cleaned === '') {
            return '#';
        }

        if (str_starts_with($cleaned, '/') && ! str_starts_with($cleaned, '//')) {
            return trim($url);
        }

        if (str_starts_with($cleaned, '#')) {
            return trim($url);
        }

        $scheme = strtolower((string) parse_url($cleaned, PHP_URL_SCHEME));
        if (in_array($scheme, ['http', 'https', 'mailto', 'tel'], true)) {
            return trim($url);
        }

        return '#';
    }

    /**
     * Validate uploaded SVG markup against script, foreignObject, animation, and event-handler injection.
     */
    public function assertSafeSvg(string $svgContent): void
    {
        $decoded = html_entity_decode($svgContent, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $normalized = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $decoded) ?? '';

        if (! preg_match('/<svg[\s>]/i', $normalized)) {
            throw new InvalidArgumentException('Uploaded SVG file is missing a valid <svg> root element.');
        }

        $dangerousPatterns = [
            '/<(script|foreignobject|iframe|object|embed|applet|meta|base|animate|animatetransform|set|handler)\b/i',
            '/\bon[a-z]+\s*=/i',
            '/(javascript|vbscript|data\s*:\s*text\/html)\s*:/i',
        ];

        foreach ($dangerousPatterns as $pattern) {
            if (preg_match($pattern, $normalized) === 1) {
                throw new InvalidArgumentException('Uploaded SVG contains potentially unsafe executable content.');
            }
        }
    }

    /**
     * @param  list<string>  $allowedTags
     */
    private function sanitizeChildren(DOMNode $parent, DOMDocument $dom, array $allowedTags): void
    {
        $children = [];
        foreach ($parent->childNodes as $child) {
            $children[] = $child;
        }

        foreach ($children as $node) {
            if (! $node instanceof DOMElement) {
                continue;
            }

            $tag = strtolower($node->tagName);

            if (in_array($tag, self::DROP_SUBTREE_TAGS, true)) {
                $parent->removeChild($node);

                continue;
            }

            $this->sanitizeChildren($node, $dom, $allowedTags);

            if (! in_array($tag, $allowedTags, true)) {
                // Unwrap disallowed benign container tags while keeping sanitized inner content
                while ($node->firstChild !== null) {
                    $parent->insertBefore($node->firstChild, $node);
                }
                $parent->removeChild($node);

                continue;
            }

            $this->sanitizeElementAttributes($node, $tag);
        }
    }

    private function sanitizeElementAttributes(DOMElement $element, string $tag): void
    {
        $allowedForTag = array_merge(
            self::ALLOWED_ATTRIBUTES['*'],
            self::ALLOWED_ATTRIBUTES[$tag] ?? [],
        );

        $attributesToRemove = [];
        foreach ($element->attributes as $attr) {
            $attrName = strtolower($attr->nodeName);

            if (str_starts_with($attrName, 'on') || ! in_array($attrName, $allowedForTag, true)) {
                $attributesToRemove[] = $attr->nodeName;

                continue;
            }

            if ($attrName === 'href' || $attrName === 'src') {
                $safeUrl = $this->sanitizeUrl($attr->nodeValue ?? '');
                if ($safeUrl === '#' && $attrName === 'src') {
                    $attributesToRemove[] = $attr->nodeName;
                } else {
                    $element->setAttribute($attr->nodeName, $safeUrl);
                }
            }
        }

        foreach ($attributesToRemove as $attrName) {
            $element->removeAttribute($attrName);
        }

        if ($tag === 'a' && strtolower($element->getAttribute('target')) === '_blank') {
            $element->setAttribute('rel', 'noopener noreferrer');
        }
    }
}
