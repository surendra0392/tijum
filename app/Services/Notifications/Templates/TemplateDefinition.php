<?php

declare(strict_types=1);

namespace App\Services\Notifications\Templates;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;

class TemplateDefinition
{
    /**
     * @param  list<string>  $approvedVariables
     * @param  array<string, string>  $optionalVariables  Map of optional variable names to explicit fallback strings
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
        public readonly array $optionalVariables = [],
    ) {}

    /**
     * Validate all required variables before rendering and produce rendered notification parts.
     *
     * Missing required variables are recorded as sanitized validation errors rather than
     * silently removed from the rendered text.
     *
     * @param  array<string, mixed>  $variables
     * @return array{
     *     title: string,
     *     body: string,
     *     subject: ?string,
     *     safe_variables: array<string, string>,
     *     validation_errors: list<string>,
     *     missing_variables: list<string>,
     *     is_valid: bool,
     * }
     */
    public function render(array $variables): array
    {
        $normalized = $this->applyVariableAliases($variables);

        $safeVariables = [];
        $replace = [];
        $validationErrors = [];
        $missingVariables = [];

        foreach ($this->approvedVariables as $var) {
            $val = $normalized[$var] ?? null;
            $clean = '';

            if (is_scalar($val)) {
                $clean = trim(strip_tags((string) $val));
            }

            if ($clean !== '') {
                $safeVariables[$var] = $clean;
                $replace['{'.$var.'}'] = $clean;

                continue;
            }

            if (array_key_exists($var, $this->optionalVariables)) {
                $fallback = trim(strip_tags((string) $this->optionalVariables[$var]));
                $safeVariables[$var] = $fallback;
                $replace['{'.$var.'}'] = $fallback;

                continue;
            }

            $safeVariables[$var] = '';
            $missingVariables[] = $var;
            $validationErrors[] = "Missing required template variable '{$var}' for template '{$this->code}'.";
        }

        $renderedTitle = trim(strtr($this->title, $replace));
        $renderedBody = trim(strtr($this->bodyTemplate, $replace));
        $renderedSubject = $this->subjectTemplate !== null
            ? trim(strtr($this->subjectTemplate, $replace))
            : null;

        return [
            'title' => $renderedTitle,
            'body' => $renderedBody,
            'subject' => $renderedSubject,
            'safe_variables' => $safeVariables,
            'validation_errors' => $validationErrors,
            'missing_variables' => $missingVariables,
            'is_valid' => $validationErrors === [],
        ];
    }

    /**
     * Normalize legacy variable aliases to canonical schema keys while preserving semantic boundaries.
     *
     * @param  array<string, mixed>  $variables
     * @return array<string, mixed>
     */
    private function applyVariableAliases(array $variables): array
    {
        $isRefundEvent = str_contains($this->eventType, 'refund');

        $aliases = [
            'booking_reference' => ['reservation_code'],
            'owner_name' => ['partner_name'],
            'checkout_date' => ['check_out_date'],
            'amount' => $isRefundEvent ? ['refund_amount'] : ['total_price'],
        ];

        foreach ($aliases as $canonical => $fallbacks) {
            if (! isset($variables[$canonical]) || $variables[$canonical] === '') {
                foreach ($fallbacks as $fallback) {
                    if (isset($variables[$fallback]) && $variables[$fallback] !== '') {
                        $variables[$canonical] = $variables[$fallback];
                        break;
                    }
                }
            }
        }

        return $variables;
    }
}
