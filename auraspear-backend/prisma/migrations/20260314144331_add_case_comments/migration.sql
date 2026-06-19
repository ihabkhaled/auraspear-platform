-- CreateTable
CREATE TABLE "case_comments" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_comment_mentions" (
    "id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_comment_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_comments_case_id_created_at_idx" ON "case_comments"("case_id", "created_at");

-- CreateIndex
CREATE INDEX "case_comments_author_id_idx" ON "case_comments"("author_id");

-- CreateIndex
CREATE INDEX "case_comment_mentions_user_id_idx" ON "case_comment_mentions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "case_comment_mentions_comment_id_user_id_key" ON "case_comment_mentions"("comment_id", "user_id");

-- AddForeignKey
ALTER TABLE "case_comments" ADD CONSTRAINT "case_comments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_comment_mentions" ADD CONSTRAINT "case_comment_mentions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "case_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
