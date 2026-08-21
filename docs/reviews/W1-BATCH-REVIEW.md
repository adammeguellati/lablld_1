# W1 batch review packet

**Run:** 2026-08-20, autonomous long run (W1 phase A + W1.5 phase B)
**Terminal:** PINK · **Reviewer:** Ivan, then Adam
**Board fingerprint at hand-off:** `1bdb45a13778cb48` · 71 cards · 3/8 gates

Nine PRs merged, all green on `typecheck` + `lint` + `build`. Every UI card is
`in_flight` with the note *awaiting batch fidelity review*; **none shipped**.
`CODE-error-boundaries` shipped on merge because it is non-visual.

This packet replaces the per-card fidelity questions. Read §7 first if you only
read one section.

---

## 0. How to read this

Each card gives the route, the design files, what changed, what was **skipped and
why**, any place the **code overruled the design's copy**, and **what to click**.

Three standing calibrations governed every decision:

- **SCREENS.md is the spec of record for structure and behaviour; the prototype
  wins on spacing, air and visual feel.**
- **Facts → code. Intent → a card. Visuals → design.** Copy tells the truth.
- **Behaviour the design silently drops is kept and restyled.** Removing
  behaviour is not a W1 action.

---

## 1. CODE-error-boundaries — *shipped*

**Route:** every route (`app/error.tsx`, `app/global-error.tsx`) · **PR #11**
**Design files:** none. Built to the LABLLD system.

Spanish, branded error boundaries with a reset action, both surfacing
`error.digest` — the only handle an operator gets on a production failure, and
whose absence is why INC-02 was undiagnosable. `global-error.tsx` replaces the
root layout, so it renders its own `html`/`body` with inline styles and depends
on neither Manrope nor `globals.css`, because the moment it fires is exactly when
a font or stylesheet may be the thing that failed.

**Verification found two things worth carrying forward.** `curl` **cannot** test a
Next 16 error boundary: the SSR HTML contains only an error marker, and the UI
renders on the client after hydration. And `min-h-[60vh]` left the lower viewport
white, because this boundary always renders **standalone** — it replaces the
merchant and admin chrome too.

**Click:** nothing routine. It only appears when something breaks.

---

## 2. UI-catalog — *awaiting review*

**Route:** `/catalog` · **PR #13**
**Design:** `designs/Catalog.dc.html` + `SCREENS.md` §1 (inventory §2.1)

Category pills with the design's dot colours, a **multi-select** Presentación
dropdown with per-facet counts, a sort menu, active-filter chips with *Limpiar
todo*, the count line, the `auto-fill minmax(260px,1fr)` gap-20 grid, the
collision-proof absolute chip row, and the empty state. *Crear orden* links to the
existing `/orders/new` rather than opening a cart modal.

**Skipped:** add/remove cart toggle and shared order modal (new logic, no cart
exists) · bulk "por mayor" pill and IVA tag (wholesale, and a tax model the code
lacks) · campaign promo tile (needs an asset and a data model that do not exist) ·
`Próximamente` chip (no field backs it; `Agotado` stayed because it reads
`stock === 0`) · the design's fourth category.

**Code over design:** three categories, from the `ProductCategory` enum.

**Pre-existing bug fixed:** `CatalogFilters` fired its debounce 350ms after *every
mount* and pushed a navigation nobody asked for. Invisible on the real page
because it was a same-URL push.

**Click:** filter by two presentations at once and confirm the count and chips
follow · sort by cost and confirm the order changes · confirm the category chip
and status chip never overlap on a long product name.

---

## 3. UI-product-details — *awaiting review*

**Route:** `/catalog/[slug]` · **PR #14**
**Design:** `designs/Detalle Producto.dc.html` + `SCREENS.md` §2 (inventory §2.2)

Full-bleed hero (a 2-up row over a 3-up row, every tile 4:5, 14px gutters, square
corners, fed from `products.images` in upload order), the title and price block,
and three edge-to-edge tabs — Resumen · Detalles · Entrega — with the `#2F6FE0`
underline. **Tab content was redistributed, not dropped:** the previous two tabs
rendered ten product fields and all ten still render. *Entrega* is new prose from
SCREENS.md §2, with the code's fulfillment-fee data folded into the Envío block so
nothing was lost when the old fee table became the price card.

