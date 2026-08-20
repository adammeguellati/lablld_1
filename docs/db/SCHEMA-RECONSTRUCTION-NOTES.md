# LABLLD — Schema Reconstruction Notes

**Reconstructed:** 2026-08-20
**Repo:** `adammeguellati/lablld_1`, branch `feat/schema-reconstruction`, cut from `main` @ `4c2deae`
**Artifacts:** `supabase/migrations/0001_initial_schema.sql`, `supabase/migrations/0002_rls_policies.sql`, `supabase/seed.sql`
**Prior work:** `docs/audit/CODE-AUDIT-2026-08.md` (on branch `docs/code-audit`, not yet merged)

---

## What this is, and what it is not

The original Supabase project is unreachable. This schema was rebuilt **blind, from code evidence only**. No database was contacted at any point. Nothing here has been applied to any LABLLD environment.

**It is not a recovery of the real schema.** It is a schema that satisfies every query the code makes. Those are different things. The real database may have columns nothing reads (invisible to this method), constraints nothing violates (invisible), triggers, functions, views, and RLS policies (all invisible). Where the real schema is looser than this one, applying this will be fine. Where it is tighter, this reconstruction will accept data the original rejected.

**Method.** Evidence was taken, in descending order of authority:

1. **Write contracts** — the Zod schemas in `app/api/admin/products/route.ts:40-81` and `app/api/admin/products/[id]/route.ts:16-57`. These are the strongest evidence available: they assert type, integrality, nullability and optionality for every column an admin can write.
2. **Actual call sites** — every `.from()`, `.select()`, `.insert()`, `.update()`, `.upsert()`, `.delete()`, `.eq()`, `.in()`, `.not()`, `.order()`, `onConflict`, and `.storage.from()` in `app/`, `components/`, `lib/`, `proxy.ts`. Extracted mechanically, then read by hand.
3. **`types/index.ts`** — hand-written domain types. Useful, but demonstrably not authoritative: see D1 below, where it contradicts the code outright.
4. **`CLAUDE.md`** — treated as a hint and nothing more. It is provably stale (it omits two whole tables and ~15 columns) and is cited below only where it corroborates something the code already showed.

There are **no `.rpc()` calls anywhere in the codebase**, so no Postgres function is invoked by the application. Whether any exist server-side is unknowable from here.

**Validation.** All three files were applied to a throwaway `postgres:16-alpine` container with hand-written stubs for the `auth` and `storage` schemas that Supabase normally provides. All three applied clean. A smoke test then replayed representative real query shapes (the billing sweep, the Shopify order-ingest join, the PDP product-with-shipping-rates read, both upserts, the pending-payment count) and exercised the constraints. Results are in the **Validation** section at the end. The container was destroyed afterwards.

---

## Table-by-table evidence

Line references are to commit `4c2deae`. Every column below is present because something in the code reads or writes it.

### `merchants` — 18 columns

`merchants.id` is the Supabase auth user id, not a separate key. Proven twice: the registration upsert writes `{ id: data.user.id }` (`app/(auth)/actions.ts:84`), and merchant deletion calls `auth.admin.deleteUser(id)` with the same value (`app/api/admin/merchants/[id]/route.ts:67`).

