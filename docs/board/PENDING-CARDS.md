# LABLLD — Pending Cards (holding file)

Every card accumulated before the board JSON exists. One line each. When the
board is created, these move across and this file is deleted.

**Format:** `ID` — title · **priority** · source reference

**Priority:** P0 blocks launch or is actively losing data/money · P1 do before
real users · P2 should do · P3 cleanup

Cards tagged **ADDED-BY-SWEEP** were not in the seed list; they came from a sweep
of the three source documents for anything flagged as tracked, unowned, or
needing a decision.

**Source documents** (each currently on its own unmerged branch):
- `docs/audit/CODE-AUDIT-2026-08.md` → branch `docs/code-audit`
- `docs/db/SCHEMA-RECONSTRUCTION-NOTES.md` → branch `feat/schema-reconstruction`
- `docs/design/DESIGN-HANDOFF-INVENTORY.md` → branch `docs/design-inventory`

---

## SEC — security

- `SEC-labels-bucket` — Flip the `labels` storage bucket private and migrate `getPublicUrl()` → `createSignedUrl()` across both uploaders and every `label_url` render surface, including the admin label queue · **P1** · audit §5 privacy finding; schema notes C11; ruling 2026-08-20 (public authored for parity only, exposure not accepted)
- `SEC-shopify-fulfillment-endpoint` — Add HMAC verification to `/api/shopify/fulfillment_order_notification`; it is an unauthenticated, unsigned service-role write path while its five sibling webhooks all verify · **P0** · audit R3
- `SEC-admin-layout-gate` — `app/admin/layout.tsx` must check `isAdmin()` itself instead of relying solely on `proxy.ts`; narrowing the proxy matcher would open every admin page at once · **P1** · audit §7
- `SEC-shopify-oauth-state` — OAuth `state` is generated at `app/api/shopify/auth/route.ts:23` and never verified; the callback reads it and discards it, so CSRF protection on the handshake is decorative (Shopify HMAC still applies) · **P2** · audit §8.5(b) · **ADDED-BY-SWEEP**
- `SEC-cron-secret-timing` — `app/api/cron/billing/route.ts:10` compares the bearer token with `!==`; the four other secret checks in the codebase use `timingSafeEqual` · **P3** · audit §8.5(f) · **ADDED-BY-SWEEP**
- `SEC-apply-rls-policies` — Apply `0002_rls_policies.sql` to a real project and verify under a live JWT; RLS is currently not the boundary at all and the authored policies have never been behaviour-tested · **P1** · audit R5; schema notes Validation · **ADDED-BY-SWEEP**

## CODE — application changes

- `CODE-remove-stripe` — Delete the Stripe webhook route, `lib/stripe.ts` and the three `@stripe/*` deps, remove the endpoint from the Stripe account, THEN drop `merchants.stripe_subscription_id` and `orders.stripe_payment_intent_id` in a follow-up migration · **P1** · audit R2; schema notes D2/D3 (ruling: columns stay until code is gone)
- `CODE-fix-order-items-type` — `types/index.ts:216` `merchant_product_id` must be `string | null`; two insert sites write null, so any non-null dereference is a latent crash on sample and admin-created orders · **P1** · schema notes D1, real latent bug
- `CODE-explicit-merchant-delete-chain` — Add `merchant_labels` to the delete chain in `app/api/admin/merchants/[id]/route.ts:52-61`; the FK cascade covers it today but the intent is implicit · **P2** · schema notes C15
- `CODE-storage-orphan-cleanup` — Delete storage objects when merchant, `merchant_labels` or `merchant_products` rows are deleted; label artwork currently outlives its rows indefinitely, and now outlives cascaded rows in a public bucket · **P2** · schema amendment finding, previously unowned
- `CODE-admin-emails-sync` — `admin_emails` table vs `ADMIN_EMAILS` env var are two copies of one list with nothing syncing them; replace the mechanism (JWT claim or role column) or add a sync · **P2** · schema notes C10
- `CODE-mount-toast-system` — `sonner` is installed and `components/ui/sonner.tsx` exists, but `<Toaster />` is mounted nowhere and `toast()` is never called; the design handoff specifies a toast after every admin action · **P2** · audit §8.2; design inventory §3 item 16
- `CODE-resend-lazy-init` — `lib/email.ts:3` constructs the Resend client at module scope, which throws on a missing key and takes down `/admin/orders/[id]` at import time; make it a lazy singleton like `getStripe()`, which exists for exactly this reason · **P1** · audit R10, §8.5(a) · **ADDED-BY-SWEEP**
- `CODE-fulfillment-notification-timeout` — `/api/shopify/fulfillment_order_notification` retries with `setTimeout` for up to ~22s inside `after()` with no `maxDuration` export; the write is silently dropped when the function is cut off · **P2** · audit §8.5(e) · **ADDED-BY-SWEEP**
- `CODE-fix-lint-errors` — 18 ESLint errors, including 4 `react-hooks/refs` errors from writing `ref.current` during render in `catalog-filters.tsx:30-31` and `merchant-products-filters.tsx:19-20`; the same bug was cloned along with the copy-pasted component · **P2** · audit §8.6, §8.4 · **ADDED-BY-SWEEP**
- `CODE-remove-dead-integrations` — Delete `lib/envia.ts` (109 lines, imported by nothing) and the Dynamic Mockups path (`lib/dynamic-mockups.ts` ← `/api/mockups/generate` ← `mockup-preview.tsx`, all unreachable); the documented mockup env var is the dead one and the live one is undocumented · **P2** · audit §8.3, R6 · **ADDED-BY-SWEEP**
- `CODE-delete-dead-files` — Remove the remaining ~1,700 lines across 26 unreachable files listed in audit §8.2, in one clearly-labelled commit, before any feature work; you currently cannot tell what is live by reading the tree · **P2** · audit R6 · **ADDED-BY-SWEEP**
- `CODE-route-handler-use-server` — `app/api/shopify/callback/route.ts:1` opens with `'use server'`, which is meaningless in a route handler · **P3** · audit §8.5(c) · **ADDED-BY-SWEEP**

