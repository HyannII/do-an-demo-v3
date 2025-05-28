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
    // Get current date and time
    const now = new Date();

    // Create start date at 00:00:00 today
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);

    // End date is current time
    const endDate = new Date(now);

    console.log(
      `Fetching hourly stats for camera ${id} from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    // Fetch camera data for today
    const cameraData = await prisma.cameraData.findMany({
      where: {
        cameraId: id,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    console.log(`Found ${cameraData.length} records for camera ${id}`);

    // Initialize hourly buckets from 00:00 to current hour
    const currentHour = now.getHours();
    const hourlyData: {
      hour: number;
      time: string;
      motorcycleCount: number;
      carCount: number;
      truckCount: number;
      busCount: number;
    }[] = [];

    // Create buckets for each hour from 0 to current hour
    for (let hour = 0; hour <= currentHour; hour++) {
      const hourDate = new Date(startDate);
      hourDate.setHours(hour, 0, 0, 0);

      hourlyData.push({
        hour,
        time: hourDate.toISOString(),
        motorcycleCount: 0,
        carCount: 0,
        truckCount: 0,
        busCount: 0,
      });
    }

    // Aggregate data by hour
    cameraData.forEach((entry) => {
      const entryDate = new Date(entry.timestamp);
      const entryHour = entryDate.getHours();

      // Find the corresponding hour bucket
      const hourBucket = hourlyData.find((h) => h.hour === entryHour);
      if (hourBucket) {
        hourBucket.motorcycleCount += entry.motorcycleCount;
        hourBucket.carCount += entry.carCount;
        hourBucket.truckCount += entry.truckCount;
        hourBucket.busCount += entry.busCount;
      }
    });

    // Calculate total counts
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
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
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
