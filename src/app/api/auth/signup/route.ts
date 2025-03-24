import prisma from "../../../../../lib/prisma";
import { NextResponse } from "next/server";
import { hash } from "bcrypt";

export async function POST(req: Request) {
  try {
    const { username, email, password, fullName, roleId } = await req.json();

    // Validate required fields
    if (!username || !email || !password || !fullName) {
      return NextResponse.json(
        { message: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Tên đăng nhập đã tồn tại" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword, // Use the hashed password here
        fullName,
        roleId: roleId || 4,
        createdAt: new Date(),
        isActive: true,
      },
    });

    // Log the signup
    await prisma.systemLog.create({
      data: {
        eventType: "REGISTRATION",
        description: "Đăng ký tài khoản mới",
        userId: user.userId,
      },
    });

    return NextResponse.json(
      {
        message: "Đăng ký thành công",
        userId: user.userId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}
