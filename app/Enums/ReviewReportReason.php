<?php

declare(strict_types=1);

namespace App\Enums;

enum ReviewReportReason: string
{
    case FakeFraudulent = 'fake_fraudulent';
    case NonGuest = 'non_guest';
    case PersonalInfoDisclosed = 'personal_info_disclosed';
    case AbusiveThreatening = 'abusive_threatening';
    case HarassmentDiscrimination = 'harassment_discrimination';
    case SpamAdvertising = 'spam_advertising';
    case ConflictOfInterest = 'conflict_of_interest';
    case Irrelevant = 'irrelevant';
    case CopiedManipulated = 'copied_manipulated';
    case OtherPolicyViolation = 'other_policy_violation';

    public function label(): string
    {
        return match ($this) {
            self::FakeFraudulent => 'Suspected Fake or Inauthentic Review',
            self::NonGuest => 'Reviewer Not Involved in Booking',
            self::PersonalInfoDisclosed => 'Personal or Sensitive Information Disclosed',
            self::AbusiveThreatening => 'Abusive, Profane or Threatening Language',
            self::HarassmentDiscrimination => 'Harassment or Discriminatory Content',
            self::SpamAdvertising => 'Spam, Commercial Advertising or Solicitation',
            self::ConflictOfInterest => 'Conflict of Interest or Competitor Post',
            self::Irrelevant => 'Irrelevant or Off-Topic Content',
            self::CopiedManipulated => 'Copied or Systematically Manipulated Feedback',
            self::OtherPolicyViolation => 'Other Review Policy Violation',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $reason): string => $reason->value, self::cases());
    }
}
