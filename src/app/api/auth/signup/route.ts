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

    // Determine which role to use
    let finalRoleId = roleId;
    
    if (!finalRoleId) {
      // Try to find the Guest role as fallback
      const guestRole = await prisma.role.findFirst({
        where: { roleName: "Guest" },
      });
      
      if (guestRole) {
        finalRoleId = guestRole.roleId;
      } else {
        // Fallback to any role if Guest doesn't exist
        const anyRole = await prisma.role.findFirst();
        
        if (!anyRole) {
          return NextResponse.json(
            { message: "Không tìm thấy role nào trong hệ thống" },
            { status: 400 }
          );
        }
        
        finalRoleId = anyRole.roleId;
      }
    } else {
      // Verify the provided roleId exists
      const roleExists = await prisma.role.findUnique({
        where: { roleId: finalRoleId },
      });
      
      if (!roleExists) {
        return NextResponse.json(
          { message: "Role không tồn tại" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create user with pending status
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
        fullName,
        roleId: finalRoleId,
        createdAt: new Date(),
        isActive: true,
        isPending: true,                // User is pending approval
        pendingApproval: new Date(),    // Record when user requested approval
      },
    });

    return NextResponse.json(
      {
        message: "Đăng ký thành công. Tài khoản của bạn đang chờ quản trị viên phê duyệt.",
        userId: user.userId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}
