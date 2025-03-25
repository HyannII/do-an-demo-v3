import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const junctions = await prisma.junction.findMany({
      include: {
        trafficLights: true,
        cameras: true,
      },
    });
    return NextResponse.json(junctions, { status: 200 });
  } catch (error) {
    console.error("Error fetching junctions:", error);
    return NextResponse.json(
      { error: "Failed to fetch junctions" },
      { status: 500 }
    );
  }
}
