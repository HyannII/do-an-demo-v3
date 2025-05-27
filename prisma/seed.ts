import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed dữ liệu cho bảng Role
  const role1 = await prisma.role.create({
    data: {
      roleId: "5ef0389a-07c0-4a14-9d32-95753c0c50ff",
      roleName: "Admin",
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
      roleId: "160bcac3-9a6e-42cd-9c7a-ce2806d2a6d4",
      roleName: "Operator",
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
      roleId: "fc45d9c2-1cab-468e-98aa-f2a992111509",
      roleName: "Technician",
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
      roleId: "dad6e775-3f7e-4b11-a0a1-6709066c233d",
      roleName: "Viewer",
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
      roleId: "c24f1a9c-4ea3-49fd-9bda-e9315a0bf98b",
      roleName: "Guest",
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
      userId: "7f7d46d9-51fc-471d-b8cf-a42add813dc1",
      username: "admin",
      passwordHash: "hashedpassword1",
      email: "admin@example.com",
      fullName: "Admin User",
      roleId: role1.roleId,
      createdAt: new Date("2025-04-29T03:14:51.096Z"),
      isActive: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      userId: "960f68d9-ee5f-485b-9244-a1be14435375",
      username: "operator1",
      passwordHash: "hashedpassword2",
      email: "operator1@example.com",
      fullName: "Operator One",
      roleId: role2.roleId,
      createdAt: new Date("2025-04-29T03:14:51.179Z"),
      isActive: true,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      userId: "1d3cce94-8545-4f90-b0f2-def8f3293525",
      username: "technician1",
      passwordHash: "hashedpassword3",
      email: "technician1@example.com",
      fullName: "Technician One",
      roleId: role3.roleId,
      createdAt: new Date("2025-04-29T03:14:51.220Z"),
      isActive: true,
    },
  });

  const user4 = await prisma.user.create({
    data: {
      userId: "1c46ef51-6d3e-4201-b944-eafcfbac5b13",
      username: "viewer1",
      passwordHash: "hashedpassword4",
      email: "viewer1@example.com",
      fullName: "Viewer One",
      roleId: role4.roleId,
      createdAt: new Date("2025-04-29T03:14:51.264Z"),
      isActive: true,
    },
  });

  const user5 = await prisma.user.create({
    data: {
      userId: "2e72b50a-6f00-4144-acdd-a13b00dcd439",
      username: "guest1",
      passwordHash: "hashedpassword5",
      email: "guest1@example.com",
      fullName: "Guest One",
      roleId: role5.roleId,
      createdAt: new Date("2025-04-29T03:14:51.309Z"),
      isActive: true,
    },
  });

  const user6 = await prisma.user.create({
    data: {
      userId: "89b41108-b7d9-4ae7-9fe9-21c190dca08a",
      username: "endministrator",
      passwordHash:
        "$2b$10$./uAL2Kktz6YCloFmvLs5eL6W4SKgS2vJyNhGC8YhuPgNLnu2fk0i",
      email: "endmin@example.com",
      fullName: "endmin",
      roleId: role1.roleId,
      createdAt: new Date("2025-04-29T16:50:43.518Z"),
      isActive: true,
    },
  });

  const user7 = await prisma.user.create({
    data: {
      userId: "f4dde20f-0252-4b53-970e-6eabc5dfa56f",
      username: "administrator",
      passwordHash:
        "$2b$10$/OJGEKplzYVGoxa0gCFFieWxr2muCGd6poGNc3Wsb9db4afnbvSzG",
      email: "admin@example.com",
      fullName: "admin",
      roleId: role1.roleId,
      createdAt: new Date("2025-04-29T16:57:34.512Z"),
      isActive: true,
    },
  });

  console.log("Seeded 7 users");

  // Seed dữ liệu cho bảng Junction
  const junction1 = await prisma.junction.create({
    data: {
      junctionId: "a914dfb3-908e-4158-9709-eec94ba83405",
      junctionName: "Ngã tư Kim Mã",
      location: "Hà Nội",
      latitude: 21.0315,
      longitude: 105.8213,
    },
  });

  const junction2 = await prisma.junction.create({
    data: {
      junctionId: "120fc6bd-0ad4-459c-b791-826368c037b5",
      junctionName: "Ngã tư Láng Hạ",
      location: "Hà Nội",
      latitude: 21.0152,
      longitude: 105.8205,
    },
  });

  const junction3 = await prisma.junction.create({
    data: {
      junctionId: "02d32ccc-6a23-4be1-8049-6bc1258e83d9",
      junctionName: "Ngã tư Đại Cồ Việt",
      location: "Hà Nội",
      latitude: 21.0087,
      longitude: 105.8471,
    },
  });

  const junction4 = await prisma.junction.create({
    data: {
      junctionId: "51839c9a-c3b4-4312-a8ea-9e69b44c095d",
      junctionName: "Ngã tư Nguyễn Trãi",
      location: "Hà Nội",
      latitude: 20.9943,
      longitude: 105.8012,
    },
  });

  const junction5 = await prisma.junction.create({
    data: {
      junctionId: "79dbc681-fe64-4cd4-9986-d91b1136a5bf",
      junctionName: "Ngã tư Giải Phóng",
      location: "Hà Nội",
      latitude: 20.9876,
      longitude: 105.8409,
    },
  });

  const junction6 = await prisma.junction.create({
    data: {
      junctionId: "71862a02-471b-4e77-867d-aa66e8e77c4b",
      junctionName: "Ngã tư Quang Trung - Lý Thường Kiệt",
      location: "Quận Hoàn Kiếm - Hà Nội",
      latitude: 21.023704,
      longitude: 105.849199,
    },
  });

  console.log("Seeded 6 junctions");

  // Seed dữ liệu cho bảng Camera
  const camera1 = await prisma.camera.create({
    data: {
      cameraId: "760b5ebc-5ea0-4c8c-ab57-f09a91771c79",
      cameraName: "Camera 1",
      cameraAddress:
        "http://192.168.1.59:83/sms/HCPEurl/commonvideobiz_VdORRafGzctjtwkqernFqlfx6vplORaPbxbaJ9fYUEBYerOnMWH4lm4bNb%2Bfo4tDQriLu2D0%2BsPBTdPeexyhnCm0NKwoEXp93jab7%2F%2F14XFB0bOXDKuLB88wlkUo9YRrBVE2BcnYvhzY6MZmJuTNOSFfSk8a%2B2O7HU%2FXv0eE9tYJ1VO%2BTZL%2BmVy8Ztv91Mj6ilKQE3uoKdjKxnJDBGjUHjC3IaX2v0SdHF9%2B8WAZSSs%3D/live.m3u8",
      location: "Ngã tư Kim Mã - Góc Tây Bắc",
      latitude: 21.031132,
      longitude: 105.821641,
      isActive: true,
      junctionId: junction1.junctionId,
    },
  });

  const camera2 = await prisma.camera.create({
    data: {
      cameraId: "17748b01-bcba-4f8a-9b01-33676b7effdc",
      cameraName: "Camera 2",
      cameraAddress:
        "http://192.168.1.59:83/sms/HCPEurl/commonvideobiz_VdORRafGzctjtwkqernFqlfx6vplORaPbxbaJ9fYUEBS5wBTe4gQB6mNCfru0EqDotPZjsS%2B%2B%2Fqzd%2BNfHO%2BCNxEyZMSGz5ofx1CKQuN1RRhSJZao1TZVVcbyT2vfrvWzfdQEu55xjtfMKXyVo%2FsywzDgYsFmjEiJBYttpl%2BOnykR7p8jQOl36zEqtWrJnGQFUxcGhb2%2BxJhlQiFUFZaotlAJdOYVP17b0bTFHfDjJME%3D/live.m3u8",
      location: "Ngã tư Kim Mã - Góc Đông Nam",
      latitude: 21.0314,
      longitude: 105.8212,
      isActive: true,
      junctionId: junction1.junctionId,
    },
  });

  const camera3 = await prisma.camera.create({
    data: {
      cameraId: "707256af-9223-4cc5-bf0d-cd259896573e",
      cameraName: "Camera 3",
      cameraAddress: "http://113.160.14.86:7373/hls/playlist.m3u8",
      location: "Ngã tư Láng Hạ - Góc Tây Nam",
      latitude: 21.0151,
      longitude: 105.8204,
      isActive: true,
      junctionId: junction2.junctionId,
    },
  });

  const camera4 = await prisma.camera.create({
    data: {
      cameraId: "0b1108f3-7fd6-43c0-9ab8-598392f7d348",
      cameraName: "Camera 4",
      cameraAddress: "192.168.1.104",
      location: "Ngã tư Đại Cồ Việt - Góc Đông Bắc",
      latitude: 21.0088,
      longitude: 105.8472,
      isActive: true,
      junctionId: junction3.junctionId,
    },
  });

  console.log("Seeded 4 cameras");

  // Seed dữ liệu cho bảng TrafficLight
  const trafficLight1 = await prisma.trafficLight.create({
    data: {
      trafficLightId: "f9ff80a3-ffc2-4276-9c12-68bef2af80b9",
      lightName: "Đèn 1",
      ipAddress: "192.168.1.201",
      location: "Ngã tư Kim Mã - Hướng Bắc",
      latitude: 21.031116,
      longitude: 105.821642,
      junctionId: junction1.junctionId,
      status: "green",
      isActive: true,
    },
  });

  const trafficLight2 = await prisma.trafficLight.create({
    data: {
      trafficLightId: "242b3a6f-b3bf-4084-a9f2-f2e7681fe0ca",
      lightName: "Đèn 2",
      ipAddress: "192.168.1.202",
      location: "Ngã tư Kim Mã - Hướng Nam",
      latitude: 21.0313,
      longitude: 105.8211,
      junctionId: junction1.junctionId,
      status: "red",
      isActive: true,
    },
  });

  const trafficLight3 = await prisma.trafficLight.create({
    data: {
      trafficLightId: "8b55a6ce-e584-40bf-8981-de1454b78e14",
      lightName: "Đèn 3",
      ipAddress: "192.168.1.203",
      location: "Ngã tư Láng Hạ - Hướng Tây",
      latitude: 21.015,
      longitude: 105.8203,
      junctionId: junction2.junctionId,
      status: "yellow",
      isActive: true,
    },
  });

  const trafficLight4 = await prisma.trafficLight.create({
    data: {
      trafficLightId: "2ce51620-0e6f-4ed2-b9e0-7325c286986e",
      lightName: "Đèn 4",
      ipAddress: "192.168.1.204",
      location: "Ngã tư Đại Cồ Việt - Hướng Đông",
      latitude: 21.0086,
      longitude: 105.847,
      junctionId: junction3.junctionId,
      status: "green",
      isActive: true,
    },
  });

  const trafficLight5 = await prisma.trafficLight.create({
    data: {
      trafficLightId: "01b1a50d-8bce-4a47-b529-0c15258e854a",
      lightName: "Đèn 5",
      ipAddress: "192.168.1.205",
      location: "Ngã tư Nguyễn Trãi - Hướng Bắc",
      latitude: 20.9945,
      longitude: 105.8014,
      junctionId: junction4.junctionId,
      status: "red",
      isActive: true,
    },
  });

  const trafficLight6 = await prisma.trafficLight.create({
    data: {
      trafficLightId: "bd420a9b-7d3a-4e80-8640-98d6aeda9f1a",
      lightName: "Đèn 6",
      ipAddress: "192.168.2.165",
      location: "Ngã tư Quang Trung - Lý Thường Kiệt, hướng Đông",
      latitude: 21.02371,
      longitude: 105.849262,
      junctionId: junction6.junctionId,
      status: "red",
      isActive: true,
    },
  });

  const trafficLight7 = await prisma.trafficLight.create({
    data: {
      trafficLightId: "4edf8f78-f0e7-4475-b522-8c40d0c714c8",
      lightName: "Đèn 7",
      ipAddress: "192.168.2.166",
      location: "Ngã tư Quang Trung - Lý Thường Kiệt, hướng Nam",
      latitude: 21.02366,
      longitude: 105.849202,
      junctionId: junction6.junctionId,
      status: "red",
      isActive: true,
    },
  });

  const trafficLight8 = await prisma.trafficLight.create({
    data: {
      trafficLightId: "665fcb64-8d34-4711-b7ec-3b085b5b2caf",
      lightName: "Đèn 8",
      ipAddress: "192.168.2.167",
      location: "Ngã tư Quang Trung - Lý Thường Kiệt, hướng Tây",
      latitude: 21.023694,
      longitude: 105.849152,
      junctionId: junction6.junctionId,
      status: "red",
      isActive: true,
    },
  });

  const trafficLight9 = await prisma.trafficLight.create({
    data: {
      trafficLightId: "d8727534-af1f-42fd-b784-44ea2aee3445",
      lightName: "Đèn 9",
      ipAddress: "192.168.2.168",
      location: "Ngã tư Quang Trung - Lý Thường Kiệt, hướng Bắc",
      latitude: 21.02376,
      longitude: 105.849191,
      junctionId: junction6.junctionId,
      status: "red",
      isActive: true,
    },
  });

  console.log("Seeded 9 traffic lights");

  // Seed dữ liệu cho bảng TrafficPattern
  await prisma.trafficPattern.create({
    data: {
      patternId: "56c041bb-2b49-44f6-bf4e-57a8de5d4119",
      junctionId: junction6.junctionId,
      patternName: "Morning Traffic Pattern",
      timingConfiguration: {
        cycleDuration: 120,
        phases: [
          {
            phaseId: "phase1",
            phaseName: "Pha Bắc-Nam",
            startTime: 0,
            duration: 30,
            isActive: true,
            lightStates: {
              [trafficLight7.trafficLightId]: "green",
              [trafficLight8.trafficLightId]: "red",
              [trafficLight9.trafficLightId]: "green",
            },
          },
          {
            phaseId: "phase2",
            phaseName: "Pha Đông-Tây",
            startTime: 30,
            duration: 25,
            isActive: true,
            lightStates: {
              [trafficLight7.trafficLightId]: "red",
              [trafficLight8.trafficLightId]: "green",
              [trafficLight9.trafficLightId]: "red",
            },
          },
          {
            phaseId: "phase3",
            phaseName: "Pha Chuyển Tiếp",
            startTime: 55,
            duration: 15,
            isActive: true,
            lightStates: {
              [trafficLight7.trafficLightId]: "yellow",
              [trafficLight8.trafficLightId]: "yellow",
              [trafficLight9.trafficLightId]: "yellow",
            },
          },
        ],
      },
      createdAt: new Date("2025-05-03T07:29:15.031Z"),
      createdByUserId: user7.userId,
    },
  });

  await prisma.trafficPattern.create({
    data: {
      patternId: "eabe5e98-da62-488f-9c90-758bf9d0762e",
      junctionId: junction6.junctionId,
      patternName: "Afternoon Traffic Pattern",
      timingConfiguration: {
        cycleDuration: 100,
        phases: [
          {
            phaseId: "phase1",
            phaseName: "Pha Chính",
            startTime: 0,
            duration: 40,
            isActive: true,
            lightStates: {
              [trafficLight7.trafficLightId]: "green",
              [trafficLight8.trafficLightId]: "red",
              [trafficLight9.trafficLightId]: "green",
            },
          },
          {
            phaseId: "phase2",
            phaseName: "Pha Phụ",
            startTime: 40,
            duration: 35,
            isActive: true,
            lightStates: {
              [trafficLight7.trafficLightId]: "red",
              [trafficLight8.trafficLightId]: "green",
              [trafficLight9.trafficLightId]: "red",
            },
          },
          {
            phaseId: "phase3",
            phaseName: "Pha Nghỉ",
            startTime: 75,
            duration: 25,
            isActive: false,
            lightStates: {
              [trafficLight7.trafficLightId]: "red",
              [trafficLight8.trafficLightId]: "red",
              [trafficLight9.trafficLightId]: "red",
            },
          },
        ],
      },
      createdAt: new Date("2025-05-03T07:29:15.031Z"),
      createdByUserId: user7.userId,
    },
  });

  await prisma.trafficPattern.create({
    data: {
      patternId: "2e402070-6c95-48b1-a41f-414fa3a46687",
      junctionId: junction1.junctionId,
      patternName: "Evening Traffic Pattern",
      timingConfiguration: {
        cycleDuration: 90,
        phases: [
          {
            phaseId: "phase1",
            phaseName: "Pha Cao Điểm",
            startTime: 0,
            duration: 45,
            isActive: true,
            lightStates: {
              [trafficLight1.trafficLightId]: "green",
              [trafficLight2.trafficLightId]: "red",
            },
          },
          {
            phaseId: "phase2",
            phaseName: "Pha Thường",
            startTime: 45,
            duration: 30,
            isActive: true,
            lightStates: {
              [trafficLight1.trafficLightId]: "red",
              [trafficLight2.trafficLightId]: "green",
            },
          },
          {
            phaseId: "phase3",
            phaseName: "Pha Chuyển Tiếp",
            startTime: 75,
            duration: 15,
            isActive: true,
            lightStates: {
              [trafficLight1.trafficLightId]: "yellow",
              [trafficLight2.trafficLightId]: "yellow",
            },
          },
        ],
      },
      createdAt: new Date("2025-05-03T07:29:15.031Z"),
      createdByUserId: user7.userId,
    },
  });

  console.log("Seeded 3 traffic patterns");

  // Seed dữ liệu mẫu cho bảng CameraData
  await prisma.cameraData.create({
    data: {
      dataId: "a1b2c3d4-e5f6-4a5b-9c8d-1234567890ab",
      cameraId: camera1.cameraId, // Camera 1 - Ngã tư Kim Mã - Góc Tây Bắc
      timestamp: new Date("2025-05-04T08:00:00.000Z"),
      motorcycleCount: 15,
      carCount: 10,
      truckCount: 2,
      busCount: 1,
    },
  });

  await prisma.cameraData.create({
    data: {
      dataId: "b2c3d4e5-f6a7-4b6c-8d9e-2345678901bc",
      cameraId: camera1.cameraId, // Camera 1 - Ngã tư Kim Mã - Góc Tây Bắc
      timestamp: new Date("2025-05-04T08:15:00.000Z"),
      motorcycleCount: 20,
      carCount: 12,
      truckCount: 3,
      busCount: 0,
    },
  });

  await prisma.cameraData.create({
    data: {
      dataId: "c3d4e5f6-a7b8-4c7d-9e0f-3456789012cd",
      cameraId: camera2.cameraId, // Camera 2 - Ngã tư Kim Mã - Góc Đông Nam
      timestamp: new Date("2025-05-04T08:00:00.000Z"),
      motorcycleCount: 18,
      carCount: 8,
      truckCount: 1,
      busCount: 2,
    },
  });

  await prisma.cameraData.create({
    data: {
      dataId: "d4e5f6a7-b8c9-4d8e-0f1a-4567890123de",
      cameraId: camera3.cameraId, // Camera 3 - Ngã tư Láng Hạ - Góc Tây Nam
      timestamp: new Date("2025-05-04T08:00:00.000Z"),
      motorcycleCount: 25,
      carCount: 15,
      truckCount: 5,
      busCount: 3,
    },
  });

  await prisma.cameraData.create({
    data: {
      dataId: "e5f6a7b8-c9d0-4e9f-1a2b-5678901234ef",
      cameraId: camera4.cameraId, // Camera 4 - Ngã tư Đại Cồ Việt - Góc Đông Bắc
      timestamp: new Date("2025-05-04T08:00:00.000Z"),
      motorcycleCount: 30,
      carCount: 20,
      truckCount: 4,
      busCount: 2,
    },
  });

  console.log("Seeded 5 camera data entries");

  // Seed dữ liệu cho ScheduleConfig
  await prisma.scheduleConfig.create({
    data: {
      scheduleId: "1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6",
      junctionId: junction1.junctionId, // Ngã tư Kim Mã
      scheduleName: "Lịch trình tự động Kim Mã",
      mode: "auto",
      autoPatternId: "2e402070-6c95-48b1-a41f-414fa3a46687", // Evening Traffic Pattern
      daySchedules: [],
      createdByUserId: user1.userId,
      isActive: true,
      createdAt: new Date("2025-05-27T04:00:00.000Z"),
    },
  });

  await prisma.scheduleConfig.create({
    data: {
      scheduleId: "2b3c4d5e-6f7g-8h9i-0j1k-l2m3n4o5p6q7",
      junctionId: junction2.junctionId, // Ngã tư Láng Hạ
      scheduleName: "Lịch trình theo tuần Láng Hạ",
      mode: "schedule",
      autoPatternId: null,
      daySchedules: [
        {
          dayOfWeek: 1, // Thứ 2
          timeSlots: [
            {
              slotId: "slot_1_1",
              patternId: "2e402070-6c95-48b1-a41f-414fa3a46687",
              startTime: "06:00",
              endTime: "09:00",
              isActive: true,
            },
            {
              slotId: "slot_1_2",
              patternId: "eabe5e98-da62-488f-9c90-758bf9d0762e",
              startTime: "09:00",
              endTime: "17:00",
              isActive: true,
            },
            {
              slotId: "slot_1_3",
              patternId: "2e402070-6c95-48b1-a41f-414fa3a46687",
              startTime: "17:00",
              endTime: "22:00",
              isActive: true,
            },
          ],
          isActive: true,
        },
        {
          dayOfWeek: 2, // Thứ 3
          timeSlots: [
            {
              slotId: "slot_2_1",
              patternId: "eabe5e98-da62-488f-9c90-758bf9d0762e",
              startTime: "06:00",
              endTime: "22:00",
              isActive: true,
            },
          ],
          isActive: true,
        },
        {
          dayOfWeek: 0, // Chủ nhật
          timeSlots: [
            {
              slotId: "slot_0_1",
              patternId: "eabe5e98-da62-488f-9c90-758bf9d0762e",
              startTime: "08:00",
              endTime: "20:00",
              isActive: true,
            },
          ],
          isActive: true,
        },
      ],
      createdByUserId: user2.userId,
      isActive: true,
      createdAt: new Date("2025-05-27T04:30:00.000Z"),
    },
  });

  console.log("Seeded 2 schedule configs");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
