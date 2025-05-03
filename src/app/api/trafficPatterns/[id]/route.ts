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
      { error: "ID m?u giao thông không h?p l?" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { junctionId, patternName, timingConfiguration, createdByUserId } =
      body;

    // Validate required fields
    if (
      !junctionId ||
      !patternName ||
      !timingConfiguration ||
      !createdByUserId
    ) {
      return NextResponse.json(
        { error: "Thi?u các tru?ng b?t bu?c" },
        { status: 400 }
      );
    }

    // Validate traffic pattern exists
    const trafficPattern = await prisma.trafficPattern.findUnique({
      where: { patternId: id },
    });
    if (!trafficPattern) {
      return NextResponse.json(
        { error: "Không tìm th?y m?u giao thông" },
        { status: 400 }
      );
    }

    // Validate junction exists
    const junction = await prisma.junction.findUnique({
      where: { junctionId },
    });
    if (!junction) {
      return NextResponse.json(
        { error: "Không tìm th?y nút giao" },
        { status: 400 }
      );
    }

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { userId: createdByUserId },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Không tìm th?y ngu?i dùng" },
        { status: 400 }
      );
    }

    // Validate timingConfiguration structure (basic validation)
    if (
      !timingConfiguration.activeTime ||
      !timingConfiguration.cycleTime ||
      !Array.isArray(timingConfiguration.phases)
    ) {
      return NextResponse.json(
        { error: "C?u trúc timingConfiguration không h?p l?" },
        { status: 400 }
      );
    }

    const updatedTrafficPattern = await prisma.trafficPattern.update({
      where: { patternId: id },
      data: {
        junctionId,
        patternName,
        timingConfiguration,
        createdByUserId,
      },
      include: {
        user: true,
        junction: true,
      },
    });

    return NextResponse.json(updatedTrafficPattern, { status: 200 });
  } catch (error) {
    console.error("L?i khi c?p nh?t m?u giao thông:", error);
    return NextResponse.json(
      { error: "Không th? c?p nh?t m?u giao thông" },
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
      { error: "ID m?u giao thông không h?p l?" },
      { status: 400 }
    );
  }

  try {
    const trafficPattern = await prisma.trafficPattern.findUnique({
      where: { patternId: id },
    });

    if (!trafficPattern) {
      return NextResponse.json(
        { error: "Không tìm th?y m?u giao thông" },
        { status: 400 }
      );
    }

    await prisma.trafficPattern.delete({
      where: { patternId: id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("L?i khi xóa m?u giao thông:", error);
    return NextResponse.json(
      { error: "Không th? xóa m?u giao thông" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
