-- CreateEnum
CREATE TYPE "public"."VirtualTryOnJobType" AS ENUM ('face_analysis', 'shade_rendering', 'refinement');

-- CreateEnum
CREATE TYPE "public"."VirtualTryOnJobStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "public"."VirtualTryOnJob" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "type" "public"."VirtualTryOnJobType" NOT NULL,
    "status" "public"."VirtualTryOnJobStatus" NOT NULL DEFAULT 'queued',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualTryOnJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VirtualTryOnJob_sessionId_idx" ON "public"."VirtualTryOnJob"("sessionId");

-- CreateIndex
CREATE INDEX "VirtualTryOnJob_status_idx" ON "public"."VirtualTryOnJob"("status");

-- AddForeignKey
ALTER TABLE "public"."VirtualTryOnJob" ADD CONSTRAINT "VirtualTryOnJob_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."VirtualTryOnSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
