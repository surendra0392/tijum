<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LedgerEntryCategory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class FinancialLedgerEntry extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'entry_reference',
        'journal_reference',
        'entry_category',
        'debit_minor',
        'credit_minor',
        'currency',
        'entity_type',
        'entity_id',
        'owner_id',
        'notes',
        'posted_at',
    ];

    /**
     * @return array{
     *     entry_category: 'App\\Enums\\LedgerEntryCategory',
     *     debit_minor: 'integer',
     *     credit_minor: 'integer',
     *     posted_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'entry_category' => LedgerEntryCategory::class,
            'debit_minor' => 'integer',
            'credit_minor' => 'integer',
            'posted_at' => 'datetime',
        ];
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function entity(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * @return BelongsTo<Owner, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }
}
