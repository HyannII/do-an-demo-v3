-- CreateTable
CREATE TABLE "ScheduleConfig" (
    "scheduleId" TEXT NOT NULL,
    "junctionId" TEXT NOT NULL,
    "scheduleName" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "autoPatternId" TEXT,
    "daySchedules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ScheduleConfig_pkey" PRIMARY KEY ("scheduleId")
);

-- AddForeignKey
ALTER TABLE "ScheduleConfig" ADD CONSTRAINT "ScheduleConfig_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleConfig" ADD CONSTRAINT "ScheduleConfig_junctionId_fkey" FOREIGN KEY ("junctionId") REFERENCES "Junction"("junctionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleConfig" ADD CONSTRAINT "ScheduleConfig_autoPatternId_fkey" FOREIGN KEY ("autoPatternId") REFERENCES "TrafficPattern"("patternId") ON DELETE SET NULL ON UPDATE CASCADE;
