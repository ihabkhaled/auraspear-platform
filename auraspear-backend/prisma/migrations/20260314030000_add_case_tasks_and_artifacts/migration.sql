-- CreateTable
CREATE TABLE "case_tasks" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "assignee" VARCHAR(320),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_artifacts" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "value" VARCHAR(2048) NOT NULL,
    "source" VARCHAR(100) NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_tasks_case_id_idx" ON "case_tasks"("case_id");

-- CreateIndex
CREATE INDEX "case_artifacts_case_id_idx" ON "case_artifacts"("case_id");

-- AddForeignKey
ALTER TABLE "case_tasks" ADD CONSTRAINT "case_tasks_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_artifacts" ADD CONSTRAINT "case_artifacts_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