**Skipped:** *Inspírate* carousel (needs a `products.inspiration` column that does
not exist) · *Compra mayorista* block (wholesale) · *Pedir muestra* two-step modal
(new logic; the existing `Solicitar muestra` link is kept, and `PROD-order-kinds`
still owns whether a sample is a real order kind).

**Click:** all three tabs · a product with fewer than five images, to see the hero
degrade · a product with no images at all.

---

## 4. UI-my-products — *awaiting review*

**Route:** `/products` · **PR #15**
**Design:** `designs/Mis Productos.dc.html` + `SCREENS.md` §4 (inventory §2.4)

3-column card grid; card with a 4:5 mockup plate, the same collision-proof chip
row as the catalogue, the merchant's name over the master product name when a
`custom_name` exists, costo-por-unidad and precio-de-venta, and a *Crear orden /
Editar* pair. *Crear orden* still appears only when the label is approved and the
master product is active — the existing rule.

**Skipped:** costo-por-mayor orange pill and the `showMarginOnCards` row (volume
pricing) · **the entire danger zone and delete confirm dialog**, per your ruling.

**Behaviour kept that the design drops:** pause/activate. The design replaces the
overflow menu with a delete; since the delete is not built, removing the menu
would have dropped behaviour nothing replaced. Restyled into a bordered icon
button that opens **upward** so it never clips on the grid's bottom row.

**New card:** `FEAT-merchant-product-delete` (`adam_authorizes`). It records the
constraint any ruling must answer to: `order_items` already snapshots
`product_name` and `unit_price`, so past orders survive — but
`merchant_product_id` is **restrict-on-delete**, so a hard delete of a referenced
row **fails today** rather than orphaning.

**Click:** products in different label states, and confirm the action rows line up
across a row of cards.

---

## 5. UI-order-flow — *awaiting review*

**Route:** `/orders` (+ `/orders/new`) · **PR #16**
**Design:** `designs/Order Flow.dc.html` + §6 and `Order Form.dc.html` + §5
(inventory §2.6, §2.5)

2×2 stat cards that **are** the filters for the states they count, a white list
shell with a `#F5F5F7` search-and-pills well, the row on the design's exact grid
(id tile, amount · customer · units line, label thumbnails, full-track status
pill, chevron rotating 180° over 350ms), and the nav pulse dot moved to the
**right edge** of Órdenes with the 1.4s `omPulse` keyframe.

**The card's one behavioural rule is now real:** carrier is visible at every
stage. `Transportadora` renders in the cotización, pagado, producción, enviado and
entregada panels, showing **"Se asigna al despachar"** while `orders.carrier` is
null. It previously appeared only once the order had shipped.

**Skipped:** wholesale promo card · *Al por mayor* kind badge · Order Form Step 0,
tier strip, DESTINO DEL LOTE.

**Code over design, twice.** The kind badge is skipped for a second reason: **no
column carries an order kind**, so a *Dropshipping* badge on every row would
assert a fact the data does not have. The SH/PA badge stays because
`orders.shopify_order_id` backs it. And the **108px status track became
`minmax(108px, max-content)`** — at exactly 108px the code's real labels truncate
to *"Pendiente d…"*, which makes the column useless. The design's number is kept
as the floor.

**Two real defects fixed, affecting every date in the app.** `formatDate` used the
**`en-US` locale** in a Colombian Spanish app, so dates read *"Aug 11, 2026"*. And
a **date-only string parses as UTC midnight**, so it rendered as the **previous
day** everywhere west of UTC — including all of Colombia at UTC-5. `2026-08-12`
displayed as **11 August**. Both fixed at the shared formatter, correcting all
five call sites. This closes the audit's date-format finding.

**Click:** each stat card as a filter · expand a row and walk the stage tabs ·
confirm an order with no carrier reads *"Se asigna al despachar"* · **check dates
across the app now read `12/08/2026` in lists and `12 de ago de 2026` in
details, and that the day is correct.**

---

## 6. UI-product-create-flow — *awaiting review*

