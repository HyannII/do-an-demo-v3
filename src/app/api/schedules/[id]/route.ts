import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: "ID lịch trình không hợp lệ" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const {
      junctionId,
      scheduleName,
      mode,
      autoPatternId,
      daySchedules,
      isActive,
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

    // Validate schedule exists
    const existingSchedule = await prisma.scheduleConfig.findUnique({
      where: { scheduleId: id },
    });
    if (!existingSchedule) {
      return NextResponse.json(
        { error: "Không tìm thấy lịch trình" },
        { status: 404 }
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

    const updatedSchedule = await prisma.scheduleConfig.update({
      where: { scheduleId: id },
      data: {
        junctionId,
        scheduleName,
        mode,
        autoPatternId: mode === "auto" ? autoPatternId : null,
        daySchedules: mode === "schedule" ? daySchedules : [],
        isActive,
      },
      include: {
        user: true,
        junction: true,
        autoPattern: true,
      },
    });

    return NextResponse.json(updatedSchedule, { status: 200 });
  } catch (error) {
    console.error("Lỗi khi cập nhật lịch trình:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật lịch trình" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: "ID lịch trình không hợp lệ" },
      { status: 400 }
    );
  }

  try {
    const schedule = await prisma.scheduleConfig.findUnique({
      where: { scheduleId: id },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Không tìm thấy lịch trình" },
        { status: 404 }
      );
    }

    await prisma.scheduleConfig.delete({
      where: { scheduleId: id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Lỗi khi xóa lịch trình:", error);
    return NextResponse.json(
      { error: "Không thể xóa lịch trình" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: "ID lịch trình không hợp lệ" },
      { status: 400 }
    );
  }

  try {
    const schedule = await prisma.scheduleConfig.findUnique({
      where: { scheduleId: id },
      include: {
        user: true,
        junction: true,
        autoPattern: true,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Không tìm thấy lịch trình" },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule, { status: 200 });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin lịch trình:", error);
    return NextResponse.json(
      { error: "Không thể lấy thông tin lịch trình" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
