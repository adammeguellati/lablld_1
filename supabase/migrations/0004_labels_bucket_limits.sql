-- =============================================================================
-- 0004 — the labels bucket gets a size limit and a MIME allowlist
--
-- Card: INFRA-labels-file-limits. Ruling: Adam, 2026-08-21 — "10 MB everywhere,
-- png/jpg/webp/pdf".
--
-- WHAT THIS FIXES
--
-- Until now the bucket had NO server-side limit of any kind. Both uploaders
-- checked size in the browser and one of them checked the extension, but a
-- browser check is a courtesy message, not a boundary: anyone holding the
-- publishable key can call storage.upload() directly and put a 400 MB file, or
-- an executable, into the bucket. 0003 made reads owner-or-admin; this makes
-- WRITES bounded. The two together are what "the bucket is governed" means.
--
-- WHY THE NUMBERS ARE THESE NUMBERS
--
-- 10 MB and the four formats are Adam's ruling, and they are the same values
-- the client now enforces — LABEL_MAX_MB and LABEL_MIME_TYPES in lib/limits.ts.
-- If a later ruling moves the limit, it moves in BOTH places or the screens
-- start lying about what the bucket accepts. There is no way to import a TS
-- constant into SQL, so this comment is the link between them; it is the one
-- place in the system where the limit is deliberately written twice, and it is
-- written twice because the two enforcers are two different runtimes.
--
-- jpg and jpeg are one MIME type (image/jpeg), which is why five accepted
-- extensions become four accepted types.
--
-- SAFE TO APPLY ANY TIME, independent of any deploy. It governs new uploads
-- only: objects already in the bucket are not re-validated and are not touched.
--
-- REVERSIBLE: set both columns back to null.
--
-- NOT APPLIED BY THE EXECUTOR. Ivan applies this in the Supabase dashboard.
-- =============================================================================

update storage.buckets
set
  -- Bytes, not MB. 10 * 1024 * 1024.
  file_size_limit  = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
where id = 'labels';

-- -----------------------------------------------------------------------------
-- Verification, to run in the same SQL editor session after applying.
--
-- Expect exactly one row: labels | f | 10485760 | {image/jpeg,image/png,image/webp,application/pdf}
--
--   select id, public, file_size_limit, allowed_mime_types
--   from storage.buckets
--   where id = 'labels';
--
-- `public` should still read f — 0003 set it and this migration does not touch
-- it. If it reads t, 0003 was rolled back or never applied, and G5 is not what
-- the board says it is.
--
-- NEGATIVE ARM, worth doing once by hand since there is no CI to hang it on:
-- with the limits in place, try to upload a >10 MB file, or a .txt, from the
-- browser console using the publishable key. Both must be REJECTED by the
-- server. If either succeeds, this migration did not take effect and the only
-- thing standing between the bucket and an arbitrary upload is a client-side
-- if-statement. See BOARD-SPEC.md, "the disable-the-property arm".
-- -----------------------------------------------------------------------------
