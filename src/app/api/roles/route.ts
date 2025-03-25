import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      select: {
        roleId: true,
        roleName: true,
        description: true,
      },
    });

    return NextResponse.json(roles, { status: 200 });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}
