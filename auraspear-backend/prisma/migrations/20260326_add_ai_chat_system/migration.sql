-- AI Chat Threads
CREATE TABLE "ai_chat_threads" (
    "id"                UUID          NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"         UUID          NOT NULL,
    "user_id"           UUID          NOT NULL,
    "connector_id"      UUID,
    "title"             VARCHAR(255),
    "model"             VARCHAR(255),
    "provider"          VARCHAR(100),
    "output_format"     VARCHAR(30)   NOT NULL DEFAULT 'plain_text',
    "temperature"       DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "max_tokens"        INTEGER       NOT NULL DEFAULT 2048,
    "system_prompt"     TEXT,
    "message_count"     INTEGER       NOT NULL DEFAULT 0,
    "total_tokens_used" INTEGER       NOT NULL DEFAULT 0,
    "last_activity_at"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_archived"       BOOLEAN       NOT NULL DEFAULT false,
    "created_at"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3)  NOT NULL,

    CONSTRAINT "ai_chat_threads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_chat_threads_tenant_user_idx" ON "ai_chat_threads"("tenant_id", "user_id");
CREATE INDEX "ai_chat_threads_tenant_user_activity_idx" ON "ai_chat_threads"("tenant_id", "user_id", "last_activity_at" DESC);
CREATE INDEX "ai_chat_threads_tenant_archived_idx" ON "ai_chat_threads"("tenant_id", "is_archived");

ALTER TABLE "ai_chat_threads"
    ADD CONSTRAINT "ai_chat_threads_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AI Chat Messages
CREATE TABLE "ai_chat_messages" (
    "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
    "thread_id"       UUID          NOT NULL,
    "tenant_id"       UUID          NOT NULL,
    "role"            VARCHAR(20)   NOT NULL,
    "content"         TEXT          NOT NULL,
    "model"           VARCHAR(255),
    "provider"        VARCHAR(100),
    "input_tokens"    INTEGER       NOT NULL DEFAULT 0,
    "output_tokens"   INTEGER       NOT NULL DEFAULT 0,
    "duration_ms"     INTEGER,
    "sequence_num"    INTEGER       NOT NULL,
    "created_at"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_chat_messages_thread_seq_idx" ON "ai_chat_messages"("thread_id", "sequence_num");
CREATE INDEX "ai_chat_messages_tenant_id_idx" ON "ai_chat_messages"("tenant_id");

ALTER TABLE "ai_chat_messages"
    ADD CONSTRAINT "ai_chat_messages_thread_id_fkey"
    FOREIGN KEY ("thread_id") REFERENCES "ai_chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_chat_messages"
    ADD CONSTRAINT "ai_chat_messages_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
