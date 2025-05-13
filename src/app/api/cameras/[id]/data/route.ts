import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

// Create a new Prisma client for each request to avoid caching issues
const createPrismaClient = () => new PrismaClient();

// Helper function to get date in GMT+7
const getGMT7Date = (date = new Date()) => {
  // Create date with GMT+7 offset (7 hours * 60 minutes * 60 seconds * 1000 milliseconds)
  const gmtOffset = 7 * 60 * 60 * 1000;
  const utc = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
  return new Date(utc + gmtOffset);
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const timestamp = searchParams.get("timestamp") || Date.now().toString(); // Add timestamp to break cache

  if (!id) {
    return NextResponse.json({ error: "Invalid camera ID" }, { status: 400 });
  }

  // Create a new instance of Prisma for this request
  const prisma = createPrismaClient();

  try {
    // Get the start and end of today in GMT+7
    const now = getGMT7Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`Fetching camera data for today from ${today.toISOString()} to ${tomorrow.toISOString()}`);

    // Fetch camera data for today
    const cameraData = await prisma.cameraData.findMany({
      where: {
        cameraId: id,
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    console.log(`Found ${cameraData.length} camera data records for today`);

    // If there's no data for today, return an empty response with 200 status
    if (cameraData.length === 0) {
      return NextResponse.json({
        cameraId: id,
        totalMotorcycleCount: 0,
        totalCarCount: 0,
        totalTruckCount: 0,
        totalBusCount: 0,
        entries: [],
        lastUpdated: getGMT7Date().toISOString(),
      }, { status: 200 });
    }

    // Calculate the total counts
    const totalMotorcycleCount = cameraData.reduce((sum, entry) => sum + entry.motorcycleCount, 0);
    const totalCarCount = cameraData.reduce((sum, entry) => sum + entry.carCount, 0);
    const totalTruckCount = cameraData.reduce((sum, entry) => sum + entry.truckCount, 0);
    const totalBusCount = cameraData.reduce((sum, entry) => sum + entry.busCount, 0);

    console.log(`Total counts - Motorcycles: ${totalMotorcycleCount}, Cars: ${totalCarCount}, Trucks: ${totalTruckCount}, Buses: ${totalBusCount}`);

    // Response with Cache-Control headers to prevent caching
    const response = NextResponse.json({
      cameraId: id,
      totalMotorcycleCount,
      totalCarCount,
      totalTruckCount,
      totalBusCount,
      entries: cameraData,
      lastUpdated: getGMT7Date().toISOString(),
    }, { status: 200 });

    // Add headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error("Error fetching camera data:", error);
    return NextResponse.json(
      { error: "Failed to fetch camera data" },
      { status: 500 }
    );
  } finally {
    // Disconnect Prisma client to prevent connection pooling issues
    await prisma.$disconnect();
  }
} 