-- Content remains readable/writable only through the authorized Next.js backend.
BEGIN;
ALTER TABLE "MediaAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SiteBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "MediaAsset", "SiteBlock", "_prisma_migrations" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "MediaAsset", "SiteBlock", "_prisma_migrations" FROM authenticated;
  END IF;
END $$;
COMMIT;
