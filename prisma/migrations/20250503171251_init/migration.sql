-- CreateTable
CREATE TABLE "Camera" (
    "cameraId" TEXT NOT NULL,
    "cameraName" TEXT NOT NULL,
    "cameraAddress" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DECIMAL(10,6),
    "longitude" DECIMAL(10,6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "junctionId" TEXT,

    CONSTRAINT "Camera_pkey" PRIMARY KEY ("cameraId")
);

-- CreateTable
CREATE TABLE "CameraData" (
    "dataId" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "motorcycleCount" INTEGER NOT NULL,
    "carCount" INTEGER NOT NULL,
    "truckCount" INTEGER NOT NULL,
    "busCount" INTEGER NOT NULL,

    CONSTRAINT "CameraData_pkey" PRIMARY KEY ("dataId")
);

-- CreateTable
CREATE TABLE "Junction" (
    "junctionId" TEXT NOT NULL,
    "junctionName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DECIMAL(10,6),
    "longitude" DECIMAL(10,6),

    CONSTRAINT "Junction_pkey" PRIMARY KEY ("junctionId")
);

-- CreateTable
CREATE TABLE "Role" (
    "roleId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "permissions" JSONB,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("roleId")
);

-- CreateTable
CREATE TABLE "TrafficLight" (
    "trafficLightId" TEXT NOT NULL,
    "lightName" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DECIMAL(10,6),
    "longitude" DECIMAL(10,6),
    "junctionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TrafficLight_pkey" PRIMARY KEY ("trafficLightId")
);

-- CreateTable
CREATE TABLE "TrafficPattern" (
    "patternId" TEXT NOT NULL,
    "junctionId" TEXT NOT NULL,
    "patternName" TEXT NOT NULL,
    "timingConfiguration" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "TrafficPattern_pkey" PRIMARY KEY ("patternId")
);

-- CreateTable
CREATE TABLE "User" (
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_roleName_key" ON "Role"("roleName");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Camera" ADD CONSTRAINT "Camera_junctionId_fkey" FOREIGN KEY ("junctionId") REFERENCES "Junction"("junctionId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraData" ADD CONSTRAINT "CameraData_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("cameraId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficLight" ADD CONSTRAINT "TrafficLight_junctionId_fkey" FOREIGN KEY ("junctionId") REFERENCES "Junction"("junctionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficPattern" ADD CONSTRAINT "TrafficPattern_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficPattern" ADD CONSTRAINT "TrafficPattern_junctionId_fkey" FOREIGN KEY ("junctionId") REFERENCES "Junction"("junctionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("roleId") ON DELETE RESTRICT ON UPDATE CASCADE;
