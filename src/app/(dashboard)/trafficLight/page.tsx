"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Map, { MapRef, Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Junction,
  TrafficLight,
  TrafficPattern,
} from "../../../../types/interface";

interface TrafficLightState {
  lights_state: { [key: string]: string };
  countdowns: { [key: string]: number | null };
  current_time: number;
}

interface Phase {
  startTime: number;
  direction: string;
  greenTime: number;
  duration: number;
  phaseName?: string;
  lightStates?: { [key: string]: string };
}

interface ActiveSchedule {
  scheduleId: string;
  junctionId: string;
  patternId: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  pattern: TrafficPattern;
}

// Traffic Light Phase Chart Component
function TrafficLightChart({
  selectedJunction,
  activePattern,
  currentPhaseInfo,
  trafficLightState,
}: {
  selectedJunction: Junction | null;
  activePattern: TrafficPattern | null;
  currentPhaseInfo: any;
  trafficLightState: TrafficLightState | null;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(600);

  useEffect(() => {
    if (chartRef.current) {
      setChartWidth(chartRef.current.offsetWidth - 140);
    }
    const handleResize = () => {
      if (chartRef.current) {
        setChartWidth(chartRef.current.offsetWidth - 140);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!selectedJunction || !activePattern) return null;

  const config = activePattern.timingConfiguration;
  if (!config || !config.phases) return null;

  const cycleDuration = config.cycleDuration || config.cycleTime || 120;

  // Create direction mapping from traffic lights using pattern data
  const directionMap: { [key: string]: string[] } = {
    Bắc: [],
    Nam: [],
    Đông: [],
    Tây: [],
  };

  console.log(
    `🗺️ [DIRECTION DEBUG] Building direction map from pattern lightStates:`,
    selectedJunction.junctionName
  );

  // Auto-detect direction mapping from lightStates in pattern phases
  config.phases.forEach((phase: any) => {
    const phaseName = phase.phaseName || "";
    const lightStates = phase.lightStates || {};

    // Find which direction this phase belongs to
    let phaseDirection = null;
    if (phaseName.includes("Bắc")) phaseDirection = "Bắc";
    else if (phaseName.includes("Nam")) phaseDirection = "Nam";
    else if (phaseName.includes("Đông")) phaseDirection = "Đông";
    else if (phaseName.includes("Tây")) phaseDirection = "Tây";

    // Find which light is green in this phase (indicates the direction)
    if (phaseDirection && phaseName.includes("Xanh")) {
      Object.entries(lightStates).forEach(([lightId, state]) => {
        if (
          state === "green" &&
          !directionMap[phaseDirection].includes(lightId)
        ) {
          directionMap[phaseDirection].push(lightId);
          console.log(
            `   ✅ Mapped light ${lightId} to direction ${phaseDirection} (from phase: ${phaseName})`
          );
        }
      });
    }
  });

  // Fallback: if auto-detection didn't work, use location parsing
  selectedJunction.trafficLights.forEach((light) => {
    const lightId = light.trafficLightId;
    let alreadyMapped = false;

    // Check if this light is already mapped
    Object.values(directionMap).forEach((lights) => {
      if (lights.includes(lightId)) alreadyMapped = true;
    });

    if (!alreadyMapped) {
      console.log(
        `   ⚠️ Light ${light.lightName} not mapped, trying location parsing: "${light.location}"`
      );

      const location = light.location;
      let direction = null;

      if (
        location.includes("hướng Bắc") ||
        location.includes("Hướng Bắc") ||
        location.toLowerCase().includes("bắc")
      ) {
        direction = "Bắc";
      } else if (
        location.includes("hướng Nam") ||
        location.includes("Hướng Nam") ||
        location.toLowerCase().includes("nam")
      ) {
        direction = "Nam";
      } else if (
        location.includes("hướng Đông") ||
        location.includes("Hướng Đông") ||
        location.toLowerCase().includes("đông")
      ) {
        direction = "Đông";
      } else if (
        location.includes("hướng Tây") ||
        location.includes("Hướng Tây") ||
        location.toLowerCase().includes("tây")
      ) {
        direction = "Tây";
      }

      if (direction && directionMap[direction]) {
        directionMap[direction].push(lightId);
        console.log(
          `   🔄 Fallback mapped light ${lightId} to direction ${direction}`
        );
      }
    }
  });

  console.log(`🗺️ [DIRECTION DEBUG] Final direction map:`, directionMap);

  // Generate timeline for each direction
  const getDirectionTimeline = (direction: string) => {
    const lightIds = directionMap[direction];
    if (!lightIds || lightIds.length === 0) return [];

    const sortedPhases = [...config.phases].sort(
      (a: any, b: any) => a.startTime - b.startTime
    );
    const timeline = [];

    for (const phase of sortedPhases) {
      let state = "red"; // default

      // Use lightStates directly - this is the most reliable method
      if (phase.lightStates && lightIds[0]) {
        state = phase.lightStates[lightIds[0]] || "red";
      }

      const phaseName = phase.phaseName || "";
      console.log(
        `   🔍 Phase "${phaseName}" for ${direction}: light ${
          lightIds[0]
        } = ${state} (${phase.startTime}s-${phase.startTime + phase.duration}s)`
      );

      timeline.push({
        startTime: phase.startTime,
        duration: phase.duration,
        state,
        phaseName: phaseName,
      });
    }

    console.log(`📊 [CHART DEBUG] Timeline for ${direction}:`, {
      lightIds,
      timeline: timeline.map(
        (t) =>
          `${t.startTime}s-${t.startTime + t.duration}s: ${t.state} (${
            t.phaseName
          })`
      ),
    });

    return timeline;
  };

  const getStateColor = (state: string) => {
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

  const getStateLabel = (state: string) => {
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

  const directions = ["Bắc", "Nam", "Đông", "Tây"];

  return (
    <div
      ref={chartRef}
      className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 h-full flex flex-col overflow-hidden"
    >
      <h2 className="text-gray-900 dark:text-white font-bold mb-2 text-sm">
        Biểu đồ thời gian pha đèn
      </h2>

      {/* Current Phase Indicator */}
      {currentPhaseInfo && (
        <div className="mb-3 p-2 rounded border border-gray-500 text-sm flex-shrink-0">
          <div className="flex items-center justify-center gap-4 w-full">
            <span className="text-gray-900 dark:text-white font-semibold py-2">
              Thời gian:{" "}
            </span>
            <span className="text-gray-900 dark:text-white py-2">
              {currentPhaseInfo.cycleTime}s/{cycleDuration}s
            </span>
          </div>
          {trafficLightState && (
            <div className="mt-1 grid grid-cols-4 gap-1 text-xs">
              {directions.map((direction) => {
                const state =
                  trafficLightState.lights_state[direction] || "red";
                const countdown = trafficLightState.countdowns[direction];
                return (
                  <div
                    key={direction}
                    className="text-center"
                  >
                    <span className="text-gray-400">{direction}: </span>
                    <span
                      className={`font-bold ${
                        state === "green"
                          ? "text-green-400"
                          : state === "yellow"
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {state === "green"
                        ? "Xanh"
                        : state === "yellow"
                        ? "Vàng"
                        : "Đỏ"}
                      {countdown !== null && ` (${countdown}s)`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Chart area */}
      <div className="flex-1">
        <div className="h-full w-full">
          {directions.map((direction) => {
            const timeline = getDirectionTimeline(direction);
            const hasLights = directionMap[direction].length > 0;

            return (
              <div
                key={direction}
                className="mb-1 last:mb-0"
              >
                <div className="flex items-center h-6">
                  {/* Direction label */}
                  <div className="w-12 text-right pr-2 flex-shrink-0">
                    <span
                      className={`text-xs font-medium ${
                        hasLights
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-500"
                      }`}
                    >
                      {direction}
                    </span>
                  </div>

                  {/* Timeline */}
                  <div
                    className="relative flex-1 w-full h-full"
                    style={{ height: "18px" }}
                  >
                    <div className="absolute inset-0 bg-gray-700"></div>
                    {timeline.map((segment, segIndex) => (
                      <div
                        key={`${direction}-${segIndex}`}
                        className="absolute top-0 h-full flex items-center justify-center text-xs font-medium text-gray-900 dark:text-white"
                        style={{
                          left: `${(segment.startTime / cycleDuration) * 100}%`,
                          width: `${(segment.duration / cycleDuration) * 100}%`,
                          backgroundColor: getStateColor(segment.state),
                        }}
                        title={`${direction} - ${getStateLabel(
                          segment.state
                        )}: ${segment.startTime}s - ${
                          segment.startTime + segment.duration
                        }s (${segment.duration}s)`}
                      >
                        {/* Text labels inside bars - REMOVED */}
                      </div>
                    ))}

                    {/* Current time indicator */}
                    {currentPhaseInfo && (
                      <div
                        className="absolute top-0 h-full w-0.5 bg-blue-400 dark:bg-yellow-400 z-10"
                        style={{
                          left: `${
                            (currentPhaseInfo.cycleTime / cycleDuration) * 100
                          }%`,
                        }}
                        title={`Thời gian hiện tại: ${currentPhaseInfo.cycleTime}s`}
                      >
                        <div className="absolute -top-2 -left-1 w-3 h-3  bg-blue-400 dark:bg-yellow-400 rounded-full border border-white"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cycle duration info */}
      <div className="mt-2 pt-2 border-t border-gray-700 flex-shrink-0">
        <div className="text-xs text-gray-400 text-center">
          Chu kỳ: {cycleDuration}s
        </div>
      </div>
    </div>
  );
}

// Traffic Map Component
function TrafficMap({
  selectedJunction,
  mapRef,
}: {
  selectedJunction: Junction | null;
  mapRef: React.RefObject<MapRef>;
}) {
  if (!selectedJunction) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-gray-400">Chọn một nút giao để xem bản đồ</p>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: Number(selectedJunction.longitude),
        latitude: Number(selectedJunction.latitude),
        zoom: 19,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/outdoors-v12"
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
      language="vi"
    >
      {selectedJunction.trafficLights.map((trafficLight: TrafficLight) => {
        // Extract direction from location
        const directionMatch = trafficLight.location.match(/hướng\s+([^\s]+)/);
        const direction = directionMatch ? directionMatch[1] : "Unknown";
        return (
          <Marker
            key={trafficLight.trafficLightId}
            longitude={Number(trafficLight.longitude)}
            latitude={Number(trafficLight.latitude)}
            anchor="bottom"
          >
            <div className="relative">
              {/* Speech Bubble Rectangle */}
              <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-md text-center min-w-[40px] max-w-[100px] break-words">
                {direction}
              </div>
              {/* Speech Bubble Pointer (Triangle) */}
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-[-6px] w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-blue-500" />
            </div>
          </Marker>
        );
      })}
    </Map>
  );
}

export default function JunctionMap() {
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [filteredJunctions, setFilteredJunctions] = useState<Junction[]>([]);
  const [selectedJunction, setSelectedJunction] = useState<Junction | null>(
    null
  );
  const [trafficPatterns, setTrafficPatterns] = useState<TrafficPattern[]>([]);
  const [activePattern, setActivePattern] = useState<TrafficPattern | null>(
    null
  );
  const [activeSchedule, setActiveSchedule] = useState<ActiveSchedule | null>(
    null
  );
  const [trafficLightState, setTrafficLightState] =
    useState<TrafficLightState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [connectionFailed, setConnectionFailed] = useState<boolean>(false);
  const [chartRefreshKey, setChartRefreshKey] = useState<number>(0);
  const [currentPhaseInfo, setCurrentPhaseInfo] = useState<any>(null);

  const mapRef = useRef<MapRef>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle junction selection
  const handleJunctionSelect = (junction: Junction) => {
    setSelectedJunction(junction);
    // Reset states when switching junctions
    setActivePattern(null);
    setActiveSchedule(null);
    setCurrentPhaseInfo(null);
  };

  // Fetch junctions on component mount
  useEffect(() => {
    const fetchJunctions = async () => {
      try {
        const response = await fetch("/api/junctions");
        if (!response.ok) {
          console.error("Failed to fetch junctions", response.status);
          return;
        }
        const data = await response.json();
        setJunctions(data);
        setFilteredJunctions(data);
      } catch (error) {
        console.error("Error fetching junctions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJunctions();
  }, []);

  // Filter junctions based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredJunctions(junctions);
      return;
    }

    const filtered = junctions.filter((junction) =>
      junction.junctionName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredJunctions(filtered);
  }, [searchQuery, junctions]);

  // Fetch active schedule and traffic patterns for the selected junction
  useEffect(() => {
    if (!selectedJunction) return;

    const fetchActiveScheduleData = async () => {
      try {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const currentTimeString = `${String(currentHour).padStart(
          2,
          "0"
        )}:${String(currentMinute).padStart(2, "0")}`;
        const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        console.log(
          `🔍 [DEBUG] Fetching schedules for junction "${selectedJunction.junctionName}" (ID: ${selectedJunction.junctionId})`
        );
        console.log(
          `🕒 [DEBUG] Current time: ${currentTimeString} (${currentTimeInMinutes} minutes)`
        );
        console.log(
          `📅 [DEBUG] Current day of week: ${currentDayOfWeek} (0=Sunday, 1=Monday...)`
        );

        // Query all schedules for this junction
        const schedulesResponse = await fetch(
          `/api/schedules?junctionId=${selectedJunction.junctionId}`
        );

        if (schedulesResponse.ok) {
          const schedules = await schedulesResponse.json();
          console.log("📋 [DEBUG] Raw schedules response:", schedules);

          // Find the active schedule
          const activeSchedule = schedules.find(
            (schedule: any) => schedule.isActive === true
          );

          if (activeSchedule) {
            console.log("🎯 [DEBUG] Found active schedule:", activeSchedule);
            console.log(`📊 [DEBUG] Schedule mode: ${activeSchedule.mode}`);

            if (
              activeSchedule.mode === "auto" &&
              activeSchedule.autoPatternId
            ) {
              // Auto mode - use the auto pattern
              console.log(
                `🤖 [DEBUG] Auto mode - using pattern: ${activeSchedule.autoPatternId}`
              );

              const patternResponse = await fetch(
                `/api/trafficPatterns/${activeSchedule.autoPatternId}`
              );
              if (patternResponse.ok) {
                const patternData = await patternResponse.json();
                console.log(
                  "📊 [DEBUG] Auto pattern data loaded:",
                  patternData
                );
                console.log(
                  `🔄 [DEBUG] Pattern name: "${patternData.patternName}"`
                );
                console.log(
                  `⏱️ [DEBUG] Cycle duration: ${
                    patternData.timingConfiguration?.cycleDuration ||
                    patternData.timingConfiguration?.cycleTime ||
                    "unknown"
                  }s`
                );

                setActivePattern(patternData);
                setActiveSchedule({
                  scheduleId: activeSchedule.scheduleId,
                  junctionId: activeSchedule.junctionId,
                  patternId: activeSchedule.autoPatternId,
                  startTime: "Auto",
                  endTime: "Auto",
                  isActive: true,
                  pattern: patternData,
                });

                console.log(
                  "✅ [DEBUG] Successfully set auto pattern from active schedule"
                );
                return;
              } else {
                console.error(
                  "❌ [DEBUG] Failed to fetch auto pattern:",
                  patternResponse.status
                );
              }
            } else if (
              activeSchedule.mode === "schedule" &&
              activeSchedule.daySchedules
            ) {
              // Schedule mode - check day schedules
              console.log(
                `📅 [DEBUG] Schedule mode - checking day schedules for day ${currentDayOfWeek}`
              );
              console.log(
                "📋 [DEBUG] Day schedules:",
                activeSchedule.daySchedules
              );

              // Find day schedule for current day
              const todaySchedule = activeSchedule.daySchedules.find(
                (daySchedule: any) =>
                  daySchedule.dayOfWeek === currentDayOfWeek &&
                  daySchedule.isActive === true
              );

              if (todaySchedule && todaySchedule.timeSlots) {
                console.log(
                  `📅 [DEBUG] Found today's schedule:`,
                  todaySchedule
                );

                // Find matching time slot
                let matchingTimeSlot = null;

                for (const timeSlot of todaySchedule.timeSlots) {
                  if (!timeSlot.isActive) continue;

                  if (!timeSlot.startTime || !timeSlot.endTime) {
                    console.log(
                      `❌ [DEBUG] TimeSlot has invalid time data:`,
                      timeSlot
                    );
                    continue;
                  }

                  const [startHour, startMinute] = timeSlot.startTime
                    .split(":")
                    .map(Number);
                  const [endHour, endMinute] = timeSlot.endTime
                    .split(":")
                    .map(Number);

                  const startTimeInMinutes = startHour * 60 + startMinute;
                  const endTimeInMinutes = endHour * 60 + endMinute;

                  console.log(`🔍 [DEBUG] Checking time slot:`);
                  console.log(
                    `     Slot: ${timeSlot.startTime} - ${timeSlot.endTime} (${startTimeInMinutes} - ${endTimeInMinutes} min)`
                  );
                  console.log(`     Pattern ID: ${timeSlot.patternId}`);
                  console.log(
                    `     Current: ${currentTimeString} (${currentTimeInMinutes} min)`
                  );

                  let isInRange = false;

                  // Handle time slots that cross midnight
                  if (startTimeInMinutes <= endTimeInMinutes) {
                    // Normal time slot (same day)
                    isInRange =
                      currentTimeInMinutes >= startTimeInMinutes &&
                      currentTimeInMinutes <= endTimeInMinutes;
                    console.log(
                      `     Normal slot: ${currentTimeInMinutes} >= ${startTimeInMinutes} && ${currentTimeInMinutes} <= ${endTimeInMinutes} = ${isInRange}`
                    );
                  } else {
                    // Time slot crosses midnight
                    isInRange =
                      currentTimeInMinutes >= startTimeInMinutes ||
                      currentTimeInMinutes <= endTimeInMinutes;
                    console.log(
                      `     Overnight slot: ${currentTimeInMinutes} >= ${startTimeInMinutes} || ${currentTimeInMinutes} <= ${endTimeInMinutes} = ${isInRange}`
                    );
                  }

                  if (isInRange) {
                    matchingTimeSlot = timeSlot;
                    console.log(`✅ [DEBUG] Found matching time slot!`);
                    break;
                  } else {
                    console.log(
                      `❌ [DEBUG] Time slot does not match current time`
                    );
                  }
                }

                if (matchingTimeSlot) {
                  console.log(
                    `🎯 [DEBUG] Selected time slot:`,
                    matchingTimeSlot
                  );

                  // Fetch the pattern for this time slot
                  const patternResponse = await fetch(
                    `/api/trafficPatterns/${matchingTimeSlot.patternId}`
                  );
                  if (patternResponse.ok) {
                    const patternData = await patternResponse.json();
                    console.log(
                      "📊 [DEBUG] Time slot pattern data loaded:",
                      patternData
                    );
                    console.log(
                      `🔄 [DEBUG] Pattern name: "${patternData.patternName}"`
                    );
                    console.log(
                      `⏱️ [DEBUG] Cycle duration: ${
                        patternData.timingConfiguration?.cycleDuration ||
                        patternData.timingConfiguration?.cycleTime ||
                        "unknown"
                      }s`
                    );

                    setActivePattern(patternData);
                    setActiveSchedule({
                      scheduleId: activeSchedule.scheduleId,
                      junctionId: activeSchedule.junctionId,
                      patternId: matchingTimeSlot.patternId,
                      startTime: matchingTimeSlot.startTime,
                      endTime: matchingTimeSlot.endTime,
                      isActive: true,
                      pattern: patternData,
                    });

                    console.log(
                      "✅ [DEBUG] Successfully set pattern from scheduled time slot"
                    );
                    return;
                  } else {
                    console.error(
                      "❌ [DEBUG] Failed to fetch time slot pattern:",
                      patternResponse.status
                    );
                  }
                } else {
                  console.log(
                    "⚠️ [DEBUG] No time slot matches current time for today"
                  );
                }
              } else {
                console.log(
                  `⚠️ [DEBUG] No active day schedule found for day ${currentDayOfWeek}`
                );
              }
            } else {
              console.log(
                "⚠️ [DEBUG] Active schedule has unknown mode or missing data"
              );
            }
          } else {
            console.log("📭 [DEBUG] No active schedule found");
          }
        } else {
          console.log(
            `🔄 [DEBUG] Schedules API error: ${schedulesResponse.status} ${schedulesResponse.statusText}`
          );
        }

        // Fallback to default pattern logic if no active schedule found
        await fetchDefaultTrafficPatterns();
      } catch (error) {
        console.error("❌ [DEBUG] Error fetching active schedule:", error);
        await fetchDefaultTrafficPatterns();
      }
    };

    const fetchDefaultTrafficPatterns = async () => {
      try {
        console.log("🔄 [DEBUG] Fetching default traffic patterns...");
        const response = await fetch(
          `/api/trafficPatterns?junctionId=${selectedJunction.junctionId}`
        );
        if (!response.ok) {
          console.error("Failed to fetch traffic patterns", response.status);
          return;
        }
        const data = await response.json();
        console.log("📊 [DEBUG] Default patterns found:", data.length);
        setTrafficPatterns(data);

        const currentHour = new Date().getHours();
        console.log(
          `🕒 [DEBUG] Looking for pattern matching hour: ${currentHour}`
        );

        const matchingPattern = data.find((pattern: TrafficPattern) => {
          if (
            pattern.timingConfiguration?.activeTime?.startHour !== undefined &&
            pattern.timingConfiguration?.activeTime?.endHour !== undefined
          ) {
            const { startHour, endHour } =
              pattern.timingConfiguration.activeTime;
            const matches = currentHour >= startHour && currentHour < endHour;
            console.log(
              `   Pattern "${pattern.patternName}": ${startHour}-${endHour}h, matches: ${matches}`
            );
            return matches;
          }
          console.log(
            `   Pattern "${pattern.patternName}": no active time configured`
          );
          return false;
        });

        const selectedPattern = matchingPattern || data[0] || null;
        setActivePattern(selectedPattern);
        setActiveSchedule(null); // Clear schedule since we're using default pattern
        console.log(
          `📋 [DEBUG] Default pattern selected: "${
            selectedPattern?.patternName || "none"
          }"`
        );

        if (selectedPattern) {
          console.log(
            `⏱️ [DEBUG] Default pattern cycle: ${
              selectedPattern.timingConfiguration?.cycleDuration ||
              selectedPattern.timingConfiguration?.cycleTime ||
              "unknown"
            }s`
          );
        }
      } catch (error) {
        console.error("Error fetching traffic patterns:", error);
      }
    };

    fetchActiveScheduleData();
  }, [selectedJunction]);

  // Calculate current phase info based on traffic light state and active pattern
  useEffect(() => {
    if (!activePattern || !trafficLightState) {
      setCurrentPhaseInfo(null);
      return;
    }

    const config = activePattern.timingConfiguration;
    if (!config || !config.phases) return;

    // Use the current_time directly from Python simulation for synchronization
    const currentTime = trafficLightState.current_time;
    const cycleDuration = config.cycleDuration || config.cycleTime || 120;
    const cycleTime = currentTime % cycleDuration;

    console.log(`🔄 [SYNC DEBUG] Comparing Python vs Pattern data:`);
    console.log(`   Python current_time: ${currentTime}s`);
    console.log(`   Pattern cycle duration: ${cycleDuration}s`);
    console.log(`   Calculated cycle time: ${cycleTime}s`);
    console.log(`   Python lights_state:`, trafficLightState.lights_state);
    console.log(`   Pattern phases:`, config.phases);

    // Debug direction mapping
    const pythonDirections = Object.keys(trafficLightState.lights_state);
    console.log(`   Python directions: [${pythonDirections.join(", ")}]`);

    const patternDirections = [
      ...new Set(config.phases.map((p: any) => p.direction)),
    ];
    console.log(`   Pattern directions: [${patternDirections.join(", ")}]`);

    const phases = config.phases;
    const yellowTime = config.yellowTime || 3;
    const allRedTime = config.allRedTime || 2;

    let currentPhase = null;
    let phaseType = "red";

    // Find the current phase based on cycle time
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const startTime = phase.startTime;
      const greenEnd = startTime + phase.greenTime;
      const yellowEnd = greenEnd + yellowTime;
      const phaseEnd = yellowEnd + allRedTime;

      console.log(`   Phase ${i}: ${phase.direction || phase.phaseName}`);
      console.log(
        `     Start: ${startTime}s, Green: ${startTime}-${greenEnd}s, Yellow: ${greenEnd}-${yellowEnd}s, Red: ${yellowEnd}-${phaseEnd}s`
      );

      if (cycleTime >= startTime && cycleTime < greenEnd) {
        currentPhase = phase;
        phaseType = "green";
        console.log(`     ✅ MATCH: Current time ${cycleTime}s in GREEN phase`);
        break;
      } else if (cycleTime >= greenEnd && cycleTime < yellowEnd) {
        currentPhase = phase;
        phaseType = "yellow";
        console.log(
          `     ✅ MATCH: Current time ${cycleTime}s in YELLOW phase`
        );
        break;
      } else if (cycleTime >= yellowEnd && cycleTime < phaseEnd) {
        currentPhase = phase;
        phaseType = "red";
        console.log(`     ✅ MATCH: Current time ${cycleTime}s in RED phase`);
        break;
      } else {
        console.log(
          `     ❌ No match: ${cycleTime}s not in range ${startTime}-${phaseEnd}s`
        );
      }
    }

    if (!currentPhase) {
      // If no phase matches, use the last phase and assume red
      currentPhase = phases[phases.length - 1] || phases[0];
      phaseType = "red";
      console.log(
        `   ⚠️ No phase matched, using fallback: ${
          currentPhase?.direction || "unknown"
        }`
      );
    }

    // Compare with Python data
    const pythonActiveDirection = Object.keys(
      trafficLightState.lights_state
    ).find(
      (direction) => trafficLightState.lights_state[direction] === "green"
    );
    const patternActiveDirection = currentPhase?.direction;

    console.log(`🚦 [SYNC COMPARISON]:`);
    console.log(
      `   Python green direction: ${pythonActiveDirection || "none"}`
    );
    console.log(
      `   Pattern active direction: ${patternActiveDirection || "none"}`
    );
    console.log(`   Pattern phase type: ${phaseType}`);

    if (pythonActiveDirection !== patternActiveDirection) {
      console.log(
        `   ⚠️ MISMATCH: Python shows ${pythonActiveDirection} green, but pattern expects ${patternActiveDirection}`
      );
    } else {
      console.log(
        `   ✅ SYNC: Both show ${pythonActiveDirection || "none"} as active`
      );
    }

    const phaseInfo = {
      phaseName: `${
        currentPhase.phaseName || currentPhase.direction
      } - ${phaseType.toUpperCase()}`,
      direction: currentPhase.direction,
      cycleTime: Math.round(cycleTime),
      phaseType: phaseType,
      totalCycleTime: cycleDuration,
      currentTime: currentTime,
    };

    setCurrentPhaseInfo(phaseInfo);

    console.log("🚦 Phase info updated:", {
      simulationTime: currentTime,
      cycleTime: Math.round(cycleTime),
      phase: currentPhase.phaseName || currentPhase.direction,
      type: phaseType,
      cycleDuration,
    });
  }, [activePattern, trafficLightState]);

  // Refresh chart every 5 minutes
  useEffect(() => {
    if (!selectedJunction) return;

    const refreshChart = () => {
      setChartRefreshKey((prev) => prev + 1);
    };

    refreshChart();
    const chartInterval = setInterval(refreshChart, 300000);

    return () => clearInterval(chartInterval);
  }, [selectedJunction]);

  // Fetch traffic light state from Python API
  useEffect(() => {
    if (!selectedJunction) {
      setTrafficLightState(null);
      setConnectionFailed(false);
      return;
    }

    const fetchTrafficLightState = async () => {
      try {
        const response = await fetch(
          "http://localhost:8000/traffic-light-state"
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch traffic light state: ${response.status}`
          );
        }
        const data = await response.json();
        setTrafficLightState(data);
        setConnectionFailed(false);
      } catch (error) {
        console.error("Error fetching traffic light state:", error);
        setConnectionFailed(true);
      }
    };

    fetchTrafficLightState();
    const interval = setInterval(fetchTrafficLightState, 1000);

    return () => clearInterval(interval);
  }, [selectedJunction]);

  // Center the map on the selected junction
  useEffect(() => {
    if (selectedJunction && mapRef.current) {
      mapRef.current.flyTo({
        center: [
          Number(selectedJunction.longitude),
          Number(selectedJunction.latitude),
        ],
        zoom: 20,
        speed: 2.5,
        curve: 1,
      });
    }
  }, [selectedJunction]);

  // Draw the simulation on the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !trafficLightState) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fixed canvas size
    const WINDOW_WIDTH = 375;
    const WINDOW_HEIGHT = 375;
    const LIGHT_RADIUS = 16;

    const LIGHT_POSITIONS = {
      Bắc: {
        red: [WINDOW_WIDTH / 2, 64],
        yellow: [WINDOW_WIDTH / 2, 96],
        green: [WINDOW_WIDTH / 2, 128],
      },
      Nam: {
        red: [WINDOW_WIDTH / 2, WINDOW_HEIGHT - 128],
        yellow: [WINDOW_WIDTH / 2, WINDOW_HEIGHT - 96],
        green: [WINDOW_WIDTH / 2, WINDOW_HEIGHT - 64],
      },
      Đông: {
        red: [WINDOW_WIDTH - 64, WINDOW_HEIGHT / 2 - 32],
        yellow: [WINDOW_WIDTH - 64, WINDOW_HEIGHT / 2],
        green: [WINDOW_WIDTH - 64, WINDOW_HEIGHT / 2 + 32],
      },
      Tây: {
        red: [64, WINDOW_HEIGHT / 2 - 32],
        yellow: [64, WINDOW_HEIGHT / 2],
        green: [64, WINDOW_HEIGHT / 2 + 32],
      },
    };

    const COUNTDOWN_POSITIONS = {
      Bắc: [WINDOW_WIDTH / 2 + 43, 96],
      Nam: [WINDOW_WIDTH / 2 + 43, WINDOW_HEIGHT - 96],
      Đông: [WINDOW_WIDTH - 30, WINDOW_HEIGHT / 2],
      Tây: [100, WINDOW_HEIGHT / 2],
    };

    // Colors
    const RED = "rgb(255, 0, 0)";
    const YELLOW = "rgb(255, 255, 0)";
    const GREEN = "rgb(0, 255, 0)";
    const DIM_RED = "rgb(150, 0, 0)";
    const DIM_YELLOW = "rgb(150, 150, 0)";
    const DIM_GREEN = "rgb(0, 150, 0)";
    const WHITE = "rgb(255, 255, 255)";
    const BLACK = "rgb(0, 0, 0)";

    // Clear the canvas
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);

    // Draw labels
    const labels = ["Bắc", "Nam", "Đông", "Tây"];
    const labelPositions = [
      [WINDOW_WIDTH / 2, 32],
      [WINDOW_WIDTH / 2, WINDOW_HEIGHT - 160],
      [WINDOW_WIDTH - 32, WINDOW_HEIGHT / 2 - 64],
      [32, WINDOW_HEIGHT / 2 - 64],
    ];

    ctx.font = "17px 'Cascadia Code'";
    ctx.fillStyle = BLACK;
    ctx.textAlign = "center";
    labels.forEach((label, index) => {
      ctx.fillText(label, labelPositions[index][0], labelPositions[index][1]);
    });

    // Draw traffic lights and countdowns
    const directions = ["Bắc", "Nam", "Đông", "Tây"] as const;
    for (const direction of directions) {
      const positions = LIGHT_POSITIONS[direction];
      const state = trafficLightState.lights_state[direction] || "red";

      // Draw the lights
      ctx.beginPath();
      ctx.arc(positions.red[0], positions.red[1], LIGHT_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = state === "red" ? RED : DIM_RED;
      ctx.fill();
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        positions.yellow[0],
        positions.yellow[1],
        LIGHT_RADIUS,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = state === "yellow" ? YELLOW : DIM_YELLOW;
      ctx.fill();
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        positions.green[0],
        positions.green[1],
        LIGHT_RADIUS,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = state === "green" ? GREEN : DIM_GREEN;
      ctx.fill();
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw countdown
      const countdown = trafficLightState.countdowns[direction];
      if (countdown !== null) {
        ctx.fillStyle = BLACK;
        ctx.fillText(
          String(countdown),
          COUNTDOWN_POSITIONS[direction][0],
          COUNTDOWN_POSITIONS[direction][1]
        );
      }
    }
  }, [trafficLightState]);

  // Get phase data for the table
  const getPhaseData = () => {
    if (!selectedJunction || !activePattern) {
      return [
        { bd: "-", green: "-", yellow: "-", red: "-", redDuration: "-" },
        { bd: "-", green: "-", yellow: "-", red: "-", redDuration: "-" },
        { bd: "-", green: "-", yellow: "-", red: "-", redDuration: "-" },
        { bd: "-", green: "-", yellow: "-", red: "-", redDuration: "-" },
      ];
    }

    const phases = activePattern.timingConfiguration.phases;
    const yellowTime = activePattern.timingConfiguration.yellowTime;
    const allRedTime = activePattern.timingConfiguration.allRedTime || 0;
    const cycleTime = activePattern.timingConfiguration.cycleTime;

    return phases.map((phase: Phase) => {
      const greenTime = phase.greenTime;
      const redDuration = cycleTime - greenTime - yellowTime - allRedTime;

      return {
        bd: String(phase.startTime).padStart(2, "0"),
        green: greenTime,
        yellow: yellowTime,
        red: allRedTime,
        redDuration: redDuration >= 0 ? redDuration : 0,
      };
    });
  };

  // Determine the current phase based on current_time
  const getCurrentPhase = () => {
    if (!activePattern || !trafficLightState) {
      return {
        phaseName: "Không xác định",
        direction: "N/A",
        timeRange: "N/A",
        scheduleInfo: "N/A",
      };
    }

    let timeRange = "N/A";
    let scheduleInfo = "Mẫu mặc định";

    if (activeSchedule) {
      timeRange = `${activeSchedule.startTime} - ${activeSchedule.endTime}`;
      scheduleInfo = `${activeSchedule.scheduleId}`;
    } else if (
      activePattern.timingConfiguration?.activeTime?.startHour !== undefined &&
      activePattern.timingConfiguration?.activeTime?.endHour !== undefined
    ) {
      const { startHour, endHour } =
        activePattern.timingConfiguration.activeTime;
      timeRange = `${String(startHour).padStart(2, "0")}:00–${String(
        endHour
      ).padStart(2, "0")}:00`;
    }

    return {
      phaseName: activePattern.patternName,
      direction: currentPhaseInfo?.direction || "N/A",
      timeRange: timeRange,
      scheduleInfo: scheduleInfo,
    };
  };

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Main Content */}
      <div className="flex h-[68vh] bg-gray-100 dark:bg-gray-800">
        {/* Mapbox Map Section (Left Side) */}
        <div className="w-3/5">
          <TrafficMap
            selectedJunction={selectedJunction}
            mapRef={mapRef}
          />
        </div>

        {/* Simulation and Phase Table Section (Right Side) */}
        <div className="w-2/5 p-4 flex flex-col gap-4">
          {/* Traffic Light Simulation */}
          <div className="flex-1 flex items-center justify-center min-h-0">
            {selectedJunction ? (
              connectionFailed ? (
                <p className="text-red-600 dark:text-red-400 text-center">
                  Mất kết nối, đang thử lại...
                </p>
              ) : trafficLightState ? (
                <canvas
                  ref={canvasRef}
                  width={375}
                  height={375}
                  className="border border-gray-300 dark:border-gray-600 mx-auto max-w-full max-h-full object-contain"
                />
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  Đang tải trạng thái đèn giao thông...
                </p>
              )
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center">
                Chọn một nút giao để xem trạng thái đèn giao thông
              </p>
            )}
          </div>

          {/* Traffic Light Phase Table */}
          <div className="flex-1 min-h-0">
            <TrafficLightChart
              key={chartRefreshKey}
              selectedJunction={selectedJunction}
              activePattern={activePattern}
              currentPhaseInfo={currentPhaseInfo}
              trafficLightState={trafficLightState}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section with Two Columns */}
      <div className="flex h-[26vh] border-t border-gray-200 dark:border-gray-600">
        {/* Junction List */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-600 p-4 overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Danh sách nút giao
            </h2>
            {/* Search Bar */}
            <div className="w-[60%]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nút giao..."
                className="w-full px-3 py-2 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 placeholder-gray-500"
              />
            </div>
          </div>
          <div className="h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar">
            {loading ? (
              <p className="text-gray-700 dark:text-gray-300">Đang tải...</p>
            ) : filteredJunctions.length > 0 ? (
              <ul>
                {filteredJunctions.map((junction) => (
                  <li
                    key={junction.junctionId}
                    className={`p-2 cursor-pointer rounded ${
                      selectedJunction?.junctionId === junction.junctionId
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    } transition-colors`}
                    onClick={() => handleJunctionSelect(junction)}
                  >
                    {junction.junctionName}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-700 dark:text-gray-300">
                Không tìm thấy nút giao phù hợp
              </p>
            )}
          </div>
        </div>

        {/* Junction Details */}
        <div className="w-1/2 p-4 overflow-hidden">
          <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
            Thông tin nút giao
          </h2>
          <div className="h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar">
            {selectedJunction ? (
              <div className="text-gray-700 dark:text-gray-300">
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Tên nút giao:{" "}
                  </strong>
                  {selectedJunction.junctionName}
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Vị trí:{" "}
                  </strong>
                  {selectedJunction.location}
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Kinh độ:{" "}
                  </strong>
                  {selectedJunction.longitude}
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Vĩ độ:{" "}
                  </strong>
                  {selectedJunction.latitude}
                </p>
                {/* Current Traffic Light Phase Information */}
                <div className="mt-2">
                  <p>
                    <strong className="text-gray-900 dark:text-white">
                      Pha đèn hiện tại:{" "}
                    </strong>
                    {getCurrentPhase().phaseName}
                  </p>
                  <p>
                    <strong className="text-gray-900 dark:text-white">
                      Khung giờ áp dụng:{" "}
                    </strong>
                    {getCurrentPhase().timeRange}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 dark:text-gray-300">
                Chọn một nút giao để xem thông tin
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar {
          /* Firefox */
          scrollbar-width: thin;
          scrollbar-color: #3b82f6 #101828;
        }
      `}</style>
    </div>
  );
}
