-- ============================================================================
-- REQUESTLUXURY.COM — DATABASE SCHEMA, TRIGGERS & ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Idempotent: paste the whole file into the Supabase SQL Editor and press Run.
-- It can be re-run at any time without losing data.
--
-- Security model in one paragraph
--   * Row Level Security is enabled on every table.
--   * Visitors only receive the columns that are safe to publish. Private
--     columns (true price of "price on request" assets, reserve prices, exact
--     addresses, deal-room document links, admin notes, dealer contact details,
--     bidder identities, sponsor report keys) are never granted to the API
--     roles and are only released through the security-definer functions below.
--   * Dealers manage their own rows; every dealer edit returns to moderation.
--   * Admins (profiles.role = 'admin') have full access.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Pure helper functions (needed by table constraints and generated columns)
-- ----------------------------------------------------------------------------

-- The single address that is promoted to admin once its email is confirmed.
create or replace function public.admin_email()
returns text language sql immutable set search_path = '' as $$
  select 'concierge@requestluxury.com'::text;
$$;

create or replace function public.slugify(p_text text)
returns text language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '-', 'g'), '-');
$$;

-- Minimum luxury price floors per vertical (USD).
create or replace function public.price_floor_usd(p_vertical text)
returns numeric language sql immutable set search_path = '' as $$
  select (case p_vertical
    when 'residences' then 450000
    when 'supercars'  then 50000
    when 'yachts'     then 150000
    when 'aviation'   then 250000
    when 'horology'   then 5000
    when 'jewelry'    then 5000
    else 0 end)::numeric;
$$;

-- Tiered lead fee (GBP): < $1M = 25, $1M–$3M = 75, > $3M = 150.
create or replace function public.lead_fee_tier_gbp(p_price_usd numeric)
returns numeric language sql immutable set search_path = '' as $$
  select (case
    when p_price_usd is null or p_price_usd <= 0 then 0
    when p_price_usd < 1000000 then 25
    when p_price_usd <= 3000000 then 75
    else 150 end)::numeric;
$$;

-- Bid ladder used by the auction engine and mirrored in the web app.
create or replace function public.minimum_next_bid(p_starting numeric, p_current numeric, p_bid_count int)
returns numeric language sql immutable set search_path = '' as $$
  select case
    when coalesce(p_bid_count, 0) = 0 then greatest(coalesce(p_starting, 0), 1)
    else coalesce(p_current, 0) + (case
      when p_current < 10000   then 250
      when p_current < 50000   then 500
      when p_current < 250000  then 2500
      when p_current < 1000000 then 10000
      else 25000 end)
  end::numeric;
$$;

-- Public teaser of the gated deal room: titles and types, never the links.
create or replace function public.deal_room_teaser(p_docs jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'title',  coalesce(d ->> 'title', 'Document'),
           'kind',   coalesce(d ->> 'kind', 'document'),
           'access', coalesce(d ->> 'access', 'registered')
         ) order by ord), '[]'::jsonb)
  from jsonb_array_elements(
         case when jsonb_typeof(p_docs) = 'array' then p_docs else '[]'::jsonb end
       ) with ordinality as t(d, ord);
$$;

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text unique not null,
  full_name         text,
  role              text not null default 'buyer' check (role in ('buyer', 'dealer', 'admin')),
  is_verified_buyer boolean not null default false,
  created_at        timestamptz not null default now()
);

create table if not exists public.dealers (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid references public.profiles (id) on delete set null,
  company_name      text not null check (char_length(btrim(company_name)) between 2 and 160),
  slug              text unique not null,
  vertical_focus    text check (vertical_focus in ('residences', 'supercars', 'yachts', 'aviation', 'horology', 'jewelry')),
  country           text not null,
  city              text not null,
  contact_email     text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_name      text,
  whatsapp_number   text,
  website_url       text,
  logo_url          text,
  feed_url          text,
  rera_orn_number   text,
  subscription_tier text not null default 'founding_free' check (subscription_tier in ('founding_free', 'pro', 'elite')),
  stripe_account_id text,
  is_verified       boolean not null default false,
  status            text not null default 'pending_review' check (status in ('pending_review', 'approved', 'suspended')),
  is_showcase       boolean not null default false,
  created_at        timestamptz not null default now()
);

create table if not exists public.listings (
  id                      uuid primary key default gen_random_uuid(),
  dealer_id               uuid references public.dealers (id) on delete cascade,
  title                   text not null check (char_length(btrim(title)) between 3 and 200),
  slug                    text unique not null,
  vertical                text not null check (vertical in ('residences', 'supercars', 'yachts', 'aviation', 'horology', 'jewelry')),
  description             text not null,
  price_usd               numeric(14,2) not null check (price_usd >= 0),
  display_currency        text not null default 'USD' check (display_currency in ('GBP', 'USD', 'EUR', 'AED', 'CHF', 'CNY', 'SAR')),
  price_on_request        boolean not null default false,
  sale_mode               text not null default 'inquire_only' check (sale_mode in ('inquire_only', 'direct_buy', 'hold_deposit', 'timed_auction')),
  deposit_amount_usd      numeric(10,2) not null default 0 check (deposit_amount_usd >= 0),
  country                 text not null,
  city                    text not null,
  exact_address           text,
  property_status         text not null default 'not_applicable' check (property_status in ('ready_built', 'off_plan', 'not_applicable')),
  trakheesi_permit_number text,
  images                  text[] not null default '{}',
  video_url               text,
  deal_room_docs          jsonb not null default '[]'::jsonb check (jsonb_typeof(deal_room_docs) = 'array'),
  specs                   jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  is_auction              boolean not null default false,
  auction_end_time        timestamptz,
  starting_bid_usd        numeric(14,2) not null default 0 check (starting_bid_usd >= 0),
  reserve_price_usd       numeric(14,2) not null default 0 check (reserve_price_usd >= 0),
  current_highest_bid_usd numeric(14,2) not null default 0,
  bid_count               int not null default 0,
  quality_score           int not null default 0,
  is_featured             boolean not null default false,
  moderation_status       text not null default 'pending_review' check (moderation_status in ('pending_review', 'approved', 'rejected', 'archived')),
  admin_notes             text,
  is_showcase             boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- Publishable derivatives of private columns ------------------------------
  public_price_usd  numeric(14,2) generated always as (case when price_on_request then null else price_usd end) stored,
  has_reserve       boolean generated always as (reserve_price_usd > 0) stored,
  reserve_met       boolean generated always as (reserve_price_usd > 0 and current_highest_bid_usd >= reserve_price_usd) stored,
  deal_room_preview jsonb generated always as (public.deal_room_teaser(deal_room_docs)) stored,
  search_tsv        tsvector generated always as (
                      to_tsvector('english',
                        coalesce(title, '') || ' ' || coalesce(city, '') || ' ' || coalesce(country, '') || ' ' ||
                        coalesce(vertical, '') || ' ' || coalesce(description, '') || ' ' || coalesce(specs::text, ''))
                    ) stored,

  -- Dubai Land Department: every Dubai residence advert must carry a Trakheesi permit.
  constraint listings_dubai_trakheesi_required check (
    not (lower(btrim(city)) = 'dubai' and vertical = 'residences')
    or nullif(btrim(coalesce(trakheesi_permit_number, '')), '') is not null
  ),
  -- Regulated real estate is never sold through online checkout or auction.
  constraint listings_residences_inquire_only check (vertical <> 'residences' or sale_mode = 'inquire_only'),
  constraint listings_auction_needs_terms check (not is_auction or (auction_end_time is not null and starting_bid_usd > 0)),
  constraint listings_hold_deposit_needs_amount check (sale_mode <> 'hold_deposit' or deposit_amount_usd > 0),
  constraint listings_price_floor check (price_usd >= public.price_floor_usd(vertical))
);

