-- Increase max_tokens default for AI chat threads from 2048 to 16384.
-- Update existing threads that still have the old default.

ALTER TABLE "ai_chat_threads" ALTER COLUMN "max_tokens" SET DEFAULT 16384;

UPDATE "ai_chat_threads"
SET "max_tokens" = 16384
WHERE "max_tokens" = 2048;
