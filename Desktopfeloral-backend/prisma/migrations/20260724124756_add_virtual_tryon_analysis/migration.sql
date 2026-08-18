-- CreateTable
CREATE TABLE "public"."VirtualTryOnAnalysis" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "faceDetected" BOOLEAN NOT NULL DEFAULT false,
    "landmarks" JSONB,
    "lipMaskUrl" TEXT,
    "skinMaskUrl" TEXT,
    "eyeMaskUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualTryOnAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VirtualTryOnAnalysis_sessionId_key" ON "public"."VirtualTryOnAnalysis"("sessionId");

-- AddForeignKey
ALTER TABLE "public"."VirtualTryOnAnalysis" ADD CONSTRAINT "VirtualTryOnAnalysis_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."VirtualTryOnSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