| Column | Type | Null | Evidence |
| --- | --- | --- | --- |
| `id` | `uuid` PK → `auth.users` | no | `app/(auth)/actions.ts:84`; `app/api/admin/merchants/[id]/route.ts:67` |
| `email` | `text` UNIQUE | no | `app/(auth)/actions.ts:84,127`; uniqueness proven at `:89` — see below |
| `full_name` | `text` | no | `app/(auth)/actions.ts:127`; `app/(merchant)/settings/profile/actions.ts:13`; `types/index.ts:26` |
| `wompi_payment_source_id` | `integer` | yes | `types/index.ts:27`; `lib/wompi.ts:42` returns `number`; written `app/(auth)/onboarding/actions.ts:52` |
| `subscription_started_at` | `timestamptz` | yes | `app/(auth)/onboarding/actions.ts:54` writes full `.toISOString()` |
| `subscription_next_billing_at` | `date` | yes | `app/(auth)/onboarding/actions.ts:55` writes `.toISOString().slice(0,10)`; compared `.lte(today)` vs a `YYYY-MM-DD` string at `app/api/cron/billing/route.ts:14,24` |
| `plan` | `plan` | yes | `types/index.ts:30`; `.not('plan','is',null)` at `app/api/cron/billing/route.ts:19` |
| `pending_plan` | `plan` | yes | `types/index.ts:31`; `app/(merchant)/settings/billing/actions.ts:23,25,60` |
| `plan_status` | `plan_status` | no | `types/index.ts:32` (non-null union); `.eq('plan_status','active')` at `app/api/cron/billing/route.ts:19` |
| `plan_cancel_at` | `date` | yes | assigned directly from `subscription_next_billing_at` at `app/(merchant)/settings/billing/actions.ts:39-40`, so same type |
| `is_active` | `boolean` | no | `types/index.ts:34`; toggled `app/api/admin/merchants/[id]/route.ts:24-26` |
| `shopify_connected` | `boolean` | no | `types/index.ts:35`; set true `app/api/shopify/callback/route.ts:87` |
| `shopify_request_domain` | `text` | yes | `types/index.ts:36`; `app/(merchant)/settings/shopify/actions.ts:40`; `app/admin/shopify/actions.ts:21,54` |
| `mockup_credits_used` | `integer` | no | `app/(merchant)/products/[id]/actions.ts:94,105,122` — **not in `types/index.ts`** |
| `mockup_credits_reset_at` | `timestamptz` | yes | `app/(merchant)/products/[id]/actions.ts:94,105` writes full `.toISOString()` |
| `stripe_subscription_id` | `text` | yes | **LEGACY.** `app/api/webhooks/stripe/route.ts:58,79,88,105,115`. Not in `types/index.ts` |
| `created_at` / `updated_at` | `timestamptz` | no | `types/index.ts:37-38` |

**`UNIQUE(email)` is proven, not guessed.** `app/(auth)/actions.ts:83-89` upserts with `onConflict: 'id'` and then handles Postgres error `23505` with the message *"Este correo ya tiene una cuenta registrada."* A unique violation on an upsert keyed by `id` can only come from a *different* unique constraint, and the handler names email as the cause.

**Not created:** `stripe_customer_id` and `stripe_payment_method_id`. `CLAUDE.md:350-351` lists them, but no code path anywhere reads or writes either one. Truth is the code. See D2.

### `products` — 46 columns

The Zod `productSchema` (`app/api/admin/products/route.ts:40-81`) is the authoritative write contract and supplied most of the type detail. Integer vs numeric follows exactly whether Zod asserts `.int()`.

| Column group | Columns | Evidence |
| --- | --- | --- |
| Identity | `id`, `name`, `slug` (UNIQUE), `sku` | `route.ts:41-43`; slug uniqueness from `.eq('slug', slug).single()` at `app/(merchant)/catalog/[slug]/page.tsx:38` |
| Copy | `description`, `short_description`, `long_description` | `route.ts:44-46` |
| Money | `base_price` `numeric` NOT NULL, `wholesale_price_usd` `numeric` | `route.ts:47-48` — `z.number().positive()`, **no `.int()`** |
| Money (int) | `price_cop`, `suggested_retail_price_cop`, `shipping_cost_cop`, `stock` | `route.ts:73-76` — all `z.number().int().min(0).nullable()` |
| Classification | `category` (enum, NOT NULL), `format` | `route.ts:48-49` |
| Arrays | `available_tiers plan[]`, `images text[]`, `icons text[]`, all NOT NULL DEFAULT `'{}'` | `route.ts:50-52` — `.optional().default([])`; `types/index.ts:89-91` non-null |
| Ficha JSON | `benefit_blocks`, `science_facts`, `supplement_facts` | `route.ts:68-70`; `types/index.ts:92-94` |
| Ficha text | `ingredients_list`, `other_ingredients`, `suggested_use`, `warning` | `route.ts:58-61` |
| Ficha legacy | `serving_size`, `servings_per_container` | `types/index.ts:97-98` only — **in neither Zod schema.** See D5 |
| Shipping | `manufacturer_country`, `product_weight_g`, `gross_weight_g`, `shipping_scope`, `fulfillment_fee_cop` | `route.ts:62-67` |
| Mockup | `mockup_template_id`, `mockup_smart_object_uuid`, `mockup_so_width`, `mockup_so_height` | `route.ts:53-56`; read at `app/(merchant)/products/[id]/actions.ts:114` |
| Label | `label_area`, `label_dimensions`, `label_template_url`, `canva_template_url`, `theme_labels` | `route.ts:57,77-80` |
| Flags | `is_active` (default true), `is_new` (default false) | `is_new` default from `route.ts:72`; `is_active` absent from the *create* schema but present in *update* (`[id]/route.ts:46`), which is how a DB default is inferred |
| Audit | `created_by` → `auth.users`, `created_at`, `updated_at` | `route.ts:111` writes `created_by: user.id`; `types/index.ts:117` `string \| null` |

