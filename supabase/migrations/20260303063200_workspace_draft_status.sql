-- Add a status column to help differentiate between active and AI-drafted workspaces
ALTER TABLE "public"."workspaces" 
ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';

-- Optional: Create an index for faster filtering of workspaces by status
CREATE INDEX IF NOT EXISTS "workspaces_status_idx" ON "public"."workspaces" ("status");
