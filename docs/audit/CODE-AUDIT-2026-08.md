# LABLLD — Code Audit

**Repo:** `adammeguellati/lablld_1` (remote `adam`)
**Commit audited:** `4c2deae` (merge of `845c1a4 app: import LABLLD platform source`)
**Date:** 2026-08-19
**Method:** static read only. No network calls to any deployed service, no database connections, no app run against remote resources. Dependencies were installed locally and `tsc --noEmit` + `eslint` were run to verify the code compiles. A full `next build` was deliberately **not** run, because Next.js build-time rendering could issue requests to the live Supabase project.

---

## 0. Briefing conformance

No contradiction between the briefing and the repo. Two things to note, neither blocking:

- The local clone at `/Users/ivan/Documents/Projects/lablld-main` carries three remotes: `adam` (= `adammeguellati/lablld_1`, the briefed source, and what `main` tracks), `origin` (`LABLLD-SAS/LABLLD`), and `personal` (`happygamer1919-tech/lablld_1`). The audit was taken from `adam/main`.
- No secret **values** appear anywhere in this report. Env vars are named only. See §4.

---

## 1. Stack

| Item | Value |
|---|---|
| Framework | Next.js **16.1.6**, App Router, React Server Components |
| Language | TypeScript **5.x**, `strict: true`, `noEmit`, path alias `@/* → ./*` |
| Runtime | React **19.2.3** / React DOM 19.2.3 |
| Package manager | **npm** (only `package-lock.json` present; lockfileVersion 3) |
| Repo shape | **Single app, not a monorepo.** No workspaces, no `turbo.json`, no `packages/` |
| Styling | Tailwind CSS **v4** via `@tailwindcss/postcss`; `tw-animate-css` |
| UI kit | shadcn **v4** (`shadcn@^4.0.5`) on **`@base-ui/react` ^1.2.0**, not Radix. Style preset `base-nova`, icons `lucide-react` ^0.577.0 |
| Database / auth / storage | Supabase — `@supabase/supabase-js` ^2.99.1, `@supabase/ssr` ^0.9.0 |
| Payments | **Wompi** (Colombia) — hand-rolled REST client, no SDK. **Stripe** ^20.4.1 + `@stripe/react-stripe-js` ^5.6.1 + `@stripe/stripe-js` ^8.9.0 still installed but effectively abandoned (see §6, §8) |
| Email | Resend ^6.18.1 |
| Validation | Zod **^4.3.6** (v4 API: `z.email()`, `.issues`) |
| Misc | `next-themes` ^0.4.6, `sonner` ^2.0.7 (installed, never mounted), `class-variance-authority`, `clsx`, `tailwind-merge` |
| Lint | ESLint 9 flat config, `eslint-config-next` 16.1.6 (core-web-vitals + typescript) |
| Hosting | Vercel (`vercel.json` with one cron) |
| Node engine | **Not pinned.** No `engines` field, no `.nvmrc`, no `.node-version` |
| Size | 204 tracked files excl. `public/`; **14,409 lines** of `.ts`/`.tsx` |

**Language of the codebase:** UI copy, comments, and `CLAUDE.md` are in **Spanish**. Identifiers are English.

### Test tooling

**There is none.** No Jest, Vitest, Playwright, Cypress, or any `*.test.*` / `*.spec.*` file. No `test` script in `package.json`. No CI workflow (`.github/` does not exist). The only automated quality gates that exist are `tsc` and `eslint`, and neither is wired to anything that runs them.

---

## 2. Structure map

```
lablld_1/
├── app/                                  Next.js App Router — all routes
│   ├── (auth)/                           Public + onboarding routes (no chrome)
│   │   ├── login, register, suspended
│   │   ├── onboarding/(wizard)/          5-step marketing wizard: quien-eres →
│   │   │                                 producto → estilo → turno → listo
│   │   └── onboarding/plan, payment/     Plan choice + Wompi card capture
│   ├── (merchant)/                       Authenticated merchant app (sidebar shell)
│   │   ├── dashboard, catalog, products, orders, labels, settings
│   ├── admin/                            Internal operator app (NOT a route group —
│   │   │                                 deliberately, to avoid /dashboard collision)
│   │   ├── dashboard, orders, products, labels, merchants, settings, shopify
│   ├── api/                              Route handlers (see §3)
│   ├── privacidad, terminos              Public legal pages (Shopify app-store req.)
│   ├── layout.tsx, page.tsx, globals.css, icon.png
├── components/
│   ├── admin/       (18 files)           Admin-only forms, tables, editors
│   ├── merchant/    (35 files)           Merchant-only forms, cards, steppers
│   ├── layout/       (5 files)           Sidebars, header, mobile nav
│   ├── onboarding/   (1 file)            Plan card
│   ├── shared/       (6 files)           Logo, logout, loading, link-button, …
│   └── ui/          (14 files)           shadcn v4 primitives
├── hooks/use-nav.ts                      Page-transition animation wrapper on router
├── lib/
│   ├── supabase/{client,server,admin}.ts Browser / SSR / service-role clients
│   ├── wompi.ts        (156 L)           Wompi REST: cards, PSE, Nequi, links, HMAC
│   ├── shopify.ts      (302 L)           Shopify OAuth, products, webhooks, fulfillment
│   ├── stripe.ts        (86 L)           Stripe SDK wrapper — ABANDONED (§8)
│   ├── email.ts         (65 L)           Resend, one template: quote email
│   ├── envia.ts        (109 L)           Envia.com shipping — DEAD, never imported
│   ├── sudomock.ts      (35 L)           SudoMock mockup render — LIVE
│   ├── dynamic-mockups.ts (33 L)         Dynamic Mockups render — DEAD (§8)
│   ├── colombia-locations.ts (37 L)      Static dept/city list
│   └── utils.ts         (41 L)           cn(), formatters, isAdmin(), tier pricing
├── types/index.ts       (255 L)          All domain types, hand-written
├── proxy.ts                              Next 16 middleware (renamed). Auth + role gate
├── public/              (49 files, 86 MB) Onboarding imagery + stale CNA placeholders
├── shopify.app.toml                      Shopify CLI app config (scopes, webhooks, URLs)
├── vercel.json                           One cron: /api/cron/billing daily 13:00 UTC
├── next.config.ts                        Image remotePatterns + tailwind resolve alias
├── dev.bat                               Windows-only ngrok + dev launcher
└── CLAUDE.md            (414 L)          Previous developer's project brief — STALE (§5)
```

**No `supabase/` directory. No `migrations/`. No `.sql` file anywhere in the repo.** This is the single most important structural fact; see §5.

---

## 3. Route inventory from code

Derived from the filesystem. Use this to diff against a live-browser crawl. Route groups `(auth)`, `(merchant)`, `(wizard)` do not appear in URLs.

### 3.1 Public / unauthenticated