**Route:** `/products/[id]` · **PR #17**
**Design:** `designs/Crear Producto.dc.html` + `SCREENS.md` §3 (inventory §2.3)

Stepper chrome restyled, plus the design's step-intro pattern on every step: the
`PASO n DE 6` eyebrow, a one-line promise, a 38px headline. The denominator is
`STEPS.length`, so it cannot drift from the rail.

**Six steps, not the design's four**, per your ruling: Shopify publish is kept.
Adam sees *Publicar* for the first time at this review; expected, not a defect.

**Your ruling 2b did not survive contact with the code — this is the most
important line in this packet.** You ruled that 2 MB is the truth and the
design's 20 MB copy should become *"PNG, máx. 2 MB"*. **This flow does not use the
2 MB uploader.** Step 3 renders `label-uploader.tsx`, which enforces **10 MB** and
accepts **jpg/jpeg/png/webp/pdf**. The 2 MB figure belongs to
`label-upload-form.tsx` on `/labels`.

Applied instead: **neither limit was changed**, and each uploader now **derives
its copy from the constant that enforces it**. Each screen states its own real
limit and the two can no longer drift. Changing a limit stays
`INFRA-labels-file-limits`' call; that card's note is corrected.

**Ruling 2c applied:** *"Intentos ilimitados"* is gone. The mockup step states the
**remaining** count before the limit is hit, from the same `MOCKUP_LIMIT` the
server enforces, plus when it renews. Once, not twice.

**Defect fixed:** every step component carried its own `PASO` eyebrow, which
double-printed under the new shared intro — and the mockup step's read
**"PASO 4"** while the six-step rail said **5**.

**Click:** walk all six steps · confirm the upload hint reads *JPG, PNG, WebP o
PDF · máx. 10 MB* · confirm the mockup step shows remaining renders **before** you
hit the limit · **and the upload proof in §8.**

---

## 7. UI-settings-panel · UI-dashboard · UI-login-register — *awaiting review*

### 7.1 UI-settings-panel — `/settings` · PR #18
**Design:** `designs/Configuracion Tiendas.dc.html` (inventory §2.7)

The inventory calls this the one screen that maps cleanly onto what exists, and
re-deriving it confirmed that harder than expected: the design's four tabs **are**
the code's four tabs, the four Shopify connection states already exist, and the
design's *"¿Vendes en otra plataforma?"* contact card **was already built**. So
this card is a restyle and almost nothing else — the honest result.

**Skipped:** *Cancelar solicitud* (a new server action, so feature-level) ·
install-link **expiry date** (no column stores one, so rendering it would invent a
fact) · suffix-locked `.myshopify.com` input (the existing field accepts **either**
the bare name or the full domain and says so; narrowing it would *remove* accepted
input).

**Click:** all four tabs, and the Tiendas tab with and without a store connected.

### 7.2 UI-dashboard — `/dashboard` · PR #19
**Design:** none. The inventory lists `/dashboard` among 30 routes with no design
coverage, so this applies the system the other W1 screens established.

36px greeting, the three alert banners rebuilt as one data-driven list instead of
three near-identical hand-written blocks, promo banners and Aprende cards reframed
to 5px plates, three stat tiles matching the Órdenes cards, and the two lower
sections in white containers.

**The part that could have broken silently, preserved exactly:** the banners and
Aprende cards still read `platform_settings.dashboard`, still fall back to
placeholder tiles when unset, and still use each `link_url`. *Ordenar productos*
still points at `settings.order_button_url`.

**Click:** **set a banner image and an Aprende card in admin settings and confirm
they still render and still link.** That is the one regression risk on this card.

### 7.3 UI-login-register — `/login`, `/register` · PR #20
**Design:** none for these routes; built to the system.

**Registration stays invite-gated** and its intentional error path is untouched:
the gating message reaches the screen through `translateAuthError`'s deliberate
raw fallback, which INC-01's fix kept precisely so this would keep working.

