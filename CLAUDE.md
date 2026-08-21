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
- **Wompi**: suscripciones mensuales y cobros por orden, en COP
- Shopify: OAuth + Webhooks
- **SudoMock**: generación de mockups 3D (`lib/sudomock.ts`)
- **Resend**: correo transaccional (`lib/email.ts`)
- Tailwind CSS + shadcn/ui v4 (usa @base-ui/react, NO Radix)
- Zod v4 para validación
- Vercel para hosting y el cron diario de facturación

### Ya NO forman parte del stack

Cualquier documento que los mencione está desactualizado.

- **Stripe** — eliminado por completo el 2026-08-21: código, dependencias,
  variables de entorno, endpoint de webhook y columnas. Los pagos son Wompi.
- **Dynamic Mockups** — reemplazado por SudoMock. `lib/dynamic-mockups.ts` y
  `/api/mockups/generate` fueron borrados.
- **Envia.com** — `lib/envia.ts` estaba escrito pero no lo importaba nada.
  Borrado. El envío se cotiza por orden desde el panel admin.

## Roles del sistema
- merchant: cliente de la plataforma, conecta su Shopify
- admin: operador interno, gestiona catálogo, aprueba etiquetas y maneja fulfillment

## Variables de entorno

`.env.example` es la fuente de verdad: cada variable está anotada con qué la lee,
si hace falta en BUILD o en RUNTIME, y si es REQUIRED u OPTIONAL. Lo de abajo es
el índice, no el detalle.

```
NEXT_PUBLIC_SUPABASE_URL=               ← REQUIRED
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   ← REQUIRED (antes anon key)
SUPABASE_SECRET_KEY=                    ← REQUIRED (antes service_role key)

NEXT_PUBLIC_WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_EVENTS_SECRET=
WOMPI_STARTER_PRICE_COP=
WOMPI_PLUS_PRICE_COP=

SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_WEBHOOK_SECRET=
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_fulfillments
SHOPIFY_WEBHOOK_BASE_URL=               ← túnel en dev; cae a NEXT_PUBLIC_APP_URL

SUDOMOCK_API_KEY=                       ← el proveedor de mockups vigente

RESEND_API_KEY=
RESEND_FROM_EMAIL=

CRON_SECRET=                            ← protege /api/cron/billing

NEXT_PUBLIC_APP_URL=                    ← REQUIRED
ADMIN_EMAILS=                           ← REQUIRED, es TODO el mecanismo de admin

NEXT_PUBLIC_SUPPORT_WHATSAPP=           ← OPTIONAL, cae al valor anterior
NEXT_PUBLIC_HELP_CENTER_URL=            ← OPTIONAL, cae al valor anterior
```

## Convenciones técnicas críticas

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
- **Clientes de terceros lazy**: nunca instanciar a nivel de módulo. Un
  constructor que lanza con la key ausente rompe la ruta al importarla, no al
  usarla (fue INC-02). `lib/email.ts` es el patrón.
- **Server Actions con formularios**: usar `useActionState` de React 19
  → firma: `(prevState: State, formData: FormData) => Promise<State>`
- **`console.*` es error de lint.** Exactamente un archivo puede escribir a
  stderr: `lib/ops-report.ts`. Todo lo que necesite reportar pasa por ahí.
- **Un límite mostrado lee la constante que lo aplica**, nunca un literal en una
  frase. Ver `lib/limits.ts`. Un límite escrito dos veces terminará estando mal
  en uno de los dos lugares, y la copia es siempre la mitad que se pudre.
- **Node 22.x**, fijado en `engines` y `.nvmrc`.
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

1. Merchant se registra → Supabase Auth → fila en `merchants`
2. Escoge plan (starter/plus) → Wompi guarda la fuente de pago
3. `completeOnboardingAction` → `merchant.plan` queda seteado; el cron diario
   (`/api/cron/billing`) cobra la renovación cada 30 días
