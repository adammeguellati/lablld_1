-- =============================================================================
-- 0003 — labels bucket goes private
--
-- Card: SEC-labels-bucket. Closes the last of the three conditions on launch
-- gate G5 (security-p0).
--
-- WHAT THIS CHANGES, AND WHY ORDER MATTERS
--
-- 0002 left the labels bucket public "for parity with production only", and
-- said so in a comment that ends "Do not treat this as accepted". This is the
-- migration that stops accepting it. Merchant label artwork is a customer's
-- unreleased brand design; a public bucket serves it to anyone who has, or can
-- guess, the object path, with no authentication at all.
--
-- APPLY THIS ONLY AFTER THE CODE PR IS DEPLOYED. Before that deploy, every
-- label surface renders getPublicUrl() output, which a private bucket answers
-- with 403 — the labels would silently stop rendering for merchants and for
-- admins reviewing the approval queue. The deployed code signs every read, and
-- falls back to the stored public URL if signing fails, so it is correct
-- against a public bucket AND a private one. Code first, then this.
--
-- REVERSIBLE: set public = true and restore the labels_read_all policy below.
-- The deployed code keeps working in either state, which is the point.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. The bucket flag. THIS is the control, not the policy underneath it.
--
-- While public = true, Supabase Storage serves objects over the public CDN path
-- WITHOUT evaluating storage.objects RLS at all, so no policy can restrict a
-- read. Flipping this is what makes the read policy below load-bearing.
-- -----------------------------------------------------------------------------
update storage.buckets
set public = false
where id = 'labels';

-- -----------------------------------------------------------------------------
-- 2. Reads become owner-or-admin.
--
-- labels_read_all was `for select to public using (bucket_id = 'labels')`. It
-- was written that way honestly, to mirror what the bucket flag already did
-- rather than imply a restriction that did not exist. With the flag flipped it
-- would now be the thing granting the world read access, so it goes.
--
-- Path shape is {merchantId}/... for both uploaders
-- (label-uploader.tsx:35, label-upload-form.tsx:30), so foldername[1] is the
-- owner. Same predicate the write policies already use.
--
-- The application reads with the SERVICE ROLE, which bypasses RLS, so signed
-- URLs are unaffected by this policy. It governs direct browser access with the
-- publishable key, which is where an unauthorised read would otherwise come
-- from.
-- -----------------------------------------------------------------------------
drop policy if exists labels_read_all on storage.objects;

create policy labels_read_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'labels'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- -----------------------------------------------------------------------------
-- 3. product-images is deliberately NOT touched.
--
-- It holds catalogue photography and theme-label previews, which are meant to
-- be world-readable, and components/merchant/product-step-label.tsx renders
-- them straight from getPublicUrl(). Only `labels` carries customer artwork.
-- -----------------------------------------------------------------------------
