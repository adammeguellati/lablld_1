# LABLLD

B2B white-label fulfillment for beauty products and supplements. Merchants sign
up, brand a catalogue product with their own label, connect their Shopify store,
and LABLLD manufactures and ships from Colombia and the Dominican Republic.

Two apps in one Next.js project:

- **Merchant** — catalogue, product personalisation, orders, billing.
- **Admin** — product catalogue, label approval, order operations, merchants.

There is no separate admin login. An admin is an email on the `ADMIN_EMAILS`
allowlist; admins deliberately have no row in `merchants`.

---

## Setup

Launch gate **G1** (parity on Adam's stack) is run from this section. If a step
here is wrong, G1 cannot pass, so treat a failure as a bug in this file.

### 1. Prerequisites

- **Node 22.x.** Pinned in `package.json` `engines` and `.nvmrc`. `nvm use` picks
  it up.
- **A Supabase project.** Free tier is enough to run locally; see
  `INFRA-supabase-backups` before real merchant data exists.
- npm. There is no lockfile for any other package manager.

### 2. Install and configure

```bash
npm install
cp .env.example .env.local
```

**Read `.env.example` top to bottom.** Every variable there is annotated with
what reads it, whether it is needed at BUILD or RUNTIME, and whether it is
REQUIRED or OPTIONAL. Blocks marked `TODO-REAL-VALUE` must be filled before
launch — they are the checklist gate G3 is counted from.

The minimum to boot the app at all:

| variable | why |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | every page |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser and proxy auth |
| `SUPABASE_SECRET_KEY` | server-side reads that bypass RLS |
| `NEXT_PUBLIC_APP_URL` | auth redirects, OAuth callbacks, Wompi returns |
| `ADMIN_EMAILS` | the entire admin mechanism |

Without the Supabase trio the app fails closed with a readable Spanish message
rather than a blank error page — that is deliberate (`lib/supabase/safe.ts`).

### 3. Database

Apply the migrations in `supabase/migrations/` **in numerical order**, in the
Supabase SQL editor:

| file | what it does |
|---|---|
| `0001_initial_schema.sql` | tables, enums, constraints |
| `0002_rls_policies.sql` | row-level security, and the `admin_emails` support table |
| `0003_labels_bucket_private.sql` | makes the `labels` bucket private |
| `0004_labels_bucket_limits.sql` | 10 MB size limit and MIME allowlist on that bucket |
| `0005_merchant_products_soft_delete.sql` | `deleted_at` on `merchant_products` |
| `0006_drop_stripe_columns.sql` | removes two abandoned columns |
| `0007_money_column_types.sql` | `fulfillment_fee_cop` becomes `integer` |

Every migration carries its own header explaining what it changes, when it is
safe to apply relative to a deploy, and a verification query to run afterwards.
**Read the header before applying** — `0006` is not cleanly reversible and `0007`
has a mandatory pre-check.

Then `supabase/seed.sql` for a catalogue to click through.

### 4. Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint, --max-warnings=0 in CI
npx tsc --noEmit # typecheck
```

`typecheck`, `lint` and `build` are the three required checks on `main`. Their
job ids in `.github/workflows/ci.yml` **are** the branch-protection check names,
so renaming a job renames its check and GitHub then waits forever on a check
nothing reports.

### 5. Shopify webhooks in local development

Shopify cannot POST to `localhost`, so order ingest does nothing locally without
a tunnel. Everything else works.

```bash
ngrok http 3000                      # copy the https URL
# set NEXT_PUBLIC_APP_URL to it in .env.local
npm run dev
```

Then disconnect and reconnect the store from `/settings/shopify` so the webhook
re-registers against the new URL. On ngrok's free tier the URL changes every
session, so this is a per-session ritual.

`dev.bat` does this on Windows, but it pins one specific ngrok domain and will
not work for anyone else. Treat it as one person's shortcut, not as the
documented path.

---

## Third-party services

| service | used for | env |
|---|---|---|
| **Supabase** | database, auth, storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` |
| **Wompi** | subscriptions and per-order charges (COP) | `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_*_PRICE_COP` |
| **Shopify** | store OAuth, product publishing, order ingest, fulfillment | `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_WEBHOOK_SECRET`, `SHOPIFY_SCOPES`, `SHOPIFY_WEBHOOK_BASE_URL` |
| **SudoMock** | 3D mockup rendering, metered | `SUDOMOCK_API_KEY` |
| **Resend** | transactional email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| **Vercel** | hosting and the daily billing cron | `CRON_SECRET` |

**Stripe, Dynamic Mockups and Envia.com are gone.** Stripe was removed in full —
code, dependencies, env vars, webhook endpoint and columns. Dynamic Mockups was
superseded by SudoMock. Envia was written and never wired up. Any document that
still names them is out of date.

---

## Where things are

```
app/(auth)/          login, register, password recovery, onboarding
app/(merchant)/      dashboard, catalog, products, orders, settings, labels
app/admin/           dashboard, products, orders, labels, merchants, settings
app/api/             Shopify OAuth + webhooks, admin REST, cron
components/          merchant/, admin/, layout/, shared/, ui/ (shadcn)
lib/                 supabase clients, shopify, wompi, sudomock, email, storage
supabase/migrations/ numbered, each with its own header and verification query
docs/                board, audit, schema notes, design inventory, review packets
proxy.ts             auth and role routing (Next 16 renamed middleware to proxy)
```

Start with `docs/board/BOARD-SPEC.md` if you are picking up the work: it explains
how the board, the gates and the review protocol operate, and
`docs/board/lablld-board.json` is the live state.

---

## Conventions that will bite you

These are not style preferences. Each one cost someone an afternoon.

- **shadcn v4 uses `@base-ui/react`, not Radix.** `Button` has no `asChild`; use
  `<Link className={buttonVariants({ variant: '...' })}>` or
  `components/shared/link-button.tsx`.
- **`Select`'s `onValueChange` passes `string | null`.** Always coalesce.
- **Supabase joins return arrays.** Cast with `as unknown as T`.
- **Zod v4**: `z.email()`, not `z.string().email()`; issues are on `.issues`.
- **`console.*` is a lint error.** Exactly one file may write to stderr:
  `lib/ops-report.ts`. Everything that needs to report routes through it.
- **A displayed limit reads the constant that enforces it.** Never a literal in a
  sentence — see `lib/limits.ts`. A limit written twice is a limit that will
  eventually be wrong in one of the two places, and the copy is always the half
  that rots.
- **Spanish, es-CO, throughout the product.** Dates go through `formatDate` in
  `lib/utils.ts`, which anchors date-only strings to local time so they do not
  render a day early at UTC-5.
