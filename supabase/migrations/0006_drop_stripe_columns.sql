-- =============================================================================
-- 0006 — the Stripe columns go
--
-- Card: CODE-remove-stripe. Source: audit R2; schema notes D2/D3, whose ruling
-- was that the columns stay until the code is gone.
--
-- THE CODE IS NOW GONE. The same PR that carries this file deletes
-- app/api/webhooks/stripe/route.ts and lib/stripe.ts and removes the three
-- @stripe/* dependencies. Those two files were the ONLY readers or writers of
-- both columns below — verified by grep over app/, lib/, components/ and
-- types/, which is why the ordering rule existed and why it is now satisfied.
--
-- Billing has been Wompi for some time: merchants.wompi_payment_source_id and
-- subscription_next_billing_at are what the live cancel path writes
-- (app/api/admin/merchants/[id]/route.ts). These two columns were left behind
-- by a processor the product no longer uses.
--
-- APPLY AFTER the code PR is deployed, not before. Dropping them while the
-- webhook route is still live would make it throw on every event it handles.
-- This is the same code-first ordering 0003 used, for the same reason.
--
-- NOT REVERSIBLE IN THE WAY THE OTHERS ARE. Re-adding the columns is one
-- statement, but the VALUES are gone. If there is any chance a Stripe id is
-- still needed to reconcile an old charge, snapshot them first — one query,
-- and it costs nothing to have:
--
--   select id, email, stripe_subscription_id from merchants
--   where stripe_subscription_id is not null;
--   select id, shopify_order_number, stripe_payment_intent_id from orders
--   where stripe_payment_intent_id is not null;
--
-- NOT APPLIED BY THE EXECUTOR. Ivan applies this in the Supabase dashboard.
-- =============================================================================

-- The partial index goes with its column; Postgres would drop it along with the
-- column anyway, but naming it here keeps the intent readable in the migration.
drop index if exists merchants_stripe_subscription_id_idx;

alter table merchants
  drop column if exists stripe_subscription_id;

alter table orders
  drop column if exists stripe_payment_intent_id;

-- -----------------------------------------------------------------------------
-- Verification, after applying. Expect ZERO rows:
--
--   select table_name, column_name
--   from information_schema.columns
--   where column_name in ('stripe_subscription_id', 'stripe_payment_intent_id');
--
-- These two are the ONLY stripe_* columns the reconstructed schema has.
-- CLAUDE.md's operating notes also name merchants.stripe_customer_id and
-- merchants.stripe_payment_method_id; neither exists in 0001, so there is
-- nothing here to drop for them. That doc is stale on this point, which is worth
-- knowing before anyone writes SQL from it.
-- -----------------------------------------------------------------------------