## INFRA — platform and operations

- `INFRA-vercel-pro` — `app/api/cron/billing/route.ts:7` sets `maxDuration = 300`, which exceeds the Hobby cap; on the wrong plan the billing loop truncates mid-merchant and it is not idempotent-safe to re-run · **P0** · pre-launch
- `INFRA-supabase-backups` — No backups on the free tier; upgrade before any real merchant data exists · **P0** · pre-launch
- `INFRA-labels-file-limits` — Neither bucket has a size or MIME limit; enforcement is client-side only and the two label uploaders disagree (2 MB vs 10 MB) while the design copy promises 20 MB. Set bucket-level limits and reconcile with design Q8 · **P2** · schema notes C16/D7; design inventory Q8
- `INFRA-billing-alerting` — The daily billing cron fails silently: no Sentry, no analytics, no error reporting anywhere in the codebase, and a failure shows only as a `plan_status` change nobody watches · **P0** · audit R8 · **ADDED-BY-SWEEP**
- `INFRA-ci-and-tests` — Zero tests, zero CI, and `eslint` currently fails; wire `tsc --noEmit` + `eslint` on every PR first (half a day), then Playwright smoke coverage of register → plan → pay → publish → order · **P1** · audit R4 · **ADDED-BY-SWEEP**
- `INFRA-supabase-schema-dump` — If any LABLLD Supabase project is ever recovered, take `pg_dump --schema-only` plus a policy and bucket export and diff it against `supabase/migrations/`; trust neither until then · **P1** · audit R1; schema notes closing · **ADDED-BY-SWEEP**
- `INFRA-account-transfer` — Transfer ownership of all six load-bearing accounts (Supabase, Wompi, Shopify Partners, Resend, SudoMock, Vercel); the Shopify app identity is pinned in `shopify.app.toml:3`, so merchants reinstalling against a new app lose their connection · **P0** · audit R9 · **ADDED-BY-SWEEP**
- `INFRA-node-version-pin` — No `engines` field, no `.nvmrc`, no `.node-version`; the runtime is whatever Vercel currently defaults to · **P3** · audit §1, §9 · **ADDED-BY-SWEEP**

## PROD — product decisions needing Adam

- `PROD-label-approval-fork` — `merchant_products.label_status` is auto-set to `approved` on upload while a separate `merchant_labels` table runs a real pending/approved/rejected queue; the design handoff promises a review it does not screen. Three sources, three positions · **P1** · audit §8.5(d); schema notes D8; design inventory Q5
- `PROD-rebuild-or-redesign` — The design handoff is written as a greenfield build (`create-next-app`, JSON data layer, Supabase at step 13) against an app that already ships. Every other design question depends on this answer · **P0** · design inventory Q1 · **ADDED-BY-SWEEP**
- `PROD-shopify-in-or-out` — `SPEC.md` §7 omits Shopify entirely and its `orders` table has no source column, but two designs and the order-flow PDF require it, and it is roughly a third of the current codebase · **P0** · design inventory Q2 · **ADDED-BY-SWEEP**
- `PROD-pricing-model` — Code discounts by plan (flat −18% for `plus`); the handoff discounts by order quantity (−6/−12/−18% at 25/100/300 units) and repackages plans as free/esencial at $119.000 COP/mo. Different businesses; also decides what happens to merchants currently on `plus` · **P0** · design inventory Q3 · **ADDED-BY-SWEEP**
- `PROD-order-kinds` — `SPEC.md` says two kinds (dropshipping, wholesale); the PDP ships a live "Pedir muestra" modal, the order form carries a disabled third `Muestra` branch referencing a state outside the 0–6 machine, and the code has `createSampleOrderAction`. Three sources, three answers · **P1** · design inventory Q4 · **ADDED-BY-SWEEP**
- `PROD-mockup-quota` — Design copy promises "Intentos ilimitados hasta que te guste"; code enforces 6 renders per merchant per month against a metered SudoMock account. Either the limit rises and the cost is modelled, or the copy changes · **P1** · design inventory Q6 · **ADDED-BY-SWEEP**
- `PROD-supplement-facts` — The handoff reduces ficha content to four plain textareas, dropping three structured editors and the Supplement Facts panel; for a supplements manufacturer that panel is a labelling-compliance artifact · **P1** · design inventory Q7 · **ADDED-BY-SWEEP**
- `PROD-onboarding-fate` — Keep, cut or redesign the 11-route onboarding flow (5-step wizard plus plan and payment) backed by 86 MB of custom imagery; the handoff does not mention it · **P1** · design inventory Q9 · **ADDED-BY-SWEEP**
- `PROD-admin-nav-scope` — Handoff shows 3 admin nav items, code has 6; dropping to 3 removes the admin dashboard, the label queue, platform settings, and the Shopify request queue the designed merchant Tiendas screen depends on · **P1** · design inventory Q10 · **ADDED-BY-SWEEP**
- `PROD-payouts-feature` — `designs/order-store.js` implements a payouts store (`loadPayouts`/`addPayout`/`updatePayout`) referenced by no design file and no document; confirm whether a merchant-payouts feature was cut or this is leftover scaffolding · **P2** · design inventory Q11 · **ADDED-BY-SWEEP**
- `PROD-undesigned-screens` — 30 shipped routes have no design coverage, including all 11 auth/onboarding routes, `/dashboard`, `/admin/labels` and `/admin/shopify`; decide per screen whether the handoff means to delete them · **P1** · design inventory §4 · **ADDED-BY-SWEEP**

