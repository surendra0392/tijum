<?php

declare(strict_types=1);

namespace App\Services\Notifications\Templates;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;

class TemplateDefinition
{
    /**
     * @param  list<string>  $approvedVariables
     */
    public function __construct(
        public readonly string $code,
        public readonly string $eventType,
        public readonly NotificationChannel $channel,
        public readonly NotificationCategory $category,
        public readonly string $title,
        public readonly string $bodyTemplate,
        public readonly ?string $subjectTemplate = null,
        public readonly ?string $dltTemplateId = null,
        public readonly ?string $metaTemplateName = null,
        public readonly ?string $metaCategory = null,
        public readonly array $approvedVariables = [],
        public readonly string $version = '1.0',
        public readonly bool $isActive = true,
    ) {}

    /**
     * @param  array<string, mixed>  $variables
     * @return array{title: string, body: string, subject: ?string, safe_variables: array<string, string>}
     */
    public function render(array $variables): array
    {
        $safeVariables = [];
        foreach ($this->approvedVariables as $var) {
            $val = $variables[$var] ?? '';
            // Sanitize string
            if (is_scalar($val)) {
                $clean = strip_tags((string) $val);
                // Mask sensitive sequences if any slipped through
                $safeVariables[$var] = trim($clean);
            } else {
                $safeVariables[$var] = '';
            }
        }

        $replace = [];
        foreach ($safeVariables as $k => $v) {
            $replace['{'.$k.'}'] = $v;
        }

        $renderedTitle = strtr($this->title, $replace);
        $renderedBody = strtr($this->bodyTemplate, $replace);
        $renderedSubject = $this->subjectTemplate !== null ? strtr($this->subjectTemplate, $replace) : null;

        return [
            'title' => $renderedTitle,
            'body' => $renderedBody,
            'subject' => $renderedSubject,
            'safe_variables' => $safeVariables,
        ];
    }
}
