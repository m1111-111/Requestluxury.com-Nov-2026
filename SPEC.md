# REQUESTLUXURY.COM — MASTER PRODUCTION SPECIFICATION (CLEAN-SLATE BUILD)

> Source brief for this repository. Saved verbatim (formatting restored) from the
> specification supplied by the owner in November 2026.

## 1. ROLE & EXECUTION RULES FOR CLAUDE
You are a Principal Full-Stack Architect. Build `requestluxury.com` from scratch as a clean, production-ready monorepo.
- **Zero Placeholders:** Do not leave `// TODO` comments, mock broken links, or unimplemented functions. Write complete, type-safe TypeScript code.
- **Error-Free Build:** Ensure strict Next.js 14/15 App Router compatibility (`use client` boundaries strictly separated from Server Components), clean Tailwind CSS styling, and defensive null checks so `npm run build` succeeds on Vercel on the first try.
- **Self-Contained Seed Data:** Include a SQL seed file (`supabase/seed.sql`) with 18 realistic, high-resolution luxury showcase listings (3 per category) so the platform looks rich and populated immediately upon deployment.

---

## 2. TECH STACK & ENVIRONMENT VARIABLES
- **Framework:** Next.js (App Router, TypeScript), Tailwind CSS, Lucide React icons.
- **Database, Auth & Realtime:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`) with strict PostgreSQL **Row Level Security (RLS)**.
- **Media CDN:** Cloudinary (`next-cloudinary` / signed upload preset) for fast image delivery and video hosting.
- **Payments:** Stripe (`stripe`) supporting Stripe Billing (B2B SaaS & £750 custom showroom deposits), Stripe Checkout (`customer_balance` bank transfers + cards for Buyer's Premium / Concierge Hold Deposits), and Stripe Connect Express.
- **Email Notifications:** Resend (`resend`) with graceful console fallback if `RESEND_API_KEY` is not yet set.

Provide a complete `.env.example`:
```env
NEXT_PUBLIC_SITE_URL=https://requestluxury.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
ADMIN_EMAIL=concierge@requestluxury.com
```

---

## 3. MULTI-DOMAIN 301 REDIRECT MIDDLEWARE (`middleware.ts` & `next.config.mjs`)
Configure Next.js `middleware.ts` to inspect the incoming `host` header and automatically issue permanent **301 Redirects** from feeder domains to the primary hub:
- `requestvilla.com` (and `www.`) -> `https://requestluxury.com`
- `requestsupercar.com` (and `www.`) -> `https://requestluxury.com`
- `requestyacht.com` (and `www.`) -> `https://requestluxury.com`
- `requestrental.com` (and `www.`) -> `https://requestluxury.com`
- `avesanti.com` / `sterlinglatimer.com` -> `https://requestluxury.com`

Also protect `/admin/*` routes in `middleware.ts` so only authenticated users with `role = 'admin'` in `public.profiles` can access the moderation backend.

---

## 4. COMPLETE SUPABASE SQL SCHEMA + ROW LEVEL SECURITY (`supabase/schema.sql`)
Write a single, idempotent SQL migration file containing all tables, triggers, and **Row Level Security (RLS)** policies:

### 4.1 Tables
1. **`public.profiles`**
   - `id` (uuid, PK, references `auth.users` on delete cascade)
   - `email` (text, unique, not null)
   - `full_name` (text)
   - `role` (text, check in `('buyer', 'dealer', 'admin')`, default `'buyer'`)
   - `is_verified_buyer` (boolean, default false)
   - `created_at` (timestamptz, default now())

2. **`public.dealers`**
   - `id` (uuid, PK, default `gen_random_uuid()`)
   - `owner_id` (uuid, references `public.profiles(id)` on delete set null)
   - `company_name` (text, not null), `slug` (text, unique, not null)
   - `vertical_focus` (text, check in `('residences', 'supercars', 'yachts', 'aviation', 'horology', 'jewelry')`)
   - `country` (text, not null), `city` (text, not null)
   - `contact_email` (text, not null), `whatsapp_number` (text), `logo_url` (text), `feed_url` (text)
   - `rera_orn_number` (text)
   - `subscription_tier` (text, check in `('founding_free', 'pro', 'elite')`, default `'founding_free'`)
   - `stripe_account_id` (text), `is_verified` (boolean, default false)
   - `status` (text, check in `('pending_review', 'approved', 'suspended')`, default `'pending_review'`)
   - `created_at` (timestamptz, default now())

