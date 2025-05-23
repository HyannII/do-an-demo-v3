import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getJunctions() {
  return await prisma.junction.findMany({
    include: {
      trafficLights: true, // Lấy danh sách traffic lights liên quan
      cameras: true, // Lấy danh sách cameras liên quan
    },
  });
}
