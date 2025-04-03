// src/app/api/junctions/[id]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const transformJunctionData = (junction: any) => {
  return {
    ...junction,
    latitude: junction.latitude ? Number(junction.latitude) : 0,
    longitude: junction.longitude ? Number(junction.longitude) : 0,
    cameras: junction.cameras.map((camera: any) => ({
      ...camera,
      latitude: camera.latitude ? Number(camera.latitude) : 0,
      longitude: camera.longitude ? Number(camera.longitude) : 0,
      installationDate: camera.installationDate
        ? camera.installationDate.toISOString()
        : undefined,
    })),
    trafficLights: junction.trafficLights.map((trafficLight: any) => ({
      ...trafficLight,
      latitude: trafficLight.latitude ? Number(trafficLight.latitude) : 0,
      longitude: trafficLight.longitude ? Number(trafficLight.longitude) : 0,
      lastMaintenance: trafficLight.lastMaintenance
        ? trafficLight.lastMaintenance.toISOString()
        : undefined,
    })),
  };
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const junction = await prisma.junction.findUnique({
      where: { junctionId: params.id },
      include: {
        trafficLights: true,
        cameras: true,
      },
    });

    if (!junction) {
      return NextResponse.json(
        { error: "Junction not found" },
        { status: 404 }
      );
    }

    const transformedJunction = transformJunctionData(junction);
    return NextResponse.json(transformedJunction, { status: 200 });
  } catch (error) {
    console.error("Error fetching junction:", error);
    return NextResponse.json(
      { error: "Failed to fetch junction" },
      { status: 500 }
    );
  }
}
