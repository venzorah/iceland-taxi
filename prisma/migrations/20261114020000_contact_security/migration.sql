BEGIN;
ALTER TABLE "PushSubscription" ADD COLUMN "userId" TEXT;
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "ContactMessage" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "requestKey" TEXT NOT NULL,
 "requestHash" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "email" TEXT NOT NULL,
 "bookingRef" TEXT,
 "topic" TEXT NOT NULL,
 "body" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'NEW',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "ContactMessage_requestKey_key" ON "ContactMessage"("requestKey");
CREATE INDEX "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");
CREATE TABLE "RateLimit" ("key" TEXT NOT NULL PRIMARY KEY, "hits" INTEGER NOT NULL, "resetAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");
ALTER TABLE "ContactMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimit" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON TABLE "ContactMessage", "RateLimit" FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON TABLE "ContactMessage", "RateLimit" FROM authenticated; END IF;
END $$;
COMMIT;
