import { TrafficLightState, Phase, TimelineSegment } from "./types";
import { Junction, TrafficPattern } from "../../../../types/interface";

export const getStateColor = (state: string): string => {
  switch (state) {
    case "green":
      return "#22c55e";
    case "yellow":
      return "#eab308";
    case "red":
      return "#ef4444";
    default:
      return "#6b7280";
  }
};

export const getStateLabel = (state: string): string => {
  switch (state) {
    case "green":
      return "Xanh";
    case "yellow":
      return "Vàng";
    case "red":
      return "Đỏ";
    default:
      return "Không xác định";
  }
};

export const getMarkerColor = (
  lightName: string,
  lightId: string,
  trafficLightState: TrafficLightState | null
) => {
  if (!trafficLightState) {
    return {
      bg: "bg-gray-500",
      border: "border-t-gray-500",
      state: "unknown",
    };
  }

  const state =
    trafficLightState.lights_state[lightName] ||
    trafficLightState.lights_state[lightId] ||
    "red";

  switch (state) {
    case "green":
      return {
        bg: "bg-green-500",
        border: "border-t-green-500",
        state: "xanh",
      };
    case "yellow":
      return {
        bg: "bg-yellow-500",
        border: "border-t-yellow-500",
        state: "vàng",
      };
    case "red":
      return {
        bg: "bg-red-500",
        border: "border-t-red-500",
        state: "đỏ",
      };
    default:
      return {
        bg: "bg-gray-500",
        border: "border-t-gray-500",
        state: "không xác định",
      };
  }
};

export const buildLightNameMapping = (
  trafficLightState: TrafficLightState | null,
  config: any,
  selectedJunction: Junction
): { [key: string]: string } => {
  const lightNameMap: { [key: string]: string } = {};

  // Method 1: Get light names from traffic light state
  if (trafficLightState) {
    Object.keys(trafficLightState.lights_state).forEach((lightName) => {
      lightNameMap[lightName] = lightName;
    });
  }

  // Method 2: Get from pattern phases
  if (Object.keys(lightNameMap).length === 0) {
    config.phases.forEach((phase: any) => {
      if (phase.lightName && !lightNameMap[phase.lightName]) {
        lightNameMap[phase.lightName] = phase.lightName;
      }

      if (phase.lightStates) {
        Object.keys(phase.lightStates).forEach((lightId) => {
          const trafficLight = selectedJunction.trafficLights.find(
            (tl) => tl.trafficLightId === lightId
          );
          if (trafficLight && !lightNameMap[trafficLight.lightName]) {
            lightNameMap[trafficLight.lightName] = trafficLight.lightName;
          } else if (!lightNameMap[lightId]) {
            lightNameMap[lightId] = lightId;
          }
        });
      }
    });
  }

  // Method 3: Fallback to junction traffic lights
  if (Object.keys(lightNameMap).length === 0) {
    selectedJunction.trafficLights.forEach((light) => {
      lightNameMap[light.lightName] = light.lightName;
    });
  }

  return lightNameMap;
};

export const getLightTimeline = (
  lightName: string,
  config: any,
  cycleDuration: number
): TimelineSegment[] => {
  const sortedPhases = [...config.phases].sort(
    (a: any, b: any) => a.startTime - b.startTime
  );

  const timeline: TimelineSegment[] = [];
  let currentTime = 0;

  for (const phase of sortedPhases) {
    let phaseAffectsThisLight = false;
    let lightState = "red";

    // Check if phase affects this light
    if (phase.lightName === lightName) {
      phaseAffectsThisLight = true;
      lightState = phase.color || "green";
    } else if (phase.lightStates) {
      const matchingLightId = Object.keys(phase.lightStates).find(
        (lightId) => lightId === lightName
      );

      if (matchingLightId && phase.lightStates[matchingLightId]) {
        phaseAffectsThisLight = true;
        lightState = phase.lightStates[matchingLightId];
      }
    } else if (
      phase.direction &&
      (lightName.toLowerCase().includes(phase.direction.toLowerCase()) ||
        phase.phaseName?.toLowerCase().includes(lightName.toLowerCase()))
    ) {
      phaseAffectsThisLight = true;
      lightState = "green";
    } else if (
      phase.phaseName &&
      phase.phaseName.toLowerCase().includes(lightName.toLowerCase())
    ) {
      phaseAffectsThisLight = true;
      lightState = phase.color || "green";
    }

    if (phaseAffectsThisLight) {
      // Fill gap before this phase with red
      if (currentTime < phase.startTime) {
        timeline.push({
          startTime: currentTime,
          duration: phase.startTime - currentTime,
          state: "red",
          phaseName: `${lightName} - Đỏ (Gap)`,
        });
      }

      // Add the active phase
      timeline.push({
        startTime: phase.startTime,
        duration: phase.duration,
        state: lightState,
        phaseName: phase.phaseName || `${lightName} - ${lightState}`,
      });

      currentTime = phase.startTime + phase.duration;
    }
  }

  // Fill remaining time with red
  if (currentTime < cycleDuration) {
    timeline.push({
      startTime: currentTime,
      duration: cycleDuration - currentTime,
      state: "red",
      phaseName: `${lightName} - Đỏ (End)`,
    });
  }

  // If no timeline was created, fill entire cycle with red
  if (timeline.length === 0) {
    timeline.push({
      startTime: 0,
      duration: cycleDuration,
      state: "red",
      phaseName: `${lightName} - Đỏ (Full)`,
    });
  }

  return timeline;
};
