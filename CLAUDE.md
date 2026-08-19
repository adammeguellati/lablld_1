# LABLLD — Contexto del proyecto

## Instrucciones generales
- Responde siempre en español
- Cero comentarios dentro del código salvo los estrictamente necesarios, en inglés
- TypeScript estricto, sin `any`
- Sin `console.log`
- Máximo 150 líneas por archivo
- Una función, una responsabilidad

## ¿Qué es esto?
Plataforma B2B de white-label fulfillment para productos de belleza
y suplementos. Los merchants se registran, personalizan productos
con su marca, conectan su tienda Shopify y nosotros manejamos el
fulfillment físico desde Colombia y República Dominicana.

## Stack
- Next.js 16 App Router + TypeScript estricto
- Supabase: base de datos + auth + storage
- Stripe: suscripciones mensuales + cobros automáticos por orden
- Shopify: OAuth + Webhooks
- Dynamic Mockups API: generación de mockups 3D (Fase 2)
- Tailwind CSS + shadcn/ui v4 (usa @base-ui/react, NO Radix)
- Zod v4 para validación
- Vercel para hosting

## Roles del sistema
- merchant: cliente de la plataforma, conecta su Shopify
- admin: operador interno, gestiona catálogo, aprueba etiquetas y maneja fulfillment

## Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   ← nueva key (antes anon key)
SUPABASE_SECRET_KEY=                    ← nueva key (antes service_role key)

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_PLUS_PRICE_ID=

SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_WEBHOOK_SECRET=
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_fulfillments

