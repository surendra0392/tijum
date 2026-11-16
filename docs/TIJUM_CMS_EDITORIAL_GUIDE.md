# TIJUM — Content Management System (CMS) Editorial Guide
**Operational Playbook for Administrators, Editors, and Content Authors**

---

## 1. CMS Architecture & Editorial Standards

TIJUM includes a native Content Management System integrated into the Admin Command Centre. It empowers the editorial team to create, publish, schedule, and maintain rich content without developer involvement or external CMS tools.

### Core Editorial Principles:
- **Food-Inclusive Focus**: All content reinforces TIJUM's core value proposition: daily homestyle South Indian food included in every stay. Writers and editors must accurately reflect each property's declared meal schedule (`breakfast_included`, `lunch_included`, `dinner_included`) rather than universally asserting that every single accommodation provides all three meals.
- **Accurate Timing Language**: Standard check-in is **09:00 AM** and checkout is **08:00 AM**. Early check-in is available from **07:00 AM** upon host confirmation.
- **Verified Booking Attribution**: Reviews and testimonials must refer to "Verified Booking" (never "Verified Stay").
- **Security & Sanitization**: All content blocks and rich-text markup are passed through `ContentBlockSanitizer` before storage and rendering to strip `<script>`, `<iframe>`, and malicious event handlers.

---

## 2. Managing CMS Static Pages (`/admin/content/pages`)

The CMS supports modular landing pages rendered at `/p/{slug}` (or root paths via redirect rules).

### 2.1 Page Fields:
- **Page Title**: User-facing heading.
- **Internal Name**: Administrative reference name for internal tracking.
- **Page URL Slug**: Unique URL identifier (e.g. `student-living-guide`).
- **Summary / Excerpt**: Short description used for search previews and social cards.
- **Featured Image**: Optional hero banner image.
- **Publishing Status**: `Draft`, `Scheduled`, `Published`, or `Archived`.
- **Scheduled Publication**: Date and time for automated release.
- **SEO Title & Description Override**: Optional custom search engine tags.

### 2.2 Modular Content Block System
Pages are structured using controlled modular content blocks:

| Block Type | Purpose | Key Data Fields |
| :--- | :--- | :--- |
| `hero` | High-impact page header with call-to-action | `headline`, `subheadline`, `badge`, `cta_text`, `cta_url`, `background_image` |
| `text` | Formatted editorial prose & guidelines | `heading`, `body` (sanitized HTML) |
| `image_text` | Split 2-column image + narrative story | `title`, `body`, `image_url`, `image_position` (`left`/`right`), `cta_text`, `cta_url` |
| `feature_grid` | 2, 3, or 4-column card grid of features | `title`, `subtitle`, `items` (array of `title`, `description`, `icon_key`) |
| `benefits` | Resident perks & policy commitments | `title`, `items` (array of `title`, `description`) |
| `faq_accordion`| Collapsible FAQ drawer for user questions | `title`, `items` (array of `question`, `answer`) |
| `cta` | Conversion banner driving to search/booking | `headline`, `text`, `button_label`, `button_url` |
| `city_discovery`| 4-city interactive destination pills | Links to Hyderabad, Guntur, Vijayawada, Visakhapatnam |

### 2.3 Revision Audit Trail & 1-Click Restore
Every page update automatically creates an immutable revision record in `content_page_revisions` capturing:
- Version sequence number (`version`)
- Editing administrator (`admin_id`)
- Full snapshot of title, content blocks, and SEO payload
- Optional editorial change note (`change_notes`)

**How to Restore a Previous Version:**
1. Navigate to the page editor in `/admin/content/pages/{id}/edit`.
2. Inspect the **Revisions History** sidebar.
3. Select any previous version to review changes.
4. Click **Restore Version**. A new version is appended to preserve the complete audit trail.

### 2.4 Automated Slug Redirects
When a published page slug is changed (e.g. from `/p/old-guidelines` to `/p/new-guidelines`), the system automatically creates a 301 Permanent Redirect rule in `seo_redirects` to maintain inbound SEO backlink value and prevent broken bookmarks.

---

## 3. Blog & Editorial Platform (`/admin/content/blog`)

The blog platform drives organic discovery by publishing living guides, cost breakdowns, neighborhood profiles, and accommodation advice.

### 3.1 Writing & Publishing Articles:
- **Title & Slug**: Clear, keyword-focused title (e.g. *Living in Madhapur vs. Gachibowli for Tech Interns*).
- **Excerpt**: 150-160 character hook used in article index cards and SEO description.
- **Reading Time**: Automatically calculated on save based on standard reading speed (200 words per minute).
- **Category & Tags**: Assigned to a primary category and relevant tag pills for discovery.
- **Author Bylines**: Selected from verified `content_authors` with bio and avatar.
- **Publication Scheduling**: Articles can be scheduled for future release via `tijum:publish-scheduled-content`.

### 3.2 Public Blog Navigation:
- Index Feed: `/blog`
- Category Archive: `/blog/category/{slug}`
- Full Article Reader: `/blog/{slug}`

---

## 4. Content Authors & Editorial Staff (`/admin/content/authors`)

Manage verified bylines that appear on published blog articles:
- **Author Name & Slug**: Full display name.
- **Designation**: Title (e.g. *Student Living Editor*, *Hyderabad Community Lead*).
- **Bio**: Short 2-3 sentence background explaining local expertise.
- **Avatar URL**: High-resolution headshot from the Media Library.
- **Active Toggle**: Inactive authors are preserved for historical bylines but cannot be assigned to new articles.

---

## 5. Blog Categories & Tags (`/admin/content/categories`)

Organize the publication into logical thematic pillars:
- Recommended categories:
  - *Student Living* (coaching centers, university hostels, exam prep)
  - *Food Standards* (hygiene, meal inclusions, South Indian recipes)
  - *Neighborhood Guides* (transit, costs, safety, nightlife)
  - *Professional Living* (IT hubs, co-living, corporate interns)
- Custom SEO meta titles and meta descriptions per category page.

---

## 6. Frequently Asked Questions (CMS) (`/admin/content/faqs`)

Manage public FAQ items displayed across the website and city landing pages:
- **Question**: Specific, natural customer inquiry.
- **Answer**: Clear, concise, policy-compliant response.
- **Category**: Grouping tag (`general`, `food`, `booking`, `timing`, `payments`).
- **Display Order**: Sorting priority.
- **Published Toggle**: Instant public visibility toggle.

---

## 7. Media Library (`/admin/content/media`)

Central asset repository for storing and managing high-resolution images:
- **Allowed MIME Types**: JPEG, PNG, WebP, SVG.
- **File Size Limit**: 5 MB per asset.
- **Security Protections**:
  - SVG files are actively sanitized to strip inline JavaScript and external entities.
  - Safe unique filename generation with path traversal prevention.
- **Accessibility & SEO**: Alt text and titles can be edited anytime to enhance screen reader accessibility and image search ranking.
- **1-Click Copy URL**: Click the copy icon on any asset card to copy its public CDN/storage link for use in content blocks or blog articles.