create index if not exists listings_public_idx   on public.listings (moderation_status, vertical, created_at desc);
create index if not exists listings_featured_idx on public.listings (is_featured) where moderation_status = 'approved';
create index if not exists listings_dealer_idx   on public.listings (dealer_id);
create index if not exists listings_auction_idx  on public.listings (auction_end_time) where is_auction;
create index if not exists listings_search_idx   on public.listings using gin (search_tsv);

create table if not exists public.auction_bids (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings (id) on delete cascade,
  bidder_id      uuid not null references public.profiles (id) on delete cascade,
  bidder_paddle  text not null,
  bid_amount_usd numeric(14,2) not null check (bid_amount_usd > 0),
  created_at     timestamptz not null default now()
);
create index if not exists auction_bids_listing_idx on public.auction_bids (listing_id, bid_amount_usd desc);
create index if not exists auction_bids_bidder_idx  on public.auction_bids (bidder_id);

create sequence if not exists public.lead_reference_seq;

create table if not exists public.leads (
  id                    uuid primary key default gen_random_uuid(),
  lead_reference_code   text unique not null,
  listing_id            uuid references public.listings (id) on delete set null,
  dealer_id             uuid references public.dealers (id) on delete set null,
  lead_type             text not null check (lead_type in (
                          'asset_inquiry', 'whatsapp_click', 'charter_request', 'bespoke_sourcing',
                          'deal_room_unlock', 'b2b_web_build', 'education_concierge', 'concierge_service')),
  buyer_name            text not null check (char_length(btrim(buyer_name)) between 1 and 160),
  buyer_email           text not null check (buyer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(buyer_email) <= 320),
  buyer_phone           text check (buyer_phone is null or char_length(buyer_phone) <= 40),
  message               text check (message is null or char_length(message) <= 5000),
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 8192),
  lead_fee_tier_gbp     numeric(10,2) not null default 0,
  protection_expires_at timestamptz not null default (now() + interval '12 months'),
  admin_status          text not null default 'new' check (admin_status in ('new', 'forwarded_to_dealer', 'closed_won', 'archived')),
  forwarded_at          timestamptz,
  created_at            timestamptz not null default now()
);
create index if not exists leads_status_idx  on public.leads (admin_status, created_at desc);
create index if not exists leads_dealer_idx  on public.leads (dealer_id);
create index if not exists leads_listing_idx on public.leads (listing_id);

-- Partner agency referral payouts (25%–50% commission share) and tiered lead fees.
create table if not exists public.referral_deals (
  id                   uuid primary key default gen_random_uuid(),
  lead_id              uuid unique references public.leads (id) on delete set null,
  dealer_id            uuid references public.dealers (id) on delete set null,
  listing_id           uuid references public.listings (id) on delete set null,
  deal_type            text not null check (deal_type in ('commission_share', 'lead_fee')),
  sale_price_usd       numeric(14,2) not null default 0 check (sale_price_usd >= 0),
  gross_commission_usd numeric(14,2) not null default 0 check (gross_commission_usd >= 0),
  referral_share_rate  numeric(5,4) not null default 0.30 check (referral_share_rate between 0.25 and 0.50),
  referral_payout_usd  numeric(14,2) generated always as (round(gross_commission_usd * referral_share_rate, 2)) stored,
  lead_fee_gbp         numeric(10,2) not null default 0 check (lead_fee_gbp >= 0),
  status               text not null default 'pending' check (status in ('pending', 'invoiced', 'paid', 'void')),
  notes                text,
  closed_at            timestamptz not null default now(),
  paid_at              timestamptz,
  created_at           timestamptz not null default now()
);
create index if not exists referral_deals_dealer_idx on public.referral_deals (dealer_id);

-- Native editorial sponsor banners.
create table if not exists public.sponsors (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,
  headline        text not null,
  body            text,
  cta_label       text not null default 'Discover more',
  target_url      text not null check (target_url ~ '^(https://|/)'),
  image_url       text,
  verticals       text[] not null default '{}',          -- empty = shown everywhere
  is_active       boolean not null default true,
  starts_at       timestamptz,
  ends_at         timestamptz,
  contact_email   text,
  monthly_fee_gbp numeric(10,2) not null default 0,
  report_key      text not null default replace(gen_random_uuid()::text, '-', ''),
  created_at      timestamptz not null default now()
);

