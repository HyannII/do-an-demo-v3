import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const junctionId = searchParams.get("junctionId");

    const schedules = await prisma.scheduleConfig.findMany({
      where: junctionId ? { junctionId } : undefined,
      include: {
        user: true,
        junction: true,
        autoPattern: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(schedules, { status: 200 });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách lịch trình:", error);
    return NextResponse.json(
      { error: "Không thể lấy danh sách lịch trình" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      junctionId,
      scheduleName,
      mode,
      autoPatternId,
      daySchedules,
      isActive = true,
    } = body;

    // Validate required fields
    if (!junctionId || !scheduleName || !mode) {
      return NextResponse.json(
        { error: "Thiếu các trường bắt buộc: junctionId, scheduleName, mode" },
        { status: 400 }
      );
    }

    // Validate mode
    if (!["auto", "schedule"].includes(mode)) {
      return NextResponse.json(
        { error: "Mode phải là 'auto' hoặc 'schedule'" },
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

    // Validate auto pattern if mode is auto
    if (mode === "auto") {
      if (!autoPatternId) {
        return NextResponse.json(
          { error: "Chế độ tự động cần có autoPatternId" },
          { status: 400 }
        );
      }

      const autoPattern = await prisma.trafficPattern.findUnique({
        where: { patternId: autoPatternId },
      });
      if (!autoPattern) {
        return NextResponse.json(
          { error: "Không tìm thấy pattern tự động" },
          { status: 400 }
        );
      }
    }

    // Validate day schedules if mode is schedule
    if (mode === "schedule") {
      if (!daySchedules || !Array.isArray(daySchedules)) {
        return NextResponse.json(
          { error: "Chế độ lên lịch cần có daySchedules là array" },
          { status: 400 }
        );
      }
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

    // If creating an active schedule, deactivate all other schedules for the same junction
    if (isActive) {
      await prisma.scheduleConfig.updateMany({
        where: {
          junctionId: junctionId,
        },
        data: {
          isActive: false,
        },
      });
    }

    const schedule = await prisma.scheduleConfig.create({
      data: {
        junctionId,
        scheduleName,
        mode,
        autoPatternId: mode === "auto" ? autoPatternId : null,
        daySchedules: mode === "schedule" ? daySchedules : [],
        createdByUserId: defaultUser.userId,
        isActive,
        createdAt: new Date(),
      },
      include: {
        user: true,
        junction: true,
        autoPattern: true,
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("Lỗi khi tạo lịch trình:", error);
    return NextResponse.json(
      { error: "Không thể tạo lịch trình" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
