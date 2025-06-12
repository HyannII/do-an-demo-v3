import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const junctionId = searchParams.get("junctionId");

    const trafficPatterns = await prisma.trafficPattern.findMany({
      where: junctionId ? { junctionId } : undefined,
      include: {
        user: true,
        junction: true,
      },
    });

    return NextResponse.json(trafficPatterns, { status: 200 });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách mẫu giao thông:", error);
    return NextResponse.json(
      { error: "Không thể lấy danh sách mẫu giao thông" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
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

    // Use a default user for now (you can implement proper authentication later)
    const defaultUser = await prisma.user.findFirst({
      where: { isActive: true },
    });

    if (!defaultUser) {
      return NextResponse.json(
        { error: "Không tìm thấy người dùng mặc định" },
        { status: 400 }
      );
    }

    const trafficPattern = await prisma.trafficPattern.create({
      data: {
        junctionId,
        patternName,
        timingConfiguration,
        createdByUserId: defaultUser.userId,
        createdAt: new Date(),
      },
      include: {
        user: true,
        junction: true,
      },
    });

    return NextResponse.json(trafficPattern, { status: 201 });
  } catch (error) {
    console.error("Lỗi khi tạo mẫu giao thông:", error);
    return NextResponse.json(
      { error: "Không thể tạo mẫu giao thông" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
