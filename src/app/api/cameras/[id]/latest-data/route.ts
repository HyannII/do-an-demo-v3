import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

// Create a new Prisma client for each request to avoid caching issues
const createPrismaClient = () => new PrismaClient();

// Helper function to get date in GMT+7
const getGMT7Date = (date = new Date()) => {
  // Create date with GMT+7 offset (7 hours * 60 minutes * 60 seconds * 1000 milliseconds)
  const gmtOffset = 7 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
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
    console.log(`Fetching latest camera data for camera ID: ${id}`);

    // Fetch the latest camera data record by timestamp
    const latestCameraData = await prisma.cameraData.findFirst({
      where: {
        cameraId: id,
      },
      orderBy: {
        timestamp: "desc", // Sort by timestamp descending to get the latest record
      },
      include: {
        camera: true, // Include camera information
      },
    });

    console.log(`Latest camera data query completed for camera ${id}`);

    // If there's no data, return an empty response with 200 status
    if (!latestCameraData) {
      console.log(`No camera data found for camera ${id}`);
      return NextResponse.json(
        {
          status: "error",
          message: "No camera data found",
          cameraId: id,
          motorcycleCount: 0,
          carCount: 0,
          truckCount: 0,
          busCount: 0,
          timestamp: null,
          lastUpdated: getGMT7Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Convert timestamp to GMT+7 for display
    const timestampGMT7 = getGMT7Date(new Date(latestCameraData.timestamp));

    console.log(`Latest camera data found:`, {
      cameraId: latestCameraData.cameraId,
      timestamp: timestampGMT7.toISOString(),
      motorcycles: latestCameraData.motorcycleCount,
      cars: latestCameraData.carCount,
      trucks: latestCameraData.truckCount,
      buses: latestCameraData.busCount,
    });

    // Response with Cache-Control headers to prevent caching
    const response = NextResponse.json(
      {
        status: "success",
        data: {
          cameraId: latestCameraData.cameraId,
          motorcycleCount: latestCameraData.motorcycleCount,
          carCount: latestCameraData.carCount,
          truckCount: latestCameraData.truckCount,
          busCount: latestCameraData.busCount,
          timestamp: timestampGMT7.toISOString(),
          camera: latestCameraData.camera,
          lastUpdated: getGMT7Date().toISOString(),
        },
      },
      { status: 200 }
    );

    // Add headers to prevent caching
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Error fetching latest camera data:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to fetch camera data",
        error: error.message,
      },
      { status: 500 }
    );
  } finally {
    // Disconnect Prisma client to prevent connection pooling issues
    await prisma.$disconnect();
  }
}