-- One row per banner impression or click, stamped with the visitor country.
create table if not exists public.sponsor_events (
  id         bigint generated always as identity primary key,
  sponsor_id uuid not null references public.sponsors (id) on delete cascade,
  event_type text not null check (event_type in ('impression', 'click')),
  country    text not null default 'ZZ' check (country ~ '^[A-Z]{2}$'),
  vertical   text check (vertical is null or char_length(vertical) <= 40),
  path       text check (path is null or char_length(path) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists sponsor_events_sponsor_idx on public.sponsor_events (sponsor_id, created_at desc);

-- Stripe payment ledger, written by the webhook with the service role.
create table if not exists public.payments (
  id                       uuid primary key default gen_random_uuid(),
  stripe_session_id        text unique not null,
  stripe_payment_intent_id text,
  kind                     text not null check (kind in ('showroom_deposit', 'hold_deposit', 'direct_buy', 'auction_settlement', 'dealer_subscription')),
  listing_id               uuid references public.listings (id) on delete set null,
  dealer_id                uuid references public.dealers (id) on delete set null,
  lead_reference_code      text,
  buyer_email              text,
  amount_total             numeric(14,2) not null default 0,
  currency                 text not null default 'gbp',
  status                   text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired', 'refunded')),
  metadata                 jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists payments_created_idx on public.payments (created_at desc);

-- ----------------------------------------------------------------------------
-- 2. Identity helpers (used by policies, triggers and RPC functions)
-- ----------------------------------------------------------------------------

-- Role claim of the current API request; null for SQL Editor / direct sessions.
create or replace function public.request_role()
returns text language sql stable set search_path = '' as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    nullif(current_setting('request.jwt.claim.role', true), '')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

-- True for admins, the service role, the SQL Editor, and the internal writes
-- that the functions in this file perform on behalf of a visitor.
create or replace function public.is_privileged()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.request_role(), 'direct') not in ('anon', 'authenticated')
      or coalesce(current_setting('requestluxury.internal_write', true), '') = 'on'
      or public.is_admin();
$$;

create or replace function public.owns_dealer(p_dealer_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dealers d
    where d.id = p_dealer_id and d.owner_id = (select auth.uid())
  );
$$;

create or replace function public.owns_active_dealer(p_dealer_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dealers d
    where d.id = p_dealer_id and d.owner_id = (select auth.uid()) and d.status <> 'suspended'
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. Triggers
-- ----------------------------------------------------------------------------

-- 3.1 Auto-create a profile for every new auth user. The concierge address is
--     promoted to admin only once its email has been confirmed, so nobody can
--     claim the admin role by registering an address they do not control.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(lower(new.email), new.id::text || '@no-email.requestluxury.invalid'),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), ''),
    case
      when lower(coalesce(new.email, '')) = public.admin_email() and new.email_confirmed_at is not null then 'admin'
      else 'buyer'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_updated()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles p
     set email = coalesce(lower(new.email), p.email),
         role  = case
                   when lower(coalesce(new.email, '')) = public.admin_email() and new.email_confirmed_at is not null then 'admin'
                   else p.role
                 end
   where p.id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, email_confirmed_at on auth.users
  for each row
  when (old.email is distinct from new.email or old.email_confirmed_at is distinct from new.email_confirmed_at)
  execute function public.handle_user_updated();

-- Back-fill profiles for users that existed before this file was first run.
insert into public.profiles (id, email, full_name, role)
select u.id,
       coalesce(lower(u.email), u.id::text || '@no-email.requestluxury.invalid'),
       nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
       case when lower(coalesce(u.email, '')) = public.admin_email() and u.email_confirmed_at is not null then 'admin' else 'buyer' end
from auth.users u
on conflict do nothing;

-- 3.2 Members may edit their name; only admins change roles or verification.
create or replace function public.profiles_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not public.is_privileged() then
    new.id                := old.id;
    new.email             := old.email;
    new.role              := old.role;
    new.is_verified_buyer := old.is_verified_buyer;
    new.created_at        := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- 3.3 Dealers may edit their public details; approval, verification, tier and
--     payout account are controlled by the platform.
create or replace function public.dealers_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not public.is_privileged() then
    new.id                := old.id;
    new.owner_id          := old.owner_id;
    new.slug              := old.slug;
    new.status            := old.status;
    new.is_verified       := old.is_verified;
    new.subscription_tier := old.subscription_tier;
    new.stripe_account_id := old.stripe_account_id;
    new.is_showcase       := old.is_showcase;
    new.created_at        := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists dealers_guard on public.dealers;
create trigger dealers_guard
  before update on public.dealers
  for each row execute function public.dealers_guard();

-- 3.4 Listing moderation guard: any dealer edit returns to 'pending_review'
--     unless the edit is made by an admin.
create or replace function public.listings_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_privileged boolean := public.is_privileged();
begin
  new.updated_at := now();
  new.is_auction := (new.sale_mode = 'timed_auction');

  if tg_op = 'INSERT' then
    if not v_privileged then
      new.moderation_status       := 'pending_review';
      new.is_featured             := false;
      new.is_showcase             := false;
      new.admin_notes             := null;
      new.current_highest_bid_usd := 0;
      new.bid_count               := 0;
      new.created_at              := now();
    end if;
  elsif not v_privileged then
    if old.is_auction and old.bid_count > 0 and (
         new.sale_mode         is distinct from old.sale_mode
      or new.auction_end_time  is distinct from old.auction_end_time
      or new.starting_bid_usd  is distinct from old.starting_bid_usd
      or new.reserve_price_usd is distinct from old.reserve_price_usd) then
      raise exception 'Auction terms cannot be changed once bidding has started' using errcode = '42501';
    end if;
    new.id                      := old.id;
    new.dealer_id               := old.dealer_id;
    new.is_featured             := old.is_featured;
    new.is_showcase             := old.is_showcase;
    new.admin_notes             := old.admin_notes;
    new.current_highest_bid_usd := old.current_highest_bid_usd;
    new.bid_count               := old.bid_count;
    new.created_at              := old.created_at;
    -- A dealer may withdraw (archive) a listing; any other edit is re-moderated.
    new.moderation_status := case when new.moderation_status = 'archived' then 'archived' else 'pending_review' end;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_10_guard on public.listings;
create trigger listings_10_guard
  before insert or update on public.listings
  for each row execute function public.listings_guard();

-- 3.5 Listing Quality Score (0–100).
create or replace function public.listings_quality_score()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.quality_score :=
      (case when coalesce(array_length(new.images, 1), 0) >= 8 then 30 else 0 end)
    + (case when char_length(coalesce(new.description, '')) >= 300 then 25 else 0 end)
    + (case when not new.price_on_request and new.price_usd > 0 then 20 else 0 end)
    + (case when nullif(btrim(coalesce(new.video_url, '')), '') is not null then 15 else 0 end)
    + (case when nullif(btrim(coalesce(new.exact_address, '')), '') is not null then 10 else 0 end);
  return new;
end;
$$;

drop trigger if exists listings_20_quality_score on public.listings;
create trigger listings_20_quality_score
  before insert or update on public.listings
  for each row execute function public.listings_quality_score();

-- 3.6 Auction engine: validates each bid, assigns the paddle, updates the lot
--     and applies the anti-sniping rule (a bid inside the final 120 seconds
--     extends the auction by 120 seconds).
create or replace function public.auction_bids_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_listing public.listings;
  v_bidder  uuid := (select auth.uid());
  v_minimum numeric;
  v_paddle  text;
begin
  if v_bidder is null then
    if public.request_role() in ('anon', 'authenticated') or new.bidder_id is null then
      raise exception 'Please sign in to place a bid' using errcode = '42501';
    end if;
    v_bidder := new.bidder_id;                -- service role acting for a bidder
  end if;

  new.id         := coalesce(new.id, gen_random_uuid());
  new.bidder_id  := v_bidder;
  new.created_at := now();

  if not exists (select 1 from public.profiles p where p.id = v_bidder and p.is_verified_buyer) then
    raise exception 'Bidding is reserved for verified buyers' using errcode = '42501';
  end if;

  select * into v_listing from public.listings where id = new.listing_id for update;

  if not found or v_listing.moderation_status <> 'approved' or not v_listing.is_auction then
    raise exception 'This lot is not open for bidding' using errcode = '22023';
  end if;
  if v_listing.auction_end_time is null or now() >= v_listing.auction_end_time then
    raise exception 'This auction has closed' using errcode = '22023';
  end if;
  if exists (select 1 from public.dealers d where d.id = v_listing.dealer_id and d.owner_id = v_bidder) then
    raise exception 'Sellers cannot bid on their own lots' using errcode = '42501';
  end if;

  v_minimum := public.minimum_next_bid(v_listing.starting_bid_usd, v_listing.current_highest_bid_usd, v_listing.bid_count);
  if new.bid_amount_usd < v_minimum then
    raise exception 'The minimum bid is now USD %', to_char(v_minimum, 'FM999,999,999,990') using errcode = '22023';
  end if;

  select b.bidder_paddle into v_paddle
    from public.auction_bids b
   where b.listing_id = new.listing_id and b.bidder_id = v_bidder
   limit 1;
  if v_paddle is null then
    select 'P-' || (101 + count(distinct b.bidder_id))::text into v_paddle
      from public.auction_bids b
     where b.listing_id = new.listing_id;
  end if;
  new.bidder_paddle := v_paddle;

  perform set_config('requestluxury.internal_write', 'on', true);
  update public.listings l
     set current_highest_bid_usd = new.bid_amount_usd,
         bid_count               = l.bid_count + 1,
         auction_end_time        = case
                                     when l.auction_end_time - now() <= interval '120 seconds'
                                       then l.auction_end_time + interval '120 seconds'
                                     else l.auction_end_time
                                   end
   where l.id = new.listing_id;
  perform set_config('requestluxury.internal_write', 'off', true);

  return new;
end;
$$;

drop trigger if exists auction_bids_before_insert on public.auction_bids;
create trigger auction_bids_before_insert
  before insert on public.auction_bids
  for each row execute function public.auction_bids_before_insert();

-- 3.7 Leads: reference code (RL-YYYY-NNNNN), dealer attribution, fee tier and
--     the 12-month protection window are always set by the database.
create or replace function public.leads_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_privileged boolean := public.is_privileged();
  v_price      numeric;
  v_dealer     uuid;
  v_status     text;
begin
  new.id          := coalesce(new.id, gen_random_uuid());
  new.buyer_name  := btrim(new.buyer_name);
  new.buyer_email := lower(btrim(new.buyer_email));
  new.metadata    := coalesce(new.metadata, '{}'::jsonb);

  if not v_privileged or new.lead_reference_code is null then
    new.lead_reference_code := 'RL-' || to_char(now(), 'YYYY') || '-' ||
                               lpad(nextval('public.lead_reference_seq')::text, 5, '0');
  end if;

  if not v_privileged then
    new.dealer_id             := null;
    new.lead_fee_tier_gbp     := 0;
    new.admin_status          := 'new';
    new.forwarded_at          := null;
    new.created_at            := now();
    new.protection_expires_at := now() + interval '12 months';
  end if;

  if new.listing_id is not null then
    select l.price_usd, l.dealer_id, l.moderation_status
      into v_price, v_dealer, v_status
      from public.listings l
     where l.id = new.listing_id;
    if not found or (v_status <> 'approved' and not v_privileged) then
      raise exception 'This listing is not available' using errcode = '22023';
    end if;
    new.dealer_id := coalesce(new.dealer_id, v_dealer);
  elsif (new.metadata ->> 'budget_usd') ~ '^[0-9]{1,12}(\.[0-9]{1,2})?$' then
    v_price := (new.metadata ->> 'budget_usd')::numeric;
  end if;

  if coalesce(new.lead_fee_tier_gbp, 0) = 0 then
    new.lead_fee_tier_gbp := public.lead_fee_tier_gbp(v_price);
  end if;
  return new;
end;
$$;

drop trigger if exists leads_before_insert on public.leads;
create trigger leads_before_insert
  before insert on public.leads
  for each row execute function public.leads_before_insert();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists payments_touch on public.payments;
create trigger payments_touch
  before update on public.payments
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 4. RPC functions (the only doors to private columns)
-- ----------------------------------------------------------------------------

-- 4.1 Create a lead from any public form and return its protected reference.
--     For WhatsApp clicks the dealer's number is released together with the
--     reference, so every introduction is on the 12-month audit trail first.
create or replace function public.create_lead(
  p_lead_type   text,
  p_buyer_name  text,
  p_buyer_email text,
  p_buyer_phone text default null,
  p_message     text default null,
  p_listing_id  uuid default null,
  p_metadata    jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_lead     public.leads;
  v_whatsapp text;
  v_company  text;
begin
  if p_lead_type in ('whatsapp_click', 'deal_room_unlock') and p_listing_id is not null then
    select * into v_lead
      from public.leads l
     where l.listing_id = p_listing_id
       and l.lead_type = p_lead_type
       and l.buyer_email = lower(btrim(p_buyer_email))
       and l.created_at > now() - interval '24 hours'
     order by l.created_at desc
     limit 1;
  end if;

  if v_lead.id is null then
    insert into public.leads (lead_type, listing_id, buyer_name, buyer_email, buyer_phone, message, metadata)
    values (p_lead_type, p_listing_id, p_buyer_name, p_buyer_email,
            nullif(btrim(coalesce(p_buyer_phone, '')), ''),
            nullif(btrim(coalesce(p_message, '')), ''),
            coalesce(p_metadata, '{}'::jsonb))
    returning * into v_lead;
  end if;

  if v_lead.dealer_id is not null then
    select d.company_name,
           case when p_lead_type = 'whatsapp_click' and not d.is_showcase then d.whatsapp_number end
      into v_company, v_whatsapp
      from public.dealers d
     where d.id = v_lead.dealer_id and d.status = 'approved';
  end if;

  return jsonb_build_object(
    'id',                    v_lead.id,
    'reference',             v_lead.lead_reference_code,
    'protection_expires_at', v_lead.protection_expires_at,
    'lead_fee_tier_gbp',     v_lead.lead_fee_tier_gbp,
    'dealer_name',           v_company,
    'dealer_whatsapp',       v_whatsapp
  );
end;
$$;

-- 4.2 Gated deal room. Contact details unlock 'registered' documents at once;
--     'verified' documents are released to verified buyers, the owning dealer
--     and admins only.
create or replace function public.unlock_deal_room(
  p_listing_id  uuid,
  p_buyer_name  text,
  p_buyer_email text,
  p_buyer_phone text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_listing  public.listings;
  v_lead     jsonb;
  v_verified boolean;
  v_docs     jsonb;
begin
  select * into v_listing
    from public.listings l
   where l.id = p_listing_id and l.moderation_status = 'approved';
  if not found then
    raise exception 'This listing is not available' using errcode = '22023';
  end if;

  v_lead := public.create_lead('deal_room_unlock', p_buyer_name, p_buyer_email, p_buyer_phone,
                               'Deal room access requested', p_listing_id,
                               jsonb_build_object('source', 'deal_room'));

  v_verified := public.is_admin()
             or public.owns_dealer(v_listing.dealer_id)
             or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_verified_buyer);

  select coalesce(jsonb_agg(jsonb_build_object(
           'title',  coalesce(d ->> 'title', 'Document'),
           'kind',   coalesce(d ->> 'kind', 'document'),
           'access', coalesce(d ->> 'access', 'registered'),
           'url',    case when coalesce(d ->> 'access', 'registered') = 'registered' or v_verified
                          then d ->> 'url' end
         ) order by ord), '[]'::jsonb)
    into v_docs
    from jsonb_array_elements(v_listing.deal_room_docs) with ordinality as t(d, ord);

  return jsonb_build_object(
    'reference',             v_lead ->> 'reference',
    'protection_expires_at', v_lead ->> 'protection_expires_at',
    'verified',              v_verified,
    'documents',             v_docs,
    'exact_address',         case when v_verified then v_listing.exact_address end
  );
end;
$$;

-- 4.3 Self-serve dealer application with optional bulk inventory (max 200 rows).
create or replace function public.submit_dealer_application(
  p_application jsonb,
  p_listings    jsonb default '[]'::jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := (select auth.uid());
  v_dealer public.dealers;
  v_count  int := 0;
begin
  if jsonb_typeof(p_application) <> 'object' then
    raise exception 'Invalid application' using errcode = '22023';
  end if;
  if coalesce(jsonb_typeof(p_listings), 'null') <> 'array' or jsonb_array_length(p_listings) > 200 then
    raise exception 'A maximum of 200 listings can be submitted at once' using errcode = '22023';
  end if;

  insert into public.dealers (
    owner_id, company_name, slug, vertical_focus, country, city, contact_email, contact_name,
    whatsapp_number, website_url, logo_url, feed_url, rera_orn_number)
  values (
    v_uid,
    btrim(p_application ->> 'company_name'),
    public.slugify(p_application ->> 'company_name') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6),
    nullif(p_application ->> 'vertical_focus', ''),
    btrim(p_application ->> 'country'),
    btrim(p_application ->> 'city'),
    lower(btrim(p_application ->> 'contact_email')),
    nullif(btrim(coalesce(p_application ->> 'contact_name', '')), ''),
    nullif(btrim(coalesce(p_application ->> 'whatsapp_number', '')), ''),
    nullif(btrim(coalesce(p_application ->> 'website_url', '')), ''),
    nullif(btrim(coalesce(p_application ->> 'logo_url', '')), ''),
    nullif(btrim(coalesce(p_application ->> 'feed_url', '')), ''),
    nullif(btrim(coalesce(p_application ->> 'rera_orn_number', '')), ''))
  returning * into v_dealer;

  if v_uid is not null then
    perform set_config('requestluxury.internal_write', 'on', true);
    update public.profiles set role = 'dealer' where id = v_uid and role = 'buyer';
    perform set_config('requestluxury.internal_write', 'off', true);
  end if;

  -- Listings pass through the moderation guard and land in 'pending_review'.
  insert into public.listings (
    dealer_id, title, slug, vertical, description, price_usd, display_currency, price_on_request,
    country, city, exact_address, property_status, trakheesi_permit_number, images, video_url, specs)
  select
    v_dealer.id,
    btrim(x.title),
    public.slugify(x.title) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
    x.vertical,
    x.description,
    x.price_usd,
    coalesce(nullif(x.display_currency, ''), 'USD'),
    coalesce(x.price_on_request, false),
    x.country,
    x.city,
    nullif(btrim(coalesce(x.exact_address, '')), ''),
    coalesce(nullif(x.property_status, ''), 'not_applicable'),
    nullif(btrim(coalesce(x.trakheesi_permit_number, '')), ''),
    coalesce((select array_agg(v) from jsonb_array_elements_text(
               case when jsonb_typeof(x.images) = 'array' then x.images else '[]'::jsonb end) as v), '{}'),
    nullif(btrim(coalesce(x.video_url, '')), ''),
    case when jsonb_typeof(x.specs) = 'object' then x.specs else '{}'::jsonb end
  from jsonb_to_recordset(p_listings) as x(
    title text, vertical text, description text, price_usd numeric, display_currency text,
    price_on_request boolean, country text, city text, exact_address text, property_status text,
    trakheesi_permit_number text, images jsonb, video_url text, specs jsonb);
  get diagnostics v_count = row_count;

  return jsonb_build_object('dealer_id', v_dealer.id, 'slug', v_dealer.slug, 'listings_received', v_count);
end;
$$;

-- 4.4 Full rows (including private columns) for admins and the owning dealer.
create or replace function public.manage_listings()
returns setof public.listings language sql stable security definer set search_path = '' as $$
  select l.* from public.listings l
  where public.is_admin() or public.owns_dealer(l.dealer_id);
$$;

create or replace function public.manage_dealers()
returns setof public.dealers language sql stable security definer set search_path = '' as $$
  select d.* from public.dealers d
  where public.is_admin() or d.owner_id = (select auth.uid());
$$;

create or replace function public.admin_sponsors()
returns setof public.sponsors language sql stable security definer set search_path = '' as $$
  select s.* from public.sponsors s where public.is_admin();
$$;

-- 4.5 Live auction state for the realtime auction box (safe for visitors).
create or replace function public.auction_state(p_listing_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'listing_id',              l.id,
    'starting_bid_usd',        l.starting_bid_usd,
    'current_highest_bid_usd', l.current_highest_bid_usd,
    'bid_count',               l.bid_count,
    'auction_end_time',        l.auction_end_time,
    'minimum_next_bid_usd',    public.minimum_next_bid(l.starting_bid_usd, l.current_highest_bid_usd, l.bid_count),
    'has_reserve',             l.has_reserve,
    'reserve_met',             l.reserve_met,
    'ended',                   l.auction_end_time <= now(),
    'server_time',             now(),
    'is_verified_buyer',       coalesce((select p.is_verified_buyer from public.profiles p where p.id = (select auth.uid())), false),
    'my_paddle',               (select b.bidder_paddle from public.auction_bids b
                                 where b.listing_id = l.id and b.bidder_id = (select auth.uid()) limit 1),
    'i_am_highest',            coalesce((select b.bidder_id = (select auth.uid()) from public.auction_bids b
                                 where b.listing_id = l.id order by b.bid_amount_usd desc limit 1), false),
    'recent_bids',             coalesce((select jsonb_agg(x) from (
                                 select b.bidder_paddle, b.bid_amount_usd, b.created_at
                                   from public.auction_bids b
                                  where b.listing_id = l.id
                                  order by b.bid_amount_usd desc
                                  limit 8) x), '[]'::jsonb)
  )
  from public.listings l
  where l.id = p_listing_id and l.moderation_status = 'approved' and l.is_auction;
$$;

-- 4.6 A member's own bidding activity.
create or replace function public.my_bids()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x.auction_end_time desc), '[]'::jsonb)
  from (
    select l.id as listing_id, l.title, l.slug, l.images[1] as image,
           l.current_highest_bid_usd, l.auction_end_time,
           max(b.bid_amount_usd) as my_highest_bid_usd,
           min(b.bidder_paddle) as paddle,
           max(b.bid_amount_usd) = l.current_highest_bid_usd as i_am_highest
      from public.auction_bids b
      join public.listings l on l.id = b.listing_id
     where b.bidder_id = (select auth.uid())
     group by l.id
  ) x;
