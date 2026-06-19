-- CreateEnum
CREATE TYPE "AiAgentStatus" AS ENUM ('online', 'offline', 'degraded', 'maintenance');

-- CreateEnum
CREATE TYPE "AiAgentTier" AS ENUM ('L0', 'L1', 'L2', 'L3');

-- CreateEnum
CREATE TYPE "AiAgentSessionStatus" AS ENUM ('running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "UebaEntityType" AS ENUM ('user', 'host', 'service_account', 'application');

-- CreateEnum
CREATE TYPE "UebaRiskLevel" AS ENUM ('critical', 'high', 'medium', 'low', 'normal');

-- CreateEnum
CREATE TYPE "MlModelStatus" AS ENUM ('training', 'active', 'degraded', 'inactive');

-- CreateEnum
CREATE TYPE "MlModelType" AS ENUM ('anomaly_detection', 'classification', 'clustering', 'time_series');

-- CreateEnum
CREATE TYPE "AttackPathSeverity" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "AttackPathStatus" AS ENUM ('active', 'mitigated', 'resolved');

-- CreateTable
CREATE TABLE "ai_agents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "model" VARCHAR(100) NOT NULL,
    "tier" "AiAgentTier" NOT NULL DEFAULT 'L1',
    "status" "AiAgentStatus" NOT NULL DEFAULT 'offline',
    "soul_md" TEXT,
    "total_tasks" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" BIGINT NOT NULL DEFAULT 0,
    "total_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_time_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_agent_sessions" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "status" "AiAgentSessionStatus" NOT NULL DEFAULT 'running',
    "input" TEXT NOT NULL,
    "output" TEXT,
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ai_agent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_agent_tools" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "schema" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agent_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ueba_entities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_name" VARCHAR(320) NOT NULL,
    "entity_type" "UebaEntityType" NOT NULL,
    "risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "risk_level" "UebaRiskLevel" NOT NULL DEFAULT 'normal',
    "top_anomaly" VARCHAR(500),
    "trend_data" JSONB,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ueba_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ueba_anomalies" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "anomaly_type" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "UebaRiskLevel" NOT NULL DEFAULT 'medium',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ueba_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_models" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "model_type" "MlModelType" NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "MlModelStatus" NOT NULL DEFAULT 'inactive',
    "last_trained" TIMESTAMP(3),
    "data_points" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ml_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attack_paths" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "path_number" VARCHAR(20) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "severity" "AttackPathSeverity" NOT NULL DEFAULT 'medium',
    "status" "AttackPathStatus" NOT NULL DEFAULT 'active',
    "stages" JSONB NOT NULL,
    "affected_assets" INTEGER NOT NULL DEFAULT 0,
    "kill_chain_coverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "linked_incident_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mitre_tactics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mitre_techniques" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attack_paths_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_agents_tenant_id_name_key" ON "ai_agents"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "ai_agents_tenant_id_idx" ON "ai_agents"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_agents_tenant_id_status_idx" ON "ai_agents"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "ai_agent_sessions_agent_id_idx" ON "ai_agent_sessions"("agent_id");

-- CreateIndex
CREATE INDEX "ai_agent_sessions_agent_id_started_at_idx" ON "ai_agent_sessions"("agent_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_agent_tools_agent_id_name_key" ON "ai_agent_tools"("agent_id", "name");

-- CreateIndex
CREATE INDEX "ai_agent_tools_agent_id_idx" ON "ai_agent_tools"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "ueba_entities_tenant_id_entity_name_entity_type_key" ON "ueba_entities"("tenant_id", "entity_name", "entity_type");

-- CreateIndex
CREATE INDEX "ueba_entities_tenant_id_idx" ON "ueba_entities"("tenant_id");

-- CreateIndex
CREATE INDEX "ueba_entities_tenant_id_risk_level_idx" ON "ueba_entities"("tenant_id", "risk_level");

-- CreateIndex
CREATE INDEX "ueba_entities_tenant_id_risk_score_idx" ON "ueba_entities"("tenant_id", "risk_score");

-- CreateIndex
CREATE INDEX "ueba_anomalies_tenant_id_idx" ON "ueba_anomalies"("tenant_id");

-- CreateIndex
CREATE INDEX "ueba_anomalies_tenant_id_severity_idx" ON "ueba_anomalies"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "ueba_anomalies_entity_id_idx" ON "ueba_anomalies"("entity_id");

-- CreateIndex
CREATE INDEX "ueba_anomalies_tenant_id_detected_at_idx" ON "ueba_anomalies"("tenant_id", "detected_at");

-- CreateIndex
CREATE UNIQUE INDEX "ml_models_tenant_id_name_key" ON "ml_models"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "ml_models_tenant_id_idx" ON "ml_models"("tenant_id");

-- CreateIndex
CREATE INDEX "ml_models_tenant_id_status_idx" ON "ml_models"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attack_paths_path_number_key" ON "attack_paths"("path_number");

-- CreateIndex
CREATE INDEX "attack_paths_tenant_id_idx" ON "attack_paths"("tenant_id");

-- CreateIndex
CREATE INDEX "attack_paths_tenant_id_severity_idx" ON "attack_paths"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "attack_paths_tenant_id_status_idx" ON "attack_paths"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "attack_paths_tenant_id_detected_at_idx" ON "attack_paths"("tenant_id", "detected_at");

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agent_sessions" ADD CONSTRAINT "ai_agent_sessions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agent_tools" ADD CONSTRAINT "ai_agent_tools_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ueba_entities" ADD CONSTRAINT "ueba_entities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ueba_anomalies" ADD CONSTRAINT "ueba_anomalies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ueba_anomalies" ADD CONSTRAINT "ueba_anomalies_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "ueba_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_models" ADD CONSTRAINT "ml_models_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attack_paths" ADD CONSTRAINT "attack_paths_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
