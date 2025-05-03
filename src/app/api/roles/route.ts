import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      include: {
        users: true,
      },
    });

    return NextResponse.json(roles, { status: 200 });
  } catch (error) {
    console.error("L?i khi l?y danh sách vai trò:", error);
    return NextResponse.json(
      { error: "Không th? l?y danh sách vai trò" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roleName, permissions } = body;

    // Validate required fields
    if (!roleName) {
      return NextResponse.json(
        { error: "Thi?u tru?ng roleName b?t bu?c" },
        { status: 400 }
      );
    }

    // Check for existing roleName
    const existingRole = await prisma.role.findUnique({ where: { roleName } });
    if (existingRole) {
      return NextResponse.json(
        { error: "Tên vai trò dã t?n t?i" },
        { status: 400 }
      );
    }

    const role = await prisma.role.create({
      data: {
        roleName,
        permissions,
      },
      include: {
        users: true,
      },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error("L?i khi t?o vai trò:", error);
    return NextResponse.json(
      { error: "Không th? t?o vai trò" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
