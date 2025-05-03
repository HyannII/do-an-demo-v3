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
  status: string;
  countdown: number | null;
}

interface Phase {
  startTime: number;
  direction: string;
  greenTime: number;
}

interface TimingConfiguration {
  activeTime: { startHour: number; endHour: number };
  cycleTime: number;
  yellowTime: number;
  allRedTime: number;
  phases: Phase[];
}

export default function JunctionMap() {
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [selectedJunction, setSelectedJunction] = useState<Junction | null>(
    null
  );
  const [trafficPatterns, setTrafficPatterns] = useState<TrafficPattern[]>([]);
  const [activePattern, setActivePattern] = useState<TrafficPattern | null>(
    null
  );
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const mapRef = useRef<MapRef>(null);

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
        if (data.length > 0) {
          setSelectedJunction(data[0]);
        }
      } catch (error) {
        console.error("Error fetching junctions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJunctions();
  }, []);

  // Fetch traffic patterns for the selected junction
  useEffect(() => {
    if (!selectedJunction) return;

    const fetchTrafficPatterns = async () => {
      try {
        const response = await fetch(
          `/api/trafficPatterns?junctionId=${selectedJunction.junctionId}`
        );
        if (!response.ok) {
          console.error("Failed to fetch traffic patterns", response.status);
          return;
        }
        const data = await response.json();
        setTrafficPatterns(data);

        // Select the active pattern based on the current time
        const currentHour = new Date().getHours();
        const matchingPattern = data.find((pattern: TrafficPattern) => {
          const { startHour, endHour } = pattern.timingConfiguration.activeTime;
          return currentHour >= startHour && currentHour < endHour;
        });

        // Fallback to the first pattern if no match is found
        const selectedPattern = matchingPattern || data[0] || null;
        setActivePattern(selectedPattern);
        setCurrentTime(0); // Reset simulation time
      } catch (error) {
        console.error("Error fetching traffic patterns:", error);
      }
    };

    fetchTrafficPatterns();
  }, [selectedJunction]);

  // Simulate traffic light timing
  useEffect(() => {
    if (!activePattern) return;

    const cycleTime = activePattern.timingConfiguration.cycleTime;
    const interval = setInterval(() => {
      setCurrentTime((prev) => (prev + 1) % cycleTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [activePattern]);

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

  // Get the current traffic light state and countdown
  const getTrafficLightState = (
    trafficLight: TrafficLight
  ): TrafficLightState => {
    if (!activePattern || !selectedJunction) {
      return { status: "red", countdown: null };
    }

    // Extract direction from location
    const directionMatch = trafficLight.location.match(/hướng\s+([^\s]+)/);
    const direction = directionMatch ? directionMatch[1] : null;
    if (!direction) {
      return { status: "red", countdown: null };
    }

    const cycleTime = activePattern.timingConfiguration.cycleTime;
    const yellowTime = activePattern.timingConfiguration.yellowTime;
    const allRedTime = activePattern.timingConfiguration.allRedTime || 0;
    const phases = activePattern.timingConfiguration.phases;

    // Find the phase for this direction
    const phase = phases.find((p: Phase) => p.direction === direction);
    if (!phase) {
      return { status: "red", countdown: null };
    }

    const startTime = phase.startTime;
    const greenTime = phase.greenTime;
    const greenEnd = startTime + greenTime;
    const yellowEnd = greenEnd + yellowTime;

    let status = "red";
    let countdown: number | null = null;

    // Determine the state based on currentTime
    if (currentTime >= startTime && currentTime < greenEnd) {
      status = "green";
      countdown = greenEnd - currentTime;
    } else if (currentTime >= greenEnd && currentTime < yellowEnd) {
      status = "yellow";
      countdown = yellowEnd - currentTime;
    } else {
      status = "red";
      // Calculate the time until the next green phase starts
      let timeToNextGreen = 0;
      if (currentTime >= yellowEnd) {
        // After yellow, calculate remaining time in the cycle plus the time to the next start
        timeToNextGreen = cycleTime - currentTime + startTime;
      } else {
        // Before the phase starts, countdown to the start time
        timeToNextGreen = startTime - currentTime;
      }

      // Adjust for negative values (e.g., when currentTime is near the end of the cycle)
      if (timeToNextGreen <= 0) {
        timeToNextGreen += cycleTime;
      }

      countdown = timeToNextGreen;
    }

    return { status, countdown };
  };

  const handleJunctionSelect = (junction: Junction) => {
    setSelectedJunction(junction);
  };

  // Get color based on traffic light status
  const getTrafficLightColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "green":
        return "bg-green-500";
      case "yellow":
        return "bg-yellow-500";
      case "red":
      default:
        return "bg-red-500";
    }
  };

  // Get phase data for the table
  const getPhaseData = () => {
    if (!activePattern) {
      return [
        { bd: "00", green: 25, yellow: 3, red: 2, cycle: 30 },
        { bd: "30", green: 25, yellow: 3, red: 2, cycle: 30 },
        { bd: "00", green: 25, yellow: 3, red: 2, cycle: 30 },
        { bd: "30", green: 25, yellow: 3, red: 2, cycle: 30 },
      ];
    }

    const phases = activePattern.timingConfiguration.phases;
    const yellowTime = activePattern.timingConfiguration.yellowTime;
    const allRedTime = activePattern.timingConfiguration.allRedTime || 0;

    return phases.map((phase: Phase, index: number) => {
      const greenTime = phase.greenTime;
      // Calculate the phase duration as the time until the next phase starts
      const nextPhaseStartTime =
        index + 1 < phases.length
          ? phases[index + 1].startTime
          : activePattern.timingConfiguration.cycleTime;
      const cycle = nextPhaseStartTime - phase.startTime;
      return {
        bd: String(phase.startTime).padStart(2, "0"),
        green: greenTime,
        yellow: yellowTime,
        red: allRedTime,
        cycle: cycle,
      };
    });
  };

  return (
    <div className="flex flex-col h-[94vh] overflow-hidden bg-gray-900">
      {/* Top Section: Mapbox Map and Table Side by Side */}
      <div className="flex h-[65vh] bg-gray-800">
        {/* Mapbox Map Section (Left Side) */}
        <div className="w-3/4">
          {selectedJunction ? (
            <Map
              ref={mapRef}
              initialViewState={{
                longitude: Number(selectedJunction.longitude),
                latitude: Number(selectedJunction.latitude),
                zoom: 18,
              }}
              style={{ width: "100%", height: "100%" }}
              mapStyle="mapbox://styles/mapbox/outdoors-v12"
              mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
              language="vi"
            >
              {selectedJunction.trafficLights.map(
                (trafficLight: TrafficLight) => {
                  const { status, countdown } =
                    getTrafficLightState(trafficLight);
                  return (
                    <Marker
                      key={trafficLight.trafficLightId}
                      longitude={Number(trafficLight.longitude)}
                      latitude={Number(trafficLight.latitude)}
                      anchor="center"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full ${getTrafficLightColor(
                            status
                          )} border-2 border-white shadow-md`}
                        />
                        <div className="mt-1 text-white font-bold text-sm bg-black bg-opacity-50 rounded px-1">
                          {countdown !== null ? countdown : "-"}
                        </div>
                      </div>
                    </Marker>
                  );
                }
              )}
            </Map>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-gray-400">Chọn một nút giao để xem bản đồ</p>
            </div>
          )}
        </div>
        {/* Traffic Light Phase Table (Right Side) */}
        <div className="w-1/4 p-4 overflow-y-auto">
          <table className="w-full border-separate border-spacing-0 border-2 border-gray-600">
            <thead>
              <tr>
                <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                  Pha
                </th>
                <th className="border-2 border-gray-600 p-2 text-center text-white bg-gray-700">
                  BD
                </th>
                <th className="border-2 border-gray-600 p-2 text-center text-white bg-gray-700">
                  X
                </th>
                <th className="border-2 border-gray-600 p-2 text-center text-white bg-gray-700">
                  V
                </th>
                <th className="border-2 border-gray-600 p-2 text-center text-white bg-gray-700">
                  TĐ
                </th>
                <th className="border-2 border-gray-600 p-2 text-center text-white bg-gray-700">
                  Chu kỳ
                </th>
              </tr>
            </thead>
            <tbody>
              {getPhaseData().map((phase, index) => (
                <tr key={index}>
                  <td className="border-2 border-gray-600 p-2 text-gray-300">
                    Pha {index + 1}
                  </td>
                  <td className="border-2 border-gray-600 p-2 text-center text-gray-300">
                    {phase.bd}
                  </td>
                  <td className="border-2 border-gray-600 p-2 text-center text-gray-300">
                    {phase.green}
                  </td>
                  <td className="border-2 border-gray-600 p-2 text-center text-gray-300">
                    {phase.yellow}
                  </td>
                  <td className="border-2 border-gray-600 p-2 text-center text-gray-300">
                    {phase.red}
                  </td>
                  <td className="border-2 border-gray-600 p-2 flex items-center justify-between">
                    <div className="flex">
                      <div
                        className="bg-green-500 h-6"
                        style={{
                          width: `${(phase.green / phase.cycle) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-yellow-500 h-6"
                        style={{
                          width: `${(phase.yellow / phase.cycle) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-red-500 h-6"
                        style={{
                          width: `${
                            ((phase.cycle - phase.green - phase.yellow) /
                              phase.cycle) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-gray-300 ml-2">{phase.cycle}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedJunction && getPhaseData().length > 0 && (
            <div className="mt-2 text-sm text-gray-300">
              Tổng thời gian chu kỳ tính bằng:{" "}
              {activePattern?.timingConfiguration.cycleTime} giây
            </div>
          )}
        </div>
      </div>
      {/* Bottom Section with Three Columns */}
      <div className="flex h-[30vh] border-t border-gray-600">
        {/* Junction List */}
        <div className="w-1/2 border-r border-gray-600 p-4 overflow-hidden">
          <h2 className="text-lg font-bold mb-2 text-white">
            Danh sách nút giao
          </h2>
          <div className="h-[calc(100%-2rem)] overflow-y-auto">
            {loading ? (
              <p className="text-gray-300">Đang tải...</p>
            ) : junctions.length > 0 ? (
              <ul>
                {junctions.map((junction) => (
                  <li
                    key={junction.junctionId}
                    className={`p-2 cursor-pointer rounded ${
                      selectedJunction?.junctionId === junction.junctionId
                        ? "bg-blue-900/30 text-blue-400"
                        : "text-gray-300 hover:bg-gray-800"
                    } transition-colors`}
                    onClick={() => handleJunctionSelect(junction)}
                  >
                    {junction.junctionName}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-300">Không có nút giao nào</p>
            )}
          </div>
        </div>
        {/* Junction Details */}
        <div className="w-1/2 p-4 overflow-hidden">
          <h2 className="text-lg font-bold mb-2 text-white">
            Thông tin nút giao
          </h2>
          <div className="h-[calc(100%-2rem)] overflow-y-auto">
            {selectedJunction ? (
              <div className="text-gray-300">
                <p>
                  <strong className="text-white">Tên nút giao: </strong>
                  {selectedJunction.junctionName}
                </p>
                <p>
                  <strong className="text-white">Vị trí: </strong>
                  {selectedJunction.location}
                </p>
                <p>
                  <strong className="text-white">Kinh độ: </strong>
                  {selectedJunction.longitude}
                </p>
                <p>
                  <strong className="text-white">Vĩ độ: </strong>
                  {selectedJunction.latitude}
                </p>
                <Link href={`/junctions/${selectedJunction.junctionId}`}>
                  <button className="mt-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors">
                    Xem chi tiết
                  </button>
                </Link>
              </div>
            ) : (
              <p className="text-gray-300">
                Chọn một nút giao để xem thông tin
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
