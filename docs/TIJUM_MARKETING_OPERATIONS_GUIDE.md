# TIJUM — Marketing Operations & Growth Guide
**Campaign Management, Promotional Banners, UTM Tracking & Permission-Based Email Marketing**

---

## 1. Marketing Philosophy & Strict Privacy Principles

TIJUM's marketing infrastructure is designed to build customer trust and drive sustainable organic growth across food-inclusive accommodations.

### Cardinal Marketing Rules:
1. **Zero Fake Metrics**: The marketing dashboard displays genuine, mathematically verified telemetry only. No vanity numbers or simulated conversions.
2. **Permission-Based Audience Only**: Customers can only be sent marketing emails if they have provided **explicit affirmative consent** (`marketing_consent = true`).
3. **Immutable Consent Audit Records**: Every opt-in and opt-out event is permanently logged with action, channel, source, IP address, and timestamp in `marketing_consent_records`.
4. **Strict Separation from Transactional Communications**: Unsubscribing from promotional communications **NEVER** prevents customers from receiving critical transactional notifications (such as reservation confirmations, check-in instructions, payment receipts, relocation offers, and customer protection cases).
5. **Zero SMS & Zero WhatsApp Marketing**: Marketing via SMS and WhatsApp is **STRICTLY PROHIBITED**. Promotional messaging is exclusively restricted to email and on-site banners. Transactional SMS and WhatsApp channels remain reserved solely for reservation operations.
6. **RFC 8058 One-Click List-Unsubscribe**: Every marketing email includes standard `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` email headers, honoring ISP and mail client instant opt-out standards.

---

## 2. Marketing Operations Command Dashboard (`/admin/marketing`)

The central marketing dashboard provides growth and campaign telemetry:
- **Verified Active Subscribers**: Current count of active, confirmed email subscribers.
- **Unsubscribed Audience**: Number of historical unsubscribes retained for suppression.
- **Active Campaigns**: Live marketing campaigns with verified UTM parameters.
- **Live Banners**: Number of published promotional banners across hero and strip placements.
- **On-Site Activity Telemetry**:
  - `page_view`: Public page visits.
  - `blog_view`: Guides and article reads.
  - `banner_click`: Interactions with promotional banners.
  - `cta_click`: Button conversions driving to property discovery.
  - `newsletter_signup`: Verified subscriber opt-in events.
- **Top UTM Campaigns**: Real-time breakdown of visits grouped by `utm_campaign`.
- **Recent Email Campaigns**: Quick status overview of drafted, scheduled, and dispatched broadcasts.

---

## 3. Promotional Banners (`/admin/marketing/banners`)

Manage customer-facing promotional banners displayed across high-visibility marketplace surfaces:

### 3.1 Banner Placements:
- `homepage_hero`: Displayed inside or directly below the main search hero on the homepage.
- `homepage_strip`: Sticky or top-bar promotional announcement strip across the homepage.
- `city_page`: Contextual promotional banner shown on city landing pages (`/hostels-in-hyderabad`, etc.).
- `blog_page`: In-article or sidebar promo card on the blog platform.

### 3.2 Banner Attributes:
- **Headline**: Compelling primary copy (e.g. *Save ₹500 on your first food-inclusive stay!*).
- **Description**: Supporting details, coupons, or food inclusion notes.
- **CTA Text & URL**: Action button (e.g. *Explore Hostels* -> `/search?city=Hyderabad`).
- **Placement & Display Order**: Controls placement slot and relative sequence among multiple banners.
- **Campaign Association**: Optional link to an overarching strategic campaign.
- **Scheduling**: Optional `starts_at` and `ends_at` dates for automated seasonal campaigns.
- **Impressions & Clicks Counter**: Automatically tracked on user interaction.

---

## 4. Strategic Campaigns & UTM Tracking (`/admin/marketing/campaigns`)

Organize multi-channel marketing initiatives and generate tracking links:

### 4.1 Campaign Objectives:
- `customer_acquisition`: Driving new student or professional bookings.
- `brand_awareness`: Introducing TIJUM's food-inclusive accommodation concept.
- `city_expansion`: Launching new clusters in Guntur, Vijayawada, or Visakhapatnam.
- `partner_onboarding`: Recruiting quality hostel and PG owners.
- `seasonal_retention`: Semester breaks, college admissions, and internship seasons.

### 4.2 Standard UTM Taxonomy:
- `utm_source`: Referral source (`newsletter`, `instagram`, `google`, `partner`).
- `utm_medium`: Channel medium (`email`, `paid_social`, `cpc`, `referral`).
- `utm_campaign`: Lowercase campaign identifier (e.g. `hyderabad_launch_2026`).
- `utm_content`: Creative variant or placement (`hero_cta`, `footer_link`, `digest_v1`).

