# LABLLD — Design Handoff Inventory

**Source folder:** `design_handoff_lablld_dashboard/` (untracked in git as of this writing)
**Repo:** `adammeguellati/lablld_1`, branch `docs/design-inventory`, cut from `main` @ `4c2deae`
**Date:** 2026-08-20
**Method:** read-only. Every text, markdown, HTML, JS and PDF file in the folder was read in full. Image assets were inventoried by filename and size only. No network calls, no build, no code changes.
**Route source:** the route inventory in `docs/audit/CODE-AUDIT-2026-08.md` §3, which lives on branch **`docs/code-audit`** (not yet merged). Route names below are quoted from it.

---

## Headline

This is not an incremental redesign of the app that exists. **It is a specification for a different product**, sharing the same brand, the same broad domain and roughly half the screens.

The handoff's own `START-HERE.md` says so plainly: it instructs the reader to run `npx create-next-app`, build a fresh data layer behind `lib/db.ts` backed by local JSON, and defer Supabase to "Step 13". `BUILD-ORDER.md` is a 14-step greenfield build. It does not know that a working Next.js 16 + Supabase + Wompi + Shopify application already exists.

The consequences are concrete, not stylistic:

- **The commercial model changes.** Code sells `starter`/`plus` plans where `plus` gets a flat −18% on wholesale price. The handoff sells `free`/`esencial` at $119.000 COP/month, where `free` cannot see prices at all, and the discount moves from the *plan* to the *order quantity* (−6% / −12% / −18% at 25 / 100 / 300 units).
- **A whole second order type appears.** "Al por mayor" (wholesale batch pre-buy, minimum 25 units, with a choice of shipping to the merchant's warehouse or leaving the batch in LABLLD's) has no counterpart anywhere in the code.
- **Shopify is missing from the spec but present in the designs.** `SPEC.md` §7 lists Supabase, Sudomock, Canva, payments and email as the integrations. Shopify is not among them, and the `orders` table has no store-origin column. Yet `Configuracion Tiendas.dc.html` is an entire Shopify connection screen, `Order Flow.dc.html` tags orders with `src: 'Shopify'` and renders an SH/PA badge, and `reference/flujo-ordenes.pdf` is explicit that orders arrive from Shopify and must be pushed back on ship and deliver. Shopify is roughly a third of the current codebase.

Read sections 3, 4 and 5 as the decision list. Section 2 is the mapping for the work that is genuinely incremental.

---

## 1. File list

30 files, 1.9 MB total.

### Root documents

| File | Lines | Description |
| --- | --- | --- |
| `START-HERE.md` | 50 | Onboarding note for whoever builds this. Two paths: open the prototypes in a browser, or drive Claude Code through `BUILD-ORDER.md` step by step. **Assumes a greenfield `create-next-app` project with no Supabase.** |
| `README.md` | 69 | What the bundle is, the dropshipping/wholesale business framing, fidelity statement ("Recreate pixel-for-pixel"), and the rule that admin and merchant are one realtime-linked system. Declares all copy final Colombian Spanish and all money COP. |
| `SPEC.md` | 390 | The authoritative systems document: actors, a 6-table Postgres data model, order kinds, the 0–6 order state machine, plan gating, pricing math, integrations, and a complete design-token set (color, type, spacing, radius, motion). |
| `SCREENS.md` | 270 | Screen-by-screen build detail for **9** screens: layout, exact grid tracks, component anatomy, final copy, and interaction states. Ends with six cross-screen interaction contracts. |
| `BUILD-ORDER.md` | 193 | 14-step implementation sequence (Step 0 project setup → Step 13 Supabase swap), each with an acceptance check. |

### Prototypes — `designs/*.dc.html`

Self-contained HTML pages using a bespoke template runtime (`<x-dc>` tags, `{{ }}` holes, `<sc-if>` / `<sc-for>` control tags). `README.md` is explicit: **do not port this runtime**, treat the files as visual reference.

