-- =============================================================================
-- LABLLD — 0002_rls_policies
-- =============================================================================
-- THESE POLICIES ARE A SAFETY NET, NOT THE PRIMARY SECURITY BOUNDARY.
--
-- The application does not rely on RLS today and these policies will almost
-- never be evaluated on a table read. Nearly every server-side query in the app
-- goes through createAdminClient() (lib/supabase/admin.ts), which authenticates
-- with the service-role key and therefore BYPASSES RLS entirely. Authorization
-- is enforced in application code instead: an auth check via
-- supabase.auth.getUser(), followed by an explicit .eq('merchant_id', user.id)
-- on the query. See docs/audit/CODE-AUDIT-2026-08.md §5 ("RLS") and risk R5.
--
-- The audit found that scoping applied correctly at every merchant call site.
-- The problem is that it is the ONLY barrier: one forgotten .eq('merchant_id',…)
-- in a future edit is a cross-tenant leak with nothing behind it. That is what
-- these policies exist to catch. They are written to match the app's current
-- behaviour exactly, so enabling them should change nothing that works today.
--
-- The one place RLS IS load-bearing right now is Storage. Label and image
-- uploads run in the browser against the publishable key
-- (components/merchant/label-uploader.tsx:34 uses lib/supabase/client.ts), so
-- the storage.objects policies at the bottom of this file are enforced on every
-- upload. Get those wrong and uploads break immediately.
--
-- NOT APPLIED ANYWHERE. Syntax-validated against a throwaway local Postgres 16
-- container only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Admin identity
--
-- The application identifies an admin by matching the signed-in user's email
-- against the comma-separated ADMIN_EMAILS environment variable
-- (lib/utils.ts:37-40). Admins deliberately have NO row in `merchants`.
--
-- Postgres cannot read the application's environment, so that mechanism cannot
-- be mirrored exactly. This table is the closest faithful equivalent: the same
-- allowlist-of-emails model, relocated somewhere a policy can reach it.
--
-- OPERATIONAL CONSEQUENCE: admin_emails and the ADMIN_EMAILS env var are two
-- copies of one list and nothing keeps them in sync. Changing one without the
-- other produces a user who is an admin to the app but not to the database, or
-- the reverse. Flagged in docs/db/SCHEMA-RECONSTRUCTION-NOTES.md.
-- -----------------------------------------------------------------------------
create table admin_emails (
  email      text primary key,
  created_at timestamptz not null default now()
);

alter table admin_emails enable row level security;

comment on table admin_emails is
  'RLS support table mirroring the ADMIN_EMAILS env var (lib/utils.ts:37). Not an application table: no code reads it.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Only an existing admin may read or change the allowlist. No self-service.
create policy admin_emails_admin_all on admin_emails
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
alter table merchants         enable row level security;
alter table products          enable row level security;
alter table shipping_rates    enable row level security;
alter table merchant_products enable row level security;
alter table merchant_labels   enable row level security;
alter table shopify_stores    enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table platform_settings enable row level security;

-- -----------------------------------------------------------------------------
-- merchants
-- merchants.id IS the auth user id (app/(auth)/actions.ts:84), so ownership is a
-- direct comparison rather than a join.
-- -----------------------------------------------------------------------------
create policy merchants_select_own on merchants
  for select to authenticated
  using (id = auth.uid());

-- Mirrors updateProfileAction (app/(merchant)/settings/profile/actions.ts:13),
-- the only merchant-initiated write to this table.
create policy merchants_update_own on merchants
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- No merchants_insert_own policy: rows are created during registration by the
-- service-role client (app/(auth)/actions.ts:83-85), before a usable session
-- exists in the email-confirmation flow.

create policy merchants_admin_all on merchants
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- products / shipping_rates — the master catalog
-- The catalog is behind auth: proxy.ts:44 lists /catalog among protectedPaths
-- and app/(merchant)/catalog/page.tsx:18 filters .eq('is_active', true).
-- Anonymous users get nothing.
-- -----------------------------------------------------------------------------
create policy products_select_active on products
  for select to authenticated
  using (is_active or public.is_admin());

create policy products_admin_all on products
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Read alongside the product on the PDP
-- (app/(merchant)/catalog/[slug]/page.tsx:38 selects '*, shipping_rates(*)').
create policy shipping_rates_select on shipping_rates
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from products p where p.id = shipping_rates.product_id and p.is_active)
  );

