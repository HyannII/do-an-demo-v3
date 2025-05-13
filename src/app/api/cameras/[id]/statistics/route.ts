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
  const period = searchParams.get("period") || "today"; // today, week, month, year
  const timestamp = searchParams.get("timestamp") || Date.now().toString(); // Add timestamp to break cache

  if (!id) {
    return NextResponse.json({ error: "Invalid camera ID" }, { status: 400 });
  }

  // Create a new instance of Prisma for this request
  const prisma = createPrismaClient();

  try {
    // Calculate date range based on period using GMT+7
    const now = getGMT7Date();
    let startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    
    switch (period) {
      case "today":
        // Start date already set to beginning of today
        break;
      case "week":
        // Go back to the start of the current week (Monday)
        const dayOfWeek = startDate.getDay() || 7; // Convert Sunday from 0 to 7
        const diff = dayOfWeek - 1; // Difference from Monday (1)
        startDate.setDate(startDate.getDate() - diff);
        break;
      case "month":
        // Go back to the start of the current month
        startDate.setDate(1);
        break;
      case "year":
        // Go back to the start of the current year
        startDate.setMonth(0, 1);
        break;
      default:
        return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    // Set end date to midnight of the next day from now
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    console.log(`Fetching statistics for camera ${id} for period ${period} from ${startDate.toISOString()} to ${endDate.toISOString()} in GMT+7`);

    // Fetch camera data for the specified period
    const cameraData = await prisma.cameraData.findMany({
      where: {
        cameraId: id,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    console.log(`Found ${cameraData.length} records for camera ${id} in period ${period}`);

    // If there's no data for the period, return an empty response with 200 status
    if (cameraData.length === 0) {
      return NextResponse.json({
        cameraId: id,
        period,
        totalMotorcycleCount: 0,
        totalCarCount: 0,
        totalTruckCount: 0,
        totalBusCount: 0,
        hourlyData: [],
        dailyData: [],
        lastUpdated: getGMT7Date().toISOString(),
      }, { status: 200 });
    }

    // Calculate the total counts
    const totalMotorcycleCount = cameraData.reduce((sum, entry) => sum + entry.motorcycleCount, 0);
    const totalCarCount = cameraData.reduce((sum, entry) => sum + entry.carCount, 0);
    const totalTruckCount = cameraData.reduce((sum, entry) => sum + entry.truckCount, 0);
    const totalBusCount = cameraData.reduce((sum, entry) => sum + entry.busCount, 0);

    console.log(`Total counts - Motorcycles: ${totalMotorcycleCount}, Cars: ${totalCarCount}, Trucks: ${totalTruckCount}, Buses: ${totalBusCount}`);

    // Prepare hourly and daily data for charts
    const hourlyData: { [key: string]: any } = {};
    const dailyData: { [key: string]: any } = {};

    // Process data for visualization
    cameraData.forEach(entry => {
      // Convert to GMT+7 for consistent display
      const timestamp = getGMT7Date(new Date(entry.timestamp));
      
      // Format hour key (e.g., "14:00") in GMT+7
      const hourKey = `${timestamp.getHours().toString().padStart(2, '0')}:00`;
      
      // Format day key (e.g., "2023-12-31") in GMT+7
      const dayKey = timestamp.toISOString().split('T')[0];

      // Initialize hourly data if it doesn't exist
      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = {
          time: hourKey,
          motorcycleCount: 0,
          carCount: 0,
          truckCount: 0,
          busCount: 0,
        };
      }

      // Initialize daily data if it doesn't exist
      if (!dailyData[dayKey]) {
        dailyData[dayKey] = {
          date: dayKey,
          motorcycleCount: 0,
          carCount: 0,
          truckCount: 0,
          busCount: 0,
        };
      }

      // Add counts to hourly and daily data
      hourlyData[hourKey].motorcycleCount += entry.motorcycleCount;
      hourlyData[hourKey].carCount += entry.carCount;
      hourlyData[hourKey].truckCount += entry.truckCount;
      hourlyData[hourKey].busCount += entry.busCount;

      dailyData[dayKey].motorcycleCount += entry.motorcycleCount;
      dailyData[dayKey].carCount += entry.carCount;
      dailyData[dayKey].truckCount += entry.truckCount;
      dailyData[dayKey].busCount += entry.busCount;
    });

    // Convert hourly and daily data to arrays and sort
    const hourlyDataArray = Object.values(hourlyData).sort((a, b) => {
      const hourA = parseInt(a.time.split(':')[0]);
      const hourB = parseInt(b.time.split(':')[0]);
      return hourA - hourB;
    });

    const dailyDataArray = Object.values(dailyData).sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    console.log(`Processed ${hourlyDataArray.length} hourly data points and ${dailyDataArray.length} daily data points`);

    // Response with Cache-Control headers to prevent caching
    const response = NextResponse.json({
      cameraId: id,
      period,
      totalMotorcycleCount,
      totalCarCount,
      totalTruckCount,
      totalBusCount,
      hourlyData: hourlyDataArray,
      dailyData: dailyDataArray,
      lastUpdated: getGMT7Date().toISOString(),
    }, { status: 200 });

    // Add headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error("Error fetching camera statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch camera statistics" },
      { status: 500 }
    );
  } finally {
    // Disconnect Prisma client to prevent connection pooling issues
    await prisma.$disconnect();
  }
} 