DYNAMIC_MOCKUPS_API_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAILS=email@ejemplo.com
```

## Convenciones técnicas críticas

- **Stripe apiVersion**: `'2026-02-25.clover'`
- **Shopify API version**: `2026-01`
- **Supabase relaciones**: select con joins devuelve array → castear con `as unknown as T`
- **Admin**: se identifica por `ADMIN_EMAILS` en env (comma-separated), NO tiene fila en `merchants`
- **Admin en merchant layout**: `app/(merchant)/layout.tsx` detecta admin por email → redirige a `/admin/dashboard`
- **Supabase publishable key** → browser y proxy
- **Supabase secret key** → `createAdminClient()` solo en servidor, bypassa RLS
- **shadcn v4** usa `@base-ui/react/button` — Button NO tiene `asChild`
  → usar `<Link className={buttonVariants({ variant: '...' })}>` en su lugar
- **shadcn v4 Select `onValueChange`**: pasa `string | null` → siempre wrappear: `(v) => setState(v ?? '')`
- **`buttonVariants` en Server Components**: extraer a componente separado `'use client'`
  → componente reutilizable: `components/shared/link-button.tsx`
- **Zod v4**: `z.email()` (no `z.string().email()`), errores en `.issues` (no `.errors`)
- **Stripe lazy**: nunca instanciar a nivel de módulo, usar `getStripe()` singleton
- **Server Actions con formularios**: usar `useActionState` de React 19
  → firma: `(prevState: State, formData: FormData) => Promise<State>`
- **Stripe keys al cambiar de live→test**: limpiar campos stripe en tabla `merchants`
  → SQL: `UPDATE merchants SET stripe_customer_id=NULL, stripe_payment_method_id=NULL, stripe_subscription_id=NULL, plan=NULL`
- **Sesión vieja en browser al cambiar keys**: cerrar sesión o usar incógnito
- **NEXT_PUBLIC_* vars**: requieren reiniciar el dev server para tomar efecto
- **FormEvent de React**: usar `{ preventDefault(): void; currentTarget: HTMLFormElement }` en lugar de `React.FormEvent` (deprecado en React 19)
- **Shopify scopes 2025+**: el parámetro `scope` en la URL OAuth ya NO es suficiente
  → Los scopes deben declararse en `shopify.app.toml` y pushearse con `npx shopify app config push`
  → Token `shpua_` = user access token del nuevo sistema Shopify
- **Shopify embedded**: el app debe tener `embedded = false` en `shopify.app.toml` para OAuth tradicional
- **Webhooks Shopify en dev**: requieren ngrok (HTTPS) — en localhost no llegan
- **Proxy (ex-middleware)**: Next.js 16 deprecó `middleware.ts` → renombrado a `proxy.ts`, función exportada como `proxy`
- **`after()` de Next.js**: usado en webhook Shopify para responder 200 inmediatamente y procesar en background
- **Shopify webhook secret**: para webhooks registrados programáticamente = `SHOPIFY_API_SECRET`; para webhooks del Dev Dashboard = signing secret propio

## Flujo del sistema

1. Merchant se registra → Supabase Auth → fila en `merchants` → Stripe Customer
2. Escoge plan (starter/plus) → Stripe SetupIntent → guarda tarjeta
3. `completeOnboardingAction` → crea suscripción Stripe → `merchant.plan` queda seteado
4. Merchant navega catálogo → ve precio según tier → entra al detalle → sube etiqueta → `label_status: 'pending'`
5. Admin aprueba o rechaza etiqueta con razón desde `/admin/labels`
6. Etiqueta aprobada → merchant conecta Shopify via OAuth desde `/settings/shopify`
7. Exporta producto a Shopify desde `/products/[id]`
8. Cliente compra → webhook `orders/create` → responde 200 inmediatamente → procesa en background:
   - Calcula costo: `base_price + shipping_rate` por país × cantidad
   - Guarda orden en `orders` + items en `order_items`
   - Cobra al merchant via Stripe → orden queda `paid` o `payment_failed`
9. Admin ve orden en `/admin/orders` → marca `in_production` → agrega tracking → marca `shipped`
   - Al marcar shipped: registra fulfillment en Shopify → cliente recibe notificación
10. (Fase 2) Dynamic Mockups genera mockup 3D tras aprobación

## Lógica de precios por tier

- **Starter**: ve `wholesale_price_usd` sin cambios
- **Plus**: ve `wholesale_price_usd * (1 - 0.18)` calculado dinámicamente, nunca guardado en DB
- **Sin sesión / plan null**: muestra botón "Ver precio" → redirige a `/login`
- Función: `calculateMerchantPrice(wholesalePrice, plan)` en `lib/utils.ts`
- Constante `PLUS_DISCOUNT = 0.18` — ajustar si el cliente quiere otro %
- Si `wholesale_price_usd` es null en DB → fallback a `base_price`

## Decisiones técnicas tomadas

### Stripe lazy initialization (`getStripe()`)
`export const stripe = new Stripe(...)` crasheaba al importar el módulo si la key
no estaba en env. Cambiado a singleton lazy.

### Admin en carpeta `app/admin/` (no route group)
`app/(admin)/` con `app/(merchant)/` colisionaban en `/dashboard`. Admin en `app/admin/`.

### `buttonVariants` + `<Link>` en lugar de `Button asChild`
shadcn v4 no expone `asChild`. Componente reutilizable: `components/shared/link-button.tsx`.

### Onboarding forzado en MerchantLayout
Middleware valida auth. `app/(merchant)/layout.tsx` valida `merchant.plan !== null` → `/onboarding/plan`.
También detecta admin por email y redirige a `/admin/dashboard` antes de buscar en `merchants`.

### `suppressHydrationWarning` en `<body>`
Extensiones del browser modifican DOM. Fix en `app/layout.tsx`.

### Email confirmation de Supabase
En desarrollo: desactivar en Dashboard → Authentication → Email → "Enable email confirmations".

### Validación del plan (dos niveles)
- Proxy: verifica sesión activa
- `app/(merchant)/layout.tsx`: verifica admin email → verifica `merchant.plan !== null`

### Supabase Storage bucket `labels`
Bucket público `labels`. Path: `{merchantId}/{productId}/{timestamp}.{ext}`.
RLS policies requeridas: INSERT/SELECT/UPDATE para authenticated sobre bucket `labels`.
Límite de 2MB por archivo validado en el cliente antes de subir.

### `merchant_products` — upsert con lógica de label_status
Solo resetea `label_status` a `'pending'` si `label_url` cambió.

### Catálogo con filtros por URL (searchParams)
Filtrado server-side. `CatalogFilters` es Client Component que actualiza URL con `router.push()`.
Envuelto en `<Suspense>` para que `useSearchParams()` funcione sin errores SSR.

### Página de detalle `/catalog/[slug]`
Busca por UUID → `eq('id', slug)` o por slug → `eq('slug', slug)` (detecta con regex).
`ProductGallery` (cliente), `ProductDetailTabs` (cliente), `SupplementFactsPanel` (puro).

### Botón "Publicar en Shopify" en `/products/[id]`
Visible solo cuando: tienda conectada + `label_status === 'approved'`.
Acción en `app/(merchant)/catalog/[slug]/actions.ts` → `publishToShopifyAction`.
Después de publicar muestra "Ver en Shopify →" con link al admin de Shopify.

### Shopify OAuth — scopes en 2025+
El parámetro `scope` en la URL OAuth es ignorado por Shopify si el app no declara los scopes
en `shopify.app.toml`. Solución: crear `shopify.app.toml` con `[access_scopes]` y correr
`npx shopify app config push`. El token resultante es de tipo `shpua_` (nuevo formato 2024+).

### Shopify webhook — respuesta inmediata con `after()`
Shopify exige respuesta en 5 segundos. Se usa `after()` de Next.js 16 para responder 200
de inmediato y procesar la orden (DB + Stripe) en background.

### Shopify webhooks en desarrollo — ngrok obligatorio
Shopify no puede enviar webhooks a `localhost`. Para probar en dev:

**Arranque completo del proyecto con webhooks:**
```bash
# Terminal 1 — exponer puerto 3000 con HTTPS
ngrok http 3000
# Ngrok muestra: Forwarding https://abc123.ngrok.io -> localhost:3000