3. **`public.listings`**
   - `id` (uuid, PK, default `gen_random_uuid()`)
   - `dealer_id` (uuid, references `public.dealers(id)` on delete cascade)
   - `title` (text, not null), `slug` (text, unique, not null)
   - `vertical` (text, check in `('residences', 'supercars', 'yachts', 'aviation', 'horology', 'jewelry')`, not null)
   - `description` (text, not null)
   - `price_usd` (numeric(14,2), not null), `display_currency` (text, default `'USD'`), `price_on_request` (boolean, default false)
   - `sale_mode` (text, check in `('inquire_only', 'direct_buy', 'hold_deposit', 'timed_auction')`, default `'inquire_only'`)
   - `deposit_amount_usd` (numeric(10,2), default 0)
   - `country` (text, not null), `city` (text, not null), `exact_address` (text)
   - `property_status` (text, check in `('ready_built', 'off_plan', 'not_applicable')`, default `'not_applicable'`)
   - `trakheesi_permit_number` (text) -- Mandatory application-level & DB check if `lower(city) = 'dubai'` and `vertical = 'residences'`
   - `images` (text[], not null, default `'{}'`), `video_url` (text)
   - `deal_room_docs` (jsonb, default `'[]'::jsonb`) -- Gated PDFs/floorplans/provenance unlocked by Verified Buyers
   - `specs` (jsonb, not null, default `'{}'::jsonb`)
   - `is_auction` (boolean, default false), `auction_end_time` (timestamptz), `starting_bid_usd` (numeric(14,2), default 0), `reserve_price_usd` (numeric(14,2), default 0), `current_highest_bid_usd` (numeric(14,2), default 0), `bid_count` (int, default 0)
   - `quality_score` (int, default 0), `is_featured` (boolean, default false)
   - `moderation_status` (text, check in `('pending_review', 'approved', 'rejected', 'archived')`, default `'pending_review'`)
   - `admin_notes` (text)
   - `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())

4. **`public.auction_bids`**
   - `id` (uuid, PK), `listing_id` (uuid, references `listings`), `bidder_id` (uuid, references `profiles`), `bidder_paddle` (text), `bid_amount_usd` (numeric(14,2)), `created_at` (timestamptz)

5. **`public.leads`** (12-Month Buyer Protection & Audit Trail)
   - `id` (uuid, PK), `lead_reference_code` (text, unique, e.g. `RL-2026-00001`), `listing_id` (uuid, nullable for bespoke sourcing/charter), `dealer_id` (uuid, nullable)
   - `lead_type` (text, check in `('asset_inquiry', 'whatsapp_click', 'charter_request', 'bespoke_sourcing', 'deal_room_unlock', 'b2b_web_build', 'education_concierge')`)
   - `buyer_name` (text, not null), `buyer_email` (text, not null), `buyer_phone` (text), `message` (text), `metadata` (jsonb)
   - `lead_fee_tier_gbp` (numeric(10,2), default 0) -- Auto-calculated: `< $1M = 25`, `$1M-$3M = 75`, `> $3M = 150`
   - `protection_expires_at` (timestamptz, default `now() + interval '12 months'`)
   - `admin_status` (text, check in `('new', 'forwarded_to_dealer', 'closed_won', 'archived')`, default `'new'`)
   - `created_at` (timestamptz, default now())

6. **`public.referral_deals`**, **`public.sponsors`**, **`public.sponsor_events`**
   - Track 25%–50% partner agency referral payouts and ROI-tracked banner impressions/clicks by visitor country (`x-vercel-ip-country`).

### 4.2 Database Triggers
- **Auto-Create Profile Trigger:** Automatically insert into `public.profiles` when a new `auth.users` row is created (auto-assign `role = 'admin'` if email matches `concierge@requestluxury.com`).
- **Listing Quality Score Trigger (0–100):** Calculate `quality_score` before insert/update on `listings` (+30 for >= 8 images, +25 for >= 300 char description, +20 for public price, +15 for video, +10 for exact address).
- **Anti-Sniping Auction Trigger:** If a valid bid is placed within 120 seconds of `auction_end_time`, extend `auction_end_time` by 120 seconds and update `current_highest_bid_usd` + `bid_count`.

### 4.3 Strict Row Level Security (RLS) Policies
Enable RLS on ALL tables:
- **`listings`:** Public `SELECT` ONLY where `moderation_status = 'approved'`. Dealers can `SELECT`, `INSERT`, and `UPDATE` their own rows (any dealer edit resets `moderation_status` to `'pending_review'` unless edited by `admin`). Admins have full `ALL` access.
- **`dealers`:** Public `SELECT` where `status = 'approved'`. Owners can read/update own profile. Admins have `ALL` access.
- **`leads`:** Public/Anon can `INSERT` (for inquiry forms). Dealers can `SELECT` leads assigned to their `dealer_id` once `admin_status = 'forwarded_to_dealer'`. Admins have `ALL` access.
- **`auction_bids`:** Public `SELECT` (exposing only `bidder_paddle` and `bid_amount_usd`, never bidder email). Authenticated verified users can `INSERT`.
- **`sponsors` & `sponsor_events`:** Public `SELECT` active sponsors; public `INSERT` into `sponsor_events`; Admin `ALL`.

---

## 5. LUXURY GUI, TYPOGRAPHY & HIGH-CONVERTING WORKFLOWS
Design Aesthetic: **Editorial Quiet Luxury** (Fusion of *JamesEdition*, *Airbnb Luxe*, *Bring a Trailer*, *NetJets*, and *Acquire.com*).
- **Palette:** Warm Alabaster (`#FAF9F6`) primary background, Deep Obsidian (`#0B0B0C`) hero & dark sections, Charcoal (`#171717`) text, Brushed Champagne Gold (`#C5A467`) primary accents.
- **Typography:** Google Fonts `Cormorant Garamond` (editorial headings) + `Plus Jakarta Sans` (clean UI, specs, prices).
- **Global Top Bar:** 6 Languages (`EN, FR, ES, DE, AR, ZH` via clean client dictionary) + 7 Live Currencies (`GBP, USD, EUR, AED, CHF, CNY, SAR`) + `Sell With Us` + `Sign In`.
- **Main Asset Navigation:** Strictly 6 tangible verticals: `Residences`, `Supercars`, `Yachts`, `Aviation`, `Horology`, `Jewelry`, plus a `Concierge & Journal` dropdown (housing Private Jet/Yacht Charter, Asset Sourcing, Swiss Finishing Schools, Executive MBAs, FX Transfers, and Golden Visas).