| File | Lines | Description |
| --- | --- | --- |
| `Catalog.dc.html` | 471 | Merchant catalog. Category pills, multi-select filter bar, sort, responsive 4:5 card grid with a collision-proof absolute chip row. Empty state. "Crear orden" opens the shared order modal. |
| `Detalle Producto.dc.html` | 444 | Master-product ficha. Full-bleed hero + 3 detail tiles, three edge-to-edge tabs, "Inspírate" 4-image carousel, and four Entrega blocks (Producción, Envío, Dropshipping, Compra mayorista). Also carries a **2-step "Pedir muestra" modal** that `SPEC.md` never models. |
| `Crear Producto.dc.html` | 513 | 4-step SKU creation: Datos → Diseño (Canva templates vs blank, two tabs) → Etiqueta (PNG upload) → Mockup, ending in a congratulations modal. Deep links re-enter at step 2 or 4. |
| `Mis Productos.dc.html` | 316 | The merchant's own SKUs: 3-column mockup cards with cost/margin, an edit sheet with a DISEÑO Y MOCKUP block, a danger zone, and a hard-delete confirm dialog. |
| `Order Form.dc.html` | 575 | The shared 660px order modal, 4 steps: Tipo de orden → Productos y pago → Envío → Confirmación. Carries the wholesale tier strip, destino-del-lote radios, and the two different locked-hover labels on Contra entrega. Contains a disabled "Muestra" branch (`isWhite = false`, line 301). |
| `Order Flow.dc.html` | 598 | Merchant order tracking. 2×2 clickable stat cards, a 330px blue wholesale promo card, then the list shell with expandable rows and a per-state stage panel. Seed orders carry `src: 'Shopify' \| 'PA'` and a `payFailed` flag. |
| `Configuracion Tiendas.dc.html` | 290 | The **Tiendas** tab of merchant Configuración: a Shopify connection card with four states (none → pending → ready-with-install-link → connected), a "¿Vendes en otra plataforma?" card, and a state-preview switcher. Not documented in `SCREENS.md`. |
| `Admin Productos.dc.html` | 687 | Admin master-product list + full editor: basic info, prices with a 3-rank volume-discount editor, ficha content, photos, live catalog preview, shipping data, availability (visibility × badge), Sudomock render ids, per-product Canva templates, and 4 inspiration slots. |
| `Admin Ordenes.dc.html` | 505 | Admin order operations. 4-up stat cards, filter pills with counts, rows with label thumbnails, and an expanded two-column workspace: products-and-labels (with a full-size label lightbox and PNG download), a delivery/contact zebra table, and the state-specific action panel including the three-field quote gate. |
| `Admin Comerciantes.dc.html` | 315 | Merchant/subscription management. Stat cards, filter pills, a 6-track row grid, a row menu (mailto, gift a month, activate/suspend/reactivate, delete), a hard-delete confirm and a toast. |

### Prototype runtime — `designs/*.js`

| File | Lines | Description |
| --- | --- | --- |
| `support.js` | 1,911 | Generated `dc-runtime` bundle — the `<x-dc>` template engine over React. Header says "GENERATED … do not edit". Not production code. |
| `image-slot.js` | 1,225 | An `<image-slot>` drag-and-drop image placeholder web component from an "omelette starter" scaffold, persisting drops to a sidecar JSON. Prototype tooling only. |
| `order-store.js` | 124 | The cross-page shared store: `localStorage` + a custom event, backing orders, merchant products, **payouts**, and `pendingPayCount()`. `SPEC.md` §9 maps each function to its production equivalent. The payouts store (`loadPayouts` / `addPayout` / `updatePayout`) is referenced by **no design file and no document** — leftover scaffolding. |

### Assets — `designs/assets/`

Placeholder-grade per `README.md`; production imagery comes from storage.

| File | Size | Description |
| --- | --- | --- |
| `labdll-logo.png` | 38 KB | LABLLD wordmark used in both sidebars. Note the filename typo: `labdll`, not `lablld`. |
| `shopify-logo.png` | 751 KB | Shopify mark for the Tiendas connection card. Oversized for its ~28px render. |
| `products/tu-marca.png` | 285 KB | Generic "your brand" product photo. |
| `labels/creatine.png` | 43 KB | Sample label artwork — creatine. |
| `labels/lutein.png` | 44 KB | Sample label artwork — lutein. |
| `labels/magnesium.png` | 44 KB | Sample label artwork — magnesium. |
| `labels/shilajit.png` | 47 KB | Sample label artwork — shilajit. |
| `labels/custom-60.png` | 39 KB | Sample custom-formula label, 60 capsules. |
| `labels/custom-90.png` | 39 KB | Sample custom-formula label, 90 capsules. |

### Reference — `reference/`

| File | Size | Description |
| --- | --- | --- |
| `flujo-ordenes.pdf` | 81 KB, 2 pages | Hand-drawn order-flow diagram, "Colombia 2026". Six states from *Pendiente de cotización* to *Entregado*, with the quote contents, the accept-or-reject decision, and the reject dialog copy. **Explicitly names Shopify and Wompi.** |

> **Documentation error:** both `README.md` and `START-HERE.md` describe `reference/` as "Earlier catalog/PDP spec, kept for continuity." It is not. It is an order-flow diagram, and it is the only document in the bundle that names Wompi or connects the order flow to Shopify. Anyone who skips it on the strength of that description misses the integration reality.

### Incidental

`.DS_Store` at the folder root and in `designs/` — macOS Finder metadata, no content. Should not be committed if the folder is ever added to git.

---

## 2. Screen and flow mapping

Routes are quoted from `docs/audit/CODE-AUDIT-2026-08.md` §3.

### 2.1 Catálogo → `/catalog`

| | |
| --- | --- |
| **Design** | `designs/Catalog.dc.html`, `SCREENS.md` §1 |
| **Code today** | `app/(merchant)/catalog/page.tsx`, `components/merchant/catalog-filters.tsx`, `product-card.tsx`, `catalog-pagination.tsx` |