$$;

-- 4.7 Admin auction ledger: who holds each paddle.
create or replace function public.admin_auction_ledger(p_listing_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'paddle', b.bidder_paddle, 'amount_usd', b.bid_amount_usd, 'created_at', b.created_at,
           'bidder_email', p.email, 'bidder_name', p.full_name
         ) order by b.bid_amount_usd desc), '[]'::jsonb)
  from public.auction_bids b
  join public.profiles p on p.id = b.bidder_id
  where b.listing_id = p_listing_id and public.is_admin();
$$;

-- 4.8 Sponsor ROI report, opened with the private key in the report link.
create or replace function public.sponsor_report(p_slug text, p_key text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_sponsor public.sponsors;
begin
  select * into v_sponsor from public.sponsors s where s.slug = p_slug;
  if not found then
    return null;
  end if;
  if v_sponsor.report_key is distinct from p_key and not public.is_admin() then
    return null;
  end if;

  return jsonb_build_object(
    'sponsor', jsonb_build_object(
      'name', v_sponsor.name, 'slug', v_sponsor.slug, 'headline', v_sponsor.headline,
      'is_active', v_sponsor.is_active, 'verticals', v_sponsor.verticals, 'created_at', v_sponsor.created_at),
    'totals', (
      select jsonb_build_object(
        'impressions', count(*) filter (where e.event_type = 'impression'),
        'clicks',      count(*) filter (where e.event_type = 'click'))
      from public.sponsor_events e where e.sponsor_id = v_sponsor.id),
    'last_30_days', (
      select jsonb_build_object(
        'impressions', count(*) filter (where e.event_type = 'impression'),
        'clicks',      count(*) filter (where e.event_type = 'click'))
      from public.sponsor_events e
      where e.sponsor_id = v_sponsor.id and e.created_at >= now() - interval '30 days'),
    'by_country', (
      select coalesce(jsonb_agg(c order by c.impressions desc, c.clicks desc), '[]'::jsonb)
      from (
        select e.country,
               count(*) filter (where e.event_type = 'impression') as impressions,
               count(*) filter (where e.event_type = 'click') as clicks
        from public.sponsor_events e
        where e.sponsor_id = v_sponsor.id
        group by e.country
        order by 2 desc, 3 desc
        limit 40) c),
    'by_vertical', (
      select coalesce(jsonb_agg(c order by c.impressions desc), '[]'::jsonb)
      from (
        select coalesce(e.vertical, 'home') as vertical,
               count(*) filter (where e.event_type = 'impression') as impressions,
               count(*) filter (where e.event_type = 'click') as clicks
        from public.sponsor_events e
        where e.sponsor_id = v_sponsor.id
        group by 1) c),
    'by_day', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'day', to_char(d.day, 'YYYY-MM-DD'),
               'impressions', coalesce(s.impressions, 0),
               'clicks', coalesce(s.clicks, 0)) order by d.day), '[]'::jsonb)
      from generate_series((now() at time zone 'utc')::date - 29, (now() at time zone 'utc')::date, interval '1 day') as d(day)
      left join (
        select (e.created_at at time zone 'utc')::date as day,
               count(*) filter (where e.event_type = 'impression') as impressions,
               count(*) filter (where e.event_type = 'click') as clicks
        from public.sponsor_events e
        where e.sponsor_id = v_sponsor.id and e.created_at >= now() - interval '31 days'
        group by 1) s on s.day = d.day::date)
  );
