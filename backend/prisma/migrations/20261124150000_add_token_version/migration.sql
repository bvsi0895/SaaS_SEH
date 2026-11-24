-- Add a per-user session generation. Existing users start at version 0.
ALTER TABLE "usuarios" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
