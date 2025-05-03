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
      { error: "ID người dùng không hợp lệ" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { username, email, fullName, roleId, isActive } = body;

    // Validate required fields
    if (!username || !email || !fullName || !roleId) {
      return NextResponse.json(
        { error: "Thiếu các trường bắt buộc" },
        { status: 400 }
      );
    }

    // Validate user exists
    const user = await prisma.user.findUnique({ where: { userId: id } });
    if (!user) {
      return NextResponse.json(
        { error: "Không tìm thấy người dùng" },
        { status: 400 }
      );
    }

    // Validate role exists
    const role = await prisma.role.findUnique({ where: { roleId } });
    if (!role) {
      return NextResponse.json(
        { error: "Không tìm thấy vai trò" },
        { status: 400 }
      );
    }

    // Check for duplicate username or email (excluding current user)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
        NOT: { userId: id },
      },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Tên người dùng hoặc email đã tồn tại" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { userId: id },
      data: {
        username,
        email,
        fullName,
        roleId,
        isActive,
      },
      include: {
        role: true,
        trafficPatterns: true,
      },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("Lỗi khi cập nhật người dùng:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật người dùng" },
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
      { error: "ID người dùng không hợp lệ" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { userId: id } });

    if (!user) {
      return NextResponse.json(
        { error: "Không tìm thấy người dùng" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { userId: id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Lỗi khi xóa người dùng:", error);
    return NextResponse.json(
      { error: "Không thể xóa người dùng" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