end;
$$;

-- 4.9 Counters for the admin overview.
create or replace function public.admin_overview()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when not public.is_admin() then null else jsonb_build_object(
    'listings_pending',  (select count(*) from public.listings where moderation_status = 'pending_review'),
    'listings_approved', (select count(*) from public.listings where moderation_status = 'approved'),
    'dealers_pending',   (select count(*) from public.dealers where status = 'pending_review'),
    'dealers_approved',  (select count(*) from public.dealers where status = 'approved'),
    'leads_new',         (select count(*) from public.leads where admin_status = 'new'),
    'leads_total',       (select count(*) from public.leads),
    'buyers_unverified', (select count(*) from public.profiles where role = 'buyer' and not is_verified_buyer),
    'sponsors_active',   (select count(*) from public.sponsors where is_active),
    'deals_open',        (select count(*) from public.referral_deals where status in ('pending', 'invoiced')),
    'payments_paid_30d', (select count(*) from public.payments where status = 'paid' and created_at >= now() - interval '30 days')
  ) end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Row Level Security
-- ----------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.dealers        enable row level security;
alter table public.listings       enable row level security;
alter table public.auction_bids   enable row level security;
alter table public.leads          enable row level security;
alter table public.referral_deals enable row level security;
alter table public.sponsors       enable row level security;
alter table public.sponsor_events enable row level security;
alter table public.payments       enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists profiles_read_own_or_admin on public.profiles;
create policy profiles_read_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- dealers -------------------------------------------------------------------
drop policy if exists dealers_public_read on public.dealers;
create policy dealers_public_read on public.dealers
  for select to anon, authenticated
  using (status = 'approved');

