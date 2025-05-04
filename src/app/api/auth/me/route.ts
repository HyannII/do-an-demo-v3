import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { userId: session.user.id }, // Use the string directly
    include: { role: true },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

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
    createdAt: user.createdAt.toISOString(),
    trafficPatterns: user.trafficPatterns,
  });
}
