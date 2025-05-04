import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../../lib/auth";
import prisma from "../../../../../../lib/prisma";
import { compare, hash } from "bcrypt";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = params.id;
  if (!userId) {
    return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
  }

  const { oldPassword, newPassword, adminPassword } = await request.json();
  if (!newPassword) {
    return NextResponse.json(
      { message: "New password is required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { userId },
    include: { role: true },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if (session.user.role !== "Admin" && userId !== session.user.id) {
    return NextResponse.json(
      { message: "Unauthorized to change this user's password" },
      { status: 403 }
    );
  }

  if (session.user.role === "Admin" && adminPassword) {
    const adminUser = await prisma.user.findUnique({
      where: { userId: session.user.id },
    });
    if (!adminUser || !(await compare(adminPassword, adminUser.passwordHash))) {
      return NextResponse.json(
        { message: "Invalid admin password" },
        { status: 401 }
      );
    }
  } else if (oldPassword) {
    if (!(await compare(oldPassword, user.passwordHash))) {
      return NextResponse.json(
        { message: "Invalid old password" },
        { status: 401 }
      );
    }
  } else {
    return NextResponse.json(
      { message: "Old password or admin password required" },
      { status: 400 }
    );
  }

  const newPasswordHash = await hash(newPassword, 10);
  await prisma.user.update({
    where: { userId },
    data: { passwordHash: newPasswordHash },
  });

  return NextResponse.json({ message: "Password changed successfully" });
}
