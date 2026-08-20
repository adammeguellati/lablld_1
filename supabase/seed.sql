-- =============================================================================
-- LABLLD — seed
-- =============================================================================
-- Minimal development seed. Run AFTER 0001_initial_schema.sql and
-- 0002_rls_policies.sql. Idempotent: safe to re-run.
--
-- NOT APPLIED ANYWHERE. Syntax-validated against a throwaway local Postgres 16
-- container only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Admin
--
-- There is no admin profile row to seed. The application deliberately gives
-- admins NO row in `merchants` — an admin is identified purely by their email
-- appearing in the ADMIN_EMAILS environment variable (lib/utils.ts:37-40), and
-- app/(merchant)/layout.tsx:14 redirects any such user out of the merchant app
-- before it ever looks them up. So the role row below is the entire admin record.
--
-- THE AUTH USER IS NOT CREATED HERE. Create adam@lablld.com through the Supabase
-- dashboard (Authentication → Users → Add user) or the Admin API. SQL cannot
-- safely fabricate an auth.users row: the encrypted password, identity record
-- and confirmation timestamps are internal to GoTrue and writing them by hand
-- produces an account that fails to log in.
--
-- Two things must then be true for this account to work as an admin:
--   1. this row exists, so the database-side RLS policies recognise it, and
--   2. ADMIN_EMAILS contains the same address, so the application does too.
-- Both. Neither one alone is enough. See 0002_rls_policies.sql.
-- -----------------------------------------------------------------------------
insert into admin_emails (email)
values ('adam@lablld.com')
on conflict (email) do nothing;

-- -----------------------------------------------------------------------------
-- Sample products
--
-- One per value of the product_category enum, so the catalog's category filter
-- (components/merchant/catalog-filters.tsx) has something in every bucket.
-- Prices are placeholders in COP. `available_tiers` gates catalog visibility by
-- plan; both tiers are granted so either plan can see all three.
--
-- created_by is left NULL: it references auth.users and no user exists yet at
-- seed time. The column is nullable precisely because types/index.ts:117
-- declares it `string | null`.
-- -----------------------------------------------------------------------------
insert into products (
  slug, name, sku, category, format,
  short_description, description,
  base_price, price_cop, suggested_retail_price_cop, wholesale_price_usd,
  stock, available_tiers, images, icons,
  serving_size, servings_per_container,
  ingredients_list, suggested_use, warning,
  manufacturer_country, product_weight_g, gross_weight_g, shipping_scope,
  is_active, is_new
)
values
  (
    'creatina-monohidratada-300g',
    'Creatina Monohidratada 300 g',
    'LAB-SUP-CRE-300',
    'supplements',
    'powder',
    'Creatina monohidratada micronizada, sin sabor.',
    'Creatina monohidratada micronizada de grado farmacéutico. 60 porciones de 5 g.',
    48000, 48000, 119000, 12.00,
    250,
    '{starter,plus}',
    '{}',
    '{}',
    '5 g', 60,
    'Creatina monohidratada micronizada (100 %).',
    'Mezcla 5 g en 250 ml de agua una vez al día.',
    'Consulta a tu médico si estás embarazada o en lactancia.',
    'Colombia', 300, 380, 'nacional',
    true, true
  ),
  (
    'serum-vitamina-c-30ml',
    'Sérum Vitamina C 30 ml',
    'LAB-COS-VTC-030',
    'cosmeticos',
    'serum',
    'Sérum facial antioxidante con vitamina C estabilizada al 15 %.',
    'Sérum facial de vitamina C estabilizada al 15 % con ácido hialurónico. Uso diario.',
    62000, 62000, 149000, 15.50,
    120,
    '{starter,plus}',
    '{}',
    '{}',
    null, null,
    'Agua, ácido ascórbico (15 %), ácido hialurónico, glicerina.',
    'Aplica 3 a 4 gotas sobre el rostro limpio, en la mañana.',
    'Solo para uso externo. Evita el contacto con los ojos.',
    'Colombia', 30, 95, 'nacional',
    true, false
  ),
  (
    'cafe-arabica-molido-340g',
    'Café Arábica Molido 340 g',
    'LAB-CAF-ARA-340',
    'cafe',
    'ground',
    'Café arábica de origen colombiano, tueste medio.',
    'Café 100 % arábica de origen colombiano, tueste medio, molido para filtro.',
    32000, 32000, 79000, 8.00,
    400,
    '{starter,plus}',
    '{}',
    '{}',
    null, null,
    'Café arábica 100 % colombiano.',
    'Usa 20 g por cada 300 ml de agua a 92 °C.',
    null,
    'Colombia', 340, 400, 'nacional',
    true, false
  )
on conflict (slug) do nothing;