| URL | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Redirect only: no session → `/login`; admin → `/admin/dashboard`; else `/dashboard` |
| `/login` | `app/(auth)/login/page.tsx` | Accepts `?next=` and `?registered=1` |
| `/register` | `app/(auth)/register/page.tsx` | |
| `/privacidad` | `app/privacidad/page.tsx` | Static legal page |
| `/terminos` | `app/terminos/page.tsx` | Static legal page |

### 3.2 Authenticated, pre-plan (merchant onboarding)

| URL | File |
|---|---|
| `/onboarding/quien-eres` | `app/(auth)/onboarding/(wizard)/quien-eres/page.tsx` |
| `/onboarding/producto` | `app/(auth)/onboarding/(wizard)/producto/page.tsx` |
| `/onboarding/estilo` | `app/(auth)/onboarding/(wizard)/estilo/page.tsx` |
| `/onboarding/turno` | `app/(auth)/onboarding/(wizard)/turno/page.tsx` |
| `/onboarding/listo` | `app/(auth)/onboarding/(wizard)/listo/page.tsx` |
| `/onboarding/plan` | `app/(auth)/onboarding/plan/page.tsx` |
| `/onboarding/payment` | `app/(auth)/onboarding/payment/page.tsx` |
| `/onboarding/payment/resultado` | `app/(auth)/onboarding/payment/resultado/page.tsx` |
| `/suspended` | `app/(auth)/suspended/page.tsx` — shown when `merchants.is_active = false` |

The `(wizard)` sub-layout redirects to `/dashboard` once `user_metadata.onboarding_completed === true`.

### 3.3 Merchant ("customer") app — 16 routes

| URL | File | In sidebar? |
|---|---|---|
| `/dashboard` | `app/(merchant)/dashboard/page.tsx` | yes |
| `/catalog` | `app/(merchant)/catalog/page.tsx` | yes |
| `/catalog/[slug]` | `app/(merchant)/catalog/[slug]/page.tsx` | — (resolves by UUID **or** slug) |
| `/products` | `app/(merchant)/products/page.tsx` | yes |
| `/products/[id]` | `app/(merchant)/products/[id]/page.tsx` | — |
| `/products/[id]/edit` | `app/(merchant)/products/[id]/edit/page.tsx` | — |
| `/orders` | `app/(merchant)/orders/page.tsx` | yes |
| `/orders/new` | `app/(merchant)/orders/new/page.tsx` | — |
| `/orders/[id]/pay` | `app/(merchant)/orders/[id]/pay/page.tsx` | — (Wompi card / PSE / Nequi) |
| `/orders/[id]/pay/resultado` | `app/(merchant)/orders/[id]/pay/resultado/page.tsx` | — |
| `/orders/[id]/resultado` | `app/(merchant)/orders/[id]/resultado/page.tsx` | — |
| `/settings` | `app/(merchant)/settings/page.tsx` | yes |
| `/settings/profile` | `app/(merchant)/settings/profile/page.tsx` | — |
| `/settings/billing` | `app/(merchant)/settings/billing/page.tsx` | — |
| `/settings/shopify` | `app/(merchant)/settings/shopify/page.tsx` | — |
| `/labels` | `app/(merchant)/labels/page.tsx` | **NO — orphan, URL only** |

### 3.4 Admin app — 11 routes

| URL | File | In sidebar? |
|---|---|---|
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | yes |
| `/admin/orders` | `app/admin/orders/page.tsx` | yes |
| `/admin/orders/new` | `app/admin/orders/new/page.tsx` | — |
| `/admin/orders/[id]` | `app/admin/orders/[id]/page.tsx` | — |
| `/admin/products` | `app/admin/products/page.tsx` | yes |
| `/admin/products/new` | `app/admin/products/new/page.tsx` | — |
| `/admin/products/[id]` | `app/admin/products/[id]/page.tsx` | — |
| `/admin/labels` | `app/admin/labels/page.tsx` | yes |
| `/admin/merchants` | `app/admin/merchants/page.tsx` | yes |
| `/admin/settings` | `app/admin/settings/page.tsx` | yes |
| `/admin/shopify` | `app/admin/shopify/page.tsx` | **NO — orphan, URL only** |

### 3.5 API route handlers — 19

| URL | Methods | Auth model |
|---|---|---|
| `/api/auth/[...supabase]` | GET | Public — Supabase PKCE code exchange |
| `/api/admin/products` | GET, POST | `isAdmin(user.email)` in handler → 403 |
| `/api/admin/products/[id]` | PATCH, DELETE | `isAdmin` → 403 |
| `/api/admin/labels/[id]` | PATCH | `isAdmin` → 401 |
| `/api/admin/merchants/[id]` | PATCH, DELETE | `isAdmin` → 403 |
| `/api/admin/settings` | GET, PATCH | `isAdmin` → 401 |
| `/api/transactions/[id]` | GET | Any authenticated user → 401 (see §10, R7) |
| `/api/mockups/generate` | POST | **DEAD** — only caller is a dead component (§8) |
| `/api/cron/billing` | GET | `Authorization: Bearer $CRON_SECRET` |
| `/api/shopify/auth` | GET | Public; optional Shopify HMAC if `hmac` param present |
| `/api/shopify/callback` | GET | Shopify HMAC (mandatory) + Supabase session |
| `/api/shopify/fulfillment_order_notification` | POST | **NONE — unauthenticated, unsigned (§10, R3)** |
| `/api/webhooks/shopify` | POST | Shopify HMAC via `SHOPIFY_WEBHOOK_SECRET` |
| `/api/webhooks/shopify/fulfillment-order` | POST | Shopify HMAC (local impl, tries both secrets) |
| `/api/webhooks/shopify/customers/data-request` | POST | Compliance HMAC via `SHOPIFY_API_SECRET` |
| `/api/webhooks/shopify/customers/redact` | POST | Compliance HMAC |
| `/api/webhooks/shopify/shop/redact` | POST | Compliance HMAC |
| `/api/webhooks/stripe` | POST | Stripe signature — **route is live but the integration is abandoned (§8, R2)** |
| `/api/webhooks/wompi` | POST | Wompi SHA-256 event checksum |

**Total: 41 page routes + 19 API routes.**

---

## 4. Environment inventory

27 distinct variable names are referenced. **There is no `.env.example`, no `.env.local.example`, and no `.env*` file of any kind in the repo.** `.gitignore` line 30 excludes `.env*`. The only written record of required config is the block in `CLAUDE.md` lines 30–52, which is **incomplete and partly wrong** (see the ✗ rows below).