### `shipping_rates` — 7 columns

Rewritten wholesale on every product PATCH: delete-all-then-reinsert at `app/api/admin/products/[id]/route.ts:96-102`. There is no upsert and therefore no natural key, so no unique constraint was authored.

| Column | Type | Evidence |
| --- | --- | --- |
| `product_id` | `uuid` NOT NULL → `products` | `app/api/admin/products/route.ts:119`; `[id]/route.ts:96,100` |
| `country` | `text` NOT NULL | `route.ts:10` — `z.string().min(1)` |
| `country_code` | `char(2)` NOT NULL | `route.ts:11` — `z.string().length(2)` |
| `rate` | `numeric` NOT NULL | `route.ts:12` — `z.number().positive()` |
| `rate_cop` | `integer` | `route.ts:13` — `z.number().int().min(0).optional()` |

### `merchant_products` — 17 columns

| Column | Type | Null | Evidence |
| --- | --- | --- | --- |
| `merchant_id` | `uuid` → `merchants` | no | `app/(merchant)/products/[id]/actions.ts:56` |
| `product_id` | `uuid` → `products` | no | `app/(merchant)/products/[id]/actions.ts:56` |
| `label_url` | `text` | yes | `actions.ts:57` writes `labelUrl \|\| null` |
| `label_status` | `label_status` | no | `actions.ts:58`; `types/index.ts:138` |
| `label_rejection_reason` | `text` | yes | `app/api/admin/labels/[id]/route.ts:50` |
| `mockup_url` | `text` | yes | `actions.ts:121`; set to `null` on re-approval at `labels/[id]/route.ts:51` |
| `shopify_product_id` | `text` | yes | `app/(merchant)/catalog/[slug]/actions.ts:65` |
| `shopify_variant_id` | `text` | yes | compared against `String(item.variant_id)` at `_process-order.ts:34` — **text, not bigint** |
| `custom_name` | `text` | yes | `actions.ts:59` |
| `custom_description` | `text` | yes | `types/index.ts:144` only — no code reads or writes it |
| `retail_price` | `numeric` | yes | `actions.ts:59`; `.not('retail_price','is',null)` at `[id]/route.ts:110` |
| `shipping_tier` | `shipping_tier` | no | `actions.ts:60`; default `'standard'` from the function default at `actions.ts:16` |
| `is_published` | `boolean` | no | `types/index.ts:147`; set true `catalog/[slug]/actions.ts:65` |
| `is_active` | `boolean` | no | `types/index.ts:148`; `app/(merchant)/products/actions.ts:29` |

**`UNIQUE(merchant_id, product_id)` is inferred, not proven** — see C3.

### `merchant_labels` — 7 columns

Absent from `CLAUDE.md` entirely; the standalone label library behind `/labels` and `/admin/labels`.

| Column | Type | Null | Evidence |
| --- | --- | --- | --- |
| `merchant_id` | `uuid` → `merchants` | no | `app/(merchant)/labels/actions.ts:16` |
| `label_url` | `text` | no | `actions.ts:17`; `types/index.ts:157` non-null |
| `name` | `text` | yes | `actions.ts:18` writes `name \|\| null` |
| `status` | `label_status` | no | `actions.ts:19` `'pending'`; `app/api/admin/labels/[id]/route.ts:39` |
| `rejection_reason` | `text` | yes | `labels/[id]/route.ts:40` |

### `shopify_stores` — 10 columns

