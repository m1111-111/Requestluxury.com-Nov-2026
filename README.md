# RequestLuxury.com

A global luxury marketplace, private auction house and concierge desk for six
categories: **Residences, Supercars, Yachts, Aviation, Horology and Jewelry**.

Dealers list inventory, buyers enquire, reserve, buy or bid, and every introduction is
registered so that RequestLuxury is credited when a sale follows. The owner moderates
everything from `/admin`.

- **To put the site online:** follow [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) (five steps).
- **To make the brand film:** see [`blender/VOICEOVER_AND_INSTRUCTIONS.md`](blender/VOICEOVER_AND_INSTRUCTIONS.md).
- **The original briefs:** [`SPEC.md`](SPEC.md) and [`BLENDER_VIDEO_SPEC.md`](BLENDER_VIDEO_SPEC.md).

## What is in the box

| Area | What it does |
| ---- | ------------ |
| **Marketplace** | Home page with a three-tab command bar, six category pages with filters, full-text search, saved listings, six languages (EN, FR, ES, DE, AR with right-to-left layout, ZH) and seven currencies at live exchange rates |
| **Listing page** | Photo gallery with lightbox, specifications, private deal room (documents unlock after registration), one-click WhatsApp enquiry, dossier request, charter and insurance partner box |
| **Ways to sell** | Enquiry only, *Buy now* through Stripe, refundable hold deposit, or timed auction with anti-sniping and live bids. Residences are always enquiry-only |
| **Lead registry** | Every enquiry gets a reference (`RL-2026-00001`), a fee tier and twelve months' protection. Forwarding a lead emails the dealer a registration certificate |
| **Dealers** | Application form at `/sell-with-us`, self-service portal at `/dealer` (listings, CSV/XML import, leads, Stripe payouts, plan) |
| **Admin** | `/admin`: moderation queue, listing editor, bulk importer with price floors, dealers, leads and referral deals, sponsors with reports, buyer verification, payments |
| **Revenue** | Buyer's Service Fee, Winning Bidder Premium, tiered lead fees, commission-share deals, dealer subscriptions, sponsor placements, the £750 showroom-build deposit |
| **Feeder domains** | Six secondary domains answer with a permanent 301 redirect to `https://requestluxury.com` |
| **SEO** | Sitemap, robots file, per-page OpenGraph metadata and structured data |

## Technology

| Layer | Choice |
| ----- | ------ |
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Lucide icons, Cormorant Garamond + Plus Jakarta Sans |
| Database, sign-in, live updates | Supabase (PostgreSQL with Row Level Security, Auth, Realtime) |
| Payments | Stripe Checkout (cards and bank transfer), Billing and Connect |
| Images | Cloudinary (signed uploads) |
| Email | Resend, with a fallback that writes emails to the server log |
| Hosting | Vercel |

## Run it on your computer

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local    # add at least the three Supabase keys
npm run dev                   # http://localhost:3000
```

The database comes from two files. Paste them, in this order, into the SQL Editor of a
Supabase project (or run them against a local `supabase start` stack):

1. [`supabase/schema.sql`](supabase/schema.sql): tables, security rules, triggers, functions.
2. [`supabase/seed.sql`](supabase/seed.sql): 18 showcase listings, 6 showcase dealers, 3 sponsors.

Both can be run again safely. With no keys at all the site still builds and every page
opens; listings and sign-in appear once the Supabase keys are set.

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build, then serve it |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no output files |

## Folder map

```text
app/
  (site)/                 Public pages: home, [vertical], search, auctions, listing/[slug],
                          sell-with-us, concierge, journal, sponsor/[slug], saved, checkout,
                          sign-in, account, dealer, contact, terms, privacy, buyer-protection
  admin/                  Owner dashboard: overview, listings, dealers, leads, sponsors, buyers
  api/                    leads, deal-room, bids, listings, rates, sponsor-events, sponsor/click,
                          cloudinary/sign, dealers/apply, stripe/{checkout,webhook,connect}
  auth/                   Sign-in callback and sign-out
  sitemap.ts robots.ts manifest.ts opengraph-image.tsx
components/               Interface, grouped by area (home, listing, listings, admin, dealer…)
lib/                      Data access, Stripe, email, currency, importer, translations, validation
  constants.ts            Fees, plans, categories, price floors, currencies, languages
  supabase/               The four database clients (public, session, browser, service)
config/feeder-domains.mjs The list of domains that redirect to the hub
middleware.ts             Feeder redirects, /admin and /dealer protection, currency by country
next.config.mjs           Redirects, security headers, image and video settings
supabase/schema.sql       The whole database, safe to re-run
supabase/seed.sql         Showcase content
public/samples/           CSV template and example XML feed for the importer
public/videos/            Where the two brand films go
blender/                  Brand-film generator, voiceover script, subtitles
types/index.ts            Shared TypeScript types
```

## Where to change things

| To change | Edit |
| --------- | ---- |
| Fees, premiums, deposit, dealer plan prices | `FEES` in [`lib/constants.ts`](lib/constants.ts) |
| Category names, descriptions, images, price floors | `VERTICALS` in `lib/constants.ts` (price floors also in `price_floor_usd()` in `schema.sql`) |
| Feeder domains | [`config/feeder-domains.mjs`](config/feeder-domains.mjs) |
| Interface wording and translations | [`lib/i18n.ts`](lib/i18n.ts) |
| Concierge services and partner links | [`lib/concierge.ts`](lib/concierge.ts) |
| Journal articles | [`lib/journal.ts`](lib/journal.ts) |
| Colours and typography | `@theme` in [`app/globals.css`](app/globals.css) |
| Email wording | [`lib/email.ts`](lib/email.ts) |
| The admin email address | `admin_email()` in `schema.sql`, and `ADMIN_EMAIL` |

## How private data is protected

- Row Level Security is enabled on every table, and private columns (true prices of
  price-on-request listings, exact addresses, deal-room documents, reserve prices,
  dealer contact details, bidder identities) are not readable by visitors or by
  signed-in buyers at all. They are released only through database functions that
  check who is asking.
- Only the Stripe webhook and the Connect onboarding route use the service-role key,
  and only on the server.
- `/admin` is closed to everyone except an account with the `admin` role, both in
  `middleware.ts` and again in the database functions the dashboard calls.
- Dealer edits return a listing to the moderation queue; nothing is published
  without approval.
- Public forms are rate-limited and carry a hidden honeypot field; feed imports refuse
  private network addresses; responses carry a Content Security Policy.

## Notes for whoever maintains this

- **Showcase content.** Seed rows are flagged `is_showcase`, shown with a *Showcase* tag,
  and refused at checkout when live Stripe keys are in use. The six showcase dealer
  names are fictional. `DEPLOYMENT_GUIDE.md` explains how to retire them.
- **Next.js version.** The project is pinned to Next.js 15 because the brief requires a
  root `middleware.ts`; Next.js 16 renames that file to `proxy.ts`.
- **Legal pages.** `/terms`, `/privacy` and `/buyer-protection` are a careful starting
  point and should be reviewed by a solicitor before launch.
- **Beyond the brief.** A `payments` table records every Stripe checkout; sponsor
  reports are protected by a private key in the link; price-on-request prices are never
  sent to the browser.
