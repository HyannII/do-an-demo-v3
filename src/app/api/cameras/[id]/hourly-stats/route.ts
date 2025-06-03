import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

// Create a new Prisma client for each request to avoid caching issues
const createPrismaClient = () => new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: "Invalid camera ID" }, { status: 400 });
  }

  const prisma = createPrismaClient();

  try {
    // Get current date in UTC
    const nowUTC = new Date();

    // Add 7 hours to get GMT+7 time (for determining current day)
    const nowGMT7 = new Date(nowUTC.getTime() + 7 * 60 * 60 * 1000);

    // Extract date components from GMT+7 time
    const year = nowGMT7.getUTCFullYear();
    const month = nowGMT7.getUTCMonth();
    const day = nowGMT7.getUTCDate();

    // Create start of today at 00:00:00 UTC using the date from GMT+7
    const startOfTodayUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

    // Create start of next day at 00:00:00 UTC
    const startOfNextDayUTC = new Date(
      Date.UTC(year, month, day + 1, 0, 0, 0, 0)
    );

    console.log(`\n=== TIME INFORMATION ===`);
    console.log(`Current time UTC: ${nowUTC.toISOString()}`);
    console.log(`Current time GMT+7: ${nowGMT7.toISOString()} (UTC + 7h)`);
    console.log(
      `Extracted date from GMT+7: ${year}-${String(month + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`
    );
    console.log(`Today start UTC: ${startOfTodayUTC.toISOString()}`);
    console.log(`Tomorrow start UTC: ${startOfNextDayUTC.toISOString()}`);
    console.log(`=========================`);

    // Log the equivalent PostgreSQL query
    console.log("\n=== EQUIVALENT POSTGRESQL QUERY ===");
    console.log('SELECT * FROM "CameraData"');
    console.log(`WHERE "cameraId" = '${id}'`);
    console.log(`  AND "timestamp" >= '${startOfTodayUTC.toISOString()}'`);
    console.log(`  AND "timestamp" < '${startOfNextDayUTC.toISOString()}'`);
    console.log('ORDER BY "timestamp" ASC;');
    console.log("=====================================\n");

    // Fetch all camera data for today
    const cameraData = await prisma.cameraData.findMany({
      where: {
        cameraId: id,
        timestamp: {
          gte: startOfTodayUTC,
          lt: startOfNextDayUTC,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    console.log(`Found ${cameraData.length} records for camera ${id}`);

    // Initialize hourly buckets for 24 hours (0-23) in UTC
    const hourlyData: {
      hour: number;
      time: string;
      motorcycleCount: number;
      carCount: number;
      truckCount: number;
      busCount: number;
    }[] = [];

    // Create buckets for all 24 hours (0-23) in UTC
    for (let hour = 0; hour < 24; hour++) {
      const hourDate = new Date(startOfTodayUTC);
      hourDate.setUTCHours(hour, 0, 0, 0);

      hourlyData.push({
        hour,
        time: hourDate.toISOString(),
        motorcycleCount: 0,
        carCount: 0,
        truckCount: 0,
        busCount: 0,
      });
    }

    // Aggregate data by hour - sum up all records in each 1-hour interval (UTC)
    cameraData.forEach((entry) => {
      // Get the UTC hour directly from the timestamp
      const entryHour = entry.timestamp.getUTCHours();

      // Find the corresponding hour bucket
      const hourBucket = hourlyData.find((h) => h.hour === entryHour);
      if (hourBucket) {
        hourBucket.motorcycleCount += entry.motorcycleCount;
        hourBucket.carCount += entry.carCount;
        hourBucket.truckCount += entry.truckCount;
        hourBucket.busCount += entry.busCount;
      }
    });

    // Calculate total counts for pie chart - sum all records
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

    const response = NextResponse.json(
      {
        cameraId: id,
        startDate: startOfTodayUTC.toISOString(),
        endDate: startOfNextDayUTC.toISOString(),
        totalMotorcycleCount,
        totalCarCount,
        totalTruckCount,
        totalBusCount,
        hourlyData,
        lastUpdated: new Date().toISOString(),
      },
      { status: 200 }
    );

    // Add headers to prevent caching
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Error fetching hourly camera statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch hourly camera statistics" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