4. Merchant navega catálogo → ve precio según tier → entra al detalle → sube etiqueta → `label_status: 'pending'`
5. Admin aprueba o rechaza etiqueta con razón desde `/admin/labels`
6. Etiqueta aprobada → merchant conecta Shopify via OAuth desde `/settings/shopify`
7. Exporta producto a Shopify desde `/products/[id]`
8. Cliente compra → webhook `orders/create` → responde 200 inmediatamente → procesa en background:
   - Calcula costo: `base_price + shipping_rate` por país × cantidad
   - Guarda orden en `orders` + items en `order_items`
   - Cobra al merchant via Wompi → orden queda `paid` o `payment_failed`
9. Admin ve orden en `/admin/orders` → marca `in_production` → agrega tracking → marca `shipped`
   - Al marcar shipped: registra fulfillment en Shopify → cliente recibe notificación
10. SudoMock genera el mockup 3D, con un tope de MOCKUP_LIMIT renders por
    merchant por mes (`lib/limits.ts`)

**OJO, el paso 4 no es lo que parece.** `saveMerchantProductAction` pone
`label_status: 'approved'` al subir, así que la cola de `/admin/labels` corre
sobre la tabla `merchant_labels`, no sobre `merchant_products`. Las dos
posiciones conviven y la contradicción sigue abierta en `PROD-label-approval-fork`.

## Lógica de precios por tier

- **Starter**: ve `wholesale_price_usd` sin cambios
- **Plus**: ve `wholesale_price_usd * (1 - 0.18)` calculado dinámicamente, nunca guardado en DB
- **Sin sesión / plan null**: muestra botón "Ver precio" → redirige a `/login`
- Función: `calculateMerchantPrice(wholesalePrice, plan)` en `lib/utils.ts`
- Constante `PLUS_DISCOUNT = 0.18` — ajustar si el cliente quiere otro %
- Si `wholesale_price_usd` es null en DB → fallback a `base_price`

## Decisiones técnicas tomadas

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
Privado desde la migración 0003; 10 MB y allowlist de MIME desde 0004. El valor
2 MB que decía esta nota era de uno de los dos uploaders y ya no existe: los dos
leen `LABEL_MAX_MB`.

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
de inmediato y procesar la orden (DB + cobro Wompi) en background.

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

### Gestión de planes — sobre Wompi, no sobre suscripciones del proveedor
Wompi no tiene un objeto "suscripción": el ciclo lo lleva la propia base de datos
y lo ejecuta el cron diario. `subscription_next_billing_at` es el reloj.

- **Upgrade / downgrade**: se guarda `pending_plan`; el cron lo aplica al cobrar
  la siguiente renovación.
- **Cancelar downgrade**: borra `pending_plan`.
- **Cancelar suscripción (merchant)**: `plan_cancel_at`; el cron limpia el plan
  al llegar la fecha, así que conserva el acceso hasta fin de ciclo.
- **Cancelar suscripción (admin)**: inmediato, y borra la fuente de pago.
- **Sin tarjeta y vencido**: el cron lo marca `past_due`.
- Confirmaciones con advertencia antes de cada acción de plan.

### Admin merchants — gestión completa
- `/admin/merchants`: tabla con plan, estado, `pending_plan` programado, badge "Suspendido"
- Suspender/reactivar: toggle `is_active` → merchant ve página `/suspended`
- Cancelar suscripción: inmediata, limpia plan y borra `wompi_payment_source_id`
- Eliminar: borra órdenes, items, tiendas, productos y etiquetas del merchant,
  luego `merchants`, luego `auth.admin.deleteUser()`, y por último barre los
  objetos de storage huérfanos (`lib/storage-cleanup.ts`)

### Cron de facturación — `/api/cron/billing`, diario 13:00 UTC
Reemplaza lo que en Stripe habrían sido webhooks de suscripción.

- Autenticado con `CRON_SECRET` en `Authorization: Bearer`, comparado en tiempo
  constante y **fail-closed si la variable no está**.
- Cobra a quien tenga `subscription_next_billing_at <= hoy` y fuente de pago.
- Aplica `pending_plan`, aplica `plan_cancel_at`, marca `past_due` a quien falle
  o no tenga tarjeta.
- **Devuelve HTTP 500 si algún cobro falló**, para que el monitor de crons de
  Vercel lo vea. Un 200 con todo fallando era el bug original.

## Estado actual — Fase 1 COMPLETADA + QA ✓ (primer commit a develop)

