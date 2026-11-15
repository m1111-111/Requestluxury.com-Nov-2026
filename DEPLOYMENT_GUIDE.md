# RequestLuxury.com — Deployment Guide

Five steps take this repository from GitHub to a live, populated marketplace at
`https://requestluxury.com`, with the six feeder domains redirecting to it.

| Step | What you do | Where | Time |
| ---- | ----------- | ----- | ---- |
| 1 | Create the database: paste `schema.sql`, then `seed.sql` | Supabase | 10 min |
| 2 | Create your admin login and set the sign-in addresses | Supabase | 5 min |
| 3 | Deploy the site and add the environment keys | Vercel | 10 min |
| 4 | Connect payments, images and email | Stripe, Cloudinary, Resend | 20 min |
| 5 | Attach `requestluxury.com` and the six feeder domains | Vercel + your registrar | 15 min |

The site is built to start without any keys: every integration switches on when its
keys are present. You can therefore complete steps 1 to 3, look at the live site, and
add Stripe, Cloudinary and Resend afterwards.

---

## Step 1 — Create the database and paste the two SQL files

1. Sign in at [supabase.com](https://supabase.com) and choose **New project**.
   - **Name:** `requestluxury`
   - **Database password:** generate one and keep it in your password manager.
   - **Region:** the one nearest your buyers (for the UK, *West EU (London)*).
2. When the project is ready, open **SQL Editor → New query**.
3. Open [`supabase/schema.sql`](supabase/schema.sql) in this repository, copy the
   **whole file**, paste it into the editor and press **Run**.
   You should see *Success. No rows returned.*
4. Choose **New query** again, paste the whole of
   [`supabase/seed.sql`](supabase/seed.sql) and press **Run**.
5. Check it worked: **Table Editor → listings** shows **18 rows**, and
   **dealers** shows **6**.

Both files are safe to run again at any time. `schema.sql` only creates what is
missing, and `seed.sql` updates its own 18 showcase rows without touching listings
you have added.

**What the seed contains.** Eighteen showcase listings (three per category), six
showcase dealer profiles with fictional names, and three house sponsor placements.
Every showcase listing carries a small *Showcase* tag on the site, and online checkout
is refused for showcase listings once live Stripe keys are in place, so nobody can pay
for an asset that does not exist.

---

## Step 2 — Create your admin login

The `/admin` dashboard opens only for an account whose role is `admin`. The database
grants that role automatically to **`concierge@requestluxury.com`**, and only once
that address is confirmed.

1. In Supabase open **Authentication → Users → Add user → Create new user**.
   - **Email:** `concierge@requestluxury.com`
   - **Password:** a long, unique password
   - Tick **Auto Confirm User**, then **Create user**.
2. Open **Authentication → URL Configuration** and set:
   - **Site URL:** `https://requestluxury.com`
   - **Redirect URLs:** add `https://requestluxury.com/auth/callback`
     (and `http://localhost:3000/auth/callback` if you will run the site on your
     own computer).
3. Open **Authentication → Sign In / Providers → Email** and leave
   **Confirm email** switched **on**.

> **Why "Confirm email" must stay on.** With it switched off, a stranger could register
> the concierge address before you do and be handed the admin role. With it on, the role
> is granted only to whoever can receive mail at that address, or to the account you
> create yourself in step 2.1.

To use a different admin address, change the one line in `schema.sql` inside the
function `public.admin_email()` before you run it, and use the same address above.

---

## Step 3 — Deploy to Vercel and add the environment keys

1. Sign in at [vercel.com](https://vercel.com) with your GitHub account and choose
   **Add New… → Project**.
2. Import the repository **`Requestluxury.com-Nov-2026`**. Vercel recognises Next.js;
   leave every build setting as it is.
3. Before pressing **Deploy**, open **Environment Variables** and add the keys below.
   (Later changes are made under **Project → Settings → Environment Variables**; press
   **Redeploy** afterwards so they take effect.)

### Needed now

| Key | Value | Where to find it |
| --- | ----- | ---------------- |
| `NEXT_PUBLIC_SITE_URL` | `https://requestluxury.com` | Type it in, no trailing slash |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxxxxx.supabase.co` | Supabase → **Connect** button, or **Project Settings → Data API** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The **publishable** key (`sb_publishable_…`) or the legacy **anon** key | Supabase → **Project Settings → API Keys** |
| `SUPABASE_SERVICE_ROLE_KEY` | The **secret** key (`sb_secret_…`) or the legacy **service_role** key | Same page. Keep it private: it bypasses the database's access rules |
| `ADMIN_EMAIL` | `concierge@requestluxury.com` | Where enquiry and payment notifications are sent |

### Added in step 4

| Key | Service |
| --- | ------- |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary |
| `RESEND_API_KEY` | Resend |

### Optional

| Key | Purpose |
| --- | ------- |
| `EMAIL_FROM` | Sender shown on emails, e.g. `RequestLuxury Concierge <concierge@requestluxury.com>` |
| `NEXT_PUBLIC_CONCIERGE_WHATSAPP` | Your concierge WhatsApp number, digits only with country code (e.g. `447700900123`). Used when a dealer has no number of their own |
| `STRIPE_CHECKOUT_CURRENCY` | `gbp` (default), `eur` or `usd`: the currency Stripe charges in |
| `NEXT_PUBLIC_VILLIERS_AFFILIATE_ID` | Your Villiers Jets affiliate id, for the charter widgets |
| `NEXT_PUBLIC_YACHT_CHARTER_AFFILIATE_URL` | Your yacht-charter partner link |

The full list, with comments, is in [`.env.example`](.env.example).

4. Press **Deploy**. After about two minutes Vercel gives you an address such as
   `requestluxury.vercel.app`. Open it: the home page should show the hero, the six
   categories and the showcase listings.
5. Go to `/sign-in`, sign in as `concierge@requestluxury.com`, then open `/admin`.

---

## Step 4 — Connect payments, images and email

### Stripe (deposits, purchases, dealer plans, payouts)

1. In the [Stripe Dashboard](https://dashboard.stripe.com) open **Developers → API keys**
   and copy the **Secret key** into `STRIPE_SECRET_KEY` and the **Publishable key** into
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Start with the **test mode** pair
   (`sk_test_…` / `pk_test_…`).
2. Open **Developers → Webhooks → Add destination** (called *Add endpoint* in older
   dashboards).
   - **Endpoint URL:** `https://requestluxury.com/api/stripe/webhook`
   - **Events:**
     - `checkout.session.completed`
     - `checkout.session.async_payment_succeeded`
     - `checkout.session.async_payment_failed`
     - `checkout.session.expired`
     - `customer.subscription.deleted`
     - `charge.refunded`
   - Copy the endpoint's **Signing secret** (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.
3. **Bank transfers.** Open **Settings → Payments → Payment methods** and switch on
   **Bank transfer**. Checkout then offers it beside cards; until it is switched on,
   checkout simply offers cards.
4. **Dealer payouts.** Open **Settings → Connect** and complete the Connect profile.
   Approved dealers then press **Connect Stripe payouts** in their portal at `/dealer` and
   finish Stripe's own onboarding. A *Buy now* purchase is paid to the dealer's
   connected account, less the Buyer's Service Fee, which stays with RequestLuxury.
5. Redeploy, then test with Stripe's card `4242 4242 4242 4242` (any future expiry,
   any CVC): pay the £750 showroom deposit at `/sell-with-us` and confirm it appears
   as *paid* under **Recent Stripe payments** on the `/admin` overview.
6. When you are satisfied, replace the three Stripe keys with the **live mode** values.
   Live mode has its own webhook endpoint and its own signing secret, so repeat item 2
   in live mode.

Fees, the showroom price and the monthly dealer plans are set in one place,
[`lib/constants.ts`](lib/constants.ts) (`FEES`). Out of the box: Buyer's Service Fee
3.5%, Winning Bidder Premium 6%, showroom build £1,500 with a £750 deposit, dealer
plans £249 (Pro) and £749 (Elite) a month.

### Cloudinary (photo and video uploads)

1. In the [Cloudinary Console](https://console.cloudinary.com) open
   **Settings → API Keys**.
2. Copy the **Cloud name** into `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, the **API Key**
   into `CLOUDINARY_API_KEY` and the **API Secret** into `CLOUDINARY_API_SECRET`.

No upload preset is needed. Uploads from `/admin` and `/dealer` are signed by the
server and stored under `requestluxury/…`. Without these keys an upload attempt
replies that Cloudinary is not configured yet, and images can still be added by
pasting their web addresses.

### Resend (enquiry confirmations, dealer certificates, sign-in emails)

1. In [Resend](https://resend.com) open **Domains → Add Domain**, enter
   `requestluxury.com` and add the DNS records it shows you at your registrar.
2. Open **API Keys → Create API Key** and copy it into `RESEND_API_KEY`.
3. **Send Supabase's own emails through Resend too.** Supabase's built-in mail service
   is for testing only: it delivers to your own team's addresses and is tightly
   rate-limited, so buyers and dealers would not receive their confirmation emails.
   In Supabase open **Authentication → Emails → SMTP Settings**, enable
   **Custom SMTP** and enter:

   | Field | Value |
   | ----- | ----- |
   | Sender email | `concierge@requestluxury.com` |
   | Sender name | `RequestLuxury` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | your Resend API key |

Without `RESEND_API_KEY` nothing fails: each email is written to the server log
(Vercel → **Logs**) instead of being sent.

After adding keys in this step, press **Redeploy** in Vercel.

---

## Step 5 — Attach requestluxury.com and the six feeder domains

1. In Vercel open **Project → Settings → Domains** and add **`requestluxury.com`**.
   Accept Vercel's suggestion to add `www.requestluxury.com` as a redirect to it, and
   make sure `requestluxury.com` is the one marked as primary.
2. On the same page add each feeder domain **and its `www.` form** (twelve entries).
   Add them as ordinary domains; do not configure a redirect in Vercel:

   | Feeder domain | Also add |
   | ------------- | -------- |
   | `requestvilla.com` | `www.requestvilla.com` |
   | `requestsupercar.com` | `www.requestsupercar.com` |
   | `requestyacht.com` | `www.requestyacht.com` |
   | `requestrental.com` | `www.requestrental.com` |
   | `avesanti.com` | `www.avesanti.com` |
   | `sterlinglatimer.com` | `www.sterlinglatimer.com` |

3. At each domain's registrar, create the DNS records Vercel displays beside the
   domain. They are normally an **A record** for the bare domain and a **CNAME** for
   `www`; copy the exact values from Vercel, as they can differ between projects.
   Vercel issues the HTTPS certificates itself once the records are found.
4. Check a feeder domain. In a terminal:

   ```bash
   curl -I https://requestvilla.com
   ```

   The reply should begin `HTTP/2 301` and contain
   `location: https://requestluxury.com/`.

The redirect is done by the site itself, so nothing else has to be configured: any
visit to a feeder domain, on any page, is answered with a permanent (301) redirect to
`https://requestluxury.com`. To add or remove a feeder domain later, edit the one list
in [`config/feeder-domains.mjs`](config/feeder-domains.mjs) and redeploy.

---

## Before you announce the site

- [ ] Sign in at `/sign-in` and confirm `/admin` opens for the concierge account, and
      that it does **not** open for an ordinary account.
- [ ] Send yourself an enquiry from a listing page. It should appear under
      **/admin → Leads** with a reference such as `RL-2026-00001`.
- [ ] Complete one test payment (step 4, item 5).
- [ ] Have your solicitor review `/terms`, `/privacy` and `/buyer-protection`, and add
      your company's registered details. The text supplied is a careful starting
      point, not legal advice.
- [ ] Set `NEXT_PUBLIC_CONCIERGE_WHATSAPP` so the WhatsApp button always has a number.
- [ ] Optional: add the brand films (see
      [`blender/VOICEOVER_AND_INSTRUCTIONS.md`](blender/VOICEOVER_AND_INSTRUCTIONS.md)).

### Replacing the showcase with real inventory

Add real dealers and listings from **/admin** (one at a time, or in bulk with the
**Bulk import** button on **/admin → Listings**, which accepts CSV and XML; a template
is at `/samples/listings-template.csv`). When your own inventory is live, retire the
showcase rows by running this in the Supabase SQL Editor:

```sql
update public.listings set moderation_status = 'archived' where is_showcase;
update public.dealers  set status = 'suspended'           where is_showcase;
```

Do not run `seed.sql` again afterwards unless you want the showcase restored.

---

## Running the site on your own computer (optional)

```bash
npm install
cp .env.example .env.local     # then fill in the Supabase keys
npm run dev                    # http://localhost:3000
```

`npm run build` makes a production build, `npm run lint` and `npm run typecheck` check
the code.

---

## If something does not look right

| What you see | Cause and fix |
| ------------ | ------------- |
| Home page loads but shows no listings | The Supabase keys are missing or mistyped in Vercel, or `seed.sql` has not been run. Check step 1.5, correct the keys, then **Redeploy** |
| `/admin` sends you back to the sign-in page saying the area is reserved for administrators | You are signed in with an address other than `concierge@requestluxury.com`, or that address is not confirmed. In Supabase → **Authentication → Users** the user must show a confirmation date |
| New users never receive the confirmation email | Custom SMTP is not configured (step 4, Resend, item 3) |
| A sign-in link opens an error page | The address is missing from **Redirect URLs** (step 2.2) |
| A payment succeeds in Stripe but stays *pending* in `/admin` | The webhook is not reaching the site: check the endpoint URL and that `STRIPE_WEBHOOK_SECRET` matches that endpoint's signing secret, in the same mode (test or live) as your keys |
| Checkout shows cards but no bank transfer | Bank transfer is not enabled in Stripe (step 4, item 3) or is not offered for your account's country and currency |
| Checkout says the request has been registered instead of opening Stripe | Stripe keys are not set, the listing is a showcase listing in live mode, or the amount is above the online card limit: the concierge desk completes these by bank transfer |
| Uploading a photo says Cloudinary is not configured yet | The three Cloudinary keys are not set, or the site was not redeployed after adding them |
| A feeder domain shows a Vercel "domain not found" page | The domain has not been added to the project (step 5.2) or its DNS has not updated yet; allow up to an hour |
| Live bids do not appear without refreshing | Run `schema.sql` again: it adds the bids table to Supabase Realtime. The page also refreshes bids every ten seconds on its own |
| A change to an environment key has no effect | Environment keys are read when the site is built: press **Redeploy** |
