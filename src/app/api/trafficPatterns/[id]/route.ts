import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "ID mẫu giao thông không hợp lệ" },
      { status: 400 }
    );
  }

  try {
    const trafficPattern = await prisma.trafficPattern.findUnique({
      where: { patternId: id },
      include: {
        user: true,
        junction: true,
      },
    });

    if (!trafficPattern) {
      return NextResponse.json(
        { error: "Không tìm thấy mẫu giao thông" },
        { status: 404 }
      );
    }

    return NextResponse.json(trafficPattern, { status: 200 });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin mẫu giao thông:", error);
    return NextResponse.json(
      { error: "Không thể lấy thông tin mẫu giao thông" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "ID mẫu giao thông không hợp lệ" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { junctionId, patternName, timingConfiguration } = body;

    // Validate required fields
    if (!junctionId || !patternName || !timingConfiguration) {
      return NextResponse.json(
        { error: "Thiếu các trường bắt buộc" },
        { status: 400 }
      );
    }

    // Validate traffic pattern exists
    const trafficPattern = await prisma.trafficPattern.findUnique({
      where: { patternId: id },
    });
    if (!trafficPattern) {
      return NextResponse.json(
        { error: "Không tìm thấy mẫu giao thông" },
        { status: 400 }
      );
    }

    // Validate junction exists
    const junction = await prisma.junction.findUnique({
      where: { junctionId },
    });
    if (!junction) {
      return NextResponse.json(
        { error: "Không tìm thấy nút giao" },
        { status: 400 }
      );
    }

    // Validate timingConfiguration structure for Gantt chart
    if (
      !timingConfiguration.cycleDuration ||
      !Array.isArray(timingConfiguration.phases)
    ) {
      return NextResponse.json(
        { error: "Cấu trúc timingConfiguration không hợp lệ" },
        { status: 400 }
      );
    }

    const updatedTrafficPattern = await prisma.trafficPattern.update({
      where: { patternId: id },
      data: {
        junctionId,
        patternName,
        timingConfiguration,
      },
      include: {
        user: true,
        junction: true,
      },
    });

    return NextResponse.json(updatedTrafficPattern, { status: 200 });
  } catch (error) {
    console.error("Lỗi khi cập nhật mẫu giao thông:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật mẫu giao thông" },
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
      { error: "ID mẫu giao thông không hợp lệ" },
      { status: 400 }
    );
  }

  try {
    const trafficPattern = await prisma.trafficPattern.findUnique({
      where: { patternId: id },
    });

    if (!trafficPattern) {
      return NextResponse.json(
        { error: "Không tìm thấy mẫu giao thông" },
        { status: 400 }
      );
    }

    await prisma.trafficPattern.delete({
      where: { patternId: id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Lỗi khi xóa mẫu giao thông:", error);
    return NextResponse.json(
      { error: "Không thể xóa mẫu giao thông" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
