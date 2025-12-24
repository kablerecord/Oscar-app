-- Deep Research System Migration
-- @see docs/features/OSQR_DEEP_RESEARCH_SPEC.md

-- ResearchSession: Tracks individual research requests
CREATE TABLE "ResearchSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,

    -- Query
    "originalQuery" TEXT NOT NULL,
    "refinedQuery" TEXT,
    "template" TEXT NOT NULL DEFAULT 'general',
    "depth" TEXT NOT NULL DEFAULT 'standard',

    -- Status
    "status" TEXT NOT NULL DEFAULT 'pending',
    "phase" INTEGER,
    "progress" INTEGER,

    -- Results (JSON)
    "reports" JSONB,
    "critiques" JSONB,
    "synthesis" JSONB,

    -- Metadata
    "modelsUsed" TEXT[],
    "tokenCost" INTEGER,
    "executionTime" INTEGER,
    "backgroundJob" BOOLEAN NOT NULL DEFAULT false,
    "inngestEventId" TEXT,

    -- Staleness
    "stalenessDecay" INTEGER NOT NULL DEFAULT 180,
    "refreshAt" TIMESTAMP(3),

    -- Failure
    "failedModels" JSONB,
    "error" TEXT,

    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ResearchSession_pkey" PRIMARY KEY ("id")
);

-- TribunalUsage: Monthly usage tracking per user
CREATE TABLE "TribunalUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
    "sessionsIncluded" INTEGER NOT NULL DEFAULT 3,
    "packsPurchased" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TribunalUsage_pkey" PRIMARY KEY ("id")
);

-- TribunalPackPurchase: Stripe purchase records
CREATE TABLE "TribunalPackPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "stripePaymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TribunalPackPurchase_pkey" PRIMARY KEY ("id")
);

-- Indexes for ResearchSession
CREATE INDEX "ResearchSession_userId_idx" ON "ResearchSession"("userId");
CREATE INDEX "ResearchSession_workspaceId_idx" ON "ResearchSession"("workspaceId");
CREATE INDEX "ResearchSession_projectId_idx" ON "ResearchSession"("projectId");
CREATE INDEX "ResearchSession_status_idx" ON "ResearchSession"("status");
CREATE INDEX "ResearchSession_template_idx" ON "ResearchSession"("template");
CREATE INDEX "ResearchSession_depth_idx" ON "ResearchSession"("depth");
CREATE INDEX "ResearchSession_createdAt_idx" ON "ResearchSession"("createdAt");
CREATE INDEX "ResearchSession_refreshAt_idx" ON "ResearchSession"("refreshAt");

-- Indexes for TribunalUsage
CREATE UNIQUE INDEX "TribunalUsage_userId_month_key" ON "TribunalUsage"("userId", "month");
CREATE INDEX "TribunalUsage_userId_idx" ON "TribunalUsage"("userId");
CREATE INDEX "TribunalUsage_month_idx" ON "TribunalUsage"("month");

-- Indexes for TribunalPackPurchase
CREATE INDEX "TribunalPackPurchase_userId_idx" ON "TribunalPackPurchase"("userId");
CREATE INDEX "TribunalPackPurchase_status_idx" ON "TribunalPackPurchase"("status");