| Column | Type | Null | Evidence |
| --- | --- | --- | --- |
| `merchant_id` | `uuid` UNIQUE → `merchants` | no | `app/api/shopify/callback/route.ts:78`; uniqueness inferred — see C4 |
| `shop_domain` | `text` UNIQUE | no | **PROVEN**: `upsert(..., { onConflict: 'shop_domain' })` at `callback/route.ts:85` |
| `access_token` | `text` | no | `callback/route.ts:80` — plaintext Shopify offline token |
| `scope` | `text` | yes | `types/index.ts:169` only — never written |
| `webhook_id` | `text` | yes | `callback/route.ts:81` |
| `fulfillment_service_id` | `text` | yes | `callback/route.ts:82` — `String(fs.id)` |
| `fulfillment_service_location_id` | `bigint` | yes | `callback/route.ts:83` — raw Shopify numeric location id |
| `fulfillment_service_handle` | `text` | yes | `callback/route.ts:84` |

### `orders` — 25 columns

| Column | Type | Null | Evidence |
| --- | --- | --- | --- |
| `merchant_id` | `uuid` → `merchants` | no | `app/(merchant)/orders/new/actions.ts:35` |
| `shopify_order_id` | `text` | yes | `_process-order.ts:62` — `String(order.id)` |
| `shopify_order_number` | `text` | yes | `_process-order.ts:63` — `String(order.order_number)` |
| `shopify_fulfillment_order_id` | `text` | yes | `app/api/shopify/fulfillment_order_notification/route.ts:28` |
| `source` | `text` | yes | `'manual'` `orders/new/actions.ts:36`, `'sample'` `:81`, `'admin'` `app/admin/orders/new/actions.ts:37`, **NULL** for Shopify orders (`_process-order.ts:60` omits it) |
| `customer_name` / `customer_email` | `text` | yes | `orders/new/actions.ts:38-39` |
| `shipping_address` | `jsonb` | yes | `orders/new/actions.ts:40`; shape at `types/index.ts:202-211` |
| `status` | `order_status` | no | every insert sets it explicitly; `types/index.ts:183` |
| `fulfillment_cost` | `numeric` | yes | `orders/new/actions.ts:41`; `types/index.ts:184` |
| `shipping_cost_cop` | `integer` | yes | `app/admin/orders/[id]/actions.ts:62` |
| `estimated_delivery` | `text` | yes | `actions.ts:63`, fed by `<input type="text">` at `components/admin/order-status-form.tsx:52` — **free text, not a date** |
| `payment_link_id` / `payment_link_url` | `text` | yes | `actions.ts:64-65`; filtered at `app/api/webhooks/wompi/route.ts:45` |
| `wompi_transaction_id` | `text` | yes | `app/(merchant)/orders/actions.ts:24` |
| `stripe_payment_intent_id` | `text` | yes | **LEGACY.** `app/api/webhooks/stripe/route.ts:30` only |
| `tracking_number` / `carrier` | `text` | yes | `app/admin/orders/[id]/actions.ts:129` |
| `envia_guide_id` / `label_pdf_url` | `text` | yes | `types/index.ts:192-193` only — never written; `lib/envia.ts` is dead code |
| `notes` | `text` | yes | `app/(auth)/onboarding/actions.ts:60` |
| `shipped_at` | `timestamptz` | yes | `app/admin/orders/[id]/actions.ts:129` |

### `order_items` — 7 columns

Values are **snapshots** taken at creation so past orders survive product edits and deletion.

| Column | Type | Null | Evidence |
| --- | --- | --- | --- |
| `order_id` | `uuid` → `orders` | no | `orders/new/actions.ts:48` |
| `merchant_product_id` | `uuid` → `merchant_products` | **yes** | `orders/new/actions.ts:92` and `app/admin/orders/new/actions.ts:47` both insert `null`. Contradicts `types/index.ts:216`. See **D1** |
| `product_name` | `text` | no | `orders/new/actions.ts:50` |
| `quantity` | `integer` | no | `orders/new/actions.ts:51` |
| `unit_price` | `numeric` | no | `orders/new/actions.ts:52` |

### `platform_settings` — 3 columns

| Column | Type | Evidence |
| --- | --- | --- |
| `key` | `text` PK | **PROVEN**: `upsert(..., { onConflict: 'key' })` at `app/api/admin/settings/route.ts:29`. Only key in use: `'dashboard'` |
| `value` | `jsonb` NOT NULL DEFAULT `'{}'` | `route.ts:18` reads `data?.value ?? {}`; `:29` writes a raw request body |

### `admin_emails` — 2 columns (new, not an application table)

Created in `0002` purely to make the RLS policies expressible. The app identifies admins from the `ADMIN_EMAILS` env var (`lib/utils.ts:37-40`), which Postgres cannot read. No application code touches this table. See C10.