create policy shipping_rates_admin_all on shipping_rates
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- merchant_products
-- -----------------------------------------------------------------------------
create policy merchant_products_own on merchant_products
  for all to authenticated
  using (merchant_id = auth.uid()) with check (merchant_id = auth.uid());

create policy merchant_products_admin_all on merchant_products
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- merchant_labels
-- Merchants create and read their own labels
-- (app/(merchant)/labels/actions.ts:15, app/(merchant)/labels/page.tsx:24).
-- Only an admin may change `status` or `rejection_reason`
-- (app/api/admin/labels/[id]/route.ts:37) — hence no merchant UPDATE policy.
-- -----------------------------------------------------------------------------
create policy merchant_labels_select_own on merchant_labels
  for select to authenticated
  using (merchant_id = auth.uid());

create policy merchant_labels_insert_own on merchant_labels
  for insert to authenticated
  with check (merchant_id = auth.uid());

create policy merchant_labels_admin_all on merchant_labels
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- shopify_stores
-- Rows are written only by the OAuth callback under the service role
-- (app/api/shopify/callback/route.ts:77). Merchants read their connection state
-- and disconnect (app/(merchant)/settings/shopify/actions.ts:9-18).
--
-- NOTE: `access_token` is a live Shopify offline token stored in plaintext. A
-- SELECT policy on this table hands it to the browser. The app only ever reads
-- it server-side, so consider a column-restricted view instead of widening this.
-- -----------------------------------------------------------------------------
create policy shopify_stores_select_own on shopify_stores
  for select to authenticated
  using (merchant_id = auth.uid());

create policy shopify_stores_delete_own on shopify_stores
  for delete to authenticated
  using (merchant_id = auth.uid());

create policy shopify_stores_admin_all on shopify_stores
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- orders
-- Merchants read their own and create manual/sample orders
-- (app/(merchant)/orders/new/actions.ts:34,79). Status transitions are driven by
-- webhooks and admin actions under the service role, so no merchant UPDATE
-- policy is granted: a merchant must not be able to mark their own order paid.
-- -----------------------------------------------------------------------------
create policy orders_select_own on orders
  for select to authenticated
  using (merchant_id = auth.uid());

create policy orders_insert_own on orders
  for insert to authenticated
  with check (merchant_id = auth.uid());

create policy orders_admin_all on orders
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- order_items — ownership is inherited from the parent order
-- -----------------------------------------------------------------------------
create policy order_items_select_own on order_items
  for select to authenticated
  using (exists (
    select 1 from orders o where o.id = order_items.order_id and o.merchant_id = auth.uid()
  ));

create policy order_items_insert_own on order_items
  for insert to authenticated
  with check (exists (
    select 1 from orders o where o.id = order_items.order_id and o.merchant_id = auth.uid()
  ));

create policy order_items_admin_all on order_items
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- platform_settings
-- Read by the merchant dashboard (app/(merchant)/dashboard/page.tsx:29);
-- written only by the admin settings API (app/api/admin/settings/route.ts:29).
-- -----------------------------------------------------------------------------
create policy platform_settings_select on platform_settings
  for select to authenticated
  using (true);

create policy platform_settings_admin_all on platform_settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- Storage policies
--
-- Unlike every table above, these ARE the live boundary. Uploads run in the
-- browser against the publishable key, so RLS on storage.objects is evaluated
-- on every one of them.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- labels — private in 0001. Every path begins with the owning merchant's uuid:
--   {merchantId}/{productId}/{ts}.{ext}  (components/merchant/label-uploader.tsx:35)
--   {merchantId}/brand/{ts}.{ext}        (components/merchant/label-upload-form.tsx:30)
-- so (storage.foldername(name))[1] is the owner and the whole policy set follows
-- from the path convention the code already uses.
-- -----------------------------------------------------------------------------
create policy labels_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'labels'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy labels_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'labels'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- upsert: true is passed at label-uploader.tsx:38 and label-upload-form.tsx:32,
-- which needs UPDATE as well as INSERT when the object already exists.
create policy labels_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'labels'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'labels'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy labels_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'labels'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- -----------------------------------------------------------------------------
-- product-images — public bucket, admin-only writes.
-- Paths are flat ({ts}-{rand}.{ext}) so there is no folder to scope by; the
-- admin check is the whole control.
-- -----------------------------------------------------------------------------
create policy product_images_read_all on storage.objects
  for select to public
  using (bucket_id = 'product-images');

create policy product_images_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy product_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy product_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
