-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "isPending" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pendingApproval" TIMESTAMP(3);
