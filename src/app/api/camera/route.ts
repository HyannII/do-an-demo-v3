import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const vmsBoards = await prisma.vMS.findMany({
      select: {
        vmsId: true,
        vmsName: true,
        longitude: true,
        latitude: true,
        location: true,
        message: true,
        status: true,
      },
    });

    return NextResponse.json(vmsBoards, { status: 200 });
  } catch (error) {
    console.error("Error fetching VMS:", error);
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}
