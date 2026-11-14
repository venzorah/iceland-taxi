BEGIN;
ALTER TABLE "Booking" ADD COLUMN "requestKey" TEXT;
ALTER TABLE "Booking" ADD COLUMN "requestHash" TEXT;
CREATE UNIQUE INDEX "Booking_requestKey_key" ON "Booking"("requestKey");
ALTER TABLE "Payment" ADD COLUMN "checkoutLeaseKey" TEXT;
CREATE UNIQUE INDEX "Payment_checkoutLeaseKey_key" ON "Payment"("checkoutLeaseKey");
COMMIT;
