-- Add contentHash column for duplicate detection
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "contentHash" TEXT;

-- Add index for fast duplicate checking (workspace + hash)
CREATE INDEX IF NOT EXISTS "Document_workspaceId_contentHash_idx" ON "Document"("workspaceId", "contentHash");
