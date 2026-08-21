# W3 batch review packet — the final design wave

**Run:** 2026-08-21, autonomous long run (continuous with W2)
**Terminal:** PINK · **Reviewer:** Ivan, then Adam
**Board fingerprint at hand-off:** `bc7c85fa4ca3b752` · 82 cards · 3/8 gates

Five PRs merged (#31–#35), all green on `typecheck` + `lint` + `build`.
**Every W3 card is `in_flight` awaiting the single consolidated W1+W2+W3 review.**
Nothing shipped on merge this wave — all four cards are visual.

After W3, every surface of the app carries the new visual language.

**§6 is the review script.** It merges all three waves into one ordered
click-through. If you read one section, read that one.

---

## 0. The scope correction, up front

Your W3 dispatch listed **admin products** among the surfaces with *no* design
coverage, and instructed restyle-only for those.

`DESIGN-HANDOFF-INVENTORY.md` §2.8 disagrees: `/admin/products`,
`/admin/products/new` and `/admin/products/[id]` map onto
**`designs/Admin Productos.dc.html`, 687 lines**, plus `SCREENS.md` §7.

Corrected and continued rather than halted on, because the dispatch opens with
*"SCOPE DERIVATION FIRST: re-read the inventory admin coverage"* — that is the
authorizing message telling me its own split is provisional.

**It changed less than it sounds.** Almost every addition that design makes is
already out by a standing ruling or needs schema the code lacks, so the buildable
core was the visuals plus listing usability — which is what you asked for under a
different name. Each addition is carded rather than silently dropped. See §3.

**Two smaller corrections:**

- **Four uncovered admin surfaces, not five.** `/admin/shopify` no longer
  exists — a four-line redirect stub with nothing linking to it, deleted in W2
  PR #29.
- **The en-US date defect did not survive W1.** `lib/utils.ts formatDate` already
  uses `Intl` `es-CO` and anchors date-only strings to local time so they do not
  render a day early at UTC-5. Re-verified, not assumed. Nothing to fix.

The other audit defects were real and are fixed — verified in live code, not
taken from the audit on trust. See §4.

---

## 1. UI-admin-orders — *awaiting review* · PR #32

**Routes:** `/admin/orders`, `/admin/orders/[id]`
**Design:** `designs/Admin Ordenes.dc.html` + `SCREENS.md` §8 (inventory §2.9)
**Folds in:** `BACKLOG-label-lightbox`

The inventory calls the label lightbox *"the single most operationally useful
addition in the bundle"* for a manufacturer. An admin had no way to pull a
merchant's label artwork out of the order screen.

- **46×62 label thumbnails on the order rows**, and a **full-size lightbox** on
  both list and detail.
- **Stat cards that are filters**, not decoration — clicking *Enviadas* writes
  `status=shipped` into the URL the server page reads.
- **Filter pills with live per-status counts**, search across order number, id,
  merchant, customer and product name, **pagination at 25 rows**.
- **ENTREGA Y CONTACTO** zebra table in the design's fixed row order.
- Detail restyled to the design's two-column layout.

**The download mechanism is the part worth knowing.** A bare `<a download>` on a
**cross-origin** href is ignored by the browser, which navigates to the file
instead of saving it. The link appends Supabase's `?download=` to the signed URL,
which sets `Content-Disposition` server-side.

**Copy tells the truth about the format.** The design says *"Descargar PNG"*. PDF
is an accepted label format, so the button reads the real extension:

| label | button | preview |
|---|---|---|
| `.png` | Descargar PNG | `<img>` |
| `.pdf` | **Descargar PDF** | `<object type="application/pdf">`, not a broken img |

**Already in code, not built here:** the **three-field quote gate** the inventory
describes as new was *already* enforced — the submit is disabled until shipping
cost, carrier and ETA are all filled. Only the design's disabled **colours** were
applied (`#E9E9ED` on `#AEAEB2` rather than a 50%-opacity green, because a dimmed
primary still reads as "nearly ready").

**Skipped:** the **expanded row workspace** — the design moves order detail out of
its own route and into a row on the list. That is a structural rebuild, not a
visual change, and it would break every deep link into `/admin/orders/[id]`
(the dashboard links there, and so does every *Ver*). The design's two-column
layout was applied to the detail **route** instead, so the visual result is the
design and only the URL differs · **the state-4 stored-batch branch**
(*Guardar en bodega*) — wholesale, out by standing ruling.

**Side effect:** the order-status vocabulary was written out **five times**, and
`/admin/dashboard` had no copy at all — which is why it showed raw slugs.
`lib/order-status.ts` is now the one source.

**Click:** click a label thumbnail on a row and confirm the lightbox opens ·
press **Descargar** and confirm the file **saves** rather than opening in a tab ·
press Escape and confirm it closes · click the *Enviadas* stat card and confirm
the list narrows · search a customer name · confirm the quote button stays
disabled until all three fields are filled.

---

## 2. UI-admin-merchants — *awaiting review* · PR #33

**Route:** `/admin/merchants`
**Design:** `designs/Admin Comerciantes.dc.html` + `SCREENS.md` §9 (inventory §2.10)

- **38px circular initials avatar** with a deterministic per-merchant tint.
- **Join date** as the design's *"Desde mar 2026"*.
- **Order count and lifetime volume columns**, both derived. Neither needs a
  column: postgrest has no `GROUP BY`, so they are aggregated in the page rather
  than added to the schema or hidden behind a view.
- Search, five state facets with live counts, clickable stat cards, pagination.

**The three destructive actions are now one row menu.** This is the audit
finding. *Suspender*, *Cancelar suscripción* and *Eliminar* sat side by side as
three bare underlined links — **the most destructive control on the screen looked
exactly like the least.** Now behind a `⋯` menu, separated by a rule, delete in
`#C0303B`, each opening a modal confirm.

The **delete confirm copy is the design's**, and it earns its specificity: it
names what is destroyed (profile, products, labels) *and* what survives
(**invoiced orders are retained**) — the fact an operator actually needs before
pressing it.

Two-line `mailto:` contact item, per `SPEC.md` §7.5: mailto only, no in-app inbox.

**Facts vs design, resolved to the code.** The design's pill vocabulary is
*Esencial · Gratis · Mes gratis · Pago vencido · Suspendida*. The pills render
what the **schema** can hold: **Al día · Pago vencido · Cancelada · Sin plan ·
Suspendida**. *"Mes gratis"* has nothing to read — there is no trial column.

**Skipped by instruction:** *Regalar un mes de Esencial* and *Extender mes
gratis* — new admin powers that spend money and need a `trial_ends_at` column.
`adam_authorizes`.

**Click:** open a row menu and confirm *Enviar correo* opens your mail client
with the right address · press *Eliminar cuenta* and confirm a **confirm dialog**
appears rather than the account vanishing · press Cancelar and confirm nothing
happened · suspend a merchant and confirm the toast, then reactivate and confirm
the copy flips · confirm the order-count and volume figures look right for a
merchant you know.

---

## 3. UI-admin-products — *awaiting review* · PR #34

**Routes:** `/admin/products`, `/admin/products/new`, `/admin/products/[id]`
**Design:** `designs/Admin Productos.dc.html` + `SCREENS.md` §7 (inventory §2.8)
**The card created on the §0 scope correction.**

- List restyled with the design's column set — **NOMBRE · CATEGORÍA · COSTO ·
  STOCK · MERCHANTS · ESTADO · CREADO** — category dot colours from `SCREENS.md`,
  stock states (*Ilimitado* / warning colour under 10 / *Agotado*).
- New and edit page chrome onto the app's heading, back link and card.
- Search over name and SKU, category facets with counts, stat cards, pagination.

The **MERCHANTS column is not new data** — the count was already being computed
on this page and thrown away without being displayed.

**Another untranslated slug, same class as the dashboard one.** This list
rendered `{p.category}` raw, so an operator read **"cosmeticos"** and
**"supplements"**. The vocabulary existed in **four** other places and this
screen had none. `lib/product-category.ts` is now the one source, in two
registers: full names for admin pickers, short names for a card chip.

**Not built, each for a reason that already existed:**

| Designed addition | Why |
|---|---|
| Volume-discount editor, derived POR MAYOR column | Wholesale, Adam ruling 2026-08-20 → `BACKLOG-volume-pricing` |
| Inspiración upload slots | Needs `products.inspiration` → `BACKLOG-inspirate-gallery` |
| Disponibilidad split into visibility × badge | Needs archive / agotado / próximamente states the enum has no room for |
| Render de mockups card | Replaces two numeric dimension columns with one free-text `label_dims` — schema change |
| Plantillas de Canva card | Replaces `theme-labels-editor.tsx` wholesale |
| Ficha content as four textareas | **New Adam card — see §5** |

**Click:** filter by a category and confirm the count matches · search a SKU ·
confirm a product with stock 0 reads *Agotado* in red · open the editor and
confirm the category picker still shows all three full names.

---

## 4. UI-admin-restyle — *awaiting review* · PR #35

**Routes:** `/admin/dashboard`, `/admin/labels`, `/admin/settings`,
`/admin/orders/new`
**Design:** none. Inventory §4 items 23–27 list them as absent.

**The restyle-only rule was held:** no flow changed, no feature was invented, no
screen gained or lost a step.

All four now carry the 36px heading, the `rounded-[22px]` card, the ink-and-orange
button, the pill vocabulary and the dashed empty state the rest of the app uses.

**Three presentation defects, all visual truth-telling:**

1. **The dashboard rendered `{order.status}` raw** — an operator read
   *"payment_failed"* and *"in_production"* in the recent-orders list. It reads
   `lib/order-status.ts` now.
2. **The *Merchants activos* stat card pointed at `href="#"`** — a card that looks
   clickable, *is* clickable, and goes nowhere. All three now link somewhere real,
   two carrying a filter: *Órdenes por procesar* → `/admin/orders?status=paid`,
   merchants → `/admin/merchants?estado=active`.
3. **`/admin/orders/new` was titled *"Nuevo pedido (admin)"***. An admin creating
   an order inside the admin app does not need to be told which app they are in.

**Picked up along the way:** the label queue's **Aprobar / Rechazar** were
`emerald-600` and `border-destructive` — the last two off-language buttons in the
admin app. The queue also gained the **label lightbox** and **search + status
facets**, which cost nothing once §1 had built both.

**Click:** confirm the dashboard's recent orders show **Spanish** status pills ·
click all three stat cards and confirm each lands somewhere real and pre-filtered ·
open a label in the queue's lightbox · confirm `/admin/orders/new` is titled
*Nuevo pedido*.

---

## 5. Open questions for Adam — consolidated across W2 and W3

Two are new. The rest carry from W1 and W2 and are still open.

| # | Card | Question |
|---|---|---|
| **NEW W3** | `PROD-ficha-content-simplification` | The design folds `supplement-facts-editor`, `benefit-blocks-editor` and `science-facts-editor` into four plain textareas. That would **drop the structured Supplement Facts panel** — which for a supplements manufacturer is a labelling-compliance artifact, not decoration. Four free-text boxes cannot produce a table with per-serving percentages, so accepting the simplification means **losing the panel, not restyling it**. Inventory Q7 leaves it open. Keep → restyle the existing editors and nothing else changes. Simplify → the panel, its editors and the columns behind them all come out, and that is a migration. |
| **NEW W2** | `FEAT-merchant-product-delete` | Should re-adding a deleted product start **blank**, or come back with its old label, mockup and price? Today it revives. Not a bug either way; a product call. |
| carried | `PROD-admin-nav-scope` | The designs show 3 admin nav items; the code has 6. Dropping to 3 removes the dashboard, the label queue and platform settings — all three of which W3 just restyled and all three of which an operator uses. Worth answering before anyone acts on the design's nav. |
| **needs Adam, not a question** | `CHORE-spanish-auth-emails` | Adam must verify `lablld.com` as a sending domain in **Resend DNS**. Until he does, Supabase custom SMTP cannot be wired, no auth email template can be edited, and every password-reset mail goes out in **English**. Nothing else is blocked by it. |
| carried | `PROD-label-approval-fork` | Three positions on label approval still unresolved |
| carried | `PROD-order-kinds` · `PROD-supplement-facts` · `PROD-undesigned-screens` · `PROD-payouts-feature` | Unchanged |
| carried | `BACKLOG-wholesale-line` · `BACKLOG-volume-pricing` · `BACKLOG-canva-themes` · `BACKLOG-inspirate-gallery` · `BACKLOG-realtime-orders` | Out by standing ruling or awaiting schema |

---

## 6. FINAL REVIEW CHECKLIST — W1 + W2 + W3 in one pass

**This is the review script.** Ordered so each step sets up the next: merchant
app first in the order a merchant meets it, then the admin app in the order an
operator works it. Nothing here needs a second browser or a second account.

### Before you start — CLEARED 2026-08-21

All six blockers are done. Kept as a record of what was applied and in what
order, because the order was load-bearing.

| ✔ | Done | Note |
|---|---|---|
| ☑ | **`0004`** — labels bucket size limit + MIME allowlist | The 10 MB limit is now a server-side boundary, not a browser `if` |
| ☑ | **`0005`** — merchant product soft delete | The one migration the deployed code could not run without |
| ☑ | **`0006`** — drop the Stripe columns | Applied **after** the endpoint and vars were removed. That order matters: dropping first would have left a live endpoint writing to columns that no longer existed |
| ☑ | **Stripe dashboard: endpoint deleted** | Stripe is no longer POSTing to a 404 and retrying |
| ☑ | **Vercel: five `STRIPE_*` vars removed** | Stripe is now absent in every sense — no code, dependency, env var, endpoint or column |
| ☑ | **Supabase: Redirect URL allowlist** | Password recovery is **functional end to end** |

**One thing is deliberately NOT done, and it does not block the review.** The
Spanish reset-email template could not be installed: Supabase now requires custom
SMTP before any auth template can be edited, and that is gated behind Adam
verifying `lablld.com` in Resend DNS.

So **recovery works today but its email arrives in Supabase's default English.**
That is a real defect, it is the one English artefact in an otherwise Spanish
sequence, and it lives on its own card — `CHORE-spanish-auth-emails` — rather
than holding a working feature open. When you reach §A below, review the
**screens and the flow**; the mail copy is not what is being reviewed.

**Two more things worth knowing while you review:**

- **Wompi sandbox keys are live in Vercel.** That is consistent with G3, whose
  carve-out is deliberate — sandbox stops being acceptable at G4, not before.
- **Adam has confirmed he owns every third-party account.** Recorded, but G4
  stays `fail`: this board's rule is that a condition is fail until its evidence
  exists, and one blanket statement is not proof of six accounts. The visible
  loose thread is Resend — `lablld.com` is not yet a verified sending domain.

### A. Auth — 3 screens

| ✔ | Route | What changed | Verify |
|---|---|---|---|
| ☐ | `/login` | W1 restyle; W2 added *"¿La olvidaste?"* and the reset banner | Password manager offers your **saved** password (W1 fixed `autoComplete`); copy is tú throughout |
| ☐ | `/register` | W1 restyle | Invite gating still refuses an uninvited address **with its message** |
| ☐ | `/forgot-password` → `/reset-password` | **New in W2** | Request a reset · link lands on the **form** not the expired state · set a password · green banner on `/login` · new password works. **The email arrives in English — that is known, tracked on `CHORE-spanish-auth-emails`, and not what you are reviewing here.** |

### B. Merchant app — 6 screens

| ✔ | Route | What changed | Verify |
|---|---|---|---|
| ☐ | `/dashboard` | W1 redesign | **Set a banner image and an Aprende card in admin settings and confirm they still render and still link.** That is the one regression risk in W1. |
| ☐ | `/catalog` | W1 redesign; Adam accepted the sort | Two presentations at once → count and chips follow · sort by cost · category and status chips never overlap on a long name |
| ☐ | `/catalog/[slug]` | W1 redesign | Gallery, tabs, Supplement Facts panel |
| ☐ | `/products` | W1 redesign | Filters and search |
| ☐ | `/products/[id]` | W1 create-flow redesign | Walk all six steps. **The stepper counter is the open question — if it ever reads "Paso 1 de 6" on a step that is not 1, screenshot it and note how you got there** (clicked through, or landed after a reload) |
| ☐ | `/products/[id]` step 3 | W2 raised the limit | Reads *"JPG, PNG, WebP o PDF · máx. 10 MB"* · a `.txt` is refused in Spanish |
| ☐ | `/products/[id]/edit` | **New in W2:** danger zone | *Eliminar producto* → confirm dialog → *Eliminar para siempre* · product leaves `/products` · reappears in `/catalog` · **an order that used it still shows under `/orders`** · Shopify listing went to draft |
| ☐ | `/labels` | W2 raised 2 MB → 10 MB | A **9 MB** image is now accepted · copy reads 10 MB · a `.txt` is refused |
| ☐ | `/orders`, `/orders/new` | W1 redesign | Order flow tabs and states |
| ☐ | `/settings` | W1 redesign | All four tabs; Tiendas with and without a store connected |

### C. Admin app — 8 screens

| ✔ | Route | What changed | Verify |
|---|---|---|---|
| ☐ | `/admin/dashboard` | **W3 restyle + 2 defect fixes** | Recent orders show **Spanish** status pills (was `payment_failed`) · **all three stat cards link somewhere real and pre-filtered** (one went to `#`) |
| ☐ | `/admin/orders` | **W3 redesign** | Label thumbnails on rows · click one → lightbox → **Descargar saves the file** rather than opening a tab · Escape closes · *Enviadas* stat card narrows the list · search a customer name · pagination |
| ☐ | `/admin/orders/[id]` | **W3 redesign** | Two-column layout · ENTREGA Y CONTACTO zebra table · **quote button stays disabled until all three fields are filled** · changing status raises a **toast** (W2) |
| ☐ | `/admin/orders/new` | **W3 restyle** | Titled *Nuevo pedido*, not *Nuevo pedido (admin)* |
| ☐ | `/admin/merchants` | **W3 redesign** | Avatars, join dates, **order count and lifetime volume** · row menu: *Enviar correo* opens your mail client · ***Eliminar cuenta* opens a confirm, not an instant delete** · Cancelar leaves everything alone · suspend → toast → reactivate → copy flips · **none of the three confirmations says "Stripe"** (W2) |
| ☐ | `/admin/products` | **W3 restyle** | Categories read **"Cosméticos & Cuidado Personal"**, not `cosmeticos` · stock 0 reads *Agotado* in red · MERCHANTS column · category filter · SKU search |
| ☐ | `/admin/products/[id]` | **W3 restyle** | Category picker shows all three full names · the Supplement Facts editors are **still there** (see §5) |
| ☐ | `/admin/labels` | **W3 restyle + lightbox** | Approve a label → **toast** · open a label in the lightbox · search and status facets · *Aprobar* / *Rechazar* are ink and red, not emerald |
| ☐ | `/admin/settings` | **W3 restyle** | Save a change and confirm it persists **and still drives the merchant dashboard** (ties back to B/`/dashboard`) |

### D. Things that should NOT have changed

| ✔ | Check |
|---|---|
| ☐ | `/orders` still shows an order whose product was deleted |
| ☐ | Admin still sees deleted merchant products (admin reads are deliberately unfiltered) |
| ☐ | Onboarding is untouched — Adam ruled keep-as-is |
| ☐ | `/admin/shopify` 404s. That feature was already gutted; only its orphans were removed |

### E. Every skip, in one place

| Skipped | Card | Reason |
|---|---|---|
| Wholesale / *Al por mayor* | `BACKLOG-wholesale-line` | Adam ruling 2026-08-20: plan-based pricing |
| Volume pricing + POR MAYOR column | `BACKLOG-volume-pricing` | same ruling |
| Inspírate gallery | `BACKLOG-inspirate-gallery` | needs `products.inspiration` |
| Canva templates card | `BACKLOG-canva-themes` | replaces `theme-labels-editor` wholesale |
| Realtime orders | `BACKLOG-realtime-orders` | not queued |
| *Regalar / Extender mes gratis* | `UI-admin-merchants` | new admin power, needs `trial_ends_at`, `adam_authorizes` |
| Expanded row workspace on admin orders | `UI-admin-orders` | structural rebuild; breaks every `/admin/orders/[id]` deep link |
| Stored-batch fulfillment branch | `UI-admin-orders` | wholesale |
| Disponibilidad visibility × badge axes | `UI-admin-products` | needs archive / agotado / próximamente states |
| Ficha simplification | `PROD-ficha-content-simplification` | **would drop the Supplement Facts panel — needs Adam** |
| `label_dims` free-text field | `UI-admin-products` | schema change |
| Cart / shared order modal | `UI-catalog` | no cart exists |
| Campaign promo tile, *Próximamente* chip | `UI-catalog` | no data model backs them |
| Cancelar solicitud, install-link expiry | `UI-settings-panel` | new action / no column stores one |
| Onboarding redesign | `UI-onboarding` | Adam ruling: future design session |
| PDF label thumbnails on listings | `UI-label-pdf-thumbnails` | P3, pre-existing, low urgency |

---

## 7. Board state

**Fingerprint:** `bc7c85fa4ca3b752` · 82 cards · **3/8 gates**

| lane | count |
|---|---|
| shipped | 25 |
| in flight | 23 |
| loose ends | 19 |
| Adam batch | 12 |
| blocked on people | 3 |

**15 cards are `in_flight` awaiting this review:** the eight W1 UI cards, the two
W2 feature cards, the four W3 admin cards, and `BACKLOG-label-lightbox` folded
into `UI-admin-orders`.

**3 blocked on Ivan:** `VERIFY-shopify-e2e`, `UI-stepper-step-counter` (needs a
second observation), `CHORE-spanish-auth-emails` (Resend DNS → Supabase SMTP →
Spanish templates).

`INFRA-supabase-recovery-config` **shipped** on 2026-08-21: the Redirect URL
allowlist is the half that made recovery work, and the Spanish-template half was
split out to `CHORE-spanish-auth-emails` once it turned out to need custom SMTP
rather than a setting.

Gates unchanged at 3/8.

- **G3** (`env-real`) — Wompi sandbox keys are live in Vercel, which the gate's
  own carve-out permits. Five `STRIPE_*` placeholders and the warehouse origin
  address are gone from `.env.example`. Still `fail`: an executor cannot read env
  values, so only Ivan can walk `.env.example` against the Vercel project and
  record that every REQUIRED name carries a real value.
- **G4** (`accounts-owned`) — Adam has confirmed he owns every third-party
  account. Still `fail`, fail-closed: one blanket statement is not per-account
  evidence, and Resend's sending domain is demonstrably not verified yet. The
  Shopify app identity question also stands — `shopify.app.toml` pins the
  `client_id`, so a transfer that ends in a *new* app silently breaks every
  merchant's existing connection.
- **G6, G7, G8** depend on paid tiers, the domain cutover and Adam running a card
  cycle himself. None is code work.