### Foreign key delete behaviour

All FKs between application tables were authored `ON DELETE RESTRICT`, because **the application hand-rolls its own cascades**, which it would not need to do if the database cascaded for it:

- `app/api/admin/products/[id]/route.ts:148-157` deletes `order_items` → `shipping_rates` → `merchant_products` → `products`, in that order.
- `app/api/admin/merchants/[id]/route.ts:52-61` deletes `order_items` → `orders` → `shopify_stores` → `merchant_products` → `merchants`.

`merchants.id → auth.users` and `products.created_by → auth.users` are the exceptions (`CASCADE` and `SET NULL`), since those parents are managed by GoTrue rather than by application code.

### Storage buckets

| Bucket | Path convention | Written by | Client |
| --- | --- | --- | --- |
| `labels` | `{merchantId}/{productId}/{ts}.{ext}` (`label-uploader.tsx:35`), `{merchantId}/brand/{ts}.{ext}` (`label-upload-form.tsx:30`) | merchants | **browser**, publishable key |
| `product-images` | `{ts}-{rand}.{ext}` (`product-image-uploader.tsx:30`, `theme-labels-editor.tsx:36`, `app/admin/settings/page.tsx:30`) | admins | **browser**, publishable key |

Both upload paths run in the browser under the user's own session, so **storage RLS is genuinely enforced today** — unlike table access, which the service-role client bypasses. Every `labels` path is prefixed with the owning merchant's uuid, which is what makes `(storage.foldername(name))[1] = auth.uid()::text` a correct and sufficient ownership check.

---

## CONFIDENCE

Every place a type, nullability, default or constraint was **inferred rather than proven**, and every place the code is genuinely ambiguous. This is the part to review.

### C1 — `merchants.plan_status` default `'active'` — INFERRED

`types/index.ts:32` declares it non-null, and no `INSERT` ever sets it, so the database must supply a default. Which default is unobservable. `'active'` is what a non-null type implies, but it is semantically odd for a merchant who has never subscribed (`plan` is `NULL` at that moment). The alternative is that the real column is nullable and `types/index.ts` is simply wrong, as it demonstrably is elsewhere (D1). **Nothing breaks either way**: the billing sweep filters on `plan is not null` first (`app/api/cron/billing/route.ts:19`), so a planless merchant is excluded regardless of status.

### C2 — `merchants.mockup_credits_used` NOT NULL DEFAULT 0 — INFERRED

Not declared in `types/index.ts` at all. `app/(merchant)/products/[id]/actions.ts:96` reads it as `merchantData.mockup_credits_used ?? 0`, and that `??` is evidence the code expects a possible `NULL` — consistent with a column added later and never backfilled. I authored it `NOT NULL DEFAULT 0` because that is the cleaner shape and the `??` then becomes harmless. **If you are restoring into an existing dataset, make it nullable instead.**

### C3 — `merchant_products UNIQUE(merchant_id, product_id)` — INFERRED

Six call sites resolve a row with `.eq('merchant_id', …).eq('product_id', …).maybeSingle()` (e.g. `app/(merchant)/products/[id]/actions.ts:27-29`, `orders/new/actions.ts:26`, `app/admin/orders/new/actions.ts:27`). `maybeSingle()` throws when more than one row matches, so the application already assumes this pair is unique. But **assuming it and enforcing it are different**: if the live table contains duplicate pairs today, this constraint will refuse to be created during a restore. `CLAUDE.md:196` describes an upsert on this table, which is consistent, but no code passes `onConflict` for it, so it is not proven.

### C4 — `shopify_stores UNIQUE(merchant_id)` — INFERRED

`.eq('merchant_id', …).single()` appears in eight places, and `CLAUDE.md:189` says "una tienda por merchant". Only `UNIQUE(shop_domain)` is actually proven (by the `onConflict`). If a merchant is ever meant to connect two storefronts, this constraint is wrong and should be dropped.

### C5 — Money columns: `numeric(12,2)` vs `integer` — INFERRED FROM ZOD, INCONSISTENTLY

I followed the Zod schemas literally: `.int()` became `integer`, everything else became `numeric(12,2)`. That reproduces an inconsistency that exists in the source rather than smoothing it over:

