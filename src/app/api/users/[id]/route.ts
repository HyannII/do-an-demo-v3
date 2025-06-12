import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id: userId } = await params;
  if (!userId) {
    return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
  }

  if (session.user.role !== "Admin" && userId !== session.user.id) {
    return NextResponse.json(
      { message: "Unauthorized to update this user" },
      { status: 403 }
    );
  }

  const { username, email, fullName, roleId, isActive, isPending } = await request.json();
  if (!username || !email || !fullName) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  const updateData: any = { username, email, fullName };
  if (session.user.role === "Admin") {
    if (roleId) {
      const role = await prisma.role.findUnique({
        where: { roleId: roleId },
      });
      if (!role) {
        return NextResponse.json(
          { message: "Role not found" },
          { status: 400 }
        );
      }
      updateData.roleId = roleId;
    }
    updateData.isActive = isActive !== undefined ? isActive : undefined;
    
    // Handle approval status changes
    if (isPending !== undefined) {
      updateData.isPending = isPending;
      
      // If admin is approving the user
      if (isPending === false) {
        updateData.approvedBy = session.user.id;
      }
    }
  }

  const user = await prisma.user.update({
    where: { userId },
    data: updateData,
    include: { role: true, trafficPatterns: true },
  });

  return NextResponse.json({
    userId: user.userId,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    roleId: user.roleId,
    role: {
      roleId: user.role.roleId,
      roleName: user.role.roleName,
      permissions: user.role.permissions,
    },
    isActive: user.isActive,
    isPending: user.isPending,
    pendingApproval: user.pendingApproval?.toISOString(),
    approvedBy: user.approvedBy,
    createdAt: user.createdAt.toISOString(),
    trafficPatterns: user.trafficPatterns,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id: userId } = await params;
  if (!userId) {
    return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
  }

  if (session.user.role !== "Admin") {
    return NextResponse.json(
      { message: "Only admins can delete users" },
      { status: 403 }
    );
  }

  if (userId === session.user.id) {
    return NextResponse.json(
      { message: "Cannot delete logged-in user" },
      { status: 403 }
    );
  }

  await prisma.user.delete({ where: { userId } });
  return new NextResponse(null, { status: 204 });
}
