import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";
import { hash } from "bcrypt";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    include: { role: true },
  });

  return NextResponse.json(
    users.map((user) => ({
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
    }))
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "Admin") {
    return NextResponse.json(
      { message: "Only admins can create users" },
      { status: 403 }
    );
  }

  const { username, email, fullName, roleId, isActive, password, isPending } =
    await request.json();
  if (!username || !email || !fullName || !roleId || !password) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  // Validate that the role exists
  const role = await prisma.role.findUnique({
    where: { roleId: roleId }, // roleId is a string (UUID)
  });
  if (!role) {
    return NextResponse.json({ message: "Role not found" }, { status: 400 });
  }

  const passwordHash = await hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      fullName,
      roleId: roleId,
      isActive,
      passwordHash,
      // Set approval status (default to false if isPending is undefined)
      isPending: isPending ?? false,
      pendingApproval: isPending ? new Date() : null,
      approvedBy: isPending ? null : session.user.id,
    },
    include: { role: true },
  });

  return NextResponse.json(
    {
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
    },
    { status: 201 }
  );
}
