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
      { error: "ID vai trò không hợp lệ" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { roleName, permissions } = body;

    // Validate required fields
    if (!roleName) {
      return NextResponse.json(
        { error: "Thiếu trường roleName bắt buộc" },
        { status: 400 }
      );
    }

    // Validate role exists
    const role = await prisma.role.findUnique({ where: { roleId: id } });
    if (!role) {
      return NextResponse.json(
        { error: "Không tìm thấy vai trò" },
        { status: 400 }
      );
    }

    // Check for duplicate roleName (excluding current role)
    const existingRole = await prisma.role.findFirst({
      where: {
        roleName,
        NOT: { roleId: id },
      },
    });
    if (existingRole) {
      return NextResponse.json(
        { error: "Tên vai trò đã tồn tại" },
        { status: 400 }
      );
    }

    const updatedRole = await prisma.role.update({
      where: { roleId: id },
      data: {
        roleName,
        permissions,
      },
      include: {
        users: true,
      },
    });

    return NextResponse.json(updatedRole, { status: 200 });
  } catch (error) {
    console.error("Lỗi khi cập nhật vai trò:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật vai trò" },
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
      { error: "ID vai trò không hợp lệ" },
      { status: 400 }
    );
  }

  try {
    const role = await prisma.role.findUnique({ where: { roleId: id } });

    if (!role) {
      return NextResponse.json(
        { error: "Không tìm thấy vai trò" },
        { status: 400 }
      );
    }

    // Check if role is associated with any users
    const userCount = await prisma.user.count({ where: { roleId: id } });
    if (userCount > 0) {
      return NextResponse.json(
        { error: "Không thể xóa vai trò vì đang có người dùng liên kết" },
        { status: 400 }
      );
    }

    await prisma.role.delete({
      where: { roleId: id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Lỗi khi xóa vai trò:", error);
    return NextResponse.json(
      { error: "Không thể xóa vai trò" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