**Changes vs current**

- Price display is driven by **plan gating**, not by tier math. `free` merchants see a locked price component; today `calculateMerchantPrice()` in `lib/utils.ts` silently applies −18% for `plus`. The whole pricing surface changes meaning.
- Product cards gain an add/remove cart toggle feeding the shared order modal. No cart concept exists today.
- Categories are named Cosméticos · Cuidado personal · Suplementos Dietarios · Café y Infusiones with fixed dot colors. Code's `ProductCategory` enum is `supplements | cosmeticos | cafe` — **"Cuidado personal" is a fourth category that does not exist.**
- Status chips gain `Próximamente` and `Agotado`, which disable the card's button. Code has only `is_new`.
- Pagination is dropped: the design specifies client-side filter and sort over a single grid, while code ships `catalog-pagination.tsx`.
- Exact grid: `repeat(auto-fill, minmax(260px, 1fr))`, gap 20px; card chip row is one absolute flex row so chips can never collide.

### 2.2 Detalle Producto → `/catalog/[slug]`

| | |
| --- | --- |
| **Design** | `designs/Detalle Producto.dc.html`, `SCREENS.md` §2 |
| **Code today** | `app/(merchant)/catalog/[slug]/page.tsx`, `product-gallery.tsx`, `product-detail-tabs.tsx`, `supplement-facts-panel.tsx` |

**Changes vs current**

- New **"Inspírate"** carousel: 4 images at 22.5% width with prev/next, from a new `products.inspiration` text[] column.
- New **Entrega** section of four prose blocks, one of which ("Compra mayorista") sells the wholesale model with three `→`-prefixed lines. Requires the wholesale feature to exist.
- New **"Pedir muestra"** 2-step modal (quantity → contact/delivery fields → sent confirmation), summarised as "Producto blanco, sin etiqueta". Code has `createSampleOrderAction` in `app/(merchant)/orders/new/actions.ts`, so a sample concept exists — but it is not surfaced from the PDP, and `SPEC.md` §2.5 does not include a sample kind. See §5, Q4.
- Retains the existing tabs and supplement-facts panel in spirit; layout becomes full-bleed hero + 3 detail tiles.

### 2.3 Crear Producto → `/products/[id]` (and `/products/[id]/edit`)

| | |
| --- | --- |
| **Design** | `designs/Crear Producto.dc.html`, `SCREENS.md` §3 |
| **Code today** | `app/(merchant)/products/[id]/page.tsx`, `components/merchant/product-stepper.tsx` and its four steps |

**Changes vs current — this is the largest single divergence in the merchant app.**

- **The steps change entirely.** Design: Datos → Diseño → Etiqueta → Mockup. Code: `product-step-label` → `product-step-mockup` → `product-step-shipping` → `product-step-publish`. The design has no shipping step and **no publish-to-Shopify step**; the code has no Datos step and no Canva design step.
- Step 2 "Diseña tu etiqueta en Canva" is new: two tabs (Plantillas 3-up grid, En blanco single 21:9 card) sourced from a new per-product `product_templates` table, with a Canva CTA in `#00C4CC` on `#10262B`. Code has two scalar columns (`label_template_url`, `canva_template_url`) plus a `theme_labels` JSON array of `{id, name, preview_url, file_url}` — related, but with no `canva_url` and no per-row status derivation.
- **Upload limit conflicts.** Design copy: "PNG con fondo transparente, 300 dpi, máximo 20 MB." Code: `components/merchant/label-upload-form.tsx:24` rejects anything over **2 MB** and accepts `image/*`, not PNG specifically. A 20 MB PNG is rejected today at one tenth of the stated limit.
- **Mockup quota conflicts.** Design copy on the mockup step: "Intentos ilimitados hasta que te guste." Code: `app/(merchant)/products/[id]/actions.ts:9` sets `MOCKUP_LIMIT = 6` renders per merchant per month, enforced at line 112, against a metered SudoMock account. The design promises something the billing model does not fund.
- New congratulations modal (centered, animated check rings, rising text) on mockup success.
- Deep-link editing: `?edit=…&step=2` ("Cambiar diseño") and step 4 ("Regenerar mockup"). Code routes editing to a separate `/products/[id]/edit` page.

### 2.4 Mis Productos → `/products`

| | |
| --- | --- |
| **Design** | `designs/Mis Productos.dc.html`, `SCREENS.md` §4 |
| **Code today** | `app/(merchant)/products/page.tsx`, `my-product-card.tsx`, `merchant-products-filters.tsx`, `product-edit-info-form.tsx` |

**Changes vs current**

