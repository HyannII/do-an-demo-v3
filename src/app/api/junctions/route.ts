import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const junctions = await prisma.junction.findMany({
      include: {
        cameras: true,
        trafficLights: true,
        trafficPatterns: true,
      },
    });

    return NextResponse.json(junctions, { status: 200 });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách nút giao:", error);
    return NextResponse.json(
      { error: "Không thể lấy danh sách nút giao" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
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

    // Create the junction
    const junction = await prisma.junction.create({
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

    return NextResponse.json(junction, { status: 201 });
  } catch (error) {
    console.error("Lỗi khi tạo nút giao:", error);
    return NextResponse.json(
      { error: "Không thể tạo nút giao" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