### Supabase
| Name | Referenced in | In CLAUDE.md? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/{client,server,admin}.ts`, `proxy.ts`, `app/api/auth/[...supabase]/route.ts` | ✓ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `lib/supabase/{client,server}.ts`, `proxy.ts`, `app/api/auth/[...supabase]/route.ts` | ✓ |
| `SUPABASE_SECRET_KEY` | `lib/supabase/admin.ts` — **service role, bypasses RLS** | ✓ |

### Wompi (live payment provider, Colombia)
| Name | Referenced in | In CLAUDE.md? |
|---|---|---|
| `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` | `lib/wompi.ts`, `components/merchant/change-payment-form.tsx`, `app/(merchant)/orders/[id]/pay/payment-form.tsx` | ✗ |
| `WOMPI_PRIVATE_KEY` | `lib/wompi.ts` — also selects sandbox vs production by `prv_test_` prefix | ✗ |
| `WOMPI_EVENTS_SECRET` | `lib/wompi.ts` `verifyWompiEvent()` | ✗ |
| `WOMPI_STARTER_PRICE_COP` | `lib/wompi.ts` | ✗ |
| `WOMPI_PLUS_PRICE_COP` | `lib/wompi.ts` | ✗ |

### Stripe (abandoned, still wired)
| Name | Referenced in | In CLAUDE.md? |
|---|---|---|
| `STRIPE_SECRET_KEY` | `lib/stripe.ts` | ✓ |
| `STRIPE_WEBHOOK_SECRET` | `app/api/webhooks/stripe/route.ts` | ✓ |
| `STRIPE_STARTER_PRICE_ID` | `lib/stripe.ts`, stripe webhook | ✓ |
| `STRIPE_PLUS_PRICE_ID` | `lib/stripe.ts`, stripe webhook | ✓ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **documented but referenced nowhere in code** | ✓ (obsolete) |

### Shopify
| Name | Referenced in | In CLAUDE.md? |
|---|---|---|
| `SHOPIFY_API_KEY` | `lib/shopify.ts` | ✓ |
| `SHOPIFY_API_SECRET` | `lib/shopify.ts`, `app/api/shopify/{auth,callback}/route.ts`, fulfillment-order webhook | ✓ |
| `SHOPIFY_WEBHOOK_SECRET` | `lib/shopify.ts`, fulfillment-order webhook | ✓ |
| `SHOPIFY_SCOPES` | `lib/shopify.ts` — note: must also be pushed via `shopify.app.toml` | ✓ |
| `SHOPIFY_WEBHOOK_BASE_URL` | `lib/shopify.ts`, `app/api/shopify/callback/route.ts` — ngrok override for dev | ✗ |

### Email (Resend)
| Name | Referenced in | In CLAUDE.md? |
|---|---|---|
| `RESEND_API_KEY` | `lib/email.ts` (**module scope — see §8**), `app/admin/shopify/actions.ts`, `app/(merchant)/settings/shopify/actions.ts` | ✗ |
| `RESEND_FROM_EMAIL` | same three files; falls back to `LABLLD <noreply@lablld.com>` | ✗ |

### Mockup rendering
| Name | Referenced in | In CLAUDE.md? |
|---|---|---|
| `SUDOMOCK_API_KEY` | `lib/sudomock.ts` — **the live provider** | ✗ |
| `DYNAMIC_MOCKUPS_API_KEY` | `lib/dynamic-mockups.ts` — **dead code path** | ✓ (obsolete) |

### Shipping (dead)
| Name | Referenced in | In CLAUDE.md? |
|---|---|---|
| `ENVIA_API_KEY` | `lib/envia.ts` — **module never imported by anything** | ✗ |
| `ENVIA_API_URL` | `lib/envia.ts`; defaults to `https://api.ship-test.envia.com` (**test endpoint by default**) | ✗ |

### Platform
| Name | Referenced in | In CLAUDE.md? |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | 7 files. Falls back to `https://app.lablld.com` in `app/(auth)/actions.ts:57` only | ✓ |
| `ADMIN_EMAILS` | `lib/utils.ts:37` (comma-separated), `app/(merchant)/settings/shopify/actions.ts` | ✓ |
| `CRON_SECRET` | `app/api/cron/billing/route.ts:10` | ✗ |

### Hardcoded secrets found

**None.** A scan for `sk_live`/`sk_test`/`pk_*`/`whsec_`/`shpat_`/`shpua_`/`shpss_`/`re_*`/JWT (`eyJ…`)/`AIza…`/`prv_prod`/`pub_prod` patterns across all `.ts`, `.tsx`, `.json`, `.toml`, `.mjs`, `.md` files returned only *format-prefix comparisons* and documentation prose — no credential values. Specifically:

- `lib/wompi.ts:10`, `app/(merchant)/orders/[id]/pay/payment-form.tsx:9`, `components/merchant/change-payment-form.tsx:7` compare against the literals `prv_test_` / `pub_test_` to pick sandbox vs production. These are prefix checks, not keys.
- `CLAUDE.md:36,80,163` mention `SUPABASE_SECRET_KEY` and the `shpua_` token *format*. Names and formats only.

**One non-secret identifier is committed:** `shopify.app.toml:3` contains `client_id = "10843cb95…"`. That is the Shopify app's public client ID (equivalent to `SHOPIFY_API_KEY`), which is designed to be public. Not a leak, but it does mean the Shopify app identity is pinned in the repo and a new owner inherits *that specific Shopify app*, not a fresh one.

**Config values that are effectively hardcoded and will need changing on handover:**

- `lib/envia.ts:9–14` — a placeholder warehouse origin address (`Calle 50 #1, El Centro, Medellín`, phone `3001234567`, `ops@lablld.com`), flagged in-code with `// Update with actual warehouse address once available`.
- `components/layout/merchant-sidebar.tsx:21` — a WhatsApp support number `+573219482805` baked into the sidebar.
- `shopify.app.toml:6` — `application_url = "https://app.lablld.com/api/shopify/auth"`, and `dev_store_url = "lablld-test.myshopify.com"`.
- `dev.bat:3` — a specific free-tier ngrok reserved domain.

---

## 5. Supabase — usage and schema reproducibility

### Critical question: is the schema reproducible from this repo?

# **No.**

There are **zero** SQL files, zero migration directories, no `supabase/` folder, no `supabase/config.toml`, no generated `database.types.ts`, and no seed data anywhere in the repository. A full-tree search for `*.sql`, `*migration*`, `*schema*` returned only two false positives (`lib/supabase/` and `app/api/auth/[...supabase]/`, both directory-name matches).

**The database schema exists only inside the previous developer's Supabase project.** If access to that project is lost, the schema — tables, columns, types, constraints, indexes, RLS policies, storage bucket policies, triggers, and auth settings — is lost with it. The code tells you which tables and columns are *read and written*, but not their types, nullability, defaults, foreign keys, unique constraints, or any of the RLS policy bodies.

The closest thing to documentation is the prose block in `CLAUDE.md` lines 358–405. **It is stale.** Compared against what the code actually queries:

