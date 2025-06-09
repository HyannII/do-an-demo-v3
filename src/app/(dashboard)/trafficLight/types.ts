export interface TrafficLightState {
  lights_state: { [lightName: string]: string };
  countdowns: { [lightName: string]: number | null };
  current_time: number;
  junction_name?: string;
  junction_id?: string;
}

export interface Phase {
  startTime: number;
  lightName?: string;
  direction?: string;
  greenTime?: number;
  duration: number;
  phaseName?: string;
  color?: string;
  lightStates?: { [key: string]: string };
}

export interface ActiveSchedule {
  scheduleId: string;
  junctionId: string;
  patternId: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  pattern: import("../../../../types/interface").TrafficPattern;
}

export interface TimelineSegment {
  startTime: number;
  duration: number;
  state: string;
  phaseName: string;
}

export interface CurrentPhaseInfo {
  phaseName: string;
  lightName: string;
  cycleTime: number;
  phaseType: string;
  totalCycleTime: number;
  currentTime: number;
}
