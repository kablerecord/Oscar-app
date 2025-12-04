-- CreateTable
CREATE TABLE "ProfileAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProfileAnswer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProfileAnswer_workspaceId_idx" ON "ProfileAnswer"("workspaceId");

-- CreateIndex
CREATE INDEX "ProfileAnswer_category_idx" ON "ProfileAnswer"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileAnswer_workspaceId_questionId_key" ON "ProfileAnswer"("workspaceId", "questionId");
