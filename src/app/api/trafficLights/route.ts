import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const trafficLights = await prisma.trafficLight.findMany({
      include: { junction: true },
    });
    return NextResponse.json(trafficLights, { status: 200 });
  } catch (error) {
    console.error("Error fetching traffic lights:", error);
    return NextResponse.json(
      { error: "Failed to fetch traffic lights" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      lightName,
      ipAddress,
      location,
      latitude,
      longitude,
      junctionId,
      status,
      isActive,
    } = body;

    const trafficLight = await prisma.trafficLight.create({
      data: {
        lightName,
        ipAddress,
        location,
        latitude,
        longitude,
        junctionId,
        status,
        isActive: isActive ?? true,
      },
      include: { junction: true },
    });

    return NextResponse.json(trafficLight, { status: 201 });
  } catch (error) {
    console.error("Error creating traffic light:", error);
    return NextResponse.json(
      { error: "Failed to create traffic light" },
      { status: 500 }
    );
  }
}
