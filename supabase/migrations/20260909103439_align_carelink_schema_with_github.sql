-- CareLink remote-schema alignment migration.
--
-- The remote Supabase project already contained a legacy/Ordonnance Mobile
-- schema. The migration was applied non-destructively through the Supabase
-- Management API so existing users and data were preserved.
--
-- The canonical CareLink schema remains versioned in:
--   supabase/carelink_full_schema.sql
-- and the complete domain migrations in this directory.
--
-- This file records the alignment event in Git so the repository and the
-- remote migration history remain traceable. The remote operation added the
-- missing CareLink domain tables/columns, backfilled patient dossiers/carts
-- and product stock rows, enabled RLS on the newly exposed tables, and added
-- the minimum authenticated Data API policies/grants needed by the current
-- application.

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'medical_dossiers'
  ) then
    raise exception 'CareLink schema alignment is missing: medical_dossiers does not exist';
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'notifications'
  ) then
    raise exception 'CareLink schema alignment is missing: notifications does not exist';
  end if;
end $$;
