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

    // Validate roleId
    let finalRoleId = roleId;

    // Nếu roleId không được cung cấp, lấy roleId mặc định từ bảng Role (ví dụ: role "Admin")
    if (!finalRoleId) {
      const defaultRole = await prisma.role.findFirst({
        where: { roleName: "Admin" }, // Giả sử bạn có một role mặc định là "Admin"
      });

      if (!defaultRole) {
        return NextResponse.json(
          { message: "Không tìm thấy role mặc định" },
          { status: 400 }
        );
      }

      finalRoleId = defaultRole.roleId; // roleId là một chuỗi UUID
    }

    // Kiểm tra xem roleId có tồn tại trong bảng Role không
    const roleExists = await prisma.role.findUnique({
      where: { roleId: finalRoleId },
    });

    if (!roleExists) {
      return NextResponse.json(
        { message: "Role không tồn tại" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
        fullName,
        roleId: finalRoleId, // Đảm bảo roleId là một chuỗi UUID
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