### 4.3 1-Click Link Generator:
In the campaign editor, the system automatically builds the full tracking URL:
`https://tijum.com/hostels-in-hyderabad?utm_source=newsletter&utm_medium=email&utm_campaign=hyderabad_launch_2026&utm_content=hero_cta`
Administrators can copy the generated link with a single click for distribution.

---

## 5. Newsletter Subscribers & Consent Registry (`/admin/marketing/subscribers`)

Maintain the verified subscriber database with legal compliance:

### 5.1 Subscriber Lifecycle:
1. **Subscription**: Submitted via public newsletter form with affirmative checkbox consent.
2. **Double Opt-In Confirmation**: Generates a secure `unsubscribe_token` and records IP address.
3. **Active Audience**: Included in broadcast campaign recipient filters.
4. **Opt-Out / Unsubscribe**:
   - Customer clicks one-click unsubscribe link in email.
   - Status updates to `unsubscribed`, with immutable audit record logged.
   - Subscriber is automatically suppressed from future email campaigns.
   - Administrator can also manually opt out subscribers from the Admin panel upon request.

---

## 6. Permission-Based Email Broadcasts (`/admin/marketing/emails`)

Compose, preview, test, and dispatch email campaigns to verified subscribers:

### 6.1 Creating a Broadcast:
- **Title**: Internal broadcast name (e.g. *October Hyderabad Student Living Digest*).
- **Subject Line**: Inbox subject (e.g. *3 homestyle meals included: Meet TIJUM in Hyderabad*).
- **Preview Header**: Sub-header text displayed in inbox previews.
- **Target Segment**:
  - `all_subscribers`: Entire active, confirmed subscriber list.
  - `hyderabad_interest`: Subscribers interested in Hyderabad properties.
  - `andhra_pradesh_interest`: Subscribers interested in Guntur, Vijayawada, or Visakhapatnam.
  - `frequent_stayers`: Past verified customers.
- **HTML & Plain Text Body**: Rich message body with plain text fallback.

### 6.2 Pre-Flight Safety Workflow:
1. **Estimate Audience**: Live counter shows exact eligible recipient count based on segment.
2. **Send Test Preview**: Sends a live test copy to an administrator's email address to verify rendering in Gmail, Outlook, and Apple Mail before dispatch.
3. **Dispatch to Audience**: Sends broadcast in chunks of 100 recipients with duplicate prevention:
   ```php
   $delivered = $campaignService->dispatchCampaign($emailCampaign);
   ```
4. **Automated Compliance Headers**:
   Every message sent via `TijumMarketingMail` injects:
   - `List-Unsubscribe: <https://tijum.com/unsubscribe/{token}>`
   - `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
   - Footer direct unsubscribe link and sender address.

---

## 7. Telemetry Privacy, Cryptographic IP Hashing & Retention Management

TIJUM tracks first-party on-site marketing telemetry (page views, banner interactions, and CTA clicks) to evaluate campaign performance while safeguarding user privacy.

### 7.1 Legal Classification: Pseudonymous (Not Anonymous) Data
Under Article 4(5) of the European Union General Data Protection Regulation (GDPR) and the provisions of the Indian Digital Personal Data Protection Act, 2023 (DPDP Act 2023), cryptographic hashes of IP addresses are legally categorized as **pseudonymous personal data**, rather than anonymous data. Because a hashed IP can theoretically be re-identified if combined with auxiliary Internet Service Provider (ISP) logs or local network audit trails, the following protections are strictly enforced:

1. **Keyed Cryptographic HMAC-SHA256**:
   IP addresses are never stored in raw form and are never hashed with unkeyed algorithms that are vulnerable to offline dictionary or rainbow-table preimage attacks. Telemetry hashing uses a keyed HMAC seeded by the application secret key:
   ```php
   $ipHash = hash_hmac('sha256', $request->ip() ?: '127.0.0.1', (string) config('app.key'));
   ```
2. **Role-Based Access Control**:
   Telemetry tables and analytics dashboards are strictly restricted to authenticated administrators who hold the explicit `marketing.view` permission. Public and owner guards have zero access to telemetry endpoints or tables.
3. **90-Day Retention Lifecycle & Pruning**:
   In adherence to the data minimization and storage limitation principles of DPDP 2023 and GDPR, marketing tracking records are retained for a maximum of 90 days. Older telemetry events are regularly pruned via:
   ```php
   app(MarketingTrackingService::class)->pruneOldEvents(retentionDays: 90);
   ```
