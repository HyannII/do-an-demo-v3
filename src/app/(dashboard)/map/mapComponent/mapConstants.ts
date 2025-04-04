// src/app/(components)/map/mapConstants.ts

import { TrafficPattern } from "@prisma/client";

// Danh sách các chế độ bản đồ Mapbox
export const mapStyles = [
  { value: "mapbox://styles/mapbox/streets-v12", label: "Streets" },
  { value: "mapbox://styles/mapbox/light-v11", label: "Light" },
  { value: "mapbox://styles/mapbox/dark-v11", label: "Dark" },
  { value: "mapbox://styles/mapbox/satellite-v9", label: "Satellite" },
  {
    value: "mapbox://styles/mapbox/satellite-streets-v12",
    label: "Satellite Streets",
  },
  { value: "mapbox://styles/mapbox/outdoors-v12", label: "Outdoors" },
];

// Types
export interface DisplayOptions {
  showJunctions: boolean;
  showCameras: boolean;
}

export interface CurrentLocation {
  longitude: number;
  latitude: number;
}

// src/app/(dashboard)/map/mapComponent/mapConstants.ts
export interface Camera {
  cameraId: string;
  cameraName: string;
  ipAddress: string;
  location: string;
  latitude: number;
  longitude: number;
  model?: string;
  manufacturer?: string;
  installationDate?: string;
  isActive: boolean;
  junctionId?: string;
}

export interface Junction {
  junctionId: string;
  junctionName: string;
  location: string;
  latitude: number;
  longitude: number;
  description?: string;
  cameras: Camera[];
  trafficLights: TrafficLight[];
  trafficPatterns: TrafficPattern[];
}

// Các interface khác (TrafficLight, TrafficPattern, v.v.) giữ nguyên

export interface TrafficLight {
  trafficLightId: string;
  lightName: string;
  ipAddress: string;
  location: string;
  latitude: number;
  longitude: number;
  junctionId: string;
  status: string;
  lastMaintenance?: string; // DateTime trong schema, nhưng chuyển thành string để dễ xử lý
  isActive: boolean;
}

// Hằng số cho màu sắc marker
export const MARKER_COLORS = {
  JUNCTION: "red",
  CAMERA: "blue",
  TRAFFIC_LIGHT: "green",
};
