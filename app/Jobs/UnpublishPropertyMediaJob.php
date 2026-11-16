<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\PropertyMedia;
use App\Services\PropertyMediaProcessor;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class UnpublishPropertyMediaJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /**
     * @var list<int>
     */
    public array $backoff = [10, 30, 60];

    public function __construct(
        public readonly int $mediaId,
    ) {}

    public function handle(PropertyMediaProcessor $processor): void
    {
        $media = PropertyMedia::query()->find($this->mediaId);

        if (! $media instanceof PropertyMedia) {
            return;
        }

        $processor->unpublishFromPublicDisk($media);
    }
}
