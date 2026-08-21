# W4 batch review packet — the buildable remainder

**Run:** 2026-08-21, autonomous long run
**Terminal:** PINK · **Reviewer:** Ivan, then Adam
**Board fingerprint at hand-off:** `e2ebdfacba39f0b1` · 85 cards · 3/8 gates

Eight PRs merged (#38–#45), all green on `typecheck` + `lint` + `build`.

**Shipped 25 → 56.** Twelve cards shipped on merge this wave, plus the fifteen
that shipped on your consolidated review. **Two cards are `in_flight`** awaiting a
final pass — both are Adam's rulings made real.

W4 was: ship the review, act on both rulings, then build everything left that is
not blocked on external state or on a decision.

**§9 is the launch runway.** Everything still open, why, and the single thing
that unblocks each.

---

## 1. The consolidated review, recorded — PR #38

15 cards shipped on your and Adam's deployed-screen walk. One gate corrected:
`BACKLOG-label-lightbox` was authored `adam_authorizes` as a backlog item, and
the message shipping it is the review **Adam himself sat in** — authorizing-message
exception, source on the card.

### The stepper closed with a root cause, not a shrug

**The original sighting was on a Chrome auto-translated page, and Chrome
translate rewrites DOM text in place.** So what was on screen was not what the
component rendered.

That reconciles two observations that could not both be true: the harness walked
4 → 5 → 6 correctly, the code has no literal step number anywhere, and you
genuinely saw a wrong number.

It also makes the original call load-bearing rather than lucky. A fabricated fix
would have changed correct code **and** left the real cause — a browser feature
rewriting the page — undiagnosed and free to do the same to any other number on
any other screen.

---

## 2. UI-supplement-facts-by-category — *awaiting review* · PR #39

**Routes:** `/catalog/[slug]`, `/admin/products/new`, `/admin/products/[id]`
**Ruling:** Adam 2026-08-21, second half. Closes the audit finding *"Supplement
Facts shown on a cosmetic product"*.

**Verified in live code before building:** W3 did **not** collapse the ficha
editors. So `UI-supplement-facts-restore` was **not created** — there was nothing
to restore, and the ruling was recorded rather than a card invented to satisfy it.

But the ruling's second half was a real defect. The panel was gated on
`supplement_facts &&` — **data presence, not category** — so an admin could fill
supplement facts on a cosmetic and the merchant-facing page rendered a
regulatory-looking panel on a product carrying no such labelling.

`showsSupplementFacts(category)` in `lib/product-category.ts` is the one place the
rule lives, checked in four call sites.

**No data is destroyed, deliberately.** Both forms send
`supplement_facts: undefined`, which the PATCH drops, so facts on a recategorised
product **stay in the column and stop rendering**. Correcting the category brings
them back rather than requiring a retype.

**Negative arm:** the same facts payload under all three categories —
`supplements` renders the panel, `cosmeticos` and `cafe` render nothing.

**Click:** open a supplement product and confirm *Datos del Suplemento* is there ·
open a cosmetic and confirm it is not · in the admin editor, switch a product's
category to Cosméticos and confirm the Supplement Facts section disappears live.

---

## 3. FEAT-product-revive-choice — *awaiting review* · PR #40

**Route:** `/products/[id]` (the create flow's entry point)
**Ruling:** Adam 2026-08-21: revive the previous label, with an explicit choice.

**The choice lives exactly where the card predicted.** `/products/[id]` reads the
**live** row, so a deleted product is invisible to the page while still being
found by `saveMerchantProductAction`, which would revive it silently. The page now
looks for the deleted row too and, when it finds one **with a stored label**,
renders the choice instead of the stepper.

**The prompt does not appear when there is nothing to reuse** — a deleted row with
no label falls through to a fresh stepper, and the existing path revives the empty
row invisibly, which is correct because there is nothing to tell the merchant.

**"Empezar de cero" is a clear, not a delete, and not an insert.** It updates the
same row. The unique `(merchant_id, product_id)` constraint forbids a second row —
which is precisely why the revive path exists — and clearing rather than deleting
is what keeps the order history hanging off that row intact.

Both actions scope `.eq(merchant_id)` on lookup **and** update, so a guessed
product id cannot reopen someone else's row.

**Honest limit:** the harness proved the action refuses server-side (no session →
*"No autenticado"*). The downstream *"Producto no encontrado"* guard is
unreachable without a session and is **stated as unproven rather than claimed**.

**Click:** delete a product · re-add it from the catalog · confirm the prompt shows
the right label · take **"usar etiqueta anterior"** and confirm the flow resumes at
review · delete and re-add again taking **"empezar de cero"** and confirm the label
is gone and the stepper starts at step 3.

---

## 4. The hardening bundle — *shipped* · PR #41

Five cards. **Two were worse than their cards said.**

**The fulfillment retry loop was killing itself.** The card said it "retries too
long". It slept **0 + 1.5 + 3 + 4.5 + 6 + 7.5 = 22.5 seconds** across six
attempts, which outlives the function on any default budget — so the later
attempts **never ran**, and when `orders/create` had not committed yet the
fulfillment id was silently never written. The loop that existed to fix that race
was being killed by it. Now flat 1.2s backoff, an 8s budget checked before each
sleep, and `maxDuration = 30`.

**The cron auth failed open.** Beyond the timing issue, with `CRON_SECRET` unset
the old code compared against the literal `"Bearer undefined"` — so on a
misconfigured deploy, anyone sending exactly that was authorized.

Also: `timingSafeEqual` for the token; `'use server'` removed from a route handler
(it turns every export into a server *action*, which route handlers are not);
`merchant_labels` added to the merchant delete chain (schema notes C15 — it has an
FK, so the delete would either fail or orphan depending on an action nobody had
checked); and orphaned label objects are now swept on merchant and product delete.

**Ordering, deliberately:** URLs are collected **before** the rows go, because the
URLs only exist on them; objects are removed **after**, best-effort, so a storage
failure can never leave a merchant half-deleted.

**Negative arms, both run by hand:** 7 cron-auth cases and 6 `labelObjectPath`
cases. The path guard is what stops the cleanup ever being pointed at
`product-images` or an arbitrary URL.

**Click:** nothing routine. If a merchant delete errors that did not before, that
is this PR.

---

## 5. Ops reporting — *shipped* · PR #42

**Shipped without a new vendor**, which `INFRA-billing-alerting` required — it says
outright that Sentry or equivalent needs asking first.

**The biggest fix needs no vendor at all.** The cron returned **HTTP 200 even when
every charge threw**, so Vercel's cron monitor recorded a success and nobody was
told. It returns **500** on a failed run now, which turns existing platform
monitoring into the alert.

The charges are **not** rolled back by that non-200: affected merchants are
already `past_due`, the status *reports* the run rather than undoing it, and a
retry is safe because each run re-reads who is still due.

`lib/ops-report.ts` is the seam — one function, one file — wired into the cron and
into `lib/supabase/safe.ts`, where a login failing on configuration previously
left **no operator-visible trace at all**.

**`no-console` is now enforced rather than documented.** CLAUDE.md forbade it and
nothing checked. It is an eslint **error** now with exactly one exempt file.
Negative arm: a `console.log` elsewhere reddens lint; the same statement in the
seam passes.

**The seam earned its keep on its first build**, which is the part worth reading:
it logged an `auth.config` failure for `/reset-password` that was really Next
saying *"this route is dynamic"*. `safeServerClient` was **catching Next's
control-flow throw** — `redirect()`, `notFound()` and dynamic detection all signal
by throwing with a `digest`. That is a bug dressed as resilience. Re-thrown now,
never reported. A channel that cries wolf on every build is worse than no channel.

Plus `engines.node` and `.nvmrc` pinning Node 22.

**Click:** nothing. Visible only when something breaks — which is the point.

---

## 6. Config and money — PR #43

`CHORE-hardcoded-config-to-env` **ships**; two others got their code half.

**Support contact into config.** `NEXT_PUBLIC_SUPPORT_WHATSAPP` and
`NEXT_PUBLIC_HELP_CENTER_URL`, both **optional with the old literals as fallback**
— which matters because these are read at build time, so a missing value would
otherwise ship a broken support link.

**One admin-email parser.** `ADMIN_EMAILS` was parsed **twice** and the two copies
**normalised differently** (the second not lowercasing). One exported list now.

`CODE-admin-emails-sync` **stays open**, because what remains cannot be built away:
`admin_emails` is a legitimate **RLS support table**, not a stray duplicate —
Postgres cannot read the application's environment, so a policy has nowhere else
to look. Replacing the mechanism is a decision.

**The money question answered itself from the code.** Five columns are `*_cop`,
four are `integer` with `.int()`, one — `orders.fulfillment_fee_cop` — is
`numeric(12,2)` with a bare `z.number()`. COP has no minor unit and four of five
already said so, so the odd one out changes.

---

## 7. Label thumbnails and settings hygiene — *shipped* · PR #44

**The card understated it.** It named two surfaces; re-deriving found **four** —
the admin order rows and the order detail item list carry label thumbnails too,
both added in W3. So the admin lightbox handled PDFs at full size while **the
thumbnail that opened it did not**.

One `LabelThumb` for all four plus the empty state, so the next surface that shows
a label gets the behaviour by *using* it rather than by remembering to.

**Negative arm, seven inputs.** The one that matters: a `.png` whose **query
string** contains `.pdf` is correctly **not** a PDF. Extension sniffing that read
the whole URL would have turned an ordinary image into a PDF chip.

`CHORE-untrack-claude-settings` — **half was already done.**
`.claude/settings.local.json` was untracked but **not in `.gitignore`**, so nothing
stopped it coming back. Untracking without ignoring is a fix that undoes itself on
the next `git add -A`.

**Click:** upload a **PDF** label and confirm it shows a PDF chip rather than a
broken image on `/labels`, `/admin/labels`, the admin order row and the order
detail.

---

## 8. Documentation — *shipped* · PR #45

Done **last** in the wave deliberately: `CHORE-rewrite-claude-md` says to do it
after the Stripe and dead-integration removals or it documents a tree about to
change.

**CLAUDE.md.** Stripe out, Wompi in, across stack, env, flow and plan management.
**The Stripe-webhooks section became the cron section** — Wompi has no subscription
object, so the cycle lives in the database and the daily cron executes it.
Documenting Stripe webhook events would have described a mechanism that never
existed here.

**The label gate is stated honestly rather than quietly fixed:**
`saveMerchantProductAction` sets `approved` on upload, so `/admin/labels` runs on
`merchant_labels`. Both positions coexist; the doc says so.

**The file manifest is deleted, not updated.** It listed twenty-odd files that no
longer exist. A hand-maintained inventory of a weekly-changing tree rots, and
while it rots it lies with a document's authority.

**README**, written as the thing G1 is run from — all seven migrations in order
with their warnings, and the note that the three required checks' **job ids are
the branch-protection names**.

**Handoff errata go in the tracked inventory, not the bundle.**
`design_handoff_lablld_dashboard/` is gitignored, so an edit inside it is invisible
to git and would create two divergent copies. The timing that card wanted was
missed and the errata says so — the code was re-derived anyway, so nothing shipped
wrong. **The record is late, not the work.**

**`public/` 86 MB → 64 MB.** The stray spreadsheet was checked on its own merits:
its sheets are *"Tablas oficios"* and *"Decreto 1607"* — Colombia's public
occupational-risk decree. **Reference data, not personal data**, so dead weight
rather than exposure. Checked by reading the workbook *structure*, not contents.

---

## 9. REMAINING — the launch runway

**29 cards open.** Nothing here is blocked on more code from me except where
marked. Grouped by what unblocks it.

### 9.1 Needs your dashboard — 3 migrations, all authored

| card | what | unblock |
|---|---|---|
| `SCHEMA-money-column-types` | `0007` authored | Run the **mandatory pre-check** first: `select count(*) from orders where fulfillment_fee_cop <> round(fulfillment_fee_cop)`. **Expect 0. If not 0, do not apply** — rows carrying centavos mean money was recorded in a different unit, and rounding would change money that already moved |
| `SEC-apply-rls-policies` | `0002` needs applying and verifying under a live anon session | Apply, then try to read another merchant's row with the publishable key. It must fail |
| `INFRA-supabase-schema-dump` | `pg_dump --schema-only` of the real project | One command, once you have DB access. It also unblocks `SCHEMA-verify-merchant-products-unique` |

### 9.2 Needs you outside the repo

| card | unblock |
|---|---|
| `CHORE-spanish-auth-emails` | **Adam verifies `lablld.com` in Resend DNS** → Supabase custom SMTP → Spanish templates. Until then every reset email is English |
| `CHORE-verify-wompi-price-unit` | **P1, and it gates real money.** `lib/wompi.ts` multiplies COP by 100 at four sites to build `amount_in_cents`, and COP is not conventionally a minor-unit currency. If that is wrong every charge is off by 100× and unrecoverable once real money moves. Prove it against one sandbox transaction and paste the amount back |
| `VERIFY-shopify-e2e` | A real Shopify store round trip |
| `CHORE-design-bundle-location` | Your call on where the untracked 1.9 MB bundle should live |

### 9.3 Needs one word from you

| card | the word |
|---|---|
| `BACKLOG-e2e-smoke` | **"yes, add Playwright."** It is the only `green_self_merge` card I did not build, and only because a new dependency needs asking. Everything else about it is ready |
| `CHORE-repo-weight` | Delete or keep **~30 MB of unreferenced onboarding design comps**? Safe for the running app and recoverable from git either way. Adam ruled onboarding stays, so they may be wanted for that future session |
| `CODE-admin-emails-sync` | Replace the mechanism (JWT claim / role column) or accept the drift and add a sync? |

### 9.4 Needs Adam — spend and ownership

| card | note |
|---|---|
| `INFRA-vercel-pro` | The cron sets `maxDuration = 300`, which exceeds the free tier |
| `INFRA-supabase-backups` | **No backups today.** Worth doing before real merchant data exists, not after |
| `INFRA-account-transfer` | **This is gate G4.** Six accounts. `shopify.app.toml` pins the `client_id`, so a transfer ending in a *new* app silently breaks every merchant's connection |
| `INFRA-error-reporting-vendor` | The seam exists and routes through one file, so pointing it at a reporter is a one-file edit. Worth deciding together with `INFRA-vercel-pro`, since log retention is the same purchase question |

### 9.5 Needs Adam — product decisions

`PROD-label-approval-fork` (three positions, still unresolved — and CLAUDE.md now
documents the contradiction rather than hiding it) · `PROD-admin-nav-scope` (the
designs show 3 nav items, the code has 6; dropping to 3 removes the dashboard, the
label queue and settings — **all three of which W3 just restyled and an operator
uses**) · `PROD-order-kinds` · `PROD-undesigned-screens` · `PROD-payouts-feature` ·
`FEAT-cod-orders` (deferred).

### 9.6 Out by standing ruling

`BACKLOG-wholesale-line` · `BACKLOG-volume-pricing` · `BACKLOG-canva-themes` ·
`BACKLOG-inspirate-gallery` · `BACKLOG-realtime-orders` · `UI-onboarding`
(Adam: keep as-is, redesign is a future design session).

---

## 10. Board state

**Fingerprint:** `e2ebdfacba39f0b1` · 85 cards · **3/8 gates**

| lane | count |
|---|---|
| shipped | 56 |
| in flight | 9 |
| loose ends | 7 |
| Adam batch | 11 |
| blocked on people | 2 |

**2 cards `in_flight` awaiting a final pass:** `UI-supplement-facts-by-category`
and `FEAT-product-revive-choice`, both Adam's rulings made real.

Gates unchanged at 3/8. G3 and G4 both carry notes from 2026-08-21 rather than
state changes — Wompi sandbox is consistent with G3's deliberate carve-out, and
Adam's confirmation of account ownership is recorded but is a claim about six
accounts rather than per-account evidence. Each names exactly what would make it
pass. **G6, G7 and G8 are spend, domain and a card cycle — none is code work.**

**There is no remaining code work that is not either blocked on you, blocked on
Adam, or waiting on one word.** §9.3 is the shortest path to more of it.
