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

// Helper to format date as YYYY-MM-DD HH:MM:SS
const formatDateTime = (date: Date): string => {
  return date.toISOString().replace('T', ' ').substr(0, 19);
};

// Aggregate data points to limit total number and ensure minimum spacing
const aggregateDataPoints = (
  cameraData: any[],
  maxPoints: number = 50,
  minIntervalMinutes: number = 5
): any[] => {
  if (!cameraData || cameraData.length === 0) return [];
  
  // Sort data by timestamp
  const sortedData = [...cameraData].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // Calculate time range
  const firstTimestamp = new Date(sortedData[0].timestamp).getTime();
  const lastTimestamp = new Date(sortedData[sortedData.length - 1].timestamp).getTime();
  const totalTimeSpan = lastTimestamp - firstTimestamp;
  
  // If we have few data points already (fewer than maxPoints), add them directly
  if (sortedData.length <= maxPoints && 
      totalTimeSpan >= minIntervalMinutes * 60 * 1000 * (sortedData.length - 1)) {
    return sortedData.map(entry => ({
      ...entry,
      time: formatDateTime(new Date(entry.timestamp)),
      timestamp: new Date(entry.timestamp)
    }));
  }
  
  // Calculate optimal interval for buckets
  // Ensure we don't exceed maxPoints and respect minimum interval
  const optimalInterval = Math.max(
    totalTimeSpan / (maxPoints - 1),
    minIntervalMinutes * 60 * 1000 // Minimum interval in milliseconds
  );
  
  console.log(`Creating ${Math.min(maxPoints, Math.floor(totalTimeSpan / optimalInterval) + 1)} buckets with interval ${optimalInterval / (60 * 1000)} minutes`);
  
  // Create evenly spaced time buckets
  const buckets: { startTime: number; endTime: number; data: any }[] = [];
  let bucketStartTime = firstTimestamp;
  
  // Create buckets with start and end times
  while (bucketStartTime <= lastTimestamp) {
    const bucketEndTime = bucketStartTime + optimalInterval;
    buckets.push({
      startTime: bucketStartTime,
      endTime: bucketEndTime,
      data: {
        timestamp: new Date(bucketEndTime), // Use the end time as the timestamp for the bucket
        time: formatDateTime(new Date(bucketEndTime)),
        motorcycleCount: 0,
        carCount: 0,
        truckCount: 0,
        busCount: 0,
        dataPoints: 0
      }
    });
    bucketStartTime = bucketEndTime;
  }
  
  // Distribute data points into the buckets based on timestamp
  sortedData.forEach(entry => {
    const entryTime = new Date(entry.timestamp).getTime();
    
    // Find the bucket this entry belongs to
    for (let i = 0; i < buckets.length; i++) {
      // Special case for the last bucket - include the endpoint
      if (i === buckets.length - 1) {
        if (entryTime >= buckets[i].startTime && entryTime <= buckets[i].endTime) {
          buckets[i].data.motorcycleCount += entry.motorcycleCount;
          buckets[i].data.carCount += entry.carCount;
          buckets[i].data.truckCount += entry.truckCount;
          buckets[i].data.busCount += entry.busCount;
          buckets[i].data.dataPoints++;
          break;
        }
      }
      // For all other buckets, include start time but exclude end time
      else if (entryTime >= buckets[i].startTime && entryTime < buckets[i].endTime) {
        buckets[i].data.motorcycleCount += entry.motorcycleCount;
        buckets[i].data.carCount += entry.carCount;
        buckets[i].data.truckCount += entry.truckCount;
        buckets[i].data.busCount += entry.busCount;
        buckets[i].data.dataPoints++;
        break;
      }
    }
  });
  
  // Log the distribution
  const nonEmptyBuckets = buckets.filter(bucket => bucket.data.dataPoints > 0);
  console.log(`Aggregated data into ${nonEmptyBuckets.length} non-empty buckets out of ${buckets.length} total`);
  
  // Return only buckets that have data
  return nonEmptyBuckets.map(bucket => bucket.data);
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Fix synchronous params access by making it async/await
  const id = params?.id;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "today"; // today, week, month, year

  if (!id) {
    return NextResponse.json({ error: "Invalid camera ID" }, { status: 400 });
  }

  // Create a new instance of Prisma for this request
  const prisma = createPrismaClient();

  try {
    // Calculate date range based on period using GMT+7
    const now = getGMT7Date();
    let startDate = new Date(now);
    
    switch (period) {
      case "today":
        // Set to beginning of today (00:00:00)
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        // Go back to the start of the current week (Monday)
        startDate.setHours(0, 0, 0, 0);
        const dayOfWeek = startDate.getDay() || 7; // Convert Sunday from 0 to 7
        const diff = dayOfWeek - 1; // Difference from Monday (1)
        startDate.setDate(startDate.getDate() - diff);
        break;
      case "month":
        // Go back to the start of the current month
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "year":
        // Go back to the start of the current year
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    // Set end date to end of the current day (23:59:59.999)
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    console.log(`Fetching statistics for camera ${id} for period ${period} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

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
        lastUpdated: new Date().toISOString(),
      }, { status: 200 });
    }

    // Calculate the total counts
    const totalMotorcycleCount = cameraData.reduce((sum, entry) => sum + entry.motorcycleCount, 0);
    const totalCarCount = cameraData.reduce((sum, entry) => sum + entry.carCount, 0);
    const totalTruckCount = cameraData.reduce((sum, entry) => sum + entry.truckCount, 0);
    const totalBusCount = cameraData.reduce((sum, entry) => sum + entry.busCount, 0);

    console.log(`Total counts - Motorcycles: ${totalMotorcycleCount}, Cars: ${totalCarCount}, Trucks: ${totalTruckCount}, Buses: ${totalBusCount}`);

    // Prepare daily data for charts
    const dailyData: { [key: string]: any } = {};

    // Aggregate hourly data to a maximum of 50 data points
    // with a minimum interval of 5 minutes between points
    const aggregatedHourlyData = aggregateDataPoints(cameraData, 50, 5);
    console.log(`Aggregated to ${aggregatedHourlyData.length} data points`);

    // Process data for daily visualization
    cameraData.forEach(entry => {
      const timestamp = new Date(entry.timestamp);
      const dayKey = timestamp.toISOString().split('T')[0];

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

      // Add counts to daily data
      dailyData[dayKey].motorcycleCount += entry.motorcycleCount;
      dailyData[dayKey].carCount += entry.carCount;
      dailyData[dayKey].truckCount += entry.truckCount;
      dailyData[dayKey].busCount += entry.busCount;
    });

    // Prepare hourly data in the expected format
    const hourlyDataArray = aggregatedHourlyData.map(entry => ({
      time: entry.time,
      motorcycleCount: entry.motorcycleCount,
      carCount: entry.carCount,
      truckCount: entry.truckCount,
      busCount: entry.busCount
    }));

    // Convert daily data to array and sort
    const dailyDataArray = Object.values(dailyData).sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    console.log(`Returning ${hourlyDataArray.length} hourly data points and ${dailyDataArray.length} daily data points`);

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
      lastUpdated: new Date().toISOString(),
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