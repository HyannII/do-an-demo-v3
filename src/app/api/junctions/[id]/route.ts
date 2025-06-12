import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "ID nút giao không hợp lệ" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { junctionName, location, latitude, longitude } = body;

    // Validate required fields
    if (!junctionName || !location) {
      return NextResponse.json(
        { error: "Thiếu các trường bắt buộc" },
        { status: 400 }
      );
    }

    // Validate junction exists
    const junction = await prisma.junction.findUnique({
      where: { junctionId: id },
    });
    if (!junction) {
      return NextResponse.json(
        { error: "Không tìm thấy nút giao" },
        { status: 400 }
      );
    }

    const updatedJunction = await prisma.junction.update({
      where: { junctionId: id },
      data: {
        junctionName,
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
      include: {
        cameras: true,
        trafficLights: true,
        trafficPatterns: true,
      },
    });

    return NextResponse.json(updatedJunction, { status: 200 });
  } catch (error) {
    console.error("Lỗi khi cập nhật nút giao:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật nút giao" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "ID nút giao không hợp lệ" },
      { status: 400 }
    );
  }

  try {
    const junction = await prisma.junction.findUnique({
      where: { junctionId: id },
    });

    if (!junction) {
      return NextResponse.json(
        { error: "Không tìm thấy nút giao" },
        { status: 400 }
      );
    }

    // Check if junction is associated with any cameras, traffic lights, or traffic patterns
    const cameraCount = await prisma.camera.count({
      where: { junctionId: id },
    });
    const trafficLightCount = await prisma.trafficLight.count({
      where: { junctionId: id },
    });
    const trafficPatternCount = await prisma.trafficPattern.count({
      where: { junctionId: id },
    });

    if (cameraCount > 0 || trafficLightCount > 0 || trafficPatternCount > 0) {
      return NextResponse.json(
        {
          error:
            "Không thể xóa nút giao vì đang có camera, đèn giao thông hoặc mẫu giao thông liên kết",
        },
        { status: 400 }
      );
    }

    await prisma.junction.delete({
      where: { junctionId: id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Lỗi khi xóa nút giao:", error);
    return NextResponse.json(
      { error: "Không thể xóa nút giao" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
