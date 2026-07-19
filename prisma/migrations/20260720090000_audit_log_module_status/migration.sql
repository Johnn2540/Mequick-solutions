-- AuditLog gains `module` (nullable — old rows just predate this field) and
-- `status` (defaulted "SUCCESS" so existing rows are backfilled sensibly:
-- everything logged so far genuinely was a successful action, including the
-- LOGIN_FAILURE rows, whose "failure" is the login attempt's own outcome,
-- not a failure of the audit-write itself).

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN "module" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'SUCCESS';

-- Backfill: existing LOGIN_FAILURE rows predate the `status` column and all
-- landed on the 'SUCCESS' default above, which is wrong for them
-- specifically — a failed login attempt is exactly what `status = 'FAILED'`
-- is for. Every other historical action really was a success.
UPDATE "audit_logs" SET "status" = 'FAILED' WHERE "action" = 'LOGIN_FAILURE';

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");
CREATE INDEX "audit_logs_status_idx" ON "audit_logs"("status");
