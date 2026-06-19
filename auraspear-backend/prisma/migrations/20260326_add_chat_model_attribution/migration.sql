-- Add model attribution fields to ai_chat_messages
ALTER TABLE "ai_chat_messages" ADD COLUMN "requested_model" VARCHAR(255);
ALTER TABLE "ai_chat_messages" ADD COLUMN "requested_provider" VARCHAR(100);
ALTER TABLE "ai_chat_messages" ADD COLUMN "fallback_model" VARCHAR(255);
ALTER TABLE "ai_chat_messages" ADD COLUMN "fallback_reason" VARCHAR(500);
ALTER TABLE "ai_chat_messages" ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'completed';

-- Add cursor pagination index for messages by createdAt
CREATE INDEX "ai_chat_messages_thread_created_idx" ON "ai_chat_messages"("thread_id", "created_at");