drop policy if exists dealers_owner_read on public.dealers;
create policy dealers_owner_read on public.dealers
  for select to authenticated
  using (public.owns_dealer(id));

drop policy if exists dealers_owner_update on public.dealers;
create policy dealers_owner_update on public.dealers
  for update to authenticated
  using (public.owns_dealer(id))
  with check (public.owns_dealer(id));

drop policy if exists dealers_admin_all on public.dealers;
create policy dealers_admin_all on public.dealers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- listings ------------------------------------------------------------------
drop policy if exists listings_public_read on public.listings;
create policy listings_public_read on public.listings
  for select to anon, authenticated
  using (moderation_status = 'approved');

drop policy if exists listings_dealer_read on public.listings;
create policy listings_dealer_read on public.listings
  for select to authenticated
  using (public.owns_dealer(dealer_id));

drop policy if exists listings_dealer_insert on public.listings;
create policy listings_dealer_insert on public.listings
  for insert to authenticated
  with check (public.owns_active_dealer(dealer_id));

drop policy if exists listings_dealer_update on public.listings;
create policy listings_dealer_update on public.listings
  for update to authenticated
  using (public.owns_active_dealer(dealer_id))
  with check (public.owns_active_dealer(dealer_id));

drop policy if exists listings_admin_all on public.listings;
create policy listings_admin_all on public.listings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- auction_bids --------------------------------------------------------------
drop policy if exists auction_bids_public_read on public.auction_bids;
create policy auction_bids_public_read on public.auction_bids
  for select to anon, authenticated
  using (true);