### Key Frontend Components to Build:
1. **Hero Section + Embedded 3D Brand Video + NetJets-Style 3-Tab Command Bar:**
   - Background loop slot for `/videos/requestluxury-hero.mp4` (with elegant fallback gradient/poster) + modal button "Watch How RequestLuxury Works (60s)".
   - 3-Tab Interactive Command Bar:
     - *Tab 1: Acquire Assets* (Vertical + Location/Make + Price Filter)
     - *Tab 2: Jet & Yacht Charter* (Origin -> Destination + Date + Pax -> Captures lead & links to Villiers Jets / Yacht Charter affiliate URL)
     - *Tab 3: 48-Hour Bespoke Sourcing* ("Tell our global dealer desk the exact watch, car, or residence you want sourced")
2. **JamesEdition-Style Interactive Listing Cards:**
   - **Inline Horizontal Photo Carousel** inside every grid card (hover left/right chevrons + dot indicators so users swipe 5+ photos without leaving the grid).
   - Glassmorphic top badges (VERIFIED PARTNER, LIVE AUCTION • 1d 08h, QUALITY 95/100).
   - Live currency-converted price + heart Save button.
3. **Airbnb Luxe Split-Screen Listing Detail Page (`/listing/[slug]`):**
   - 5-photo editorial mosaic + full-screen lightbox.
   - Left column: Narrative description, dynamic JSONB spec grid, Dubai Trakheesi permit badge (if Dubai), and **Acquire.com-Style Gated Deal Room** (blurred floorplan/provenance cards unlocked by entering verified buyer contact details).
   - Right column (Sticky Card):
     - Regulated Real Estate (USA, UK, UAE, EU, etc.) automatically hides direct checkout fees and routes to **1-Click WhatsApp Inquiry** + **Request Private Dossier** (generating the 12-month protected Lead Certificate).
     - Eligible Watches/Cars/Deposits show **Reserve / Buy via Stripe** (3.5% Buyer's Service Fee) or **Live Realtime Auction Box** (6% Winning Bidder Premium).
     - Below Contact Card: **Contextual Affiliate Concierge Box** (*"Fly Private via Villiers Jets"*, *"Save 2% on International FX Wire"*, *"Specialist Asset Insurance"*).
4. **B2B Dealer & Custom Showroom Sales Page (`/sell-with-us`):**
   - Pitches two clear paths:
     1. **Free Founding Partner Syndication** (includes self-serve Dealer Submission Form + bulk CSV/XML feed uploader).
     2. **£1,500 Custom 5-Day Luxury Showroom & AI WhatsApp Build** (with an instant £750 Stripe Deposit Checkout button for fast upfront B2B cash flow).
5. **ROI-Tracked Sponsor Banner & Public Client Report (`/sponsor/[slug]`):**
   - Displays native editorial banners per vertical and provides sponsors a live analytics page showing Impressions, Clicks, CTR %, and Visitor Country breakdown.

---

## 6. FULL ADMIN MODERATION BACKEND (`/admin`)
Build a complete, intuitive Admin Dashboard so the founder can review, edit, approve, and monetize every submission without touching SQL:
1. **Submissions Queue (`/admin/listings`):**
   - Tabs: Pending Review, Approved, Rejected, All.
   - Full **Inline / Modal Listing Editor**: Edit title, description, price, currency, category, specs JSON, upload/reorder Cloudinary images, toggle `is_featured`, adjust `sale_mode`, verify Dubai `trakheesi_permit_number`, and click **Approve & Publish**, **Save Edits**, or **Reject with Note**.
   - **Admin Bulk Importer:** Upload CSV or paste a dealer XML feed URL to import listings (enforcing minimum luxury price floors: Residences $450k+, Supercars $50k+, Yachts $150k+, Aviation $250k+, Horology $5k+, Jewelry $5k+).
2. **Dealer Approvals (`/admin/dealers`):** Approve/verify dealers, manage Founding Partner tiers, and view XML sync URLs.
3. **Leads, 12-Month Protection & Referral Tracker (`/admin/leads`):**
   - View all incoming buyer inquiries, charter requests, sourcing requests, and B2B £1,500 showroom leads.
   - 1-click **"Forward to Partner Dealer & Send 12-Month Registration Certificate"** button.
   - Convert closed leads into `referral_deals` (auto-calculating 30% broker commission share or £25/£75/£150 tiered lead fees).
4. **Sponsors Manager (`/admin/sponsors`):** Create/edit sponsor banners and copy their private `/sponsor/[slug]` ROI report link.

---

## 7. SEO & DEPLOYMENT DELIVERABLES
- Dynamic `app/sitemap.ts` and `app/robots.ts`.
- Dynamic OpenGraph metadata on every listing and category page.
- `DEPLOYMENT_GUIDE.md` explaining the exact 5 steps to paste `schema.sql` + `seed.sql` into Supabase, add `.env` keys in Vercel, and attach secondary domains for automatic 301 redirects.