- Card pricing block becomes **costo por mayor** in an orange pill (`#FDEFE0` / `#B4690E`) plus costo por unidad, with an optional margin row behind a `showMarginOnCards` prop.
- **Merchant-side hard delete is new.** The edit sheet gains a hairline-divided danger zone and a confirm dialog ("¿Eliminar {name}?" → "Eliminar para siempre", `#C0303B`). Code has **no merchant delete path at all** — `app/(merchant)/products/actions.ts` exposes only `toggleMerchantProductAction`. Deleting must preserve `order_items` snapshots.
- The Shopify column and publish state disappear from this screen. Code's `/products` table carries a Shopify column and `publish-to-shopify-button.tsx`.
- 3-column grid; "Crear orden" per card opens the shared order modal.

### 2.5 Order Form → `/orders/new`

| | |
| --- | --- |
| **Design** | `designs/Order Form.dc.html`, `SCREENS.md` §5 |
| **Code today** | `app/(merchant)/orders/new/page.tsx`, `components/merchant/order-form.tsx`, `colombia-address-selector.tsx` |

**Changes vs current**

- Becomes a **660px modal** shared by Catálogo, Mis Productos and Órdenes, not a standalone page.
- Gains **Step 0, Tipo de orden**: two selectable cards, Dropshipping vs Al por mayor. Nothing equivalent exists.
- Wholesale branch adds the tier strip (25/−6, 100/−12, 300/−18), a 25-unit minimum, single-product-only enforcement, and **DESTINO DEL LOTE** (a mi bodega con flete / en bodega LABLLD sin flete). When the batch stays with LABLLD the entire address block is hidden and replaced by a blue note; only name + WhatsApp are required.
- **FORMA DE PAGO** shows Prepago active and Contra entrega locked, with two different hover labels: "Próximamente" (green) in dropshipping, "Solo disponible en dropshipping" (neutral) in wholesale.
- Product carousel: horizontal, `scroll-snap-type: x mandatory`, 178px cards, steppers rendered in **every** card but dimmed until selected so heights match.
- Totals panel carries the fixed line "Envío: se te envía como cotización cuando LABLLD confirme la orden" — shipping is never priced at order time.
- Existing `colombia-address-selector.tsx` maps onto the Envío step's ciudad/departamento fields.

### 2.6 Órdenes (merchant) → `/orders`

| | |
| --- | --- |
| **Design** | `designs/Order Flow.dc.html`, `SCREENS.md` §6 |
| **Code today** | `app/(merchant)/orders/page.tsx`, `orders-table.tsx`, `order-row.tsx`, `order-tab-panel.tsx`, `order-steps.tsx` |

**Changes vs current**

- Header gains 2×2 **clickable stat cards** (Total · Pendientes / Enviadas · Entregadas) acting as filters, plus a 330px blue wholesale promo card with no CTA.
- Row grid is specified exactly: `92px | minmax(160px,1fr) | minmax(104px,auto) | 108px | 16px`, gap 10, padding `10px 14px` on `#FCFCFD`, with the status pill full-width in its track so pills align down the list.
- New **kind badge** per row (Dropshipping `#EDF4FC`/`#1D5EA8`, Al por mayor `#FDEFE0`/`#B4690E`) plus label thumbnails.
- **Carrier must be visible at every stage** from quote onward, including "Se asigna al despachar" while unknown. Today `order-tab-panel.tsx` has tabs `info | cotizacion | pago | pagado | produccion | enviado | entregado` — close to the same machine, but the carrier-everywhere rule is a new constraint.
- The pulsing dot: design wants 8×8 `#34C759` with a 1.4s `omPulse` keyframe on the **right edge of the nav item**. Code already ships a dot (`components/layout/merchant-sidebar.tsx:65`) but as a static emerald dot on the **icon's top-right corner**, no animation. Substance exists; placement and motion change.
- The prototype's seed data carries `src: 'Shopify' | 'PA'` rendered as an SH/PA badge. `SPEC.md` does not model this column. See §5, Q2.

### 2.7 Configuración → Tiendas → `/settings?tab=tiendas` (and `/settings/shopify`)

| | |
| --- | --- |
| **Design** | `designs/Configuracion Tiendas.dc.html` — **no `SCREENS.md` section** |
| **Code today** | `app/(merchant)/settings/page.tsx`, `settings-tabs.tsx`, `app/(merchant)/settings/shopify/page.tsx`, `shopify-connect-form.tsx`, `shopify-request-form.tsx` |

**This is the one screen that maps cleanly onto what already exists.** The design's four tabs — General · Seguridad · Facturación · Tiendas — match `components/merchant/settings-tabs.tsx:34-35` exactly, and the code already redirects to `/settings?tab=tiendas` from the Shopify callback.

**Changes vs current**

- The four connection states (none → pending → ready → connected) match the existing `merchants.shopify_request_domain` request flow and the `/admin/shopify` approval queue. The design formalises the copy: "Te responderemos en un máximo de 8 horas hábiles", a requested/sent/estimated-response table, "Cancelar solicitud", a copyable install URL with an expiry date, and a connected-state table showing "Sincronización de órdenes: Activa".
- New: **"Cancelar solicitud"** action and an install-link **expiry date**. Neither exists today.
- New: a "¿Vendes en otra plataforma?" contact card.
- The domain input is a split field with a fixed `.myshopify.com` suffix and inline error state.