- **Missing entirely from the doc:** `merchant_labels`, `platform_settings`.
- **Merchant columns the doc omits:** `wompi_payment_source_id`, `subscription_started_at`, `subscription_next_billing_at`, `shopify_request_domain`, `mockup_credits_used`, `mockup_credits_reset_at`.
- **Merchant columns the doc lists that `types/index.ts` no longer declares:** `stripe_customer_id`, `stripe_payment_method_id`, `stripe_subscription_id`. The Stripe webhook (`app/api/webhooks/stripe/route.ts`) still filters on `stripe_subscription_id` — so either the column survives as a legacy artifact or that webhook is silently broken. **This cannot be resolved from the repo.**
- **Product columns the doc omits:** `mockup_smart_object_uuid`, `mockup_so_width`, `mockup_so_height`, `fulfillment_fee_cop`, `label_template_url`, `canva_template_url`, `theme_labels`.
- **Order columns the doc omits:** `wompi_transaction_id`, `payment_link_id`, `shopify_fulfillment_order_id`.
- **`shopify_stores` columns the doc omits:** `fulfillment_service_id`, `fulfillment_service_location_id`, `fulfillment_service_handle`.
- **Order statuses the doc omits:** `quote_pending`, `payment_pending` (both present in `types/index.ts:11-12` and used in `app/(merchant)/layout.tsx:19`).
- **`shipping_rates` column the doc omits:** `rate_cop`.

So the doc is not a usable substitute for a schema dump either.

### Tables referenced in code (9)

| Table | Read/write sites |
|---|---|
| `merchants` | 73 |
| `orders` | 42 |
| `merchant_products` | 35 |
| `products` | 22 |
| `shopify_stores` | 17 |
| `order_items` | 8 |
| `shipping_rates` | 5 |
| `merchant_labels` | 5 |
| `platform_settings` | 3 (key/value JSON blob, key `dashboard`) |

No `.rpc()` calls — so no Postgres functions are invoked from the app. Whether any exist server-side is unknown.

### Storage buckets referenced (2)

| Bucket | Used by | Path convention |
|---|---|---|
| `labels` | `components/merchant/label-upload-form.tsx:32`, `components/merchant/label-uploader.tsx:37` | `{merchantId}/{productId}/{timestamp}.{ext}` |
| `product-images` | `components/admin/product-image-uploader.tsx:37`, `components/admin/theme-labels-editor.tsx:37,41`, `app/admin/settings/page.tsx:31,33` | `{timestamp}-{random}.{ext}` |

`CLAUDE.md` states both are **public** buckets with manually-created RLS policies ("política manual en dashboard"). Those policies are not in the repo.

### Auth

Supabase Auth, email + password, PKCE. Three client factories:

- `lib/supabase/client.ts` — browser, publishable key.
- `lib/supabase/server.ts` — SSR, publishable key, cookie-backed.
- `lib/supabase/admin.ts` — **service-role key, `autoRefreshToken: false`, `persistSession: false`, comment `// Bypasses RLS — server-side only`.**

### RLS

**RLS is effectively not the security boundary in this application.** Nearly every server-side data access goes through `createAdminClient()`, which bypasses RLS entirely. Authorization is enforced in application code: an auth check (`supabase.auth.getUser()`) followed by an explicit `.eq('merchant_id', user.id)` on the query.

I checked every Server Action and API route. **The ownership scoping is consistently applied** — e.g. `app/(merchant)/orders/actions.ts:16,24,28`, `app/(merchant)/products/actions.ts:23`, `app/(merchant)/products/[id]/actions.ts:75,110`. That is genuinely good discipline and I found no IDOR in the merchant surface.

But it means: **if any future edit forgets one `.eq('merchant_id', …)`, there is no second line of defence.** RLS policies (if they exist at all in the live project) are never exercised on these paths. This is the architectural risk to understand before touching this code.

---

## 6. Third-party services

| Service | Purpose | Where referenced | Account needed? |
|---|---|---|---|
| **Supabase** | Postgres, Auth, Storage | `lib/supabase/*`, `proxy.ts`, every page/action | **Yes — mandatory.** Contains all data and the only copy of the schema |
| **Wompi** (Colombia) | **Live payments**: card tokens, payment sources, PSE, Nequi, payment links, recurring charges | `lib/wompi.ts`, `app/api/webhooks/wompi/route.ts`, `app/api/cron/billing/route.ts`, billing/onboarding/order-pay actions | **Yes — mandatory.** Merchant + private key + events secret |
| **Shopify** | Merchant store OAuth, product publishing, order webhooks, fulfillment service | `lib/shopify.ts`, `app/api/shopify/*`, `app/api/webhooks/shopify/*`, `shopify.app.toml` | **Yes — mandatory.** A Partner account owning app client_id `10843cb95…` |
| **Resend** | Transactional email (quote email, Shopify install link, admin notification) | `lib/email.ts`, `app/admin/shopify/actions.ts`, `app/(merchant)/settings/shopify/actions.ts` | **Yes.** Also needs a verified sending domain for `noreply@lablld.com` |
| **SudoMock** (`api.sudomock.com`) | **Live** 3D label mockup rendering | `lib/sudomock.ts`, `app/(merchant)/products/[id]/actions.ts:6` | **Yes.** Credit-metered — the app enforces a 6-render/month cap per merchant (`MOCKUP_LIMIT`) |
| **Stripe** | **Abandoned.** No code creates customers, subscriptions, or payment intents any more. `lib/stripe.ts` is imported *only* by `app/api/webhooks/stripe/route.ts`. `@stripe/react-stripe-js` and `@stripe/stripe-js` are installed but imported **nowhere** | `lib/stripe.ts`, `app/api/webhooks/stripe/route.ts` | **No — but see R2.** If a Stripe webhook endpoint is still configured, this route can still mutate merchant plans |
| **Dynamic Mockups** (`app.dynamicmockups.com`) | **Dead.** Superseded by SudoMock | `lib/dynamic-mockups.ts` ← `app/api/mockups/generate/route.ts` ← `components/merchant/mockup-preview.tsx` (all three unreachable) | No |
| **Envia.com** | **Dead.** Shipping rate quotes + label generation, fully written, never imported | `lib/envia.ts` | No |
| **Vercel** | Hosting + cron | `vercel.json` | **Yes — mandatory** (cron is a Vercel platform feature) |
| **Unsplash** | Whitelisted image host | `next.config.ts:16` | No |
| **ngrok** | Local dev HTTPS tunnel for Shopify webhooks | `dev.bat`, `CLAUDE.md` | Dev only |
| **lablld.com** | Marketing site linked from the sidebar and shipping copy | `components/layout/merchant-sidebar.tsx:82,86`, `components/merchant/product-step-shipping.tsx:38` | Domain ownership |
| **WhatsApp** | Support link (hardcoded number) | `components/layout/merchant-sidebar.tsx:21` | Phone ownership |
| **Analytics** | **None.** No Vercel Analytics, no GA, no PostHog, no Sentry, no error reporting of any kind | — | — |

**No AI APIs are used anywhere in this codebase.**

---

## 7. Auth flow

### Session mechanism
Supabase Auth with cookie-backed SSR sessions (`@supabase/ssr`). Cookies are read/written in `proxy.ts` (the Next 16 replacement for `middleware.ts`), refreshed on every matched request by the `supabase.auth.getUser()` call.

