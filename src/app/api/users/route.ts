import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        trafficPatterns: true,
      },
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("L?i khi l?y danh sách ngu?i dùng:", error);
    return NextResponse.json(
      { error: "Không th? l?y danh sách ngu?i dùng" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, fullName, roleId, isActive, password } = body;

    // Validate required fields
    if (!username || !email || !fullName || !roleId || !password) {
      return NextResponse.json(
        { error: "Thi?u các tru?ng b?t bu?c" },
        { status: 400 }
      );
    }

    // Validate role exists
    const role = await prisma.role.findUnique({ where: { roleId } });
    if (!role) {
      return NextResponse.json(
        { error: "Không tìm th?y vai trò" },
        { status: 400 }
      );
    }

    // Check for existing username or email
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Tên ngu?i dùng ho?c email dã t?n t?i" },
        { status: 400 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        fullName,
        roleId,
        isActive: isActive ?? true,
        passwordHash,
        createdAt: new Date(),
      },
      include: {
        role: true,
        trafficPatterns: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("L?i khi t?o ngu?i dùng:", error);
    return NextResponse.json(
      { error: "Không th? t?o ngu?i dùng" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