### 2.8 Admin Productos → `/admin/products`, `/admin/products/new`, `/admin/products/[id]`

| | |
| --- | --- |
| **Design** | `designs/Admin Productos.dc.html`, `SCREENS.md` §7 |
| **Code today** | `app/admin/products/*`, `product-form.tsx`, `product-edit-form.tsx`, the four array editors, `product-image-uploader.tsx`, `theme-labels-editor.tsx` |

**Changes vs current**

- List table becomes NOMBRE · CATEGORÍA · COSTO · **POR MAYOR** · ESTADO · ⋯, where POR MAYOR is derived from that product's rank-1 discount.
- **Descuentos por volumen** editor is new: three rank cards with editable minimum-units and discount-%, defaults 25/−6, 100/−12, 300/−18, each with a live per-unit preview.
- **Disponibilidad** splits into two independent axes: visibility (`activo | desactivado | archivado`) and badge (`sin etiqueta | nuevo | próximamente | agotado`). Code has only `is_active` + `is_new` — no archive state, no agotado/próximamente.
- **Render de mockups** card: three monospace fields, Mockup UUID / Smart Object ID / Dimensiones de etiqueta, with a derived "Listo para renderizar" chip. Code already has `mockup_template_id`, `mockup_smart_object_uuid`, `mockup_so_width`, `mockup_so_height` — the design replaces the two numeric dimensions with one free-text `label_dims` string ("78 × 105 mm · 3 mm de sangrado").
- **Plantillas de Canva** card is new: a pinned blank-base row plus N designed themes, each with thumb upload, name, Canva link and a derived status (Publicada / Falta la vista previa / Falta el enlace de Canva). Replaces `theme-labels-editor.tsx`.
- **Inspiración**: 4 upload slots feeding the PDP gallery. New.
- Existing `supplement-facts-editor`, `benefit-blocks-editor`, `science-facts-editor` are folded into a single "Contenido de la ficha" card of four plain textareas — **a significant simplification that would drop the structured supplement-facts table**. See §5, Q7.
- `shipping-rates-editor.tsx` (per-country rates) has no counterpart; the design quotes shipping per order instead.

### 2.9 Admin Órdenes → `/admin/orders`, `/admin/orders/[id]`

| | |
| --- | --- |
| **Design** | `designs/Admin Ordenes.dc.html`, `SCREENS.md` §8 |
| **Code today** | `app/admin/orders/page.tsx`, `app/admin/orders/[id]/page.tsx` + `actions.ts`, `orders-table.tsx`, `order-status-form.tsx`, `order-detail.tsx` |

**Changes vs current**

- Detail moves from a separate route into an **expanded row workspace** on the list — two columns, `minmax(0,1.4fr) | minmax(0,1fr)`.
- **PRODUCTOS Y ETIQUETAS** panel is new: 46×62 label thumbnail per item, click → full-size lightbox with **Descargar PNG**. Today an admin has no way to pull the merchant's label artwork out of the order screen. For a manufacturer this is the single most operationally useful addition in the bundle.
- **ENTREGA Y CONTACTO** zebra table with 11 fixed rows, ending Transportadora / Días estimados / Guía.
- The **quote gate** is formalised: `shipping_cost` + `eta_days` + `carrier`, three-across, with "Enviar cotización" disabled (`#E9E9ED`/`#AEAEB2`) until all three are filled. Code's `confirmQuoteAction` already implements a quote; the design makes the three-field requirement a hard UI gate.
- State 4 branches on fulfillment: not stored → Transportadora + Número de guía → **Marcar enviada**; stored → **Guardar en bodega** → straight to delivered with `carrier = 'Almacenado'`. Code's `markShippedAction` has no stored-batch branch.
- Always-present **Rechazar orden** (outlined red) and a grey step-back link. Cancelled orders can be reopened to state 1.
- Stat cards and filter pills carry live counts; search spans id, merchant, product and recipient.

### 2.10 Admin Comerciantes → `/admin/merchants`

| | |
| --- | --- |
| **Design** | `designs/Admin Comerciantes.dc.html`, `SCREENS.md` §9 |
| **Code today** | `app/admin/merchants/page.tsx`, `merchant-actions.tsx`, `merchant-cancel-button.tsx` |

**Changes vs current**