drop policy if exists auction_bids_verified_insert on public.auction_bids;
create policy auction_bids_verified_insert on public.auction_bids
  for insert to authenticated
  with check (
    bidder_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_verified_buyer)
  );

drop policy if exists auction_bids_admin_all on public.auction_bids;
create policy auction_bids_admin_all on public.auction_bids
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- leads ---------------------------------------------------------------------
drop policy if exists leads_public_insert on public.leads;
create policy leads_public_insert on public.leads
  for insert to anon, authenticated
  with check (true);

drop policy if exists leads_dealer_read_forwarded on public.leads;
create policy leads_dealer_read_forwarded on public.leads
  for select to authenticated
  using (admin_status = 'forwarded_to_dealer' and public.owns_dealer(dealer_id));

drop policy if exists leads_admin_all on public.leads;
create policy leads_admin_all on public.leads
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- referral_deals ------------------------------------------------------------
drop policy if exists referral_deals_dealer_read on public.referral_deals;
create policy referral_deals_dealer_read on public.referral_deals
  for select to authenticated
  using (public.owns_dealer(dealer_id));

drop policy if exists referral_deals_admin_all on public.referral_deals;
create policy referral_deals_admin_all on public.referral_deals
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- sponsors ------------------------------------------------------------------
drop policy if exists sponsors_public_read_active on public.sponsors;
create policy sponsors_public_read_active on public.sponsors
  for select to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists sponsors_admin_all on public.sponsors;
