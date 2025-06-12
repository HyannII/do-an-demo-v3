import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Helper function to get date in GMT+7
const getGMT7Date = (date = new Date()) => {
  // Create date with GMT+7 offset (7 hours * 60 minutes * 60 seconds * 1000 milliseconds)
  const gmtOffset = 7 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  return new Date(utc + gmtOffset);
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const timestamp = searchParams.get("timestamp") || Date.now().toString(); // Add timestamp to break cache

  if (!id) {
    return NextResponse.json({ error: "Invalid camera ID" }, { status: 400 });
  }

  try {
    // Get current GMT+7 time
    const nowGMT7 = getGMT7Date();

    // Create start and end of today in GMT+7, then convert back to UTC for database query
    const todayGMT7 = new Date(nowGMT7);
    todayGMT7.setHours(0, 0, 0, 0);

    const endOfTodayGMT7 = new Date(nowGMT7);
    endOfTodayGMT7.setHours(23, 59, 59, 999);

    // Convert GMT+7 times back to UTC for database query
    const gmtOffset = 7 * 60 * 60 * 1000;
    const todayUTC = new Date(todayGMT7.getTime() - gmtOffset);
    const endOfTodayUTC = new Date(endOfTodayGMT7.getTime() - gmtOffset);

    console.log(`Current GMT+7 time: ${nowGMT7.toISOString()}`);
    console.log(
      `GMT+7 Today: ${todayGMT7.toLocaleDateString(
        "vi-VN"
      )} ${todayGMT7.toLocaleTimeString("vi-VN")}`
    );
    console.log(
      `Fetching camera data for GMT+7 today (${todayGMT7.toISOString()} to ${endOfTodayGMT7.toISOString()})`
    );
    console.log(
      `Database query range UTC: ${todayUTC.toISOString()} to ${endOfTodayUTC.toISOString()}`
    );

    // Fetch camera data for today using UTC range
    const cameraData = await prisma.cameraData.findMany({
      where: {
        cameraId: id,
        timestamp: {
          gte: todayUTC,
          lte: endOfTodayUTC,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    console.log(
      `Found ${
        cameraData.length
      } camera data records for GMT+7 today (${todayGMT7.toLocaleDateString(
        "vi-VN"
      )})`
    );

    // Log some sample timestamps if we have data
    if (cameraData.length > 0) {
      console.log("Sample timestamps from database:");
      cameraData.slice(0, 3).forEach((entry, index) => {
        const entryGMT7 = getGMT7Date(new Date(entry.timestamp));
        console.log(
          `  ${
            index + 1
          }. DB UTC: ${entry.timestamp.toISOString()} -> GMT+7: ${entryGMT7.toISOString()}`
        );
      });
    }

    // If there's no data for today, return an empty response with 200 status
    if (cameraData.length === 0) {
      return NextResponse.json(
        {
          cameraId: id,
          totalMotorcycleCount: 0,
          totalCarCount: 0,
          totalTruckCount: 0,
          totalBusCount: 0,
          entries: [],
          lastUpdated: getGMT7Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Calculate the total counts
    const totalMotorcycleCount = cameraData.reduce(
      (sum, entry) => sum + entry.motorcycleCount,
      0
    );
    const totalCarCount = cameraData.reduce(
      (sum, entry) => sum + entry.carCount,
      0
    );
    const totalTruckCount = cameraData.reduce(
      (sum, entry) => sum + entry.truckCount,
      0
    );
    const totalBusCount = cameraData.reduce(
      (sum, entry) => sum + entry.busCount,
      0
    );

    console.log(
      `Total counts - Motorcycles: ${totalMotorcycleCount}, Cars: ${totalCarCount}, Trucks: ${totalTruckCount}, Buses: ${totalBusCount}`
    );

    // Response with Cache-Control headers to prevent caching
    const response = NextResponse.json(
      {
        cameraId: id,
        totalMotorcycleCount,
        totalCarCount,
        totalTruckCount,
        totalBusCount,
        entries: cameraData.map((entry) => ({
          ...entry,
          timestamp: getGMT7Date(new Date(entry.timestamp)),
        })),
        lastUpdated: getGMT7Date().toISOString(),
      },
      { status: 200 }
    );

    // Add headers to prevent caching
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Error fetching camera data:", error);
    return NextResponse.json(
      { error: "Failed to fetch camera data" },
      { status: 500 }
    );
  }
}
