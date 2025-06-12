import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cameras = await prisma.camera.findMany({
      include: { junction: true },
    });
    return NextResponse.json(cameras, { status: 200 });
  } catch (error) {
    console.error("Error fetching cameras:", error);
    return NextResponse.json(
      { error: "Failed to fetch cameras" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      cameraName,
      cameraAddress,
      location,
      latitude,
      longitude,
      isActive,
      junctionId,
    } = body;

    const camera = await prisma.camera.create({
      data: {
        cameraName,
        cameraAddress,
        location,
        latitude,
        longitude,
        isActive: isActive ?? true,
        junctionId: junctionId || null,
      },
      include: { junction: true },
    });

    return NextResponse.json(camera, { status: 201 });
  } catch (error) {
    console.error("Error creating camera:", error);
    return NextResponse.json(
      { error: "Failed to create camera" },
      { status: 500 }
    );
  }
}
