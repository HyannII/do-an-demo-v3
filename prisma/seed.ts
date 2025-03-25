import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

async function main() {
//   // Xóa dữ liệu cũ (nếu cần)
//   await prisma.systemLog.deleteMany();
//   await prisma.notification.deleteMany();
//   await prisma.vMSLog.deleteMany();
//   await prisma.mediaLog.deleteMany();
//   await prisma.media.deleteMany();
//   await prisma.vMS.deleteMany();
//   await prisma.trafficPattern.deleteMany();
//   await prisma.trafficData.deleteMany();
//   await prisma.trafficLightLog.deleteMany();
//   await prisma.trafficLight.deleteMany();
//   await prisma.camera.deleteMany();
//   await prisma.junction.deleteMany();
//   await prisma.user.deleteMany();
//   await prisma.role.deleteMany();

  // 1. Chèn dữ liệu vào bảng Role
  const adminRole = await prisma.role.create({
    data: {
      roleId: uuidv4(),
      roleName: "Admin",
      description: "Quản trị viên hệ thống, có toàn quyền",
      permissions: {
        canManageUsers: true,
        canManageJunctions: true,
        canManageVMS: true,
      },
    },
  });

  const staffRole = await prisma.role.create({
    data: {
      roleId: uuidv4(),
      roleName: "Staff",
      description: "Nhân viên, quyền hạn giới hạn",
      permissions: {
        canManageUsers: false,
        canManageJunctions: true,
        canManageVMS: false,
      },
    },
  });

  // Kiểm tra nếu adminRole hoặc staffRole không tồn tại
  if (!adminRole || !staffRole) {
    throw new Error("Failed to create roles. Seeding aborted.");
  }

  // 2. Chèn dữ liệu vào bảng User
  const user1 = await prisma.user.create({
    data: {
      userId: uuidv4(),
      username: "admin1",
      passwordHash: "$2b$10$exampleHash1",
      email: "admin1@example.com",
      fullName: "Nguyễn Văn An",
      roleId: adminRole.roleId,
      createdAt: new Date("2023-01-01T08:00:00Z"),
      lastLogin: new Date("2025-03-25T09:00:00Z"),
      isActive: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      userId: uuidv4(),
      username: "staff1",
      passwordHash: "$2b$10$exampleHash2",
      email: "staff1@example.com",
      fullName: "Trần Thị Bình",
      roleId: staffRole.roleId,
      createdAt: new Date("2023-02-01T08:00:00Z"),
      lastLogin: new Date("2025-03-24T15:00:00Z"),
      isActive: true,
    },
  });

  // 3. Chèn dữ liệu vào bảng Junction
  const junction1 = await prisma.junction.create({
    data: {
      junctionId: uuidv4(),
      junctionName: "Ngã tư Kim Mã - Liễu Giai",
      location: "Quận Ba Đình, Hà Nội",
      latitude: 21.0315,
      longitude: 105.8223,
      description: "Ngã tư đông đúc ở trung tâm Hà Nội",
    },
  });

  const junction2 = await prisma.junction.create({
    data: {
      junctionId: uuidv4(),
      junctionName: "Ngã tư Nguyễn Trãi - Khuất Duy Tiến",
      location: "Quận Thanh Xuân, Hà Nội",
      latitude: 20.9912,
      longitude: 105.8015,
      description: "Ngã tư lớn gần Đại học Quốc gia Hà Nội",
    },
  });

  // 4. Chèn dữ liệu vào bảng Camera
  const camera1 = await prisma.camera.create({
    data: {
      cameraId: uuidv4(),
      cameraName: "Camera 1 - Kim Mã",
      ipAddress: "192.168.1.101",
      location: "Góc đông bắc ngã tư Kim Mã",
      latitude: 21.0317,
      longitude: 105.8225,
      model: "Hikvision DS-2CD2143G0-I",
      manufacturer: "Hikvision",
      installationDate: new Date("2022-05-10T00:00:00Z"),
      isActive: true,
      junctionId: junction1.junctionId,
    },
  });

  const camera2 = await prisma.camera.create({
    data: {
      cameraId: uuidv4(),
      cameraName: "Camera 2 - Nguyễn Trãi",
      ipAddress: "192.168.1.102",
      location: "Góc tây nam ngã tư Nguyễn Trãi",
      latitude: 20.9914,
      longitude: 105.8017,
      model: "Dahua IPC-HFW2431R-ZS",
      manufacturer: "Dahua",
      installationDate: new Date("2022-06-15T00:00:00Z"),
      isActive: true,
      junctionId: junction2.junctionId,
    },
  });

  // 5. Chèn dữ liệu vào bảng TrafficLight
  const trafficLight1 = await prisma.trafficLight.create({
    data: {
      trafficLightId: uuidv4(),
      lightName: "Đèn 1 - Kim Mã",
      ipAddress: "192.168.1.201",
      location: "Hướng bắc ngã tư Kim Mã",
      latitude: 21.0316,
      longitude: 105.8224,
      junctionId: junction1.junctionId,
      status: "green",
      lastMaintenance: new Date("2024-01-10T00:00:00Z"),
      isActive: true,
    },
  });

  const trafficLight2 = await prisma.trafficLight.create({
    data: {
      trafficLightId: uuidv4(),
      lightName: "Đèn 2 - Nguyễn Trãi",
      ipAddress: "192.168.1.202",
      location: "Hướng nam ngã tư Nguyễn Trãi",
      latitude: 20.9913,
      longitude: 105.8016,
      junctionId: junction2.junctionId,
      status: "red",
      lastMaintenance: new Date("2024-02-15T00:00:00Z"),
      isActive: true,
    },
  });

  // 6. Chèn dữ liệu vào bảng TrafficLightLog
  await prisma.trafficLightLog.createMany({
    data: [
      {
        logId: uuidv4(),
        trafficLightId: trafficLight1.trafficLightId,
        changeTime: new Date("2025-03-25T10:00:00Z"),
        previousStatus: "red",
        newStatus: "green",
        changeReason: "Điều chỉnh theo lịch trình giao thông",
        triggeredByUserId: user1.userId,
      },
      {
        logId: uuidv4(),
        trafficLightId: trafficLight2.trafficLightId,
        changeTime: new Date("2025-03-25T10:05:00Z"),
        previousStatus: "green",
        newStatus: "red",
        changeReason: "Sự cố giao thông tại ngã tư",
        triggeredByUserId: user2.userId,
      },
    ],
    skipDuplicates: true,
  });

  // 7. Chèn dữ liệu vào bảng TrafficData
  await prisma.trafficData.createMany({
    data: [
      {
        dataId: uuidv4(),
        cameraId: camera1.cameraId,
        captureTime: new Date("2025-03-25T08:00:00Z"),
        vehicleCount: 150,
        pedestrianCount: 20,
        averageSpeed: 35.5,
        trafficDensity: "medium",
        rawData: { details: "Giờ cao điểm buổi sáng" },
      },
      {
        dataId: uuidv4(),
        cameraId: camera2.cameraId,
        captureTime: new Date("2025-03-25T08:30:00Z"),
        vehicleCount: 200,
        pedestrianCount: 30,
        averageSpeed: 30.0,
        trafficDensity: "high",
        rawData: { details: "Giờ cao điểm, ùn tắc nhẹ" },
      },
    ],
    skipDuplicates: true,
  });

  // 8. Chèn dữ liệu vào bảng TrafficPattern
  await prisma.trafficPattern.createMany({
    data: [
      {
        patternId: uuidv4(),
        junctionId: junction1.junctionId,
        patternName: "Giờ cao điểm sáng",
        description: "Cấu hình cho giờ cao điểm 7h-9h",
        timingConfiguration: { green: 60, yellow: 5, red: 30 },
        createdAt: new Date("2023-03-01T08:00:00Z"),
        createdByUserId: user1.userId,
      },
      {
        patternId: uuidv4(),
        junctionId: junction2.junctionId,
        patternName: "Giờ cao điểm chiều",
        description: "Cấu hình cho giờ cao điểm 17h-19h",
        timingConfiguration: { green: 50, yellow: 5, red: 40 },
        createdAt: new Date("2023-03-02T08:00:00Z"),
        createdByUserId: user2.userId,
      },
    ],
    skipDuplicates: true,
  });

  // 9. Chèn dữ liệu vào bảng VMS
  const vms1 = await prisma.vMS.create({
    data: {
      vmsId: uuidv4(),
      vmsName: "VMS 1 - Kim Mã",
      ipAddress: "192.168.1.301",
      location: "Cạnh ngã tư Kim Mã",
      latitude: 21.0318,
      longitude: 105.8226,
      message: "Cẩn thận ùn tắc giờ cao điểm",
      status: "operational",
      installationDate: new Date("2022-07-01T00:00:00Z"),
      lastUpdate: new Date("2025-03-25T09:00:00Z"),
      isActive: true,
      junctionId: junction1.junctionId,
    },
  });

  const vms2 = await prisma.vMS.create({
    data: {
      vmsId: uuidv4(),
      vmsName: "VMS 2 - Nguyễn Trãi",
      ipAddress: "192.168.1.302",
      location: "Cạnh ngã tư Nguyễn Trãi",
      latitude: 20.9915,
      longitude: 105.8018,
      message: "Giảm tốc độ, có công trình phía trước",
      status: "maintenance",
      installationDate: new Date("2022-08-01T00:00:00Z"),
      lastUpdate: new Date("2025-03-25T09:00:00Z"),
      isActive: true,
      junctionId: junction2.junctionId,
    },
  });

  // 10. Chèn dữ liệu vào bảng Media
  const media1 = await prisma.media.create({
    data: {
      mediaId: uuidv4(),
      mediaName: "Hình ảnh cảnh báo ùn tắc",
      mediaType: "image",
      size: 2.5,
      ossDir: "/media/images/traffic_warning.jpg",
      thumbnailUrl: "/thumbnails/small/traffic_warning.jpg",
      bigThumbnailUrl: "/thumbnails/big/traffic_warning.jpg",
      defaultImageUrl: "/default/traffic_warning.jpg",
      version: "1.0",
      uploadPath: "/uploads/traffic_warning.jpg",
      uniqueId: "media_001",
      duration: null,
      status: "uploaded",
      content: null,
      createdAt: new Date("2025-03-25T08:00:00Z"),
      lastUpdatedAt: new Date("2025-03-25T08:00:00Z"),
      uploadedByUserId: user1.userId,
      vmsId: vms1.vmsId,
    },
  });

  const media2 = await prisma.media.create({
    data: {
      mediaId: uuidv4(),
      mediaName: "Video hướng dẫn giao thông",
      mediaType: "video",
      size: 15.0,
      ossDir: "/media/videos/traffic_guide.mp4",
      thumbnailUrl: "/thumbnails/small/traffic_guide.jpg",
      bigThumbnailUrl: "/thumbnails/big/traffic_guide.jpg",
      defaultImageUrl: "/default/traffic_guide.jpg",
      version: "1.0",
      uploadPath: "/uploads/traffic_guide.mp4",
      uniqueId: "media_002",
      duration: "00:02:30.000",
      status: "uploaded",
      content: null,
      createdAt: new Date("2025-03-25T08:30:00Z"),
      lastUpdatedAt: new Date("2025-03-25T08:30:00Z"),
      uploadedByUserId: user2.userId,
      vmsId: vms2.vmsId,
    },
  });

  // 11. Chèn dữ liệu vào bảng MediaLog
  await prisma.mediaLog.createMany({
    data: [
      {
        logId: uuidv4(),
        mediaId: media1.mediaId,
        action: "uploaded",
        actionTime: new Date("2025-03-25T08:00:00Z"),
        details: { message: "Tải lên thành công" },
        triggeredByUserId: user1.userId,
      },
      {
        logId: uuidv4(),
        mediaId: media2.mediaId,
        action: "uploaded",
        actionTime: new Date("2025-03-25T08:30:00Z"),
        details: { message: "Tải lên thành công" },
        triggeredByUserId: user2.userId,
      },
    ],
    skipDuplicates: true,
  });

  // 12. Chèn dữ liệu vào bảng VMSLog
  await prisma.vMSLog.createMany({
    data: [
      {
        logId: uuidv4(),
        vmsId: vms1.vmsId,
        changeTime: new Date("2025-03-25T09:00:00Z"),
        previousMessage: "Đường thông thoáng",
        newMessage: "Cẩn thận ùn tắc giờ cao điểm",
        changeReason: "Cập nhật thông báo giờ cao điểm",
        triggeredByUserId: user1.userId,
      },
      {
        logId: uuidv4(),
        vmsId: vms2.vmsId,
        changeTime: new Date("2025-03-25T09:00:00Z"),
        previousMessage: "Đường thông thoáng",
        newMessage: "Giảm tốc độ, có công trình phía trước",
        changeReason: "Cảnh báo công trình xây dựng",
        triggeredByUserId: user2.userId,
      },
    ],
    skipDuplicates: true,
  });

  // 13. Chèn dữ liệu vào bảng Notification
  await prisma.notification.createMany({
    data: [
      {
        notificationId: uuidv4(),
        notificationType: "alert",
        message: "Ùn tắc tại ngã tư Kim Mã",
        createdAt: new Date("2025-03-25T08:00:00Z"),
        isRead: false,
        userId: user1.userId,
      },
      {
        notificationId: uuidv4(),
        notificationType: "warning",
        message: "Công trình tại ngã tư Nguyễn Trãi",
        createdAt: new Date("2025-03-25T08:30:00Z"),
        isRead: false,
        userId: user2.userId,
      },
    ],
    skipDuplicates: true,
  });

  // 14. Chèn dữ liệu vào bảng SystemLog
  await prisma.systemLog.createMany({
    data: [
      {
        logId: uuidv4(),
        logTime: new Date("2025-03-25T09:00:00Z"),
        eventType: "login",
        description: "Admin đăng nhập hệ thống",
        userId: user1.userId,
        ipAddress: "192.168.1.10",
      },
      {
        logId: uuidv4(),
        logTime: new Date("2025-03-25T09:05:00Z"),
        eventType: "update",
        description: "Nhân viên cập nhật thông báo VMS",
        userId: user2.userId,
        ipAddress: "192.168.1.11",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
