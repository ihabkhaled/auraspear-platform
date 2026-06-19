-- CreateTable
CREATE TABLE "application_logs" (
    "id" UUID NOT NULL,
    "level" VARCHAR(10) NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "feature" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "function_name" VARCHAR(255),
    "class_name" VARCHAR(255),
    "tenant_id" UUID,
    "actor_user_id" UUID,
    "actor_email" VARCHAR(320),
    "request_id" VARCHAR(100),
    "target_resource" VARCHAR(100),
    "target_resource_id" VARCHAR(255),
    "outcome" VARCHAR(50),
    "metadata" JSONB,
    "stack_trace" TEXT,
    "http_method" VARCHAR(10),
    "http_route" VARCHAR(500),
    "http_status_code" INTEGER,
    "source_type" VARCHAR(50),
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_logs_created_at_idx" ON "application_logs"("created_at");

-- CreateIndex
CREATE INDEX "application_logs_level_idx" ON "application_logs"("level");

-- CreateIndex
CREATE INDEX "application_logs_tenant_id_idx" ON "application_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "application_logs_tenant_id_created_at_idx" ON "application_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "application_logs_actor_user_id_idx" ON "application_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "application_logs_actor_email_idx" ON "application_logs"("actor_email");

-- CreateIndex
CREATE INDEX "application_logs_feature_idx" ON "application_logs"("feature");

-- CreateIndex
CREATE INDEX "application_logs_function_name_idx" ON "application_logs"("function_name");
