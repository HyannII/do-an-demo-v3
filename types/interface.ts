export interface Camera {
  cameraId: string;
  cameraName: string;
  cameraAddress: string;
  location: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  junctionId?: string;
}

export interface Junction {
  junctionId: string;
  junctionName: string;
  location: string;
  latitude?: number;
  longitude?: number;
  cameras: Camera[];
  trafficLights: TrafficLight[];
  trafficPatterns: TrafficPattern[];
}

export interface Role {
  roleId: string;
  roleName: string;
  permissions?: any;
  users: User[];
}

export interface TrafficLight {
  trafficLightId: string;
  lightName: string;
  ipAddress: string;
  location: string;
  latitude?: number;
  longitude?: number;
  junctionId: string;
  status: string;
  isActive: boolean;
}

export interface TrafficPattern {
  patternId: string;
  junctionId: string;
  patternName: string;
  timingConfiguration: any;
  createdAt: Date;
  createdByUserId: string;
}

export interface User {
  userId: string;
  username: string;
  passwordHash: string;
  email: string;
  fullName: string;
  roleId: string;
  createdAt: Date;
  isActive: boolean;
  isPending: boolean;
  pendingApproval?: Date | string;
  approvedBy?: string;
  trafficPatterns: TrafficPattern[];
}

export interface CameraData {
  dataId: string;
  cameraId: string;
  timestamp: Date;
  motorcycleCount: number;
  carCount: number;
  truckCount: number;
  busCount: number;
}

export interface CameraDataSummary {
  cameraId: string;
  totalMotorcycleCount: number;
  totalCarCount: number;
  totalTruckCount: number;
  totalBusCount: number;
  entries: CameraData[];
}

export interface TimeSlot {
  slotId: string;
  patternId: string;
  startTime: string; // Format "HH:MM"
  endTime: string; // Format "HH:MM"
  isActive: boolean;
}

export interface DaySchedule {
  dayOfWeek: number; // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
  timeSlots: TimeSlot[];
  isActive: boolean;
}

export interface ScheduleConfig {
  scheduleId: string;
  junctionId: string;
  scheduleName: string;
  mode: "auto" | "schedule"; // "auto" sử dụng pattern "Tự động", "schedule" theo lịch
  autoPatternId?: string; // ID của pattern "Tự động"
  daySchedules: DaySchedule[];
  createdAt: Date;
  isActive: boolean;
}