- `price_cop`, `suggested_retail_price_cop`, `shipping_cost_cop`, `stock`, `rate_cop` — all `z.number().int()` → `integer`
- `base_price`, `wholesale_price_usd`, `fulfillment_fee_cop`, `rate` — no `.int()` → `numeric(12,2)`

`fulfillment_fee_cop` is the odd one out: it is a COP amount like its `_cop` siblings, but `app/api/admin/products/route.ts:66` declares it `z.number().optional()` with no `.int()`. Since `formatCOP` (`lib/utils.ts:20-25`) renders zero decimals, COP almost certainly has no fractional part in practice, and **these may all be `integer` in the real database**. `orders.shipping_cost_cop` and `orders.fulfillment_cost` are not Zod-validated at all; I typed them by analogy with their same-named product columns.

### C6 — `orders.status` default `'pending'` — INFERRED

Every insert sets `status` explicitly, so the real default is unobservable. `'pending'` is a member of the enum and `CLAUDE.md:401` glosses it as *"orden recibida, sin cobrar"*, which reads like a default. Low impact: nothing relies on it.

### C7 — `orders.source` left unconstrained — DELIBERATE CHOICE

Three values are written (`'manual'`, `'sample'`, `'admin'`) and Shopify-ingested orders leave it `NULL`. I did **not** add a `CHECK`. In a blind reconstruction a too-tight constraint is worse than a missing one: it turns a future write into a runtime failure that looks like an application bug. Add `check (source is null or source in ('manual','sample','admin'))` if you want it tightened.

### C8 — Enums vs `text` — DELIBERATE CHOICE

Six Postgres enums were created from the unions in `types/index.ts`. The real columns may well be `text` with or without `CHECK` constraints; this is unknowable. Enums are stricter, so the risk is asymmetric: a value the code writes but I failed to enumerate would be rejected at runtime. I cross-checked every written literal against every enum and found no gaps — all nine `order_status` values, all three `plan_status`, all three `label_status`, both `plan`, both `shipping_tier`, all three `product_category` appear in the code. **Note that adding a value to a Postgres enum later requires `ALTER TYPE`, which is more friction than a `text` column.**

### C9 — Indexes are entirely inferred

Not one index can be proven from application code; every index in `0001` was derived from an observed query pattern (which columns are filtered, joined and ordered together). They are a reasonable starting set, not a reproduction. In particular `merchants_billing_sweep_idx` is a partial index tuned to the exact shape of `app/api/cron/billing/route.ts:19-32` and would be wrong if that query changes.

### C10 — `admin_emails` has no counterpart in the real database

The app's admin check is an env-var email allowlist read at module scope (`lib/utils.ts:37-40`). Postgres cannot read the app's environment, so RLS could not mirror it without relocating the list. `admin_emails` is my invention. **It creates a second copy of the admin list that nothing keeps in sync with `ADMIN_EMAILS`.** Change one without the other and you get a user who is an admin to the app but not the database, or the reverse. If the real project used a JWT custom claim or a `role` column instead, this table should be replaced by that.

### C11 — `labels` bucket authored PRIVATE, which does not match production

Instructed, and correct on the merits: `CODE-AUDIT-2026-08.md` §5 records that `CLAUDE.md` declares both buckets public with hand-made policies that exist in no repository, and a public `labels` bucket means any merchant's proprietary label artwork is readable by anyone with or guessing the URL.

**But it is a breaking change and I did not fix the callers.** `components/merchant/label-uploader.tsx:42` and `label-upload-form.tsx:34` both call `getPublicUrl()`, which returns a working URL only for a public bucket. Against a private bucket they will return URLs that 400. Making this real requires migrating both call sites to `createSignedUrl()`, plus every surface that renders a stored `label_url` — including the admin label queue. That is application work, out of scope here. Flip `public` to `true` in `0001` if you need to match production exactly today.

### C12 — Columns that exist but nothing uses

Authored because `types/index.ts` declares them, but no code path reads or writes any of them. They may not exist in the real database at all:

`products.serving_size`, `products.servings_per_container` (see D5) · `merchant_products.custom_description` · `shopify_stores.scope` · `orders.envia_guide_id` · `orders.label_pdf_url`

The last two are residue from the dead `lib/envia.ts` shipping integration (risk R6 in the audit).

### C13 — `updated_at` triggers are invented