**Two real defects fixed.** The **login** password field carried
`autoComplete="new-password"` — on a sign-in form that is actively harmful,
because it tells the password manager this is a *new* credential and the saved one
is never offered. Now `current-password` with `username` on the email field; both
forms also dropped form-level `autoComplete="off"`, which suppressed the same
behaviour a second time. And the **tú/usted mix**: login greeted with *"Por favor,
introduzca sus datos."* while every other string on both screens uses tú.

**Not invented:** password recovery. No route, no action, no template — a link
would lead nowhere. Carded as `FEAT-password-recovery`.

**Click:** confirm your password manager now offers the saved credential on
`/login` · confirm `/register` still shows the gating error, unchanged in wording.

---

## 8. Signed-URL upload proof — **NOT discharged**

`SEC-labels-bucket` shipped with the bucket private and every read signed, but its
happy path has **never executed end to end**. At flip time no label data existed,
so both label pages only proved their empty state, and the admin order thumbnail
was not testable because there were zero orders.

**It cannot be discharged from a terminal.** A real upload needs a real Supabase
bucket, and no LABLLD terminal has production access. What *is* verified: the
upload gate's copy and its enforcement now come from one constant, and
`labelObjectPath` is exercised directly, including the negative arm that a
`product-images` URL returns `null` so the wrong bucket can never be signed.

**Your step:** upload a label on the deployed instance, then confirm it renders on
`/labels`, on `/admin/labels`, and on an order-detail thumbnail. **If it uploads
but renders broken, look at `lib/storage.ts` `signLabelUrl` and the
`labels_read_own` policy in migration `0003` — not at any W1 redesign.**

---

## 9. Open questions for Adam — consolidated

1. **A fourth category.** The design names *Cuidado personal*; the enum has three,
   and `cosmeticos` is already labelled *"Cosméticos & Cuidado Personal"*, so the
   design may be splitting one existing label rather than adding a product line.
   **No card owns category taxonomy** — if he wants it, it needs one, or the
   question is lost with `UI-catalog` into the Shipped lane.
2. **Merchant hard delete** — `FEAT-merchant-product-delete`. What happens to a
   product with live orders? Blocking, soft-delete and cascade are three different
   products, and `merchant_product_id` is restrict-on-delete today.
3. **Which upload limit is right**, now that both are stated honestly: 10 MB in the
   create flow, 2 MB on `/labels`. `INFRA-labels-file-limits`.
4. **Is 6 mockup renders per month right?** The UI now states it truthfully.
   `PROD-mockup-quota`.
5. **The Shopify publish step**, which he sees for the first time in the create
   flow, since the design has no counterpart for it.
6. **Password recovery** — `FEAT-password-recovery`. It changes who can regain
   entry to an invite-only product.
7. **Onboarding.** `UI-onboarding` was **not started, deliberately**. Its 11 routes
   have no design coverage and the handoff's model differs structurally, so
   redesigning would mean inventing a flow and calling it a redesign. It is a
   design conversation first. `PROD-onboarding-fate` carries the keep/cut question,
   and 86 MB of custom imagery rides on the answer.
8. **Sort options on the catalogue** were chosen by me — the design specifies a
   sort control but not its options. *Más recientes* preserves the existing
   `created_at desc` default.

---

## 10. Board state

| | |
|---|---|
| Cards | **71** (was 70 at run start; +`FEAT-merchant-product-delete`, +`FEAT-password-recovery`, −0) |
| Shipped | **15** |
| In flight | 17, of which **8 are W1 UI cards awaiting your screen** |
| Adam batch | 16 |
| Loose ends | 22 |
| Blocked on people | 1 (`VERIFY-shopify-e2e`, behind G4) |
| Launch gates | **3/8** — G1, G2, G5 pass |
| Fingerprint | `1bdb45a13778cb48` |

**Gate note, flagged rather than buried:** the three W1.5 cards were
`ivan_merge` on the board while your long-run authorization granted self-merge and
named them. `BOARD-SPEC.md` says the JSON wins and a contradicting card is halted
on. I brought the JSON into line and recorded the source on each card, rather than
halting all of phase B — which would have contradicted the instruction that
created the phase. If you would rather I had halted, that is the rule to tighten.

**Nothing ships until you say so.** Every UI card above flips to `shipped` on your
confirmation, or gains an adjustment card.
