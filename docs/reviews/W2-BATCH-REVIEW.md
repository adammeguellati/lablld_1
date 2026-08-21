# W2 batch review packet

**Run:** 2026-08-21, autonomous long run
**Terminal:** PINK · **Reviewer:** Ivan, then Adam
**Board fingerprint at hand-off:** `5506f0b16194b4ec` · 76 cards · 3/8 gates (superseded — see W3-BATCH-REVIEW.md for current state)

Eight PRs merged (#23–#30), all green on `typecheck` + `lint` + `build`.
Five cards **shipped on merge** (non-visual). Two are **`in_flight` awaiting your
deployed-screen review**. One is **blocked on you** because the bug it describes
does not reproduce.

W2 was Adam's eight rulings plus the deferred cleanup queue. Read §0 and §9 if
you only read two sections.

---

## 0. Read this first — ALL APPLIED 2026-08-21

Everything this section originally asked for is done. Kept as the record of what
was applied and in what order.

| file | what | status |
|---|---|---|
| `0004_labels_bucket_limits.sql` | 10 MB size limit + MIME allowlist on the `labels` bucket | ☑ applied |
| `0005_merchant_products_soft_delete.sql` | `deleted_at` column + partial index | ☑ applied — the one the deployed code could not run without |
| `0006_drop_stripe_columns.sql` | drops the two abandoned Stripe columns | ☑ applied, **after** the endpoint and vars were removed |

**The Stripe ordering held.** Endpoint deleted and the five `STRIPE_*` vars
removed from Vercel *before* `0006`. Dropping the columns first would have left a
live endpoint writing to columns that no longer existed — a quiet decommission
turned into `42703` on every event Stripe still sent.

**Password recovery is functional.** The Supabase Redirect URL allowlist is
configured. The Spanish email template is **not** installed and could not be:
Supabase now requires custom SMTP before any auth template can be edited, and
that is gated behind Adam verifying `lablld.com` in Resend DNS. So recovery works
today but its email arrives in **English**. Tracked on
`CHORE-spanish-auth-emails`; it does not block `FEAT-password-recovery` shipping.

---

## 1. Adam's eight rulings, as recorded — PR #23

| # | Ruling | What happened on the board |
|---|---|---|
| 1 | Three categories; the label split is not a product line | `PROD-category-taxonomy` **shipped**; new `CHORE-remove-unreachable-category-branches` |
| 2 | Merchant delete is **soft** | `FEAT-merchant-product-delete` unblocked → §4 |
| 3 | 10 MB everywhere, png/jpg/webp/pdf | `INFRA-labels-file-limits` buildable → §2 |
| 4 | Mockup quota 6/month stands | `PROD-mockup-quota` **shipped** |
| 5 | Shopify publish step kept, placement confirmed | noted on `UI-product-create-flow` |
| 6 | Password recovery: build it | `FEAT-password-recovery` → §3 |
| 7 | Onboarding kept as-is | `PROD-onboarding-fate` **shipped**; `UI-onboarding` stays todo and out of scope |
| 8 | Catalog sort accepted as built | noted on `UI-catalog` |

**Your G5 caveat is discharged.** The upload proof closes the last open thread on
`SEC-labels-bucket`: the private bucket's signed-URL path is proven end to end at
runtime, not reasoned about.

**No action, recorded:** *"No mockup template set up"* on seed products is missing
seed data, not a screen defect. Mockup render proof waits for a real product
carrying a template.

### The stepper bug does not reproduce

`UI-stepper-step-counter` is filed **as reported** and **blocked on you** — not
fixed. `product-stepper.tsx:153` renders `Paso {step} de {STEPS.length}`: the
numerator is component state, the denominator is the length of the array that
also draws the rail, and **there is no literal step number anywhere in the file**.

A harness mounted the real component at each step (SSR gave 1/3/5/6 correctly),
then drove the two client transitions that reach the reported steps in a browser:
**PASO 4 DE 6 → PASO 5 DE 6 → PASO 6 DE 6**, rail advancing with it. Neither
server action on the untested transitions revalidates or redirects, so neither can
reset client state.

**To unblock:** a screenshot of the wrong counter, which step the screen was on,
and how you got there — clicked through in one session, or landed on it after a
reload. The reload path is the one the harness cannot drive; it re-enters through
`getInitialStep()`, which returns 1 only when the merchant has no
`merchant_products` row at all.

Inventing a fix for a defect that does not reproduce would change working code on
a guess.

**Click:** nothing. This one needs your observation, not a click-through.

---

## 2. INFRA-labels-file-limits — *shipped* · PR #24

**Routes:** `/labels`, `/products/[id]` step 3 and step 4

Three different numbers were on screen for one limit. `/labels` enforced 2 MB,
the create-flow uploader 10 MB, and the step-4 checklist claimed *"Tamaño < 15MB"*
— a figure belonging to neither. None was enforced by anything but a browser `if`.

`lib/limits.ts` now holds `LABEL_MAX_MB`, `LABEL_EXTENSIONS`, `LABEL_MIME_TYPES`,
`LABEL_ACCEPT_ATTR` and `LABEL_TYPES_COPY`, and everything reads them.

- `/labels` rises **2 MB → 10 MB** and gains the extension check it never had.
- Both file pickers dropped `accept="image/*"` — which could not offer a PDF, an
  accepted label format — for the real MIME list.
- Both uploaders show a document chip for a PDF instead of a broken `<img>`.

**Negative arm:** an 11 MB file → *"El archivo no puede superar 10 MB"*; a `.txt`
→ *"Solo se permiten archivos JPG, PNG, WebP o PDF"*. Both messages, both
uploaders, derived from the constants. **Positive arm:** a 9 MB PNG, refused by
the old 2 MB limit, passes.

**Cut and carded:** `UI-label-pdf-thumbnails` (P3) — `/labels` and `/admin/labels`
still render a PDF label as a broken thumbnail. Pre-existing (the create flow
always accepted PDFs), but this PR widens it to both upload paths. The link
around the thumbnail still opens the file correctly.

**Click:** upload a 9 MB image on `/labels` and confirm it is accepted · try a
`.txt` and confirm the Spanish message · confirm both screens read *"JPG, PNG,
WebP o PDF · máx. 10 MB"*.

---

## 3. FEAT-password-recovery — *awaiting review* · PR #25

**Routes:** `/forgot-password` (new), `/reset-password` (new), `/login` (changed)
**Design:** none for these routes; built to the auth system W1 established.

| Route | Behaviour |
|---|---|
| `/forgot-password` | Email in, neutral confirmation out |
| `/reset-password` | Server-checks the recovery session, then the form or an expired-link state with a way back |
| `/login` | *"¿La olvidaste?"* beside the password field; a green banner after a successful reset |

`components/auth/auth-shell.tsx` extracts the split-screen chrome so the two new
screens cannot drift from `/login` and `/register`. **Those two were deliberately
not refactored onto it** — `UI-login-register` is awaiting your review and
changing it now would invalidate that review.

**Non-enumeration is deliberate.** Registration is invite-gated, so the screen
never reveals whether an address has an account: Supabase answers 200 for
addresses it does not know, and the copy says *"si esa dirección tiene una
cuenta"* either way.

Real failures **are** shown. The first draft swallowed every error to protect that
property, which would have reported *"enviado"* during an SMTP outage and left a
merchant waiting for mail that never comes.

**Negative arms:** mismatched passwords → *"Las contraseñas no coinciden"*;
matching passwords with **no recovery session** → refused **server-side**. That
second one is the arm that matters: without the server check, an unauthenticated
POST could attempt a password change.

**BLOCKED ON TWO SUPABASE DASHBOARD SETTINGS** — `INFRA-supabase-recovery-config`:

1. **Redirect URL allowlist** must contain `<NEXT_PUBLIC_APP_URL>/api/auth/callback`.
   Supabase refuses to redirect anywhere not on the list, so without it every link
   lands on the site root with the code unspent and the merchant sees the
   expired-link screen.
2. **The Reset Password email template** is English boilerplate out of the box.
   Adam ruled the flow Spanish; both screens are Spanish and the email would be
   the one English artefact in the sequence.

The mail goes over whatever SMTP the Supabase project is configured with — **not
Resend, not `lib/email.ts`** — because Adam ruled the recovery to run on the
Supabase flow.

**Click, after those two settings are done:** request a reset for a real address ·
confirm the mail arrives in Spanish · follow the link and confirm it lands on the
**form**, not the expired state · set a password · confirm the green banner on
`/login` and that the new password works.

---

## 4. FEAT-merchant-product-delete — *awaiting review* · PR #26

**Route:** `/products/[id]/edit` (danger zone), plus eight filtered reads
**Design:** `designs/Mis Productos.dc.html` — the hairline-divided danger zone

**Why soft.** `order_items` references `merchant_products` with `ON DELETE
RESTRICT`. A merchant who had ever sold the product could not hard-delete it at
all — the delete fails at the database and they see an error they cannot act on.
Relaxing that FK to a cascade would take the order line with it and silently
rewrite a paid order's history. So the row stays and the merchant stops seeing it.

- **Eight merchant-side reads filter `deleted_at is null`**: `/products`,
  `/catalog`, `/catalog/[slug]`, `/products/[id]`, `/products/[id]/edit`,
  `/dashboard`, and `/orders/new` (page and action).
- **Admin reads are untouched**, per the ruling — an operator still sees everything.
- **Order history is untouched.** `/orders` joins `order_items` to
  `merchant_products` and is deliberately *not* filtered. That is the whole point
  of soft over hard.
- Deleting also **drafts the Shopify listing**, exactly as the existing deactivate
  path already does. Leaving a listing live in the merchant's own store while it
  is gone from here would let a customer buy something we no longer show them.

**One consequence worth your attention.** The unique `(merchant_id, product_id)`
constraint **deliberately stays whole** rather than becoming partial on
`deleted_at`: six call sites resolve a row with `.maybeSingle()` on that pair and
would start throwing the moment a merchant held two rows for one product.

So **re-adding a deleted product revives the original row** — old label, mockup
and price. If Adam would rather a re-add start blank, that is a product question
and a follow-up card, not a bug.

**The delete itself is unproven at runtime** and stays so until `0005` is applied.

**Click, after applying 0005:** delete a product and confirm it leaves
`/products` · confirm it reappears as available in `/catalog` · confirm an order
that used it still shows correctly under `/orders` · confirm the Shopify listing
went to draft · re-add it and note that the old label comes back.

---

## 5. CODE-remove-stripe — *shipped* · PR #27

**Routes:** none visible. `/admin/merchants` confirmation copy changed.

Gone: `app/api/webhooks/stripe/route.ts` (123 lines), `lib/stripe.ts` (86 lines),
the three `@stripe/*` deps, the five `STRIPE_*` entries in `.env.example`.

The ordering rule from schema notes D2/D3 is **satisfied, not skipped**: those two
files were the only readers or writers of both columns, verified by grep across
`app/`, `lib/`, `components/` and `types/`.

**Fixed on the way past:** three admin confirmation dialogs told the operator that
suspending, cancelling or deleting a merchant would act on **Stripe**. The live
cancel path has been Wompi for some time. A decommission that leaves the screens
naming the dead processor is half done.

**Two things outside the repo, both yours**, recorded in `.env.example`:

1. Delete the `/api/webhooks/stripe` endpoint in the Stripe dashboard — until it
   is gone, Stripe keeps POSTing to a route that now 404s and retrying.
2. Remove the five vars from the Vercel project.

**Also found:** `CLAUDE.md` names `merchants.stripe_customer_id` and
`merchants.stripe_payment_method_id`. **Neither exists** in the reconstructed
schema — the doc is stale on that point. Noted in the migration so nobody writes
SQL from it.

**Click:** open the three merchant confirmations on `/admin/merchants` and confirm
none of them says "Stripe".

---

## 6. CODE-mount-toast-system — *shipped* · PR #28

**Routes:** every route (root layout). Visible on `/admin/labels`,
`/admin/orders/[id]`, `/admin/merchants`, `/admin/settings`.

`sonner` was installed and `components/ui/sonner.tsx` existed, but `<Toaster />`
was mounted **nowhere** — so every `toast()` call in the codebase was a no-op.

- Mounted in `app/layout.tsx`, theme pinned to `light`: the app has no dark mode,
  and a viewer whose OS is dark would otherwise get dark toasts on light screens.
- **All five `alert()` calls are gone.** A browser alert blocks the whole page and
  cannot be styled, which is why the handoff specifies toasts.
- Success feedback where the design asks for *"a toast after every admin action"*.

**The real find:** `merchant-actions.tsx` **failed silently on every path.** A
non-ok response from the delete, suspend or cancel endpoint left the row exactly
as it was and told the operator nothing — a click that looks like it did nothing
is indistinguishable from a UI that ignored the click. On a destructive action
that is worse than an error message. All three now surface the error.

**Click:** approve a label · change an order's status · suspend a merchant — each
should raise a toast bottom-right · reactivate the merchant and confirm the copy
flips correctly.

---

## 7. The dead-code sweep — *shipped* · PR #29

**Routes:** `/admin/shopify` returns 404 instead of redirecting. Nothing else.

**The audit's list was re-derived, not trusted — and that mattered.** It named
`components/ui/sonner.tsx` and `components/merchant/label-uploader.tsx` as dead;
**both are live now** — W2 mounted the Toaster and W1 put the uploader in the
create flow. Deleting from a list written before two waves of work would have
broken the app.

Instead: a reachability pass over all 196 TS/TSX files, walking imports
transitively from the real entry points.

| | before | after |
|---|---|---|
| files | 196 | 173 |
| unreachable | 24 (1,782 lines) | 4 (403 lines) |

**Kept on purpose:** `dialog.tsx`, `sheet.tsx`, `tabs.tsx`, `separator.tsx` —
vendored shadcn primitives, not app code, and W3's admin restyle needs a confirm
dialog. A stated cut, not an oversight.

**Both dead integrations** went too: `lib/envia.ts`, and the whole Dynamic
Mockups chain including `/api/mockups/generate` — **a real HTTP endpoint**,
reachable by request even though no UI called it. SudoMock remains the live
provider.

**The ordering trap was honoured:** the warehouse origin address was captured off
`lib/envia.ts:9-14` **before** deleting and is preserved verbatim on
`CHORE-hardcoded-config-to-env`.

`/admin/shopify` turned out to be a four-line redirect stub with nothing linking
to it — the feature had been gutted and only its orphans remained.

**Click:** nothing routine. If any screen 404s that did not before, that is this
PR and worth reporting.

---

## 8. CHORE-remove-unreachable-category-branches — *shipped* · PR #30

Four lookup maps carried `beauty` and `skincare` keys alongside the three real
ones. The Postgres enum and both admin zod schemas admit only `supplements`,
`cosmeticos` and `cafe`, so all eight entries were unreachable.

**The fix is the type, not the deletion.** The maps were `Record<string, string>`
— which is what let a key the enum cannot hold be written. They are now
`Record<ProductCategory, string>`, so the same mistake is a compile error.

**Negative arm**, proven by hand since there is no CI to hang it on: re-adding a
`beauty` key reddens `tsc` with `TS2353`. Removing it returns the tree to green.
Without that check the tightened type would be an assertion nobody had tested.

`CODE-fix-lint-errors` had **no remainder**: `eslint --max-warnings=0` already
exits 0.

**Click:** nothing. No rendered output changes, because the deleted arms could
never render.

---

## 9. Open questions for Adam — consolidated

Only one is new this wave. The rest are carried from W1 and still open.

| # | Card | Question |
|---|---|---|
| **NEW** | `FEAT-merchant-product-delete` | Should re-adding a deleted product start **blank**, or come back with its old label, mockup and price? Today it revives — see §4. Not a bug either way; a product call. |
| carried | `PROD-label-approval-fork` | Three positions on label approval still unresolved |
| carried | `PROD-order-kinds` | Order types |
| carried | `PROD-supplement-facts` | Structured facts panel |
| carried | `PROD-admin-nav-scope` | 3 nav items in the design vs 6 in code |
| carried | `PROD-undesigned-screens` | 30 routes with no design coverage |
| carried | `PROD-payouts-feature` | Payouts |

---

## 10. Board state

**Fingerprint:** `5506f0b16194b4ec` · 76 cards · **3/8 gates**

| lane | count |
|---|---|
| shipped | 24 |
| in flight | 23 |
| loose ends | 19 |
| Adam batch | 12 |
| blocked on people | 3 |

Gates unchanged at 3/8 (G1, G2, G5 pass). G5's outstanding runtime caveat is now
discharged, which does not change the count but does mean the gate no longer
rests on an unproven claim.

Cards new this wave: `CHORE-remove-unreachable-category-branches`,
`UI-stepper-step-counter`, `UI-label-pdf-thumbnails`,
`INFRA-supabase-recovery-config`.