`types/index.ts` declares `updated_at` non-null on `merchants`, `products`, `merchant_products` and `orders`, but **no code path writes `merchants.updated_at` or `merchant_products.updated_at` ever**. Only `products` (`app/admin/products/actions.ts:20`, `app/api/admin/products/[id]/route.ts:87`) sets it by hand. A trigger is the only mechanism that reconciles those facts, so I added one to every table with the column. The real database may instead have a stale `updated_at` that only some rows maintain. Harmless if wrong; the trigger simply does what the column name promises.

### C14 — `shipping_rates` has no unique key

Rewritten by delete-all-then-reinsert, so nothing forces `(product_id, country_code)` to be unique and the application would tolerate duplicates. A real schema might well have that constraint. Not authored, because inventing it could block a restore.

### C15 — Enabling RLS changes the merchant-deletion path

`app/api/admin/merchants/[id]/route.ts:52-61` deletes `order_items`, `orders`, `shopify_stores` and `merchant_products` before deleting the merchant — **but not `merchant_labels`**. With the `ON DELETE RESTRICT` FK authored in `0001`, deleting a merchant who has ever saved a label will now **fail** where it previously succeeded (leaving orphans, or cascading, depending on what the real FK does). This is a genuine behaviour change introduced by this reconstruction. Either add `merchant_labels` to that delete chain, or change that one FK to `ON DELETE CASCADE`. **This needs a decision before applying anywhere.**

### C16 — What this method cannot see at all

Columns no query touches. Constraints no code violates. Triggers, functions, views, materialised views. Existing RLS policies. Storage bucket file-size and MIME restrictions. Auth configuration (email confirmation, password policy, redirect allowlist). Realtime publications. Scheduled jobs. **None of these are recoverable from application code, and their absence here is not evidence of their absence in the real database.**

---

## Places where two files disagree about the same field

Each of these is a live contradiction in the repository, not a reconstruction artifact.

### D1 — `order_items.merchant_product_id`: nullable or not? — **RESOLVED IN FAVOUR OF THE CODE**

- `types/index.ts:216` declares `merchant_product_id: string` — non-nullable.
- `app/(merchant)/orders/new/actions.ts:92` inserts the literal `null` for every sample order.
- `app/admin/orders/new/actions.ts:47` inserts `mpRes.data?.id ?? null` whenever the merchant has no matching `merchant_product`.

Two writers beat one type declaration. The column is authored **nullable**, and the FK is `ON DELETE RESTRICT`. **`types/index.ts:216` should be corrected to `string | null`** — any code doing `item.merchant_product_id.slice(...)` or similar is a latent null-dereference today. Verified against the live container: the null insert succeeds.

### D2 — `merchants` Stripe columns: three sources, three answers

- `CLAUDE.md:350-351` lists `stripe_customer_id`, `stripe_payment_method_id`, `stripe_subscription_id`.
- `types/index.ts:23-39` declares **none** of them.
- `app/api/webhooks/stripe/route.ts` filters on `stripe_subscription_id` at lines 58, 79, 88 and 105, and writes it at 115. It never touches the other two.

I authored `stripe_subscription_id` only. **This cannot be resolved from the repo** — it is the same open question the audit raised as risk R2. Either the column survives as a legacy artifact and that webhook still silently mutates merchant plans, or it was dropped and the webhook has been failing with `42703` ever since. Both are bad; they need different fixes. The webhook is dead code either way (payments moved to Wompi), so the correct end state is to delete the route and the column together.

### D3 — `orders.stripe_payment_intent_id`: same shape

`CLAUDE.md:375` lists it. `types/index.ts:174-200` omits it. `app/api/webhooks/stripe/route.ts:30` writes it. Authored, flagged legacy, same disposition as D2.

### D4 — Order status vocabulary: 7 vs 9

`CLAUDE.md:398-408` documents seven statuses. `types/index.ts:10-19` declares nine — adding `quote_pending` and `payment_pending`, both of which are load-bearing in current code (`app/(merchant)/layout.tsx:19` counts `payment_pending` on every merchant page load; `_process-order.ts:69` creates every Shopify order as `quote_pending`). The enum follows `types/index.ts`.

### D5 — `products.serving_size` / `servings_per_container`: declared but unwritable

- `types/index.ts:97-98` declares both as top-level product columns.
- **Neither Zod schema includes them** — not the create schema (`app/api/admin/products/route.ts:40-81`) nor the update schema (`[id]/route.ts:16-57`). No admin can set them through the API.
- The same two values also live inside the `supplement_facts` JSON blob (`types/index.ts:56-57`), which *is* writable.

