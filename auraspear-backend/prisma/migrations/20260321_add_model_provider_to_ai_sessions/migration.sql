-- Add model, provider, and errorMessage columns to ai_agent_sessions
ALTER TABLE "ai_agent_sessions" ADD COLUMN "model" VARCHAR(255);
ALTER TABLE "ai_agent_sessions" ADD COLUMN "provider" VARCHAR(50);
ALTER TABLE "ai_agent_sessions" ADD COLUMN "error_message" TEXT;