# Terminal 2 — actualizar .env.local con la URL de ngrok
# NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
# Luego iniciar el servidor
npm run dev
```

**La URL de ngrok cambia cada sesión (plan gratuito). Cada vez hay que:**
1. Correr `ngrok http 3000` → copiar la URL nueva
2. Actualizar `NEXT_PUBLIC_APP_URL` en `.env.local`
3. Correr `npm run dev`
4. En LABLLD: desconectar y reconectar tienda Shopify desde `/settings/shopify`
   (re-registra el webhook con la nueva URL)

**Sin ngrok**: webhooks no llegan, órdenes no se guardan. Todo lo demás funciona normal.

### Shopify — una tienda por merchant
`shopify_stores` tiene `UNIQUE(shop_domain)`. El callback valida que el dominio no esté
tomado por otro merchant → redirige a `/settings/shopify?error=store_already_connected`.

### Shopify fulfillment al marcar enviado
`markShippedAction` en `app/admin/orders/[id]/actions.ts` llama a `createFulfillment` de Shopify.
Si falla (ej. orden ya fulfilleda), el error es no-fatal — igual actualiza el status en DB.

### Sidebar merchant con sub-items de Configuración
`/settings` no tiene página propia. Sidebar muestra sub-items directamente:
"Tienda Shopify" → `/settings/shopify` y "Facturación" → `/settings/billing`.

### Formulario admin dividido en editores especializados
`ProductForm` orquesta estado + submit. Editores de arrays (`SupplementFactsEditor`,
`BenefitBlocksEditor`, `ScienceFactsEditor`, `ShippingRatesEditor`) manejan su propio estado
interno y notifican al padre con el objeto completo vía `onChange`.

### next.config.ts — remotePatterns para Supabase Storage + Unsplash
`next/image` requiere dominios whitelisted. Agregados `*.supabase.co` e `images.unsplash.com`.

### Tailwind resolution loop en monorepo
Si hay carpeta padre sin `node_modules/tailwindcss`, webpack/turbopack entra en loop.
Fix: alias explícito en `next.config.ts` apuntando a `path.resolve(__dirname, 'node_modules/tailwindcss')`.

### Gestión de planes — lógica completa
- **Upgrade Starter → Plus**: `always_invoice` en Stripe → cobra prorrateo inmediato → plan en DB al instante
- **Downgrade Plus → Starter**: solo `pending_plan` en DB, Stripe sigue en Plus; al renovar (`invoice.paid`) se aplica el cambio
- **Cancelar downgrade**: borra `pending_plan`, Stripe sin cambios
- **Cancelar suscripción (merchant)**: `cancel_at_period_end: true` en Stripe → guarda `plan_cancel_at` en DB → acceso hasta fin de ciclo → webhook `customer.subscription.deleted` limpia plan
- **Cancelar suscripción (admin)**: cancelación inmediata en Stripe
- Confirmaciones con advertencia antes de cada acción de plan

### Admin merchants — gestión completa
- `/admin/merchants`: tabla con plan, estado, `pending_plan` programado, badge "Suspendido"
- Suspender/reactivar: toggle `is_active` → merchant ve página `/suspended`
- Cancelar suscripción: cancelación inmediata en Stripe + limpia plan en DB
- Eliminar: cancela Stripe + delete en `merchants` + `auth.admin.deleteUser()`

### Webhooks Stripe — eventos cubiertos
- `invoice.paid` con `subscription_create`: backup para setear plan si action falló
- `invoice.paid` con `subscription_cycle`: aplica `pending_plan` si existe
- `invoice.payment_failed`: setea `plan_status = 'past_due'`
- `customer.subscription.updated`: sincroniza plan y plan_status
- `customer.subscription.deleted`: limpia `plan`, `pending_plan`, `plan_cancel_at`, setea `cancelled`

## Estado actual — Fase 1 COMPLETADA + QA ✓ (primer commit a develop)

### Todos los bloques completados ✓
- [x] Setup inicial: estructura, tipos, lib/, proxy
- [x] Bloque 1: Auth + onboarding + Stripe suscripciones
- [x] Bloque 2: Catálogo + shipping rates + subida de etiqueta
- [x] Bloque 3: Aprobación de etiquetas (admin) + Shopify OAuth + exportar producto
- [x] Bloque 4: Webhooks Shopify + Stripe + cobro automático
- [x] Bloque 5: Dashboards + órdenes + fulfillment + facturación
- [x] QA + fixes: auth redesign, plan management, imagen productos, admin merchants

### Archivos funcionales
```
proxy.ts                                            → auth completa por rol + onboarding protegido