create policy sponsors_admin_all on public.sponsors
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- sponsor_events ------------------------------------------------------------
drop policy if exists sponsor_events_public_insert on public.sponsor_events;
create policy sponsor_events_public_insert on public.sponsor_events
  for insert to anon, authenticated
  with check (exists (select 1 from public.sponsors s where s.id = sponsor_id and s.is_active));

drop policy if exists sponsor_events_admin_all on public.sponsor_events;
create policy sponsor_events_admin_all on public.sponsor_events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- payments ------------------------------------------------------------------
drop policy if exists payments_admin_read on public.payments;
create policy payments_admin_read on public.payments
  for select to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 6. Privileges: column-level grants keep private data out of the public API
-- ----------------------------------------------------------------------------

revoke all on table public.profiles, public.dealers, public.listings, public.auction_bids,
                    public.leads, public.referral_deals, public.sponsors, public.sponsor_events,
                    public.payments
  from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;

grant all on table public.profiles, public.dealers, public.listings, public.auction_bids,
                   public.leads, public.referral_deals, public.sponsors, public.sponsor_events,
                   public.payments
  to service_role;
grant usage, select on sequence public.lead_reference_seq to service_role;

-- profiles
grant select on table public.profiles to authenticated;
grant update (full_name, role, is_verified_buyer) on table public.profiles to authenticated;

-- dealers (contact details, feed URL, payout account and owner stay private)
grant select (id, company_name, slug, vertical_focus, country, city, logo_url, website_url, rera_orn_number,
              subscription_tier, is_verified, status, is_showcase, created_at)
  on table public.dealers to anon, authenticated;
grant insert, update, delete on table public.dealers to authenticated;

-- listings (price_usd, exact_address, deal_room_docs, reserve_price_usd and admin_notes stay private)
grant select (id, dealer_id, title, slug, vertical, description, public_price_usd, display_currency,
              price_on_request, sale_mode, deposit_amount_usd, country, city, property_status,
              trakheesi_permit_number, images, video_url, specs, is_auction, auction_end_time,
              starting_bid_usd, current_highest_bid_usd, bid_count, has_reserve, reserve_met,
              quality_score, is_featured, moderation_status, is_showcase, deal_room_preview,
              search_tsv, created_at, updated_at)
  on table public.listings to anon, authenticated;
grant insert, update, delete on table public.listings to authenticated;

-- auction_bids (the bidder identity is never exposed)
grant select (id, listing_id, bidder_paddle, bid_amount_usd, created_at)
  on table public.auction_bids to anon, authenticated;
grant insert (listing_id, bidder_id, bid_amount_usd) on table public.auction_bids to authenticated;
grant delete on table public.auction_bids to authenticated;

-- leads
grant insert (lead_type, listing_id, buyer_name, buyer_email, buyer_phone, message, metadata)
  on table public.leads to anon, authenticated;
grant select, update, delete on table public.leads to authenticated;

-- referral_deals
grant select, insert, update, delete on table public.referral_deals to authenticated;

-- sponsors (report key, contact and fee stay private)
grant select (id, name, slug, headline, body, cta_label, target_url, image_url, verticals,
              is_active, starts_at, ends_at, created_at)
  on table public.sponsors to anon, authenticated;
grant insert, update, delete on table public.sponsors to authenticated;

-- sponsor_events
grant insert (sponsor_id, event_type, country, vertical, path) on table public.sponsor_events to anon, authenticated;
grant select, delete on table public.sponsor_events to authenticated;

-- payments
grant select on table public.payments to authenticated;

-- Functions: nothing is callable through the API unless granted below.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.price_floor_usd(text)                     to anon, authenticated, service_role;
grant execute on function public.lead_fee_tier_gbp(numeric)                to anon, authenticated, service_role;
grant execute on function public.minimum_next_bid(numeric, numeric, int)   to anon, authenticated, service_role;
grant execute on function public.deal_room_teaser(jsonb)                   to anon, authenticated, service_role;
grant execute on function public.slugify(text)                             to anon, authenticated, service_role;
grant execute on function public.request_role()                            to anon, authenticated, service_role;
grant execute on function public.is_admin()                                to anon, authenticated, service_role;
grant execute on function public.is_privileged()                           to anon, authenticated, service_role;
grant execute on function public.owns_dealer(uuid)                         to anon, authenticated, service_role;
grant execute on function public.owns_active_dealer(uuid)                  to anon, authenticated, service_role;
grant execute on function public.create_lead(text, text, text, text, text, uuid, jsonb) to anon, authenticated, service_role;
grant execute on function public.unlock_deal_room(uuid, text, text, text)  to anon, authenticated, service_role;
grant execute on function public.submit_dealer_application(jsonb, jsonb)   to anon, authenticated, service_role;
grant execute on function public.auction_state(uuid)                       to anon, authenticated, service_role;
grant execute on function public.sponsor_report(text, text)                to anon, authenticated, service_role;
grant execute on function public.manage_listings()                         to authenticated, service_role;
grant execute on function public.manage_dealers()                          to authenticated, service_role;
grant execute on function public.admin_sponsors()                          to authenticated, service_role;
grant execute on function public.my_bids()                                 to authenticated, service_role;
grant execute on function public.admin_auction_ledger(uuid)                to authenticated, service_role;
grant execute on function public.admin_overview()                          to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. Realtime: broadcast new bids to the live auction box
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'auction_bids') then
    alter publication supabase_realtime add table public.auction_bids;
  end if;
end;
$$;

-- Ask the API layer to pick up the new tables and functions immediately.
notify pgrst, 'reload schema';