### Register — `app/(auth)/actions.ts:31` `registerAction`
1. Zod validation: name ≥ 2 chars, valid email, **password ≥ 8 chars** (note: Supabase's own minimum is 6, and the error translator at line 15 still says "at least 6").
2. Pre-check against `merchants` by email using the **service-role client**, returns early if taken.
3. `supabase.auth.signUp()` with `data: { full_name, onboarding_completed: false }` and
   **`emailRedirectTo: ${NEXT_PUBLIC_APP_URL}/api/auth/callback`** — fallback `https://app.lablld.com`.
4. On "already registered", it lists all auth users via `admin.auth.admin.listUsers()` to find and delete an *orphan* (auth user with no `merchants` row). This is an unpaginated full-user listing on every duplicate registration — it will degrade as the user table grows.
5. Inserts the `merchants` row (`upsert` on `id`); on failure it deletes the auth user to avoid orphans.
6. No session (email confirmation on) → `redirect('/login?registered=1')`. Session present → `redirect('/onboarding/quien-eres')`.

### Login — `app/(auth)/actions.ts:100` `loginAction`
1. Zod validation, `signInWithPassword`.
2. **`isAdmin(email)` → `/admin/dashboard`.**
3. `?next=` honoured only if it starts with `/` (open-redirect safe).
4. Self-heals a missing `merchants` row by inserting one.
5. `user_metadata.onboarding_completed === true` → `/dashboard`, else `/onboarding/quien-eres`.

### Logout — `logoutAction` → `signOut()` → `/login`.

### Email-confirmation / PKCE callback — `app/api/auth/[...supabase]/route.ts`
Catch-all `GET`. Exchanges `?code=` for a session, then redirects to `?next=` if given, else `/dashboard` or `/onboarding/quien-eres` based on `onboarding_completed`.

### Redirect URLs that must be configured in the Supabase dashboard

| URL | Set by |
|---|---|
| `https://app.lablld.com/api/auth/callback` | `emailRedirectTo` in `registerAction`, from `NEXT_PUBLIC_APP_URL` |
| `http://localhost:3000/api/auth/callback` | same, dev |
| Site URL: `https://app.lablld.com` | implied by the `NEXT_PUBLIC_APP_URL` fallback |

Note the catch-all route matches `/api/auth/<anything>`, so `/api/auth/callback` and `/api/auth/confirm` both resolve to the same handler.

### Shopify OAuth redirect URLs (`shopify.app.toml:32-35`)
- `https://app.lablld.com/api/shopify/callback`
- `http://localhost:3000/api/shopify/callback`
- App entry point: `https://app.lablld.com/api/shopify/auth`

### Authorization model — three layers

1. **`proxy.ts`** (edge, runs on all non-asset paths):
   - `/api/webhooks/*` and `/api/shopify/*` → bypass entirely.
   - `/admin/*` → requires session **and** `isAdmin(email)`, else `/login` or `/dashboard`.
   - `/dashboard`, `/catalog`, `/products`, `/orders`, `/settings`, `/onboarding` → require session.
   - `/login`, `/register` while logged in → bounce to the right dashboard.
2. **Layouts:** `app/(merchant)/layout.tsx` re-checks session, redirects admins out, and redirects to `/suspended` when `is_active === false`.
3. **Per-handler:** every admin API route and every Server Action re-checks `getUser()` and, for admin surfaces, `isAdmin()`.

**`isAdmin()` (`lib/utils.ts:37-40`) is an env-var email allowlist.** Admins have no row in `merchants` and no database-backed role. `ADMIN_EMAILS` is read at module scope, so changing it requires a redeploy.

Two gaps worth knowing:
- **`app/admin/layout.tsx` does not check `isAdmin`.** It reads the user only to render the header. The entire admin-page gate rests on `proxy.ts`. If the proxy matcher is ever narrowed, every admin *page* opens at once. (The admin *API* routes are independently guarded, so data mutation stays protected.)
- **`/labels` is not in `proxy.ts`'s `protectedPaths`.** It is still protected, but only by `app/(merchant)/layout.tsx`. Inconsistent with its sibling routes.

---

## 8. Quality assessment

Headline: **the code that is alive is written to a consistent and fairly disciplined standard. The problem is how much of it is dead, and how much of the surrounding documentation is wrong.**

### 8.1 What is good — state it plainly

- `tsc --noEmit` passes clean under `strict: true`.
- **Zero `any`.** Zero `@ts-ignore` / `@ts-expect-error`. Verified by full-tree grep.
- **Zero `console.log` / `console.error` / `console.warn`.**
- **One TODO in the entire codebase** (`components/admin/order-detail.tsx:74`) — and that file is dead anyway. TODO/FIXME density is effectively nil.
- Auth + ownership scoping is applied consistently on every merchant-facing write (§5).
- Webhook signature verification is present and uses `crypto.timingSafeEqual` on the Shopify paths.
- Zod validation on all form-driven Server Actions and admin API bodies.
- The lazy `getStripe()` singleton pattern shows the previous developer understood the module-scope-instantiation trap.

### 8.2 Dead code — ~1,900 lines, ~13% of the codebase

Verified by import-graph traversal. **26 files are unreachable.**

**Directly unreferenced (never imported by anything):**

| File | Lines |
|---|---|
| `components/ui/dialog.tsx` | 157 |
| `components/merchant/product-label-panel.tsx` | 150 |
| `components/ui/sheet.tsx` | 135 |
| `components/merchant/payment-pending-card.tsx` | 116 |
| `lib/envia.ts` | 109 |
| `components/merchant/product-configure-form.tsx` | 103 |
| `components/admin/shopify-requests-table.tsx` | 96 |
| `components/admin/order-detail.tsx` | 80 |
| `components/merchant/add-product-form.tsx` | 65 |
| `components/merchant/shopify-request-form.tsx` | 63 |
| `components/admin/orders-table.tsx` | 58 |
| `components/merchant/shopify-connect-button.tsx` | 55 |
| `components/merchant/mockup-preview.tsx` | 50 |
| `components/merchant/order-steps.tsx` | 49 |
| `components/ui/sonner.tsx` | 49 |
| `components/shared/error-boundary.tsx` | 47 |
| `components/admin/merchant-cancel-button.tsx` | 44 |
| `components/merchant/product-active-toggle.tsx` | 38 |
| `components/ui/separator.tsx` | 25 |
| `components/merchant/payment-method-list.tsx` | 8 |

**Transitively dead** (imported only by dead files):

| File | Lines | Reached only via |
|---|---|---|
| `components/merchant/label-uploader.tsx` | 85 | `product-label-panel.tsx` |
| `components/merchant/theme-label-selector.tsx` | 41 | `product-label-panel.tsx` |
| `app/api/mockups/generate/route.ts` | 37 | `mockup-preview.tsx` |
| `lib/dynamic-mockups.ts` | 33 | that route |

**Abandoned but still routable:**

| File | Lines | Note |
|---|---|---|
| `app/api/webhooks/stripe/route.ts` | 123 | Live HTTP endpoint. Mutates `merchants.plan` / `plan_status` |
| `lib/stripe.ts` | 86 | Imported only by the above |

`components/ui/sonner.tsx` deserves a specific mention: the `sonner` toast dependency is installed, the wrapper component exists, but **`<Toaster />` is mounted nowhere in any layout**, and `toast()` is never called. `CLAUDE.md:407` lists "toasts de confirmación" as pending Phase-2 work — this is a half-wired feature left in place.

### 8.3 Two abandoned integrations left fully in the tree

- **Envia.com shipping** (`lib/envia.ts`, 109 lines) is a complete, well-typed client with rate quoting and label generation. **Nothing imports it.** `ENVIA_API_KEY` and `ENVIA_API_URL` exist purely to feed it, and `ENVIA_API_URL` defaults to the **test** endpoint. Someone built a shipping integration and then stopped.
- **Dynamic Mockups** was replaced by **SudoMock** without removing the old path. Both clients export a function named `generateMockup` with near-identical signatures. `DYNAMIC_MOCKUPS_API_KEY` is documented in `CLAUDE.md`; `SUDOMOCK_API_KEY` — the one that actually matters — is not documented anywhere.

### 8.4 Duplication

- **`components/merchant/catalog-filters.tsx` (127 L) vs `components/merchant/merchant-products-filters.tsx` (88 L)** — copy-paste siblings. Same structure, same `useRef`+`useEffect` debounce, and **the same React-refs lint error in both** (lines 30–31 and 19–20 respectively). A bug was cloned along with the code.
- **`components/merchant/label-uploader.tsx` (85 L) vs `components/merchant/label-upload-form.tsx` (101 L)** — two label uploaders to the same `labels` bucket. One is dead.
- **`components/admin/product-form.tsx` (203 L) vs `components/admin/product-edit-form.tsx` (219 L)** — create/edit variants of the same 40-field form, maintained in parallel.
- **`lib/wompi.ts:37` re-derives the sandbox/production base URL** already computed by `getBase()` at line 9, and the same ternary is duplicated again in `app/(merchant)/orders/[id]/pay/payment-form.tsx:9` and `components/merchant/change-payment-form.tsx:7`. Four copies of one decision.

### 8.5 Concrete defects found

**(a) `lib/email.ts:3` will crash the admin order page if `RESEND_API_KEY` is unset.**
```ts
const client = new Resend(process.env.RESEND_API_KEY)   // module scope
```
I verified against the installed `resend@6` that `new Resend(undefined)` **throws** `Missing API key`. Because this runs at module scope, the throw happens at *import* time. `lib/email.ts` is imported by `app/admin/orders/[id]/actions.ts:8`, which backs `/admin/orders/[id]`. So a missing key takes out the admin order-detail route entirely, rather than just disabling email. The guard at `lib/email.ts:22` (`if (!process.env.RESEND_API_KEY) return`) is **unreachable** — the constructor already threw. The other two Resend call sites (`app/admin/shopify/actions.ts:33`, `app/(merchant)/settings/shopify/actions.ts:43`) do it correctly, instantiating lazily inside a guard. This is exactly the trap `CLAUDE.md:141` documents for Stripe and solves with `getStripe()`; the same lesson was not applied to Resend.

**(b) OAuth `state` is generated but never verified.**
`app/api/shopify/auth/route.ts:23` creates `crypto.randomBytes(16)` as `state` and puts it in the authorize URL. `app/api/shopify/callback/route.ts:13` reads `state` back — and never uses it (ESLint flags it as an unused variable). It is not stored in a cookie or the DB, so it cannot be. CSRF protection on the OAuth handshake is decorative. Shopify's mandatory HMAC check at line 24 provides real protection, so the practical exposure is limited, but the control that appears to be there is not.

**(c) `'use server'` at the top of a route handler.**
`app/api/shopify/callback/route.ts:1` begins with `'use server'`. That directive marks a module as a Server Actions module; it is meaningless (and misleading) in a `route.ts`. A small tell that some of this was generated rather than reasoned through.

**(d) Label approval appears to have been silently bypassed.**
`CLAUDE.md:96-97` describes the core workflow: merchant uploads a label → `label_status: 'pending'` → admin approves at `/admin/labels`. But `app/(merchant)/products/[id]/actions.ts:38` and `:59` now set **`label_status: 'approved'`** the moment a merchant attaches a label URL. Meanwhile a *separate* `merchant_labels` table with its own pending/approved/rejected flow was added (`/labels`, `/admin/labels`). Two label-approval systems now coexist, and the one documented as the product's compliance gate is auto-approving. **Whether this was intentional is not answerable from the repo** — flag it as a product question for the owner.

**(e) `/api/shopify/fulfillment_order_notification` retries with `setTimeout` for up to ~22 s inside `after()`** (`route.ts:20-21`, 6 attempts with `attempt * 1500` ms backoff) with **no `maxDuration` export**. On Vercel's default function timeout this loop can be cut off mid-way, silently dropping the `shopify_fulfillment_order_id` write.

**(f) `app/api/cron/billing/route.ts:10` compares the bearer token with `!==`** — a non-constant-time string comparison. Low practical risk for a 200-response-code oracle, but it is the one signature/secret check in the codebase that does not use `timingSafeEqual`, and the four others do.

### 8.6 Lint state

`eslint .` reports **18 errors and 8 warnings**. Nothing runs it in CI.

| Rule | Count | Locations |
|---|---|---|
| `react/no-unescaped-entities` | 14 | `app/privacidad/page.tsx:11-12` (8), `app/terminos/page.tsx:12-13` (4), `app/admin/settings/page.tsx:115` (2) |
| `react-hooks/refs` (**errors**) | 4 | `components/merchant/catalog-filters.tsx:30,31`; `components/merchant/merchant-products-filters.tsx:19,20` — writing `ref.current` during render |
| `@typescript-eslint/no-unused-vars` | 5 | `app/api/shopify/callback/route.ts:13` (the `state` above), `components/admin/theme-labels-editor.tsx:18`, `components/merchant/payment-pending-card.tsx:4`, `components/merchant/product-card.tsx:4`, `components/merchant/product-step-shipping.tsx:3` |
| `@next/next/no-img-element` | 3 | `app/admin/orders/[id]/page.tsx:70`, `components/merchant/order-tab-panel.tsx:79`, `components/merchant/product-step-label.tsx:92` |

### 8.7 The repo's own rules are not met

`CLAUDE.md:5-10` sets house rules. Measured against the code:

| Rule | Status |
|---|---|
| "TypeScript estricto, sin `any`" | ✅ Held |
| "Sin `console.log`" | ✅ Held |
| "Máximo 150 líneas por archivo" | ❌ **15 files exceed it**, up to 302 (`lib/shopify.ts`), 255 (`types/index.ts`), 244 (`components/merchant/order-tab-panel.tsx`), 238 (`components/merchant/product-stepper.tsx`), 219/203 (the two admin product forms) |
| "Una función, una responsabilidad" | ⚠️ Mostly held; `app/api/shopify/callback/route.ts` GET does HMAC + auth + token exchange + 3 webhook registrations + fulfillment-service registration + 2 DB writes in one 90-line function |

### 8.8 Documentation drift

`CLAUDE.md` is the only substantive documentation and it is **materially out of date**. Beyond the schema drift in §5 and the env drift in §4, it lists a file inventory (lines 253–345) that no longer matches: it names `app/(auth)/onboarding/payment/payment-form.tsx` (the actual file is `pay-button.tsx`), states "`/settings` no tiene página propia" (it has one), describes Stripe as the payment system throughout, and describes `merchant_products.label_status` as the label workflow. It also claims "**Supabase — tablas (todas creadas ✓)**" — a claim that is *only* verifiable against the live project, which is exactly the problem.

`README.md` is the **unmodified `create-next-app` template**. It says nothing about LABLLD. There is no setup guide, no env list, no local-development instructions beyond `dev.bat` (Windows only, hardcoded ngrok domain).

### 8.9 Repo hygiene

- **`public/` is 86 MB across 49 files.** Largest: `image1.png` (14 MB), `onboarding/quien_eres_-_foto.png` (10 MB), `onboarding/primera_foto.png` (7.9 MB). Twelve files exceed 2 MB. None are optimised. There is also a 7.9 MB file named `public/onboarding/primera_foto` **with no extension**, and a spreadsheet `public/onboarding/Tablas_oficios.xlsx` sitting in the publicly-served directory.
- Stale `create-next-app` placeholders still present: `public/next.svg`, `public/vercel.svg`, `public/file.svg`, `public/globe.svg`, `public/window.svg`.
- **Git history is a single squashed import commit** (`845c1a4 app: import LABLLD platform source`, authored 2026-08-19). There is no development history, no per-change rationale, nothing to `git blame`, and nothing to bisect. Every line of this codebase arrived in one commit.
- `.claude/settings.local.json` — a personal editor settings file — is committed.
- `dev.bat` is Windows-only and pins a specific free-tier ngrok reserved domain.

---

## 9. Build and deploy

### Commands
| Script | Command |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint` |

No `test` script. No `typecheck` script. No prebuild or postinstall hooks.

### Output
Default Next.js App Router build (`.next/`). No `output: 'standalone'`, no `output: 'export'` — this is a **server-rendered app and cannot be deployed as static files.** Serverless/Node functions are required.

### Vercel specifics
- **`vercel.json`** declares exactly one thing: a cron hitting `GET /api/cron/billing` daily at `0 13 * * *` (13:00 UTC). Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when `CRON_SECRET` is set as a project env var — the route requires it (`route.ts:10`) and returns 401 otherwise. **If `CRON_SECRET` is not set on the project, all subscription billing silently stops.**
- No `buildCommand`, `installCommand`, `framework`, or `regions` override — Vercel auto-detects Next.js and npm.
- **`app/api/cron/billing/route.ts:6-7`** sets `export const runtime = 'nodejs'` and `export const maxDuration = 300`. **300 s exceeds the Hobby-plan limit** — this requires a Vercel plan that permits 300-second functions. On a plan that caps lower, the billing run will be truncated mid-loop, and the loop is not idempotent-safe by design (it charges then updates).
- `next.config.ts` whitelists three remote image hosts: `*.supabase.co/storage/v1/object/public/**`, `images.unsplash.com`, `cdn.sudomock.com`.
- `next.config.ts` sets an explicit `tailwindcss` resolve alias for **both** turbopack and webpack, to work around a resolution loop when a parent directory lacks `node_modules/tailwindcss`. Keep this if the repo ever moves under another project folder.
- `experimental.serverActions: {}` — an empty object; enables the default, sets nothing.
- **No Node version is pinned.** Vercel will use its current default. With Next 16 + React 19 this is probably fine, but it is unlatched.

### Build-time vs runtime env vars

**Must be present at BUILD time** (`NEXT_PUBLIC_*` are inlined into the client bundle by the compiler — setting them only at runtime will ship `undefined` to the browser):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`
- `NEXT_PUBLIC_APP_URL`

**Runtime only (server):** `SUPABASE_SECRET_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_STARTER_PRICE_COP`, `WOMPI_PLUS_PRICE_COP`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_WEBHOOK_SECRET`, `SHOPIFY_SCOPES`, `SHOPIFY_WEBHOOK_BASE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SUDOMOCK_API_KEY`, `ADMIN_EMAILS`, `CRON_SECRET`.

**Only needed if the abandoned paths stay wired:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_STARTER_PRICE_ID`, `STRIPE_PLUS_PRICE_ID`, `DYNAMIC_MOCKUPS_API_KEY`, `ENVIA_API_KEY`, `ENVIA_API_URL`.

Two runtime vars are read at **module scope**, so they are captured when the module first loads and a change requires a redeploy, not just an env update: `ADMIN_EMAILS` (`lib/utils.ts:37`) and the whole `SHOPIFY_*` block (`lib/shopify.ts:3-7`). `RESEND_API_KEY` is worse — see §8.5(a).

### Out-of-band deploy steps that are not in the repo

These are required for a working deployment and exist only as prose in `CLAUDE.md`:
1. `npx shopify app config push` to register scopes and compliance webhooks from `shopify.app.toml`. Scopes in the OAuth URL alone are ignored by Shopify since 2025.
2. Supabase Storage buckets `labels` and `product-images` must be created **and their RLS policies added by hand in the dashboard**.
3. Supabase Auth redirect URLs and Site URL configured (§7).
4. Wompi webhook endpoint pointed at `/api/webhooks/wompi`.
5. `CRON_SECRET` set on the Vercel project.

### Verification performed
- `npm ci` → clean, 650 packages, exit 0.
- `npx tsc --noEmit` → **exit 0, no errors.**
- `npx eslint .` → 18 errors, 8 warnings (§8.6).
- `next build` **not run** — it could trigger build-time data fetching against the live Supabase project, which the audit terms forbid. The typecheck is strong evidence the code compiles; a full production build should be verified once by the new owner in an environment with its own credentials.

---

## 10. Risk list — ranked

### R1 — The database schema exists nowhere but the previous developer's Supabase project. **Critical.**
No migrations, no SQL, no schema dump, no generated types. Nine tables, two storage buckets, all RLS policies, all constraints, indexes, defaults, and auth configuration are recoverable **only** from the live project. `CLAUDE.md`'s prose schema is provably incomplete (missing two whole tables and ~15 columns). If access to that Supabase project is lost or revoked before a dump is taken, this application cannot be rebuilt — you would be reverse-engineering column types from query sites.
**Do first, before anything else:** obtain owner-level access to the Supabase project and take a full `pg_dump --schema-only` plus a policy/bucket export, commit it, and adopt a migrations workflow from that point on. Nothing else on this list matters if this is not done.

### R2 — An abandoned Stripe integration is still a live, mutating webhook endpoint. **High.**
`/api/webhooks/stripe` is deployed and signature-checked, and it writes `plan`, `pending_plan`, and `plan_status` on `merchants` — keyed on `stripe_subscription_id`, a column `types/index.ts` no longer declares. Payments moved to Wompi; no code creates Stripe objects any more. If a Stripe webhook endpoint is still configured on the old account, a single stale `customer.subscription.deleted` will null out a live merchant's plan and lock them out of the app. Two silent failure modes, and which one applies depends on whether that legacy column still exists — **not answerable from the repo.**
**Action:** confirm the Stripe account state, delete the webhook endpoint there, then remove `lib/stripe.ts`, the route, and the three `@stripe/*` dependencies.

### R3 — `/api/shopify/fulfillment_order_notification` is an unauthenticated, unsigned write endpoint. **High.**
`proxy.ts:35` exempts all of `/api/shopify/*` from auth, and unlike every other webhook this handler performs **no HMAC verification**. Anyone who can reach the URL can POST arbitrary JSON that causes a service-role (RLS-bypassing) write of an attacker-chosen `shopify_fulfillment_order_id` onto any order whose `shopify_order_id` they can guess. Blast radius is one column, so this is not a data breach — but it is an unauthenticated write into the production database from the open internet, and it sits next to five sibling routes that all verify correctly.
**Action:** add `verifyWebhookHmac` to match the sibling handlers.

### R4 — Zero tests, zero CI, and a single squashed commit of history. **High.**
No test framework, no test file, no `.github/` workflow. `tsc` and `eslint` exist but nothing runs them — and `eslint` currently fails with 18 errors. Git history is one import commit, so there is no `git blame`, no rationale for any decision, and no bisect. For an owner who verifies behaviour rather than reading code, this is the core operational risk: **there is currently no automated, machine-verifiable signal that a change is safe.** Every regression will be found by a merchant, in production, on a payment or fulfillment path.
**Action:** CI running `tsc --noEmit` + `eslint` on every PR is a half-day of work and should precede any feature change. Playwright smoke coverage of register → plan → pay → publish → order is the next step.

### R5 — Authorization depends entirely on application code, with RLS bypassed everywhere. **High.**
Nearly every server-side query uses the service-role client. Security rests on a hand-written `.eq('merchant_id', user.id)` on each query. The current code applies this correctly everywhere I checked — but there is no second line of defence, no test asserting it, and no lint rule enforcing it. One forgotten `.eq()` in a future edit is a cross-tenant data leak with nothing to catch it. Compounding this: admin identity is an env-var email allowlist (`ADMIN_EMAILS`) read at module scope, so the admin set cannot be changed without a redeploy and is not auditable in the database.
**Action:** verify (against the live project) whether RLS policies actually exist on these tables; if not, add them so the service-role path is a convenience rather than the only barrier.

### R6 — 13% of the codebase is dead, including two fully-built abandoned integrations. **Medium.**
26 unreachable files, ~1,900 lines. An entire Envia.com shipping client. A superseded Dynamic Mockups provider that shadows the live SudoMock one with an identically-named export. A `sonner` toast system installed and never mounted. Two label-uploader components, two orders tables, two filter components. For a new owner, the cost is not the bytes — it is that **you cannot tell what is live by reading the tree.** The `DYNAMIC_MOCKUPS_API_KEY` / `SUDOMOCK_API_KEY` pair is the sharpest example: the documented one is dead and the live one is undocumented.
**Action:** delete the dead set (listed in §8.2) in one clearly-labelled commit before any feature work.

### R7 — Documentation actively misleads on the things that cost money. **Medium.**
`CLAUDE.md` is the only real documentation and it describes Stripe as the payment system, Dynamic Mockups as the renderer, and a label-approval gate that the code now auto-approves. It omits Wompi, Resend, SudoMock, Envia, `CRON_SECRET`, and `SHOPIFY_WEBHOOK_BASE_URL` from the env list entirely. `README.md` is the untouched `create-next-app` template. There is no `.env.example`. **A new developer provisioning this app from the repo alone would configure the wrong payment provider and the wrong mockup vendor, and would not know the billing cron needs a secret.**
**Action:** write a real `.env.example` from §4 of this document and rewrite `CLAUDE.md`'s stack/env/schema sections against the code.

### R8 — Subscription billing is a single unguarded cron with no idempotency and no alerting. **Medium.**
All recurring revenue flows through one daily `GET /api/cron/billing`. If `CRON_SECRET` is unset the route 401s and **billing stops silently** — nothing logs, nothing alerts, there is no observability tooling in the codebase at all (no Sentry, no analytics, no error reporting). `maxDuration = 300` exceeds Hobby-plan limits, so on the wrong plan the loop truncates part-way through the merchant list; the loop charges and then updates, so a truncation mid-merchant is not obviously safe to re-run. Failures are recorded only as a `plan_status` change on a row nobody is watching.
**Action:** add failure alerting on this route before anything else touches billing, and confirm the Vercel plan supports 300 s.

### R9 — Third-party account ownership must transfer, and one of them is pinned in the repo. **Medium.**
Six accounts are load-bearing: Supabase, Wompi, Shopify Partners, Resend, SudoMock, Vercel. `shopify.app.toml:3` pins a specific Shopify app `client_id`, so you inherit *that app* — a merchant who reinstalls against a new app loses their connection, and the compliance webhooks (`customers/data_request`, `customers/redact`, `shop/redact`) are registered against it. Resend needs the `lablld.com` sending domain verified. SudoMock is credit-metered and the app enforces a 6-render/month cap per merchant against that quota.
**Action:** treat account transfer as a checklist item per service, and confirm the Shopify Partner org can be transferred rather than recreated.

### R10 — `RESEND_API_KEY` missing takes down the admin order page, not just email. **Low-Medium.**
`lib/email.ts:3` instantiates `new Resend(...)` at module scope; I verified against the installed package that this **throws** on an undefined key. Since the module is imported by `app/admin/orders/[id]/actions.ts`, an unset key breaks `/admin/orders/[id]` at import time, and the in-function guard at line 22 never runs. A one-line fix (lazy singleton, exactly as `getStripe()` does), but it is the kind of failure that presents as an unexplained 500 on the operator's most-used screen.

### R11 — Two orphan routes and one undocumented workflow fork. **Low.**
`/labels` (merchant) and `/admin/shopify` are reachable by URL but appear in no sidebar — expect them to show up in a live-browser crawl as unexplained pages. More importantly, the label-approval flow forked: `merchant_products.label_status` is now auto-set to `'approved'` on upload while a separate `merchant_labels` table runs a real pending/approved/rejected review. **Which is the intended product behaviour is a question for the owner, not something the code can answer.**

### R12 — Repo weight and hygiene. **Low.**
86 MB of unoptimised images in `public/` (a 14 MB PNG, a 10 MB PNG, a 7.9 MB extensionless file, a stray `.xlsx` in a publicly-served path), plus the `create-next-app` placeholder SVGs. Slows every clone and every build. `.claude/settings.local.json` is committed. `dev.bat` is Windows-only with a hardcoded ngrok domain, so there is no documented macOS/Linux dev path.

---

## Appendix — verification commands

```bash
npm ci                    # exit 0, 650 packages
npx tsc --noEmit          # exit 0, no errors
npx eslint .              # 18 errors, 8 warnings
# next build deliberately NOT run — could reach the live Supabase project
```