app/page.tsx                                        → redirige según sesión
app/layout.tsx                                      → metadata LABLLD, suppressHydrationWarning

app/(auth)/actions.ts                               → registerAction, loginAction, logoutAction
app/(auth)/onboarding/actions.ts                    → completeOnboardingAction
app/(auth)/onboarding/layout.tsx                    → redirige a billing si ya tiene plan
app/(auth)/suspended/page.tsx                       → página cuenta suspendida por admin
app/(auth)/login/page.tsx                           ✓ (split-screen diseño)
app/(auth)/register/page.tsx                        ✓ (split-screen diseño)
app/(auth)/onboarding/plan/page.tsx                 ✓
app/(auth)/onboarding/payment/page.tsx              ✓
app/(auth)/onboarding/payment/payment-form.tsx      ✓

app/(merchant)/layout.tsx                           → verifica admin + is_active + plan
app/(merchant)/dashboard/page.tsx                   → bienvenida, plan, productos, órdenes recientes ✓
app/(merchant)/catalog/page.tsx                     → grid + filtros ✓
app/(merchant)/catalog/[slug]/page.tsx              → detalle completo ✓
app/(merchant)/catalog/[slug]/actions.ts            → publishToShopifyAction ✓
app/(merchant)/products/page.tsx                    → tabla + columna Shopify ✓
app/(merchant)/products/[id]/page.tsx               → config + botón publicar ✓
app/(merchant)/products/[id]/actions.ts             → saveMerchantProductAction ✓
app/(merchant)/orders/page.tsx                      → tabla órdenes del merchant ✓
app/(merchant)/settings/shopify/page.tsx            → conectar/desconectar tienda ✓
app/(merchant)/settings/shopify/actions.ts          → disconnectShopifyAction ✓
app/(merchant)/settings/billing/page.tsx            → plan + switcher + tarjeta + cobros + cancelar ✓
app/(merchant)/settings/billing/actions.ts          → changePlanAction, cancelSubscriptionAction,
                                                       revertCancelAction, cancelPendingPlanAction ✓

app/admin/layout.tsx                                → async, pasa email al Header
app/admin/dashboard/page.tsx                        → stats + órdenes recientes ✓
app/admin/products/page.tsx                         → tabla productos ✓
app/admin/products/new/page.tsx                     → formulario crear producto ✓
app/admin/products/[id]/page.tsx                    → formulario editar producto ✓
app/admin/labels/page.tsx                           → tabla etiquetas + aprobar/rechazar ✓
app/admin/orders/page.tsx                           → tabla órdenes con link a detalle ✓
app/admin/orders/[id]/page.tsx                      → detalle + gestión de status + tracking ✓
app/admin/orders/[id]/actions.ts                    → markInProductionAction, markShippedAction ✓
app/admin/merchants/page.tsx                        → tabla merchants + suspender/cancelar/eliminar ✓

app/api/shopify/auth/route.ts                       → genera URL OAuth + state ✓
app/api/shopify/callback/route.ts                   → intercambia code, guarda token ✓
app/api/admin/products/route.ts                     → GET + POST ✓
app/api/admin/products/[id]/route.ts                → PATCH + DELETE ✓
app/api/admin/labels/[id]/route.ts                  → PATCH aprobar/rechazar ✓
app/api/admin/merchants/[id]/route.ts               → PATCH toggle_active/cancel + DELETE eliminar ✓
app/api/webhooks/shopify/route.ts                   → orders/create → guarda + cobra ✓
app/api/webhooks/stripe/route.ts                    → invoice.paid + payment_failed +
                                                       subscription.updated/deleted ✓

