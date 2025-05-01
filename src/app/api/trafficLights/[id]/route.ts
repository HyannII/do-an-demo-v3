import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: "Invalid traffic light ID" },
      { status: 400 }
    );
  }

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

    const updatedTrafficLight = await prisma.trafficLight.update({
      where: { trafficLightId: id },
      data: {
        lightName,
        ipAddress,
        location,
        latitude,
        longitude,
        junctionId,
        status,
        isActive,
      },
      include: { junction: true },
    });

    return NextResponse.json(updatedTrafficLight, { status: 200 });
  } catch (error) {
    console.error("Error updating traffic light:", error);
    return NextResponse.json(
      { error: "Failed to update traffic light" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: "Invalid traffic light ID" },
      { status: 400 }
    );
  }

  try {
    await prisma.trafficLight.delete({
      where: { trafficLightId: id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting traffic light:", error);
    return NextResponse.json(
      { error: "Failed to delete traffic light" },
      { status: 500 }
    );
  }
}