- Row gains a 38px circular initials avatar, brand name, join date ("Desde mar 2026"), and derived **order count + lifetime volume** columns. None of these exist today.
- Status pill vocabulary changes to Esencial · Gratis · **Mes gratis** · **Pago vencido** · Suspendida. Code's `PlanStatus` is `active | past_due | cancelled` against plans `starter | plus`. "Pago vencido" must read as distinct from "Gratis" (lapsed vs never paid) — a distinction the current enum cannot express.
- **"Regalar un mes de Esencial"** (→ `trial`, 30 days, new `trial_ends_at` column) and "Extender mes gratis" are new admin powers.
- **"Enviar correo"** is a two-line `mailto:` menu item. `SPEC.md` §7.5 is explicit that admin↔merchant messaging is mailto only, with no in-app inbox.
- Delete confirm copy is specified and materially different from a generic warning: profile, products and labels are destroyed; **invoiced orders are retained**.
- Every action fires an ink-pill toast, bottom-center, green check, auto-dismissing at 2.6s. Code has `sonner` installed but `<Toaster />` is mounted nowhere (see `CODE-AUDIT-2026-08.md` §8.2) — the dependency is already there, unwired.

---

## 3. Screens and features the handoff covers that do NOT exist in code today

Ranked by build cost.

1. **The entire wholesale ("Al por mayor") order type.** Order-type step, single-product constraint, 25-unit minimum, volume-tier pricing, destino del lote (`merchant_warehouse` / `lablld_warehouse`), the conditional address block, the stored-batch shipping shortcut, the warehouse field, and the "Guardar en bodega" admin action that skips state 5. Code's `orders` table has no `kind`, no `fulfillment`, no `warehouse`. This is a new business line, not a screen.
2. **Volume-discount pricing (`−6% / −12% / −18%` at 25 / 100 / 300 units) and its admin editor.** Three editable rank cards with live per-unit preview, plus the derived POR MAYOR column in the admin product list. Code prices by *plan* (`PLUS_DISCOUNT = 0.18` in `lib/utils.ts`), never by quantity.
3. **The `free` / `esencial` plan model and its gating.** $119.000 COP/month, masked prices for free users, an upgrade sheet on the create/order entry points, and the `trial` state with `trial_ends_at`. `SPEC.md` §5 flags the merchant-side gating as **"specified but not yet designed"** — so even the handoff does not have this screen.
4. **Per-product Canva template themes (`product_templates`).** A blank base plus N designed themes, each with preview image, Canva URL, sort order and a derived publish status; surfaced as the Plantillas/En blanco tabs in Crear Producto step 2. Code has two scalar URL columns and a `theme_labels` JSON array with no Canva link.
5. **The "Inspírate" gallery.** A `products.inspiration` array of up to 4 images, 4 admin upload slots, and a prev/next carousel on the PDP.
6. **Merchant-side product hard delete.** Danger zone in the edit sheet plus a confirm dialog, with the requirement that `order_items` keep their name/label/price snapshots. Code exposes only an active/inactive toggle.
7. **The label lightbox with "Descargar PNG" in Admin Órdenes**, and label thumbnails on the order rows themselves.
8. **Admin merchant lifecycle actions:** "Regalar un mes de Esencial" / "Extender mes gratis", the mailto contact action, and the order-count + lifetime-volume columns.
9. **A distinct "Pago vencido" status**, separate from "Gratis" — lapsed payer vs never-paid. Not expressible in the current `PlanStatus` enum.
10. **Product availability as two independent axes:** visibility (`activo | desactivado | archivado`) × badge (`nuevo | próximamente | agotado`). Code has `is_active` + `is_new`; there is no archive state and no out-of-stock or coming-soon badge.
11. **A fourth product category, "Cuidado personal".** Code's `ProductCategory` enum is `supplements | cosmeticos | cafe`.
12. **Clickable stat cards as filters** on merchant Órdenes (2×2), Admin Órdenes (4-up) and Admin Comerciantes (4-up), each with live counts.
13. **The 330px blue wholesale promo card** on the merchant orders page.
14. **The congratulations modal** after a successful mockup render.
15. **The "Pedir muestra" modal on the PDP** — 2 steps, quantity + contact/delivery, summarised as "Producto blanco, sin etiqueta". A sample *action* exists in code (`createSampleOrderAction`), but there is no PDP entry point and no sample order kind.
16. **A toast system.** Ink pill, bottom-center, green check, 2.6s auto-dismiss, after every admin action. `sonner` is installed but never mounted.
17. **Admin reopen of a cancelled order** (state 0 → 1), and the always-visible "Rechazar orden" with a step-back link.
18. **Realtime** on `orders` driving both the admin list and the merchant dot without a reload (`BUILD-ORDER.md` Step 9 acceptance check). Today both sides require a refresh.
19. **"Cancelar solicitud"** on a pending Shopify connection request, and an **expiry date** on the generated install link.

---

## 4. Screens in code that the handoff does NOT cover

These have no design file, no `SCREENS.md` section and no `BUILD-ORDER.md` step. Building strictly to the handoff deletes them.

**Authentication and onboarding — 11 routes, entirely absent**

