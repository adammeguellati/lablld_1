-- =============================================================================
-- LABLLD — 0001_initial_schema
-- =============================================================================
-- RECONSTRUCTED FROM CODE EVIDENCE. The original Supabase project is unreachable
-- and this repository has never contained a migration, a schema dump, or a
-- generated types file (see docs/audit/CODE-AUDIT-2026-08.md §5, on branch
-- docs/code-audit).
--
-- Every table, column, type and constraint below was inferred from:
--   * types/index.ts                     (hand-written domain types)
--   * every .from()/.select()/.insert()/.update()/.upsert()/.delete() call site
--   * the Zod schemas in app/api/admin/products/*                (write contracts)
--   * .storage.from() call sites                                 (buckets, paths)
--
-- CLAUDE.md was treated as a hint only. It is provably stale: it omits
-- merchant_labels, platform_settings and ~15 columns, and lists three Stripe
-- columns that no longer appear in types/index.ts.
--
-- Per-column evidence, and every place a type or nullability was GUESSED rather
-- than proven, is in docs/db/SCHEMA-RECONSTRUCTION-NOTES.md. Read the CONFIDENCE
-- section there before applying this anywhere.
--
-- THIS FILE HAS NOT BEEN RUN AGAINST ANY LABLLD DATABASE. It was validated for
-- syntax against a throwaway local Postgres 16 container only.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- Every value below is enumerated from a TypeScript union in types/index.ts and
-- cross-checked against every literal the code actually writes.
-- -----------------------------------------------------------------------------

-- types/index.ts:1
create type plan as enum ('starter', 'plus');

-- types/index.ts:9
create type plan_status as enum ('active', 'past_due', 'cancelled');

-- types/index.ts:10-19. All nine values are written somewhere in app/.
create type order_status as enum (
  'quote_pending',    -- app/(merchant)/orders/new/actions.ts:37, api/webhooks/shopify/_process-order.ts:69
  'payment_pending',  -- app/admin/orders/[id]/actions.ts:60
  'pending',          -- app/admin/orders/[id]/actions.ts:67 (.in() guard)
  'paid',             -- app/(auth)/onboarding/actions.ts:59, app/admin/orders/new/actions.ts:37
  'payment_failed',   -- app/(merchant)/orders/actions.ts:27
  'in_production',    -- app/admin/orders/[id]/actions.ts:99
  'shipped',          -- app/admin/orders/[id]/actions.ts:129
  'delivered',        -- app/admin/orders/[id]/actions.ts:91
  'cancelled'         -- app/(merchant)/orders/actions.ts:40
);

-- types/index.ts:20, and the z.enum() in app/api/admin/products/route.ts:48
create type product_category as enum ('supplements', 'cosmeticos', 'cafe');

-- types/index.ts:21
create type label_status as enum ('pending', 'approved', 'rejected');

-- types/index.ts:146
create type shipping_tier as enum ('standard', 'express');

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- No code path ever writes merchants.updated_at or merchant_products.updated_at,
-- yet types/index.ts declares both non-null. A trigger is the only mechanism
-- that reconciles those two facts.
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- merchants
-- PK is the Supabase auth user id: app/(auth)/actions.ts:84 upserts
-- { id: data.user.id }, and app/api/admin/merchants/[id]/route.ts:67 calls
-- auth.admin.deleteUser(id) with the same value.
-- -----------------------------------------------------------------------------
create table merchants (
  id                            uuid primary key references auth.users (id) on delete cascade,
  email                         text        not null unique,
  full_name                     text        not null,

  -- Wompi subscription state
  wompi_payment_source_id       integer,
  subscription_started_at       timestamptz,
  -- DATE, not timestamptz: written as .toISOString().slice(0,10) and compared
  -- with .lte(today) where today is a YYYY-MM-DD string
  -- (app/(auth)/onboarding/actions.ts:55, app/api/cron/billing/route.ts:14,24).
  subscription_next_billing_at  date,

  plan                          plan,
  pending_plan                  plan,
  plan_status                   plan_status not null default 'active',
  -- Assigned directly from subscription_next_billing_at
  -- (app/(merchant)/settings/billing/actions.ts:39-40) so it shares that type.
  plan_cancel_at                date,

  is_active                     boolean     not null default true,
  shopify_connected             boolean     not null default false,
  shopify_request_domain        text,

  -- SudoMock render quota. MOCKUP_LIMIT = 6 per calendar month is enforced in
  -- app/(merchant)/products/[id]/actions.ts:9,112.
  mockup_credits_used           integer     not null default 0,
  mockup_credits_reset_at       timestamptz,

  -- LEGACY. Not declared in types/index.ts. The only remaining reader/writer is
  -- app/api/webhooks/stripe/route.ts (58, 79, 88, 105, 115), an abandoned
  -- integration flagged as risk R2 in the code audit. Kept so that route does
  -- not 42703 if it is still receiving events. Drop it with the Stripe route.
  stripe_subscription_id        text,

  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create trigger merchants_set_updated_at
  before update on merchants
  for each row execute function set_updated_at();

-- app/api/cron/billing/route.ts:19-32 filters on
-- (plan is not null, plan_status, subscription_next_billing_at <= today).
create index merchants_billing_sweep_idx
  on merchants (plan_status, subscription_next_billing_at)
  where plan is not null;

-- app/admin/merchants/page.tsx:18
create index merchants_created_at_idx on merchants (created_at desc);

-- app/api/webhooks/stripe/route.ts filters on this in five places.
create index merchants_stripe_subscription_id_idx
  on merchants (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- -----------------------------------------------------------------------------
-- products — the LABLLD master catalog
-- Column list is the union of types/index.ts:73-121 and the Zod productSchema
-- at app/api/admin/products/route.ts:40-81, which is the authoritative write
-- contract. Integer vs numeric follows whether Zod asserts .int().
-- -----------------------------------------------------------------------------
create table products (
  id                          uuid primary key default gen_random_uuid(),
  name                        text             not null,
  -- app/(merchant)/catalog/[slug]/page.tsx:38 resolves .eq('slug', slug).single(),
  -- which errors on more than one row. Nullable, so multiple NULLs are allowed.
  slug                        text unique,
  sku                         text,
  description                 text,
  short_description           text,
  long_description            text,

  -- z.number().positive() — no .int() assertion, so numeric not integer.
  base_price                  numeric(12,2)    not null,
  wholesale_price_usd         numeric(12,2),
  -- These four ARE asserted z.number().int().min(0).nullable().
  price_cop                   integer,
  suggested_retail_price_cop  integer,
  shipping_cost_cop           integer,
  stock                       integer,

  category                    product_category not null,
  format                      text,

  available_tiers             plan[]           not null default '{}',
  images                      text[]           not null default '{}',
  icons                       text[]           not null default '{}',

  benefit_blocks              jsonb,
  science_facts               jsonb,
  supplement_facts            jsonb,

  ingredients_list            text,
  other_ingredients           text,
  -- serving_size / servings_per_container are declared in types/index.ts:97-98
  -- but absent from BOTH Zod schemas, so nothing can write them. The same two
  -- values also live inside supplement_facts. Almost certainly superseded.
  serving_size                text,
  servings_per_container      integer,
  suggested_use               text,
  warning                     text,

  manufacturer_country        text,
  product_weight_g            numeric(10,2),
  gross_weight_g              numeric(10,2),
  shipping_scope              text,
  -- z.number().optional() with no .int(), unlike the other *_cop columns.
  fulfillment_fee_cop         numeric(12,2),

  mockup_template_id          text,
  mockup_smart_object_uuid    text,
  mockup_so_width             integer,
  mockup_so_height            integer,
  label_area                  jsonb,
  label_dimensions            jsonb,
  label_template_url          text,
  canva_template_url          text,
  theme_labels                jsonb,

  is_active                   boolean          not null default true,
  is_new                      boolean          not null default false,

  created_by                  uuid references auth.users (id) on delete set null,
  created_at                  timestamptz      not null default now(),
  updated_at                  timestamptz      not null default now()
);

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

-- app/(merchant)/catalog/page.tsx:18 and app/(merchant)/dashboard/page.tsx:30
create index products_active_created_idx on products (created_at desc) where is_active;
create index products_category_idx       on products (category);

-- -----------------------------------------------------------------------------
-- shipping_rates — per-product, per-country freight
-- Rewritten wholesale on every product PATCH: delete-all then re-insert
-- (app/api/admin/products/[id]/route.ts:96-102). No upsert, hence no natural key.
-- -----------------------------------------------------------------------------
create table shipping_rates (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid          not null references products (id) on delete restrict,
  country      text          not null,
  -- z.string().length(2) at app/api/admin/products/route.ts:11
  country_code char(2)       not null,
  rate         numeric(12,2) not null,
  rate_cop     integer,
  created_at   timestamptz   not null default now()
);

create index shipping_rates_product_id_idx on shipping_rates (product_id);

-- -----------------------------------------------------------------------------
-- merchant_products — a merchant's labelled SKU derived from a master product
-- -----------------------------------------------------------------------------
create table merchant_products (
  id                     uuid primary key default gen_random_uuid(),
  merchant_id            uuid          not null references merchants (id) on delete restrict,
  product_id             uuid          not null references products  (id) on delete restrict,

  label_url              text,
  label_status           label_status  not null default 'pending',
  label_rejection_reason text,
  mockup_url             text,

  -- Shopify ids arrive as numbers and are stored via String(): text, not bigint
  -- (app/api/webhooks/shopify/_process-order.ts:34).
  shopify_product_id     text,
  shopify_variant_id     text,

  custom_name            text,
  -- Declared at types/index.ts:144 but no code path reads or writes it.
  custom_description     text,
  retail_price           numeric(12,2),
  shipping_tier          shipping_tier not null default 'standard',

  is_published           boolean       not null default false,
  is_active              boolean       not null default true,

  created_at             timestamptz   not null default now(),
  updated_at             timestamptz   not null default now(),

  -- Inferred, not proven. Six call sites resolve a row with
  -- .eq('merchant_id', …).eq('product_id', …).maybeSingle(), which throws if the
  -- pair is not unique — e.g. app/(merchant)/products/[id]/actions.ts:27-29.
  constraint merchant_products_merchant_product_key unique (merchant_id, product_id)
);

create trigger merchant_products_set_updated_at
  before update on merchant_products
  for each row execute function set_updated_at();

create index merchant_products_merchant_id_idx  on merchant_products (merchant_id);
create index merchant_products_product_id_idx   on merchant_products (product_id);
-- app/api/webhooks/shopify/_process-order.ts:34 — the hot path of order ingest.
create index merchant_products_variant_idx
  on merchant_products (shopify_variant_id)
  where shopify_variant_id is not null;
-- app/admin/dashboard/page.tsx:17, app/api/admin/labels/[id]/route.ts:53
create index merchant_products_label_status_idx on merchant_products (label_status);

-- -----------------------------------------------------------------------------
-- merchant_labels — the standalone label library and its approval queue
-- Absent from CLAUDE.md entirely. types/index.ts:154-162.
--
-- app/api/admin/merchants/[id]/route.ts:44-69 deletes orders, order_items,
-- shopify_stores and merchant_products when removing a merchant, but NOT
-- merchant_labels. Under the on-delete-restrict convention used by every other
-- FK in this file, that DELETE would fail. Resolved by ruling — see below.
-- -----------------------------------------------------------------------------
create table merchant_labels (
  id               uuid primary key default gen_random_uuid(),
  -- CASCADE per ruling 2026-08-20: label is worthless without merchant; code delete-chain fix tracked separately
  merchant_id      uuid         not null references merchants (id) on delete cascade,
  label_url        text         not null,
  name             text,
  status           label_status not null default 'pending',
  rejection_reason text,
  created_at       timestamptz  not null default now()
);

create index merchant_labels_merchant_created_idx
  on merchant_labels (merchant_id, created_at desc);
create index merchant_labels_status_idx on merchant_labels (status);

-- -----------------------------------------------------------------------------
-- shopify_stores — one connected storefront per merchant
-- -----------------------------------------------------------------------------
create table shopify_stores (
  id                              uuid primary key default gen_random_uuid(),
  -- .eq('merchant_id', …).single() in eight places implies uniqueness, and
  -- CLAUDE.md:189 states "una tienda por merchant".
  merchant_id                     uuid        not null unique references merchants (id) on delete restrict,
  -- PROVEN unique: upsert(..., { onConflict: 'shop_domain' })
  -- at app/api/shopify/callback/route.ts:85.
  shop_domain                     text        not null unique,
  -- Long-lived Shopify offline access token, stored in plaintext.
  access_token                    text        not null,
  -- Declared at types/index.ts:169; never written by any code path.
  scope                           text,
  webhook_id                      text,
  fulfillment_service_id          text,
  -- Shopify location ids exceed int4 range.
  fulfillment_service_location_id bigint,
  fulfillment_service_handle      text,
  created_at                      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------
create table orders (
  id                           uuid primary key default gen_random_uuid(),
  merchant_id                  uuid         not null references merchants (id) on delete restrict,

  -- All three stored via String(...) of a Shopify numeric id.
  shopify_order_id             text,
  shopify_order_number         text,
  shopify_fulfillment_order_id text,

  -- Left NULL by Shopify-ingested orders (_process-order.ts:60 omits it).
  -- Observed values: 'manual', 'sample', 'admin'. Deliberately unconstrained —
  -- see the CONFIDENCE section on why no CHECK was added.
  source                       text,

  customer_name                text,
  customer_email               text,
  shipping_address             jsonb,

  status                       order_status not null default 'pending',

  fulfillment_cost             numeric(12,2),
  shipping_cost_cop            integer,
  -- Free text, not a date: fed by an <input type="text"> holding e.g. "3 – 5"
  -- (components/admin/order-status-form.tsx:52).
  estimated_delivery           text,

  payment_link_id              text,
  payment_link_url             text,
  wompi_transaction_id         text,

  -- LEGACY, alongside merchants.stripe_subscription_id. Written only by
  -- app/api/webhooks/stripe/route.ts:30. Not in types/index.ts.
  stripe_payment_intent_id     text,

  tracking_number              text,
  carrier                      text,
  -- types/index.ts:192-193. Never written: lib/envia.ts is dead code and
  -- nothing generates a shipping label PDF.
  envia_guide_id               text,
  label_pdf_url                text,

  notes                        text,
  shipped_at                   timestamptz,
  created_at                   timestamptz  not null default now(),
  updated_at                   timestamptz  not null default now()
);

create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- app/(merchant)/orders/page.tsx:14, app/(merchant)/dashboard/page.tsx:26
create index orders_merchant_created_idx on orders (merchant_id, created_at desc);
-- app/(merchant)/layout.tsx:19 counts payment_pending per merchant on every page load.
create index orders_merchant_status_idx  on orders (merchant_id, status);
-- app/admin/dashboard/page.tsx:16, app/admin/orders/page.tsx:31
create index orders_status_idx           on orders (status);
create index orders_created_at_idx       on orders (created_at desc);
-- Shopify order ingest de-duplicates on this (_process-order.ts:55) and both
-- fulfillment-order handlers look orders up by it.
create index orders_shopify_order_id_idx on orders (shopify_order_id) where shopify_order_id is not null;
-- app/api/webhooks/wompi/route.ts:45
create index orders_payment_link_id_idx  on orders (payment_link_id)  where payment_link_id  is not null;

-- -----------------------------------------------------------------------------
-- order_items
-- -----------------------------------------------------------------------------
create table order_items (
  id                  uuid          primary key default gen_random_uuid(),
  order_id            uuid          not null references orders (id) on delete restrict,
  -- NULLABLE, and this contradicts types/index.ts:216 which declares it a bare
  -- string. Two insert sites write null: sample orders always
  -- (app/(merchant)/orders/new/actions.ts:92) and admin orders whenever the
  -- merchant has no matching merchant_product
  -- (app/admin/orders/new/actions.ts:47). The code wins; the type is wrong.
  merchant_product_id uuid          references merchant_products (id) on delete restrict,
  -- Snapshotted at creation so past orders survive product edits and deletes.
  product_name        text          not null,
  quantity            integer       not null,
  unit_price          numeric(12,2) not null,
  created_at          timestamptz   not null default now()
);

create index order_items_order_id_idx            on order_items (order_id);
create index order_items_merchant_product_id_idx on order_items (merchant_product_id);

-- -----------------------------------------------------------------------------
-- platform_settings — a key/value JSON blob, absent from CLAUDE.md
-- Only key in use: 'dashboard' (app/api/admin/settings/route.ts:18,29).
-- -----------------------------------------------------------------------------
create table platform_settings (
  -- PROVEN primary key: upsert(..., { onConflict: 'key' }).
  key        text        primary key,
  value      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger platform_settings_set_updated_at
  before update on platform_settings
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Storage buckets
-- -----------------------------------------------------------------------------

-- product-images: admin-uploaded catalog photography and Canva theme previews.
-- Flat paths, `{timestamp}-{random}.{ext}`
-- (components/admin/product-image-uploader.tsx:30, theme-labels-editor.tsx:36,
--  app/admin/settings/page.tsx:30). Read via getPublicUrl, so genuinely public.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- labels: merchant-uploaded label artwork.
-- Paths are `{merchantId}/{productId}/{timestamp}.{ext}`
-- (components/merchant/label-uploader.tsx:35) and
-- `{merchantId}/brand/{timestamp}.{ext}` (label-upload-form.tsx:30). Both are
-- prefixed with the owning merchant's uuid, which is what makes the per-folder
-- storage policies in 0002 possible.
--
-- PUBLIC to match production for parity verification. Flip to private + signed URLs tracked as security card SEC-labels-bucket. Do not treat this as accepted.
--
--   Context for the reader: CODE-AUDIT-2026-08.md §5 ("Storage buckets
--   referenced") records that CLAUDE.md declares both buckets public with
--   hand-made policies that exist in no repository. A public `labels` bucket
--   means any merchant's proprietary label artwork is readable by anyone
--   holding or guessing the URL. Public here is a deliberate parity choice for
--   diffing this reconstruction against the live project, not a judgement that
--   the exposure is acceptable.
--
--   What SEC-labels-bucket has to carry: flipping this to false also requires
--   migrating components/merchant/label-uploader.tsx:42 and
--   label-upload-form.tsx:34 off getPublicUrl() and onto createSignedUrl(),
--   plus every surface that renders a stored label_url, including the admin
--   label queue. getPublicUrl() returns a working URL only for a public bucket.
insert into storage.buckets (id, name, public)
values ('labels', 'labels', true)
on conflict (id) do nothing;
