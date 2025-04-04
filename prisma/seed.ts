import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed dữ liệu cho bảng Role
  const role1 = await prisma.role.create({
    data: {
      roleName: "Admin",
      description: "Quản trị viên hệ thống",
      permissions: {
        canViewUsers: true,
        canEditUsers: true,
        canDeleteUsers: true,
        canViewRoles: true,
        canEditRoles: true,
        canDeleteRoles: true,
      },
    },
  });

  const role2 = await prisma.role.create({
    data: {
      roleName: "Operator",
      description: "Nhân viên vận hành",
      permissions: {
        canViewUsers: true,
        canEditUsers: false,
        canDeleteUsers: false,
        canViewRoles: true,
        canEditRoles: false,
        canDeleteRoles: false,
      },
    },
  });

  const role3 = await prisma.role.create({
    data: {
      roleName: "Technician",
      description: "Kỹ thuật viên",
      permissions: {
        canViewUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canViewRoles: false,
        canEditRoles: false,
        canDeleteRoles: false,
      },
    },
  });

  const role4 = await prisma.role.create({
    data: {
      roleName: "Viewer",
      description: "Người xem",
      permissions: {
        canViewUsers: true,
        canEditUsers: false,
        canDeleteUsers: false,
        canViewRoles: true,
        canEditRoles: false,
        canDeleteRoles: false,
      },
    },
  });

  const role5 = await prisma.role.create({
    data: {
      roleName: "Guest",
      description: "Khách",
      permissions: {
        canViewUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canViewRoles: false,
        canEditRoles: false,
        canDeleteRoles: false,
      },
    },
  });

  console.log("Seeded 5 roles");

  // Seed dữ liệu cho bảng User
  const user1 = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: "hashedpassword1",
      email: "admin@example.com",
      fullName: "Admin User",
      roleId: role1.roleId,
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      username: "operator1",
      passwordHash: "hashedpassword2",
      email: "operator1@example.com",
      fullName: "Operator One",
      roleId: role2.roleId,
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      username: "technician1",
      passwordHash: "hashedpassword3",
      email: "technician1@example.com",
      fullName: "Technician One",
      roleId: role3.roleId,
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true,
    },
  });

  const user4 = await prisma.user.create({
    data: {
      username: "viewer1",
      passwordHash: "hashedpassword4",
      email: "viewer1@example.com",
      fullName: "Viewer One",
      roleId: role4.roleId,
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true,
    },
  });

  const user5 = await prisma.user.create({
    data: {
      username: "guest1",
      passwordHash: "hashedpassword5",
      email: "guest1@example.com",
      fullName: "Guest One",
      roleId: role5.roleId,
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true,
    },
  });

  console.log("Seeded 5 users");

  // Seed dữ liệu cho bảng Junction
  const junction1 = await prisma.junction.create({
    data: {
      junctionName: "Ngã tư Kim Mã",
      location: "Hà Nội",
      latitude: 21.0315,
      longitude: 105.8213,
      description: "Ngã tư đông đúc ở trung tâm Hà Nội",
    },
  });

  const junction2 = await prisma.junction.create({
    data: {
      junctionName: "Ngã tư Láng Hạ",
      location: "Hà Nội",
      latitude: 21.0152,
      longitude: 105.8205,
      description: "Ngã tư gần khu văn phòng",
    },
  });

  const junction3 = await prisma.junction.create({
    data: {
      junctionName: "Ngã tư Đại Cồ Việt",
      location: "Hà Nội",
      latitude: 21.0087,
      longitude: 105.8471,
      description: "Ngã tư gần trường đại học",
    },
  });

  const junction4 = await prisma.junction.create({
    data: {
      junctionName: "Ngã tư Nguyễn Trãi",
      location: "Hà Nội",
      latitude: 20.9943,
      longitude: 105.8012,
      description: "Ngã tư đông đúc ở phía nam Hà Nội",
    },
  });

  const junction5 = await prisma.junction.create({
    data: {
      junctionName: "Ngã tư Giải Phóng",
      location: "Hà Nội",
      latitude: 20.9876,
      longitude: 105.8409,
      description: "Ngã tư gần bến xe",
    },
  });

  console.log("Seeded 5 junctions");

  // Seed dữ liệu cho bảng Camera
  const camera1 = await prisma.camera.create({
    data: {
      cameraName: "Camera 1",
      cameraAddress: "192.168.1.101",
      location: "Ngã tư Kim Mã - Góc Tây Bắc",
      latitude: 21.0316,
      longitude: 105.8214,
      model: "Hikvision DS-2CD2143G0-I",
      manufacturer: "Hikvision",
      installationDate: new Date("2023-01-15"),
      isActive: true,
      junctionId: junction1.junctionId,
    },
  });

  const camera2 = await prisma.camera.create({
    data: {
      cameraName: "Camera 2",
      cameraAddress: "192.168.1.102",
      location: "Ngã tư Kim Mã - Góc Đông Nam",
      latitude: 21.0314,
      longitude: 105.8212,
      model: "Hikvision DS-2CD2143G0-I",
      manufacturer: "Hikvision",
      installationDate: new Date("2023-01-15"),
      isActive: true,
      junctionId: junction1.junctionId,
    },
  });

  const camera3 = await prisma.camera.create({
    data: {
      cameraName: "Camera 3",
      cameraAddress: "192.168.1.103",
      location: "Ngã tư Láng Hạ - Góc Tây Nam",
      latitude: 21.0151,
      longitude: 105.8204,
      model: "Dahua IPC-HFW2431R-ZS",
      manufacturer: "Dahua",
      installationDate: new Date("2023-02-10"),
      isActive: true,
      junctionId: junction2.junctionId,
    },
  });

  const camera4 = await prisma.camera.create({
    data: {
      cameraName: "Camera 4",
      cameraAddress: "192.168.1.104",
      location: "Ngã tư Đại Cồ Việt - Góc Đông Bắc",
      latitude: 21.0088,
      longitude: 105.8472,
      model: "Dahua IPC-HFW2431R-ZS",
      manufacturer: "Dahua",
      installationDate: new Date("2023-03-05"),
      isActive: true,
      junctionId: junction3.junctionId,
    },
  });

  const camera5 = await prisma.camera.create({
    data: {
      cameraName: "Camera 5",
      cameraAddress: "192.168.1.105",
      location: "Ngã tư Nguyễn Trãi - Góc Tây Bắc",
      latitude: 20.9944,
      longitude: 105.8013,
      model: "Axis P3225-LVE",
      manufacturer: "Axis",
      installationDate: new Date("2023-04-01"),
      isActive: true,
      junctionId: junction4.junctionId,
    },
  });

  console.log("Seeded 5 cameras");

  // Seed dữ liệu cho bảng TrafficLight
  const trafficLight1 = await prisma.trafficLight.create({
    data: {
      lightName: "Đèn 1",
      ipAddress: "192.168.1.201",
      location: "Ngã tư Kim Mã - Hướng Bắc",
      latitude: 21.0317,
      longitude: 105.8215,
      junctionId: junction1.junctionId,
      status: "green",
      lastMaintenance: new Date("2023-06-01"),
      isActive: true,
    },
  });

  const trafficLight2 = await prisma.trafficLight.create({
    data: {
      lightName: "Đèn 2",
      ipAddress: "192.168.1.202",
      location: "Ngã tư Kim Mã - Hướng Nam",
      latitude: 21.0313,
      longitude: 105.8211,
      junctionId: junction1.junctionId,
      status: "red",
      lastMaintenance: new Date("2023-06-01"),
      isActive: true,
    },
  });

  const trafficLight3 = await prisma.trafficLight.create({
    data: {
      lightName: "Đèn 3",
      ipAddress: "192.168.1.203",
      location: "Ngã tư Láng Hạ - Hướng Tây",
      latitude: 21.015,
      longitude: 105.8203,
      junctionId: junction2.junctionId,
      status: "yellow",
      lastMaintenance: new Date("2023-07-15"),
      isActive: true,
    },
  });

  const trafficLight4 = await prisma.trafficLight.create({
    data: {
      lightName: "Đèn 4",
      ipAddress: "192.168.1.204",
      location: "Ngã tư Đại Cồ Việt - Hướng Đông",
      latitude: 21.0086,
      longitude: 105.847,
      junctionId: junction3.junctionId,
      status: "green",
      lastMaintenance: new Date("2023-08-20"),
      isActive: true,
    },
  });

  const trafficLight5 = await prisma.trafficLight.create({
    data: {
      lightName: "Đèn 5",
      ipAddress: "192.168.1.205",
      location: "Ngã tư Nguyễn Trãi - Hướng Bắc",
      latitude: 20.9945,
      longitude: 105.8014,
      junctionId: junction4.junctionId,
      status: "red",
      lastMaintenance: new Date("2023-09-10"),
      isActive: true,
    },
  });

  console.log("Seeded 5 traffic lights");

  // Seed dữ liệu cho bảng TrafficData
  await prisma.trafficData.create({
    data: {
      cameraId: camera1.cameraId,
      captureTime: new Date(),
      vehicleCount: 50,
      pedestrianCount: 20,
      averageSpeed: 40.5,
      trafficDensity: "medium",
      rawData: { additionalInfo: "Sample data 1" },
    },
  });

  await prisma.trafficData.create({
    data: {
      cameraId: camera2.cameraId,
      captureTime: new Date(),
      vehicleCount: 70,
      pedestrianCount: 15,
      averageSpeed: 35.0,
      trafficDensity: "high",
      rawData: { additionalInfo: "Sample data 2" },
    },
  });

  await prisma.trafficData.create({
    data: {
      cameraId: camera3.cameraId,
      captureTime: new Date(),
      vehicleCount: 30,
      pedestrianCount: 10,
      averageSpeed: 45.0,
      trafficDensity: "low",
      rawData: { additionalInfo: "Sample data 3" },
    },
  });

  await prisma.trafficData.create({
    data: {
      cameraId: camera4.cameraId,
      captureTime: new Date(),
      vehicleCount: 60,
      pedestrianCount: 25,
      averageSpeed: 38.5,
      trafficDensity: "medium",
      rawData: { additionalInfo: "Sample data 4" },
    },
  });

  await prisma.trafficData.create({
    data: {
      cameraId: camera5.cameraId,
      captureTime: new Date(),
      vehicleCount: 40,
      pedestrianCount: 30,
      averageSpeed: 42.0,
      trafficDensity: "medium",
      rawData: { additionalInfo: "Sample data 5" },
    },
  });

  console.log("Seeded 5 traffic data entries");

  // Seed dữ liệu cho bảng TrafficLightLog
  await prisma.trafficLightLog.create({
    data: {
      trafficLightId: trafficLight1.trafficLightId,
      changeTime: new Date(),
      previousStatus: "red",
      newStatus: "green",
      changeReason: "Scheduled change",
      triggeredByUserId: user1.userId,
    },
  });

  await prisma.trafficLightLog.create({
    data: {
      trafficLightId: trafficLight2.trafficLightId,
      changeTime: new Date(),
      previousStatus: "green",
      newStatus: "red",
      changeReason: "Scheduled change",
      triggeredByUserId: user1.userId,
    },
  });

  await prisma.trafficLightLog.create({
    data: {
      trafficLightId: trafficLight3.trafficLightId,
      changeTime: new Date(),
      previousStatus: "yellow",
      newStatus: "red",
      changeReason: "Manual override",
      triggeredByUserId: user2.userId,
    },
  });

  await prisma.trafficLightLog.create({
    data: {
      trafficLightId: trafficLight4.trafficLightId,
      changeTime: new Date(),
      previousStatus: "green",
      newStatus: "yellow",
      changeReason: "Scheduled change",
      triggeredByUserId: user1.userId,
    },
  });

  await prisma.trafficLightLog.create({
    data: {
      trafficLightId: trafficLight5.trafficLightId,
      changeTime: new Date(),
      previousStatus: "red",
      newStatus: "green",
      changeReason: "Scheduled change",
      triggeredByUserId: user1.userId,
    },
  });

  console.log("Seeded 5 traffic light logs");

  // Seed dữ liệu cho bảng TrafficPattern
  await prisma.trafficPattern.create({
    data: {
      junctionId: junction1.junctionId,
      patternName: "Morning Rush",
      description: "Traffic pattern for morning rush hours",
      timingConfiguration: {
        green: 60,
        yellow: 5,
        red: 30,
      },
      createdAt: new Date(),
      createdByUserId: user1.userId,
    },
  });

  await prisma.trafficPattern.create({
    data: {
      junctionId: junction1.junctionId,
      patternName: "Evening Rush",
      description: "Traffic pattern for evening rush hours",
      timingConfiguration: {
        green: 50,
        yellow: 5,
        red: 40,
      },
      createdAt: new Date(),
      createdByUserId: user1.userId,
    },
  });

  await prisma.trafficPattern.create({
    data: {
      junctionId: junction2.junctionId,
      patternName: "Normal Day",
      description: "Traffic pattern for normal daytime",
      timingConfiguration: {
        green: 45,
        yellow: 5,
        red: 45,
      },
      createdAt: new Date(),
      createdByUserId: user2.userId,
    },
  });

  await prisma.trafficPattern.create({
    data: {
      junctionId: junction3.junctionId,
      patternName: "Night Time",
      description: "Traffic pattern for night time",
      timingConfiguration: {
        green: 30,
        yellow: 5,
        red: 60,
      },
      createdAt: new Date(),
      createdByUserId: user1.userId,
    },
  });

  await prisma.trafficPattern.create({
    data: {
      junctionId: junction4.junctionId,
      patternName: "Weekend",
      description: "Traffic pattern for weekends",
      timingConfiguration: {
        green: 40,
        yellow: 5,
        red: 50,
      },
      createdAt: new Date(),
      createdByUserId: user2.userId,
    },
  });

  console.log("Seeded 5 traffic patterns");

  // Seed dữ liệu cho bảng Notification
  await prisma.notification.create({
    data: {
      notificationType: "alert",
      message: "Traffic light 1 changed to green",
      createdAt: new Date(),
      isRead: false,
      userId: user1.userId,
    },
  });

  await prisma.notification.create({
    data: {
      notificationType: "info",
      message: "New traffic pattern applied at Junction 1",
      createdAt: new Date(),
      isRead: false,
      userId: user2.userId,
    },
  });

  await prisma.notification.create({
    data: {
      notificationType: "warning",
      message: "Camera 3 is offline",
      createdAt: new Date(),
      isRead: false,
      userId: user3.userId,
    },
  });

  await prisma.notification.create({
    data: {
      notificationType: "alert",
      message: "Traffic light 4 changed to yellow",
      createdAt: new Date(),
      isRead: false,
      userId: user1.userId,
    },
  });

  await prisma.notification.create({
    data: {
      notificationType: "info",
      message: "System maintenance scheduled",
      createdAt: new Date(),
      isRead: false,
      userId: user4.userId,
    },
  });

  console.log("Seeded 5 notifications");

  // Seed dữ liệu cho bảng SystemLog
  await prisma.systemLog.create({
    data: {
      logTime: new Date(),
      eventType: "user_login",
      description: "User admin logged in",
      userId: user1.userId,
      ipAddress: "192.168.1.10",
    },
  });

  await prisma.systemLog.create({
    data: {
      logTime: new Date(),
      eventType: "traffic_light_change",
      description: "Traffic light 1 changed to green",
      userId: user1.userId,
      ipAddress: "192.168.1.10",
    },
  });

  await prisma.systemLog.create({
    data: {
      logTime: new Date(),
      eventType: "user_login",
      description: "User operator1 logged in",
      userId: user2.userId,
      ipAddress: "192.168.1.11",
    },
  });

  await prisma.systemLog.create({
    data: {
      logTime: new Date(),
      eventType: "camera_offline",
      description: "Camera 3 went offline",
      userId: null,
      ipAddress: null,
    },
  });

  await prisma.systemLog.create({
    data: {
      logTime: new Date(),
      eventType: "traffic_pattern_update",
      description: "Traffic pattern updated at Junction 1",
      userId: user1.userId,
      ipAddress: "192.168.1.10",
    },
  });

  console.log("Seeded 5 system logs");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