1. `/login` — `app/(auth)/login/page.tsx`
2. `/register` — `app/(auth)/register/page.tsx`
3. `/onboarding/quien-eres`
4. `/onboarding/producto`
5. `/onboarding/estilo`
6. `/onboarding/turno`
7. `/onboarding/listo` — the five-step marketing wizard, backed by 86 MB of bespoke imagery in `public/onboarding/`
8. `/onboarding/plan` — plan selection
9. `/onboarding/payment` — Wompi card capture
10. `/onboarding/payment/resultado` — payment result
11. `/suspended` — the account-suspended screen the merchant layout redirects to

**Merchant app**

12. `/dashboard` (**Inicio**) — the merchant home. The sidebar in `Configuracion Tiendas.dc.html` renders an "Inicio" nav item, but no design file exists for the page it opens. `SCREENS.md`'s shell description omits Inicio from the nav altogether.
13. `/labels` — the merchant label library and upload form (`merchant_labels`)
14. `/settings` → **General** tab
15. `/settings` → **Seguridad** tab (`security-form.tsx`, password change)
16. `/settings/profile` — profile editing
17. `/settings/billing` — plan switcher, change payment method, cancel subscription, revert cancel, cancel pending downgrade, charge history
18. `/orders/[id]/pay` — the Wompi payment screen (card / PSE / Nequi)
19. `/orders/[id]/pay/resultado` — payment result
20. `/orders/[id]/resultado` — order transaction result
21. `/products/[id]/edit` — the separate edit route
22. **Publish-to-Shopify** on `/products/[id]` (`publish-to-shopify-button.tsx`, `publishToShopifyAction`, `reconnectInventoryAction`)

**Admin app**

23. `/admin/dashboard` — admin home with stats and recent orders. The admin nav in the designs is only Productos · Órdenes · Comerciantes; the code's sidebar has six items.
24. `/admin/labels` — **the label approval queue.** `Crear Producto.dc.html` step 3 says "Revisamos legibilidad y sangrado antes de imprimir", but no screen exists for doing that review, and `SPEC.md` never models label status.
25. `/admin/settings` — platform settings (`platform_settings` table, dashboard config)
26. `/admin/shopify` — **the admin side of the Tiendas flow.** The designed merchant screen has a pending state that resolves to a ready install link, which requires this queue. The queue itself is undesigned.
27. `/admin/orders/new` — admin-created manual order

**Public**

28. `/` — the root redirect
29. `/privacidad` — privacy policy (a Shopify app-store requirement)
30. `/terminos` — terms of service

**Systems with no design surface**

31. The whole **Shopify integration**: OAuth handshake, order-ingest webhook, fulfillment service registration, fulfillment-order webhooks, the three GDPR compliance webhooks, and pushing tracking back to Shopify on ship. `SPEC.md` §7 does not list Shopify as an integration at all, though `reference/flujo-ordenes.pdf` requires it.
32. **Subscription billing**: the daily `/api/cron/billing` renewal charge, `past_due` handling, `pending_plan` downgrades, `plan_cancel_at`.
33. **Wompi PSE and Nequi payment methods.** `SPEC.md` §7.4 says "Prepago via PSE / Nequi / transferencia" in one line; the three built payment screens are undesigned.

---

## 5. Ambiguities needing Adam's answer

Ordered by how much work is blocked.

**Q1 — Is this a rebuild or a redesign?**
`START-HERE.md` and `BUILD-ORDER.md` describe a greenfield build: `npx create-next-app`, JSON-file data layer, Supabase deferred to Step 13. A working Next.js 16 + Supabase + Wompi + Shopify application already exists with 41 page routes. Everything else on this list depends on the answer. If it is a redesign, `BUILD-ORDER.md` needs re-sequencing against the existing schema and the 30 undesigned screens in §4 need a decision each. If it is a rebuild, that is a months-long project and the existing Shopify, billing and payment integrations must be re-specified before it starts.

**Q2 — Is Shopify in or out?**
`SPEC.md` §7 lists Supabase, Sudomock, Canva, payments and email, and omits Shopify entirely; its `orders` table has no store-origin column. But `Configuracion Tiendas.dc.html` is a full Shopify connection screen, `Order Flow.dc.html` tags orders `src: 'Shopify' | 'PA'` with an SH/PA badge, and `reference/flujo-ordenes.pdf` states that orders arrive from Shopify and "los pedidos deben actualizarse en Shopify cuando se envíen o entreguen". Shopify is roughly a third of the current codebase. If it stays, `SPEC.md` §2.5 needs a source column and §7 needs a Shopify section.

**Q3 — Which pricing model is live: plan-based or quantity-based?**
Code gives `plus` merchants a flat −18% on every unit. The handoff gives `esencial` merchants full access, and moves the discount to order quantity (−6 / −12 / −18% at 25 / 100 / 300 units). These are different businesses. Related and equally blocking: does `starter`/`plus` map onto `free`/`esencial`, and what happens to merchants currently on `plus` at $X/month when the price becomes $119.000 COP?