## CHORE — hygiene and documentation

- `CHORE-hardcoded-config-to-env` — Move the two placeholder values that have no env var into configuration: the warehouse origin address (`lib/envia.ts:9-14`) and the WhatsApp support number (`components/layout/merchant-sidebar.tsx:21`) · **P2** · audit §4; `.env.example` TODO-REAL-VALUE block · **ADDED-BY-SWEEP**
- `CHORE-rewrite-claude-md` — `CLAUDE.md` names Stripe as the payment system, Dynamic Mockups as the renderer, and a label gate the code bypasses; it omits Wompi, Resend, SudoMock, `CRON_SECRET` and `SHOPIFY_WEBHOOK_BASE_URL`. Rewrite its stack, env and schema sections against the code · **P2** · audit R7, §8.8 · **ADDED-BY-SWEEP**
- `CHORE-write-readme` — `README.md` is the untouched `create-next-app` template; there is no setup guide and the only dev script (`dev.bat`) is Windows-only with a pinned ngrok domain · **P2** · audit §8.8, §8.9 · **ADDED-BY-SWEEP**
- `CHORE-design-bundle-location` — `design_handoff_lablld_dashboard/` is untracked, 1.9 MB, includes two `.DS_Store` files and a 751 KB Shopify logo rendered at ~28px; decide whether to version it and where · **P3** · design inventory Q12 · **ADDED-BY-SWEEP**
- `CHORE-repo-weight` — `public/` is 86 MB across 49 unoptimised files, including a 14 MB PNG, a 10 MB PNG, a 7.9 MB extensionless file and a stray `.xlsx` in a publicly served path, plus the `create-next-app` placeholder SVGs · **P3** · audit R12, §8.9 · **ADDED-BY-SWEEP**
- `CHORE-untrack-claude-settings` — `.claude/settings.local.json`, a personal editor settings file, is committed · **P3** · audit §8.9 · **ADDED-BY-SWEEP**
- `CHORE-handoff-doc-corrections` — Fix the internal contradictions in the design bundle: `SCREENS.md` omits Inicio from the merchant nav while `Configuracion Tiendas.dc.html` includes it; sidebar width is 260px in the docs and 264px in the prototype; `reference/` is described as a catalog/PDP spec but is an order-flow diagram and the only doc naming Wompi; `Configuracion Tiendas.dc.html` has no `SCREENS.md` section or build step; the logo asset is misspelled `labdll-logo.png` · **P3** · design inventory Q13 · **ADDED-BY-SWEEP**
- `CHORE-merge-doc-branches` — Four documentation branches are pushed and unmerged (`docs/code-audit`, `docs/design-inventory`, `feat/schema-reconstruction`, `chore/env-and-pending-cards`); every cross-reference in this file points at a branch rather than `main` · **P2** · this file · **ADDED-BY-SWEEP**

## Open schema questions (no code change until answered)

- `SCHEMA-verify-merchant-products-unique` — `UNIQUE(merchant_id, product_id)` is inferred from `.maybeSingle()` usage, not proven; if the live table holds duplicate pairs a restore will refuse to create the constraint · **P2** · schema notes C3 · **ADDED-BY-SWEEP**
- `SCHEMA-money-column-types` — Money columns follow Zod's inconsistent `.int()` usage; `fulfillment_fee_cop` is `numeric` while every sibling `*_cop` is `integer`. One of the five Zod declarations is wrong · **P2** · schema notes C5, D6 · **ADDED-BY-SWEEP**

---

## Counts

| Group | Cards |
| --- | --- |
| SEC | 6 |
| CODE | 12 |
| INFRA | 8 |
| PROD | 11 |
| CHORE | 8 |
| SCHEMA | 2 |
| **Total** | **47** |

Seeded: 13. Added by sweep: 34.
