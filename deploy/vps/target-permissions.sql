-- TARGET ONLY, after restore/migrate. Run as iceland_owner on the VPS clone, never Supabase.
-- Explicit RLS policy for the server role; application authorization stays in Next.js.
BEGIN;
DO $$ BEGIN
  IF current_user <> 'iceland_owner' OR to_regnamespace('auth') IS NOT NULL
     OR current_database() NOT IN ('iceland_taxi', 'iceland_taxi_rehearsal') THEN
    RAISE EXCEPTION 'Refusing: expected private VPS target and iceland_owner';
  END IF;
END $$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO iceland_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO iceland_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO iceland_app;
ALTER DEFAULT PRIVILEGES FOR ROLE iceland_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO iceland_app;
ALTER DEFAULT PRIVILEGES FOR ROLE iceland_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO iceland_app;
DO $$ DECLARE table_name text; BEGIN
  FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS vps_server_access ON public.%I', table_name);
    EXECUTE format('CREATE POLICY vps_server_access ON public.%I TO iceland_app USING (true) WITH CHECK (true)', table_name);
  END LOOP;
END $$;
-- Runtime must never edit migration history.
REVOKE INSERT, UPDATE, DELETE ON public._prisma_migrations FROM iceland_app;
COMMIT;