**Q4 — How many order kinds are there?**
`SPEC.md` §2.5 says two: `dropshipping | wholesale`. But `Detalle Producto.dc.html` ships a live "Pedir muestra" modal, `Order Form.dc.html` carries a disabled third branch (`isWhite`, hardcoded `false` at line 301) labelled "Muestra" with the copy "Preparamos tu muestra sin etiqueta y te cotizamos el envío. La verás en Órdenes con estado **'En revisión'**" — a state that is not in the 0–6 machine. Code already has `createSampleOrderAction`. Three sources, three different answers.

**Q5 — Does the label approval step survive?**
`Crear Producto.dc.html` step 3 promises "Revisamos legibilidad y sangrado antes de imprimir", but the handoff has no admin screen for that review, and `SPEC.md`'s `merchant_products` has no status column. Code is already ambiguous here: `app/(merchant)/products/[id]/actions.ts:38` auto-sets `label_status: 'approved'` on upload, while a separate `merchant_labels` table runs a real pending/approved/rejected queue at `/admin/labels`. This question was already open in `CODE-AUDIT-2026-08.md` §8.5(d); the handoff does not resolve it and adds a third position.

**Q6 — Unlimited mockup regeneration, or six per month?**
`Crear Producto.dc.html` promises "Intentos ilimitados hasta que te guste". Code enforces `MOCKUP_LIMIT = 6` per merchant per month against a metered SudoMock account. The copy is a commercial commitment against a per-render cost. Either the limit rises and the cost is modelled, or the copy changes.

**Q7 — Do structured supplement facts survive?**
The admin editor in the design reduces ficha content to four plain textareas (descripción, modo de uso, advertencias, ingredientes). Code has three structured array editors — `supplement-facts-editor` (serving size, servings per container, indented rows with %DV), `benefit-blocks-editor`, `science-facts-editor` — rendering a real Supplement Facts panel on the PDP. For a supplements manufacturer that panel is a labelling-compliance artifact, not decoration. Confirm the simplification is intended.

**Q8 — What is the label upload limit?**
Design copy says PNG, 300 dpi, **max 20 MB**. Code rejects over **2 MB** (`label-upload-form.tsx:24`) and accepts any `image/*`. A print-resolution PNG will routinely exceed 2 MB, so the current limit may already be hurting merchants. Confirm the real limit and whether PNG-only should be enforced.

**Q9 — What happens to onboarding?**
The five-step wizard (`/onboarding/quien-eres` → `producto` → `estilo` → `turno` → `listo`) plus plan and payment steps is 11 routes backed by 86 MB of custom imagery in `public/onboarding/`. The handoff does not mention it. `SPEC.md` §5 says only "Signup lands on Gratis." Keep, cut, or redesign?

**Q10 — Which admin nav is correct?**
The designs show three items (Productos · Órdenes · Comerciantes). Code has six (Dashboard · Órdenes · Productos · Etiquetas · Merchants · Configuración). Dropping to three removes the admin dashboard, the label queue, the platform settings screen and the Shopify request queue — the last of which the designed merchant Tiendas screen actively depends on.

**Q11 — Is the payouts store a real feature?**
`designs/order-store.js` implements `loadPayouts` / `addPayout` / `updatePayout` against a `lablld.payouts.v1` key. No design file, no document, and no code references it. Either a planned merchant-payouts feature was cut, or it is leftover scaffolding. Worth one sentence before someone builds it by inference.

**Q12 — Where should the design bundle live?**
`design_handoff_lablld_dashboard/` is currently **untracked**. This inventory commits only itself, not the source folder. The folder is 1.9 MB and includes two `.DS_Store` files and a 751 KB Shopify logo rendered at ~28px. If it should be versioned, it should be added deliberately, `.DS_Store` excluded, and probably placed under `docs/` rather than the repo root.

**Q13 — Minor, but they will cost time if left:**
- `SCREENS.md`'s shared shell omits **Inicio** from the merchant nav; `Configuracion Tiendas.dc.html` includes it. Which is right?
- Merchant sidebar width is **260px** in `SCREENS.md` and `BUILD-ORDER.md`, but **264px** in `Configuracion Tiendas.dc.html`.
- `README.md` and `START-HERE.md` both describe `reference/` as an "earlier catalog/PDP spec". It is an order-flow diagram, and the only document naming Wompi.
- `Configuracion Tiendas.dc.html` has no `SCREENS.md` section and no `BUILD-ORDER.md` step, so a reader following the build order never builds it.
- The logo asset is named `labdll-logo.png` — transposed letters.

---

## Appendix — verification

Read in full: all 5 markdown documents, all 10 `.dc.html` prototypes, all 3 `.js` runtime files, and both pages of `reference/flujo-ordenes.pdf`. Image assets inventoried by filename and size only. Code claims in §2 and §4 were checked against the working tree at `4c2deae`; file and line references are to that commit. No network calls, no build, no code changes.