### Todos los bloques completados ✓
- [x] Setup inicial: estructura, tipos, lib/, proxy
- [x] Bloque 1: Auth + onboarding + suscripciones
- [x] Bloque 2: Catálogo + shipping rates + subida de etiqueta
- [x] Bloque 3: Aprobación de etiquetas (admin) + Shopify OAuth + exportar producto
- [x] Bloque 4: Webhooks Shopify + cobro automático
- [x] Bloque 5: Dashboards + órdenes + fulfillment + facturación
- [x] QA + fixes: auth redesign, plan management, imagen productos, admin merchants

### Archivos

El inventario de archivos que vivía aquí quedó obsoleto: nombraba
`app/api/webhooks/stripe/route.ts`, `lib/stripe.ts`, `lib/envia.ts`,
`lib/dynamic-mockups.ts` y otros veinte archivos que ya no existen.

Un listado a mano de un árbol que cambia todas las semanas se pudre, y mientras
tanto miente con la autoridad de un documento. El árbol se lee del árbol; el
README tiene el mapa por carpetas, que sí sobrevive a un refactor.

**Lo que sí conviene saber y no se ve leyendo carpetas:**

- `proxy.ts` — Next 16 renombró `middleware.ts`; la función se exporta `proxy`.
- `lib/supabase/safe.ts` — envuelve los factories que lanzan con env ausente.
  Relanza los throws de control de Next (llevan `digest`); atraparlos es un bug
  disfrazado de resiliencia.
- `lib/limits.ts`, `lib/order-status.ts`, `lib/product-category.ts` — cada
  vocabulario o límite que se muestra en pantalla vive en uno de estos tres.
- `lib/ops-report.ts` — el único archivo que puede escribir a stderr.
- `components/shared/label-thumb.tsx` — toda miniatura de etiqueta pasa por acá,
  porque un PDF es un formato aceptado y no se ve en un `<img>`.

## Supabase — tablas (todas creadas ✓)

```
merchants         id, email, full_name, wompi_payment_source_id,
                  subscription_next_billing_at,
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
                  custom_name, retail_price, is_published, deleted_at

shopify_stores    id, merchant_id, shop_domain, access_token, webhook_id

orders            id, merchant_id, shopify_order_id, shopify_order_number,
                  customer_name, customer_email, shipping_address,
                  status, fulfillment_cost, fulfillment_fee_cop,
                  shipping_cost_cop, estimated_delivery,
                  tracking_number, carrier, notes, shipped_at,
                  created_at, updated_at

order_items       id, order_id, merchant_product_id,
                  product_name, quantity, unit_price

shipping_rates    id, product_id, country, country_code, rate
```

## Supabase Storage — buckets

```
labels            PRIVADO desde 0003. Se lee con createSignedUrl, nunca con
                  getPublicUrl. path: {merchantId}/{productId}/{timestamp}.{ext}
                  RLS: lectura owner-or-admin (0003)
                  Límite 10 MB + allowlist MIME en el bucket (0004), no solo en
                  el cliente. La copia lo lee de LABEL_MAX_MB en lib/limits.ts

product-images    público, para imágenes de productos (subidas por admin)
                  path: {timestamp}-{random}.{ext}
                  RLS: INSERT para authenticated (política manual en dashboard)
                  Límite: 5MB validado en cliente únicamente
```

## OrderStatus — valores y labels

```ts
pending        → 'Pendiente'     // orden recibida, sin cobrar
paid           → 'Pagada'        // cobro Wompi exitoso
payment_failed → 'Pago fallido'  // cobro Wompi falló
in_production  → 'En producción' // admin procesando
shipped        → 'Enviada'       // tracking subido + fulfillment en Shopify
delivered      → 'Entregada'
cancelled      → 'Cancelada'
```

## Estado

Fase 1 completa. W1-W4 (2026-08) rehicieron el sistema visual completo, quitaron
Stripe, Dynamic Mockups y Envia, y cerraron la deuda de la auditoría.

El estado vivo está en `docs/board/lablld-board.json` y se lee desde el portal
que describe `docs/board/BOARD-SPEC.md`. Los paquetes de revisión por ola están
en `docs/reviews/`. **Este archivo describe cómo está construido el sistema; el
board dice qué falta.** Cuando los dos se contradigan, gana el board.
