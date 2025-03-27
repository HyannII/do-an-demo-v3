// src/app/(components)/map/mapConstants.ts

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
  showVMS: boolean;
}

export interface CurrentLocation {
  longitude: number;
  latitude: number;
}

export interface Junction {
  junctionId: string;
  junctionName: string;
  longitude: number;
  latitude: number;
  location: string;
  description?: string;
  trafficLights?: TrafficLight[];
  cameras?: Camera[];
}

export interface VMS {
  vmsId: string;
  vmsName: string;
  longitude: number;
  latitude: number;
  location: string;
  message?: string;
  status: string;
}

export interface Camera {
  cameraId: string;
  longitude: number;
  latitude: number;
}

export interface TrafficLight {
  trafficLightId: string;
  longitude: number;
  latitude: number;
}

// Hằng số cho màu sắc marker
export const MARKER_COLORS = {
  JUNCTION: "red",
  CAMERA: "blue",
  TRAFFIC_LIGHT: "green",
  VMS: "purple",
};
