"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapRef } from "react-map-gl/mapbox";
import { Junction, TrafficPattern } from "../../../../types/interface";
import { TrafficLightState, ActiveSchedule, CurrentPhaseInfo } from "./types";

// Import components
import TrafficLightChart from "./components/TrafficLightChart";
import TrafficMap from "./components/TrafficMap";
import TrafficCanvas from "./components/TrafficCanvas";
import JunctionList from "./components/JunctionList";
import JunctionDetails from "./components/JunctionDetails";

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
  const [currentPhaseInfo, setCurrentPhaseInfo] =
    useState<CurrentPhaseInfo | null>(null);

  const mapRef = useRef<MapRef>(null);

  // Handle junction selection
  const handleJunctionSelect = (junction: Junction) => {
    setSelectedJunction(junction);
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
          return;
        }
        const data = await response.json();
        setJunctions(data);
        setFilteredJunctions(data);
      } catch (error) {
        // Silent error handling
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
        const currentDayOfWeek = now.getDay();

        // Query all schedules for this junction
        const schedulesResponse = await fetch(
          `/api/schedules?junctionId=${selectedJunction.junctionId}`
        );

        if (schedulesResponse.ok) {
          const schedules = await schedulesResponse.json();

          // Find the active schedule
          const activeSchedule = schedules.find(
            (schedule: any) => schedule.isActive === true
          );

          if (activeSchedule) {
            if (
              activeSchedule.mode === "auto" &&
              activeSchedule.autoPatternId
            ) {
              // Auto mode - use the auto pattern
              const patternResponse = await fetch(
                `/api/trafficPatterns/${activeSchedule.autoPatternId}`
              );
              if (patternResponse.ok) {
                const patternData = await patternResponse.json();
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
                return;
              }
            } else if (
              activeSchedule.mode === "schedule" &&
              activeSchedule.daySchedules
            ) {
              // Schedule mode - check day schedules
              const todaySchedule = activeSchedule.daySchedules.find(
                (daySchedule: any) =>
                  daySchedule.dayOfWeek === currentDayOfWeek &&
                  daySchedule.isActive === true
              );

              if (todaySchedule && todaySchedule.timeSlots) {
                // Find matching time slot
                let matchingTimeSlot = null;

                for (const timeSlot of todaySchedule.timeSlots) {
                  if (!timeSlot.isActive) continue;

                  if (!timeSlot.startTime || !timeSlot.endTime) {
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

                  let isInRange = false;

                  // Handle time slots that cross midnight
                  if (startTimeInMinutes <= endTimeInMinutes) {
                    // Normal time slot (same day)
                    isInRange =
                      currentTimeInMinutes >= startTimeInMinutes &&
                      currentTimeInMinutes <= endTimeInMinutes;
                  } else {
                    // Time slot crosses midnight
                    isInRange =
                      currentTimeInMinutes >= startTimeInMinutes ||
                      currentTimeInMinutes <= endTimeInMinutes;
                  }

                  if (isInRange) {
                    matchingTimeSlot = timeSlot;
                    break;
                  }
                }

                if (matchingTimeSlot) {
                  // Fetch the pattern for this time slot
                  const patternResponse = await fetch(
                    `/api/trafficPatterns/${matchingTimeSlot.patternId}`
                  );
                  if (patternResponse.ok) {
                    const patternData = await patternResponse.json();
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
                    return;
                  }
                }
              }
            }
          }
        }

        // Fallback to default pattern logic if no active schedule found
        await fetchDefaultTrafficPatterns();
      } catch (error) {
        await fetchDefaultTrafficPatterns();
      }
    };

    const fetchDefaultTrafficPatterns = async () => {
      try {
        const response = await fetch(
          `/api/trafficPatterns?junctionId=${selectedJunction.junctionId}`
        );
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        setTrafficPatterns(data);

        const currentHour = new Date().getHours();

        const matchingPattern = data.find((pattern: TrafficPattern) => {
          if (
            pattern.timingConfiguration?.activeTime?.startHour !== undefined &&
            pattern.timingConfiguration?.activeTime?.endHour !== undefined
          ) {
            const { startHour, endHour } =
              pattern.timingConfiguration.activeTime;
            return currentHour >= startHour && currentHour < endHour;
          }
          return false;
        });

        const selectedPattern = matchingPattern || data[0] || null;
        setActivePattern(selectedPattern);
        setActiveSchedule(null);
      } catch (error) {
        // Silent error handling
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

    // Get available light names
    const lightNames = Object.keys(trafficLightState.lights_state);

    // Find the currently active light(s)
    const activeLights = lightNames.filter(
      (lightName) => trafficLightState.lights_state[lightName] === "green"
    );
    const yellowLights = lightNames.filter(
      (lightName) => trafficLightState.lights_state[lightName] === "yellow"
    );

    let currentPhase = null;
    let phaseType = "red";
    let activeLightName = activeLights[0] || yellowLights[0] || lightNames[0];

    // Try to find matching phase in pattern
    const phases = config.phases;
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const startTime = phase.startTime;
      const duration = phase.duration;
      const phaseEnd = startTime + duration;

      // Check if current time is within this phase
      if (cycleTime >= startTime && cycleTime < phaseEnd) {
        // Check if this phase affects any of the active lights
        if (
          phase.lightName &&
          (activeLights.includes(phase.lightName) ||
            yellowLights.includes(phase.lightName))
        ) {
          currentPhase = phase;
          phaseType =
            phase.color ||
            (activeLights.includes(phase.lightName) ? "green" : "yellow");
          activeLightName = phase.lightName;
          break;
        } else if (phase.lightStates) {
          // Check lightStates for active lights
          const matchingLight = Object.keys(phase.lightStates).find(
            (lightId) => {
              const state = phase.lightStates![lightId];
              return (
                lightNames.includes(lightId) &&
                ((state === "green" && activeLights.includes(lightId)) ||
                  (state === "yellow" && yellowLights.includes(lightId)))
              );
            }
          );

          if (matchingLight) {
            currentPhase = phase;
            phaseType = phase.lightStates[matchingLight];
            activeLightName = matchingLight;
            break;
          }
        }
      }
    }

    if (!currentPhase) {
      // Fallback: find any phase that affects the active lights
      for (const phase of phases) {
        if (phase.lightName && activeLights.includes(phase.lightName)) {
          currentPhase = phase;
          phaseType = "green";
          activeLightName = phase.lightName;
          break;
        }
      }
    }

    if (!currentPhase && phases.length > 0) {
      // Last resort: use first phase
      currentPhase = phases[0];
      phaseType = "red";
      activeLightName = currentPhase.lightName || lightNames[0];
    }

    const phaseInfo: CurrentPhaseInfo = {
      phaseName: currentPhase
        ? currentPhase.phaseName ||
          `${activeLightName} - ${phaseType.toUpperCase()}`
        : "Không xác định",
      lightName: activeLightName,
      cycleTime: Math.round(cycleTime),
      phaseType: phaseType,
      totalCycleTime: cycleDuration,
      currentTime: currentTime,
    };

    setCurrentPhaseInfo(phaseInfo);
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

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Main Content */}
      <div className="flex h-[68vh] bg-gray-100 dark:bg-gray-800">
        {/* Mapbox Map Section (Left Side) */}
        <div className="w-3/5">
          <TrafficMap
            selectedJunction={selectedJunction}
            mapRef={mapRef}
            trafficLightState={trafficLightState}
          />
        </div>

        {/* Simulation and Phase Table Section (Right Side) */}
        <div className="w-2/5 p-4 flex flex-col gap-4">
          {/* Traffic Light Simulation */}
          <div className="flex-1 flex items-center justify-center min-h-0">
            {selectedJunction ? (
              <TrafficCanvas
                trafficLightState={trafficLightState}
                connectionFailed={connectionFailed}
              />
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
              connectionFailed={connectionFailed}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section with Two Columns */}
      <div className="flex h-[26vh] border-t border-gray-200 dark:border-gray-600">
        {/* Junction List */}
        <JunctionList
          junctions={junctions}
          filteredJunctions={filteredJunctions}
          selectedJunction={selectedJunction}
          searchQuery={searchQuery}
          loading={loading}
          onJunctionSelect={handleJunctionSelect}
          onSearchChange={setSearchQuery}
        />

        {/* Junction Details */}
        <JunctionDetails
          selectedJunction={selectedJunction}
          activePattern={activePattern}
          activeSchedule={activeSchedule}
          trafficLightState={trafficLightState}
          currentPhaseInfo={currentPhaseInfo}
        />
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