They look superseded by `supplement_facts` and left behind. Authored (nullable) so a restore does not lose data, but **nothing in the application can populate them.**

### D6 — `fulfillment_fee_cop` breaks its own file's convention

Within `app/api/admin/products/route.ts`, four money columns are `z.number().int()` — `price_cop:73`, `suggested_retail_price_cop:74`, `shipping_cost_cop:75`, and `rate_cop:13` — while `fulfillment_fee_cop:66` is a bare `z.number()`. Same unit, same naming convention, different validation. One of the five is wrong. I reproduced the inconsistency rather than guessing which.

### D7 — Two different size limits on the same storage bucket

- `components/merchant/label-upload-form.tsx:24` rejects files over **2 MB**.
- `components/merchant/label-uploader.tsx:27` rejects files over **10 MB**.

Both upload to the `labels` bucket. (`components/admin/product-image-uploader.tsx:25` uses 5 MB for `product-images`, which is at least a different bucket.) A bucket-level `file_size_limit` would settle it, but there is no evidence of what the real value is, so none was authored. Note that `label-uploader.tsx` is dead code per the audit (§8.2), so 2 MB is the effective live limit.

### D8 — Label approval: the schema supports a workflow the code bypasses

`merchant_products.label_status` defaults to `'pending'` and `CLAUDE.md:96-97` describes an admin approval gate. But `app/(merchant)/products/[id]/actions.ts:38,58` sets `'approved'` directly on upload, while a **separate** `merchant_labels` table runs a real pending/approved/rejected queue. Not a column-type disagreement, but the two tables encode contradictory beliefs about how labels get approved. Already open as an audit finding (§8.5d) and unresolved by the design handoff.

---

## Validation

Performed against a throwaway `postgres:16-alpine` Docker container on localhost, with hand-written stubs for `auth.users`, `auth.uid()`, `auth.jwt()`, `storage.buckets`, `storage.objects` and `storage.foldername()`. **No remote host was contacted. The container was destroyed afterwards.** The stub file is not part of this repository.

| Check | Result |
| --- | --- |
| `0001_initial_schema.sql` applies | clean |
| `0002_rls_policies.sql` applies | clean |
| `seed.sql` applies | clean |
| `seed.sql` re-applies (idempotency) | clean |
| Tables created | 10 (9 application + `admin_emails`) |
| RLS enabled on every table | yes, 10/10 |
| Policies created | 24 on `public`, 8 on `storage.objects` |
| Indexes created | 35 |
| `order_items.merchant_product_id = NULL` insert (D1) | accepted |
| `UNIQUE(merchant_id, product_id)` rejects duplicate | yes |
| `UNIQUE(merchants.email)` rejects duplicate (the `23505` at `actions.ts:89`) | yes |
| `UNIQUE(products.slug)` allows multiple NULLs | yes |
| `order_status` enum rejects an unlisted value | yes |
| `updated_at` trigger fires across transactions | yes |
| Billing-sweep query (`cron/billing/route.ts:19`) | executes |
| Shopify ingest join (`_process-order.ts:33`) | executes |
| PDP product + nested `shipping_rates` (`catalog/[slug]/page.tsx:38`) | executes |
| `platform_settings` upsert on `key` | executes |
| `shopify_stores` upsert on `shop_domain` | executes |
| Pending-payment count (`layout.tsx:19`) | executes |

**What this validation does and does not prove.** It proves the SQL is syntactically valid, internally consistent, and structurally capable of serving the queries the application makes. It proves nothing about whether it matches the real LABLLD database, which was never contacted. The RLS policies in particular were never exercised under a real JWT — the stubbed `auth.uid()` returns `NULL` — so they are syntax-checked, not behaviour-checked.

---

## Before applying this anywhere

1. Resolve **C15** (merchant deletion vs `merchant_labels`) — it will fail at runtime otherwise.
2. Decide **D2/D3** — keep the Stripe columns or delete them with the webhook.
3. Decide **C11** — private `labels` bucket plus signed-URL migration, or public to match today.
4. Fix **D1** in `types/index.ts` regardless of whether this schema is ever applied. That one is a real latent bug in shipped code.
5. If any LABLLD Supabase project is ever recovered, **diff it against this before trusting either.**
