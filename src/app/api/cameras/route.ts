import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const transformCameraData = (camera: any) => {
  return {
    ...camera,
    latitude: camera.latitude ? Number(camera.latitude) : 0,
    longitude: camera.longitude ? Number(camera.longitude) : 0,
    installationDate: camera.installationDate
      ? camera.installationDate.toISOString()
      : undefined,
  };
};

export async function GET() {
  try {
    const cameras = await prisma.camera.findMany();
    const transformedCameras = cameras.map(transformCameraData);
    return NextResponse.json(transformedCameras, { status: 200 });
  } catch (error) {
    console.error("Error fetching cameras:", error);
    return NextResponse.json(
      { error: "Failed to fetch cameras" },
      { status: 500 }
    );
  }
}
