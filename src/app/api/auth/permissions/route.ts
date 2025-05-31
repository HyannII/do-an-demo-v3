import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user with role and permissions directly from database
    const user = await prisma.user.findUnique({
      where: { userId: session.user.id },
      include: {
        role: {
          select: {
            permissions: true,
          },
        },
      },
    });

    if (!user || !user.role) {
      // Return empty permissions if user or role not found
      return NextResponse.json({});
    }

    // Return permissions as key-value pairs (permission: true/false)
    const permissions = user.role.permissions || {};

    return NextResponse.json(permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    // Return empty permissions on error to avoid breaking the app
    return NextResponse.json({});
  }
}
