-- =============================================================================
-- 0005 — merchant products get a soft delete
--
-- Card: FEAT-merchant-product-delete. Ruling: Adam, 2026-08-21 — soft delete.
-- Hide it from the merchant, preserve order history, keep the restrict FK as
-- the safety net.
--
-- WHY NOT A HARD DELETE
--
-- order_items references merchant_products with ON DELETE RESTRICT, so a
-- merchant who had ever sold the product could not delete it at all: the delete
-- would fail at the database and the merchant would see an error they cannot
-- act on. Relaxing that FK to a cascade would take the order line with it and
-- silently rewrite a paid order's history. The ruling picks the third option:
-- the row stays, and the merchant stops seeing it.
--
-- THE UNIQUE CONSTRAINT DELIBERATELY STAYS AS IT IS
--
-- merchant_products_merchant_product_key is unique (merchant_id, product_id)
-- with no deleted_at in it. Six call sites resolve a row with
-- .eq(merchant_id).eq(product_id).maybeSingle(), which throws if that pair ever
-- returns two rows. Making the constraint partial (`where deleted_at is null`)
-- would let a merchant hold one live and any number of deleted rows for the
-- same product, and every one of those call sites that does NOT filter — the
-- admin reads, the order webhook — would start throwing on the second delete.
--
-- The consequence, stated rather than discovered later: re-adding a product the
-- merchant deleted REVIVES the original row, with its old label, mockup and
-- price, instead of starting a blank one. The application clears deleted_at on
-- the next save for exactly that reason.
--
-- NOT APPLIED BY THE EXECUTOR. Ivan applies this in the Supabase dashboard.
-- REVERSIBLE: drop the column. Nothing else in the schema depends on it.
-- =============================================================================

alter table merchant_products
  add column if not exists deleted_at timestamptz;

comment on column merchant_products.deleted_at is
  'Set when a merchant deletes the product from their own list. The row and its
   order history stay. Every merchant-facing read filters on deleted_at is null;
   admin reads deliberately do not, so an operator still sees everything.';

-- Merchant-facing lists filter on (merchant_id, deleted_at is null) and order by
-- created_at. A partial index matches exactly the rows those queries keep.
create index if not exists merchant_products_live_idx
  on merchant_products (merchant_id, created_at desc)
  where deleted_at is null;

-- -----------------------------------------------------------------------------
-- Verification, after applying:
--
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_name = 'merchant_products' and column_name = 'deleted_at';
--
-- Expect one row: deleted_at | timestamp with time zone | YES.
--
-- And confirm nothing was deleted on the way in — this migration must not
-- change a single existing row:
--
--   select count(*) filter (where deleted_at is null)     as live,
--          count(*) filter (where deleted_at is not null) as deleted
--   from merchant_products;
--
-- Expect deleted = 0 immediately after applying.
-- -----------------------------------------------------------------------------
