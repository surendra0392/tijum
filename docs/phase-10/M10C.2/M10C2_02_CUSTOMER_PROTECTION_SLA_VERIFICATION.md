# TIJUM Phase M10C.2 — Customer Protection SLA Verification Report

## 1. Regulatory & Architecture Framework

The Consumer Protection (E-Commerce) Rules, 2020 require an e-commerce entity to maintain an explicit grievance redressal mechanism with:
1. **Statutory Acknowledgement:** Acknowledging the receipt of any consumer complaint within forty-eight (48) hours.
2. **Statutory Resolution:** Redressing the grievance within thirty (30) days from the date of its receipt.

In addition to statutory deadlines, TIJUM operates an internal operational first-action SLA matrix to guarantee rapid emergency intervention during stay discrepancies:
- **Urgent Priority:** 2 hours
- **High Priority:** 4 hours
- **Medium (Standard) Priority:** 24 hours
- **Low Priority:** 48 hours

---

## 2. Model & Accessor SLA Isolation

### 2.1 The Legacy Overwrite Problem
In previous versions, `CustomerProtectionCase` contained a database column `sla_due_at`. In several operational contexts, internal staff or automated workflows set `sla_due_at` to the operational first-action deadline (e.g. 2 hours or 4 hours). 

When the model accessor `getResolutionDueAtAttribute()` evaluated:
```php
if ($this->sla_due_at !== null) {
    return CarbonImmutable::parse($this->sla_due_at);
}
```
the customer protection case reported a "resolution deadline" of 2 hours or 4 hours instead of the statutory 30-day window, creating severe false SLA breach alerts and legal non-compliance.

### 2.2 Hardened Implementation in `CustomerProtectionCase.php`
`CustomerProtectionCase` now isolates operational first-action targets from statutory deadlines and prevents `sla_due_at` from truncating the 30-day statutory resolution window:

```php
public function getFirstActionDueAtAttribute(): CarbonImmutable
{
    $created = CarbonImmutable::parse($this->created_at);
    $hours = $this->priority->firstActionSlaHours();

    return $created->addHours($hours);
}

public function getAcknowledgementDueAtAttribute(): CarbonImmutable
{
    $created = CarbonImmutable::parse($this->created_at);
    $hours = (int) config('tijum.customer_protection.sla.acknowledgement_hours', 48);

    return $created->addHours($hours);
}

public function getResolutionDueAtAttribute(): CarbonImmutable
{
    $created = CarbonImmutable::parse($this->created_at);
    $days = (int) config('tijum.customer_protection.sla.resolution_days', 30);
    $statutoryDeadline = $created->addDays($days);

    // Legacy sla_due_at field must never truncate or override the statutory 30-day resolution deadline
    if ($this->sla_due_at !== null) {
        $parsedSla = CarbonImmutable::parse($this->sla_due_at);

        return $parsedSla->greaterThan($statutoryDeadline) ? $parsedSla : $statutoryDeadline;
    }

    return $statutoryDeadline;
}

public function getFirstActionTargetHoursAttribute(): int
{
    return $this->priority->firstActionSlaHours();
}
```

---

## 3. API V1 Parity

Both Customer (`/api/v1/customer/cases/{reference}`) and Partner (`/api/v1/owner/cases/{reference}`) endpoints return the isolated SLA metrics:

```json
{
  "first_action_target_hours": 2,
  "first_action_due_at": "2026-11-20T12:00:00+00:00",
  "acknowledgement_due_at": "2026-11-22T10:00:00+00:00",
  "resolution_due_at": "2026-12-20T10:00:00+00:00"
}
```

Support ticket priorities (`SupportTicketPriority::Urgent->defaultSlaHours()`, etc.) maintain exact parity with Customer Protection Case priorities:
- Urgent: 2 hours
- High: 4 hours
- Standard: 24 hours
- Low: 48 hours

Automated tests in `tests/Feature/Api/V1/PhaseM10C2FinancialAndSlaTest.php` and `tests/Feature/Api/V1/PhaseM10C1PolicyAndArtifactVerificationTest.php` verify that even when `sla_due_at` is set to 2 hours, `resolution_due_at` evaluates to exactly `created_at + 30 days`.
