-- CreateEnum
CREATE TYPE "CaseCycleStatus" AS ENUM ('active', 'closed');

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "cycle_id" UUID;

-- CreateTable
CREATE TABLE "case_cycles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "CaseCycleStatus" NOT NULL DEFAULT 'active',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "created_by" VARCHAR(320) NOT NULL,
    "closed_by" VARCHAR(320),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_cycles_tenant_id_idx" ON "case_cycles"("tenant_id");

-- CreateIndex
CREATE INDEX "case_cycles_tenant_id_status_idx" ON "case_cycles"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "cases_cycle_id_idx" ON "cases"("cycle_id");

-- AddForeignKey
ALTER TABLE "case_cycles" ADD CONSTRAINT "case_cycles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "case_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
