import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "Invalid camera ID" }, { status: 400 });
  }

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

    const updatedCamera = await prisma.camera.update({
      where: { cameraId: id },
      data: {
        cameraName,
        cameraAddress,
        location,
        latitude,
        longitude,
        isActive,
        junctionId: junctionId || null,
      },
      include: { junction: true },
    });

    return NextResponse.json(updatedCamera, { status: 200 });
  } catch (error) {
    console.error("Error updating camera:", error);
    return NextResponse.json(
      { error: "Failed to update camera" },
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
    return NextResponse.json({ error: "Invalid camera ID" }, { status: 400 });
  }

  try {
    await prisma.camera.delete({
      where: { cameraId: id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting camera:", error);
    return NextResponse.json(
      { error: "Failed to delete camera" },
      { status: 500 }
    );
  }
}