components/layout/header.tsx                        ✓
components/layout/merchant-sidebar.tsx              ✓
components/layout/admin-sidebar.tsx                 → incluye link a /admin/merchants ✓
components/onboarding/plan-card.tsx                 ✓
components/shared/link-button.tsx                   ✓
components/merchant/catalog-filters.tsx             ✓
components/merchant/product-card.tsx                ✓
components/merchant/product-gallery.tsx             ✓
components/merchant/product-detail-tabs.tsx         ✓
components/merchant/supplement-facts-panel.tsx      ✓
components/merchant/label-uploader.tsx              ✓
components/merchant/product-configure-form.tsx      ✓
components/merchant/shopify-connect-form.tsx        ✓
components/merchant/publish-to-shopify-button.tsx   ✓
components/merchant/plan-switcher.tsx               → upgrade/downgrade con confirmaciones ✓
components/merchant/cancel-subscription-button.tsx  → cancelar al fin de ciclo + revertir ✓
components/admin/product-form.tsx                   → incluye image uploader ✓
components/admin/product-edit-form.tsx              → incluye image uploader ✓
components/admin/product-image-uploader.tsx         → sube a bucket product-images ✓
components/admin/supplement-facts-editor.tsx        ✓
components/admin/benefit-blocks-editor.tsx          ✓
components/admin/science-facts-editor.tsx           ✓
components/admin/shipping-rates-editor.tsx          ✓
components/admin/label-actions.tsx                  ✓
components/admin/orders-table.tsx                   ✓
components/admin/order-status-form.tsx              ✓
components/admin/merchant-actions.tsx               → suspender/reactivar/cancelar/eliminar ✓

lib/supabase/client.ts                              ✓
lib/supabase/server.ts                              ✓
lib/supabase/admin.ts                               ✓
lib/stripe.ts                                       → incluye changePlan, scheduleCancelSubscription,
                                                       revertCancelSubscription ✓
lib/shopify.ts                                      ✓
lib/utils.ts                                        ✓
shopify.app.toml                                    ✓
next.config.ts                                      → remotePatterns + turbopack/webpack alias ✓
```

### Pendiente — Fase 2
```
app/api/mockups/generate/route.ts             → Dynamic Mockups API
lib/dynamic-mockups.ts                        → integración mockups 3D
```

## Supabase — tablas (todas creadas ✓)

```
merchants         id, email, full_name, stripe_customer_id,
                  stripe_payment_method_id, stripe_subscription_id,
                  plan, pending_plan, plan_status, plan_cancel_at,
                  is_active, shopify_connected

products          id, name, slug, sku, description, short_description,
                  long_description, base_price, wholesale_price_usd,
                  category, format, available_tiers, images, icons,
                  mockup_template_id, label_area, is_active, is_new,
                  supplement_facts, benefit_blocks, science_facts,
                  ingredients_list, other_ingredients, serving_size,
                  servings_per_container, suggested_use, warning,
                  manufacturer_country, product_weight_g, gross_weight_g,
                  shipping_scope, created_by, created_at, updated_at

merchant_products id, merchant_id, product_id, label_url,
                  label_status ('pending'|'approved'|'rejected'),
                  label_rejection_reason, mockup_url,
                  shopify_product_id, shopify_variant_id,
                  custom_name, retail_price, is_published

shopify_stores    id, merchant_id, shop_domain, access_token, webhook_id

orders            id, merchant_id, shopify_order_id, shopify_order_number,
                  customer_name, customer_email, shipping_address,
                  status, fulfillment_cost, stripe_payment_intent_id,
                  tracking_number, carrier, notes, shipped_at,
                  created_at, updated_at

order_items       id, order_id, merchant_product_id,
                  product_name, quantity, unit_price

shipping_rates    id, product_id, country, country_code, rate
```

## Supabase Storage — buckets

```
labels            público, para etiquetas de merchants
                  path: {merchantId}/{productId}/{timestamp}.{ext}
                  RLS: INSERT/SELECT/UPDATE para authenticated

product-images    público, para imágenes de productos (subidas por admin)
                  path: {timestamp}-{random}.{ext}
                  RLS: INSERT para authenticated (política manual en dashboard)
                  Límite: 5MB por archivo validado en cliente
```

## OrderStatus — valores y labels

```ts
pending        → 'Pendiente'     // orden recibida, sin cobrar
paid           → 'Pagada'        // cobro Stripe exitoso
payment_failed → 'Pago fallido'  // cobro Stripe falló
in_production  → 'En producción' // admin procesando
shipped        → 'Enviada'       // tracking subido + fulfillment en Shopify
delivered      → 'Entregada'
cancelled      → 'Cancelada'
```

## Siguiente — Fase 2 (cuando el cliente lo apruebe)

1. Dynamic Mockups API — generación de mockup 3D con la etiqueta del merchant
2. Polish UI — estados vacíos, loading skeletons, toasts de confirmación
3. Deploy en Vercel — configurar env vars, dominio, webhooks con URL de producción
