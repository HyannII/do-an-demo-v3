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
  const [trafficLightState, setTrafficLightState] =
    useState<TrafficLightState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>(""); // State for search query
  const [connectionFailed, setConnectionFailed] = useState<boolean>(false); // State for connection status
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
        setFilteredJunctions(data); // Initialize filtered junctions
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
    const filtered = junctions.filter((junction) =>
      junction.junctionName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredJunctions(filtered);
  }, [searchQuery, junctions]);

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

        const currentHour = new Date().getHours();
        const matchingPattern = data.find((pattern: TrafficPattern) => {
          const { startHour, endHour } = pattern.timingConfiguration.activeTime;
          return currentHour >= startHour && currentHour < endHour;
        });

        const selectedPattern = matchingPattern || data[0] || null;
        setActivePattern(selectedPattern);
      } catch (error) {
        console.error("Error fetching traffic patterns:", error);
      }
    };

    fetchTrafficPatterns();
  }, [selectedJunction]);

  // Fetch traffic light state from Python API only when a junction is selected
  useEffect(() => {
    if (!selectedJunction) {
      setTrafficLightState(null); // Reset traffic light state when no junction is selected
      setConnectionFailed(false); // Reset connection status
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
        setConnectionFailed(false); // Connection succeeded
      } catch (error) {
        console.error("Error fetching traffic light state:", error);
        setConnectionFailed(true); // Connection failed
      }
    };

    fetchTrafficLightState();
    const interval = setInterval(fetchTrafficLightState, 1000); // Fetch every second

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
    const LIGHT_RADIUS = 16; // Scaled from 15 * (375/350)
    const LIGHT_POSITIONS = {
      Bắc: {
        red: [WINDOW_WIDTH / 2, 64], // 60 * (375/350)
        yellow: [WINDOW_WIDTH / 2, 96], // 90 * (375/350)
        green: [WINDOW_WIDTH / 2, 128], // 120 * (375/350)
      },
      Nam: {
        red: [WINDOW_WIDTH / 2, WINDOW_HEIGHT - 128], // (350 - 120) * (375/350)
        yellow: [WINDOW_WIDTH / 2, WINDOW_HEIGHT - 96], // (350 - 90) * (375/350)
        green: [WINDOW_WIDTH / 2, WINDOW_HEIGHT - 64], // (350 - 60) * (375/350)
      },
      Đông: {
        red: [WINDOW_WIDTH - 64, WINDOW_HEIGHT / 2 - 32], // 60 * (375/350), 30 * (375/350)
        yellow: [WINDOW_WIDTH - 64, WINDOW_HEIGHT / 2], // 60 * (375/350)
        green: [WINDOW_WIDTH - 64, WINDOW_HEIGHT / 2 + 32], // 60 * (375/350), 30 * (375/350)
      },
      Tây: {
        red: [64, WINDOW_HEIGHT / 2 - 32], // 60 * (375/350), 30 * (375/350)
        yellow: [64, WINDOW_HEIGHT / 2], // 60 * (375/350)
        green: [64, WINDOW_HEIGHT / 2 + 32], // 60 * (375/350), 30 * (375/350)
      },
    };

    const COUNTDOWN_POSITIONS = {
      Bắc: [WINDOW_WIDTH / 2 + 43, 96], // (WINDOW_WIDTH / 2 + 40) * (375/350), 90 * (375/350)
      Nam: [WINDOW_WIDTH / 2 + 43, WINDOW_HEIGHT - 96], // (WINDOW_WIDTH / 2 + 40) * (375/350), (350 - 90) * (375/350)
      Đông: [WINDOW_WIDTH - 30, WINDOW_HEIGHT / 2], // (375 - 40) * (375/350)
      Tây: [100, WINDOW_HEIGHT / 2], // 100 * (375/350)
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
      [WINDOW_WIDTH / 2, 32], // 30 * (375/350)
      [WINDOW_WIDTH / 2, WINDOW_HEIGHT - 160], // (350 - 150) * (375/350)
      [WINDOW_WIDTH - 32, WINDOW_HEIGHT / 2 - 64], // (350 - 30) * (375/350), 60 * (375/350)
      [32, WINDOW_HEIGHT / 2 - 64], // 30 * (375/350), 60 * (375/350)
    ];

    ctx.font = "17px 'Cascadia Code'"; // Scaled from 16 * (375/350)
    ctx.fillStyle = BLACK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    labels.forEach((label, index) => {
      ctx.fillText(label, labelPositions[index][0], labelPositions[index][1]);
    });

    // Draw traffic lights and countdowns
    for (const direction in LIGHT_POSITIONS) {
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

  const handleJunctionSelect = (junction: Junction) => {
    setSelectedJunction(junction);
  };

  // Get phase data for the table
  const getPhaseData = () => {
    // If no junction is selected or no active pattern exists, return placeholder data
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

    return phases.map((phase: Phase, index: number) => {
      const greenTime = phase.greenTime;
      const startTime = phase.startTime;

      // Calculate red duration as cycleTime - greenTime - yellowTime - allRedTime
      const redDuration = cycleTime - greenTime - yellowTime - allRedTime;

      return {
        bd: String(phase.startTime).padStart(2, "0"),
        green: greenTime,
        yellow: yellowTime,
        red: allRedTime,
        redDuration: redDuration >= 0 ? redDuration : 0, // Ensure non-negative
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
      };
    }

    const currentTime = trafficLightState.current_time;
    const phases = activePattern.timingConfiguration.phases;
    const yellowTime = activePattern.timingConfiguration.yellowTime;
    const allRedTime = activePattern.timingConfiguration.allRedTime || 0;

    let currentPhase = null;
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const startTime = phase.startTime;
      const greenEnd = startTime + phase.greenTime;
      const yellowEnd = greenEnd + yellowTime;
      const phaseEnd = yellowEnd + allRedTime;

      if (currentTime >= startTime && currentTime < phaseEnd) {
        currentPhase = phase;
        break;
      }
    }

    if (!currentPhase) {
      // If no phase matches, assume we're in the all-red period at the end of the cycle
      // Use the last phase for display purposes
      currentPhase = phases[phases.length - 1];
    }

    const { startHour, endHour } = activePattern.timingConfiguration.activeTime;
    const timeRange = `${String(startHour).padStart(2, "0")}:00–${String(
      endHour
    ).padStart(2, "0")}:00`;

    return {
      phaseName: activePattern.patternName,
      direction: currentPhase.direction,
      timeRange: timeRange,
    };
  };

  return (
    <div className="flex flex-col h-[94vh] overflow-hidden bg-gray-900">
      {/* Top Section: Mapbox Map and Simulation/Table Side by Side */}
      <div className="flex h-[68vh] bg-gray-800">
        {/* Mapbox Map Section (Left Side) */}
        <div className="w-3/5">
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
                  // Extract direction from location
                  const directionMatch =
                    trafficLight.location.match(/hướng\s+([^\s]+)/);
                  const direction = directionMatch
                    ? directionMatch[1]
                    : "Unknown";
                  return (
                    <Marker
                      key={trafficLight.trafficLightId}
                      longitude={Number(trafficLight.longitude)}
                      latitude={Number(trafficLight.latitude)}
                      anchor="bottom" // Anchor the bottom of the speech bubble to the coordinates
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
                }
              )}
            </Map>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-gray-400">Chọn một nút giao để xem bản đồ</p>
            </div>
          )}
        </div>
        {/* Simulation and Phase Table Section (Right Side) */}
        <div className="w-2/5 p-4 flex flex-col overflow-y-auto custom-scrollbar">
          {/* Traffic Light Simulation */}
          <div className="mb-4 flex-1 flex items-center justify-center">
            {selectedJunction ? (
              connectionFailed ? (
                <p className="text-red-400 text-center">
                  Mất kết nối, đang thử lại...
                </p>
              ) : trafficLightState ? (
                <canvas
                  ref={canvasRef}
                  width={375}
                  height={375}
                  className="border border-gray-600 mx-auto"
                />
              ) : (
                <p className="text-gray-400 text-center">
                  Đang tải trạng thái đèn giao thông...
                </p>
              )
            ) : (
              <p className="text-gray-400 text-center">
                Chọn một nút giao để xem trạng thái đèn giao thông
              </p>
            )}
          </div>
          {/* Traffic Light Phase Table */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full border-separate border-spacing-0 border-2 border-gray-600">
              <thead>
                <tr>
                  <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                    Pha
                  </th>
                  <th className="border-2 border-gray-600 p-2 text-center text-white bg-gray-700">
                    Bắt đầu
                  </th>
                  <th className="border-2 border-gray-600 p-2 text-center text-white bg-gray-700">
                    Xanh
                  </th>
                  <th className="border-2 border-gray-600 p-2 text-center text-white bg-gray-700">
                    Vàng
                  </th>
                  <th className="border-2 border-gray-600 p-2 text-center text-white bg-gray-700">
                    Đỏ chung
                  </th>
                  <th className="border-2 border-gray-600 p-2 text-center text-white bg-gray-700">
                    Đỏ
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
                      {phase.redDuration === "-" ? (
                        <span className="text-gray-300 w-full text-center">
                          -
                        </span>
                      ) : (
                        <>
                          <div className="flex">
                            <div
                              className="bg-green-500 h-6"
                              style={{
                                width: `${
                                  (Number(phase.green) /
                                    (Number(phase.green) +
                                      Number(phase.yellow) +
                                      Number(phase.redDuration))) *
                                  100
                                }%`,
                              }}
                            />
                            <div
                              className="bg-yellow-500 h-6"
                              style={{
                                width: `${
                                  (Number(phase.yellow) /
                                    (Number(phase.green) +
                                      Number(phase.yellow) +
                                      Number(phase.redDuration))) *
                                  100
                                }%`,
                              }}
                            />
                            <div
                              className="bg-red-500 h-6"
                              style={{
                                width: `${
                                  (Number(phase.redDuration) /
                                    (Number(phase.green) +
                                      Number(phase.yellow) +
                                      Number(phase.redDuration))) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-gray-300 ml-2">
                            {phase.redDuration}
                          </span>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selectedJunction && activePattern && getPhaseData().length > 0 && (
              <div className="mt-2 text-sm text-gray-300">
                Tổng thời gian chu kỳ:{" "}
                {activePattern?.timingConfiguration.cycleTime} giây
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Bottom Section with Two Columns */}
      <div className="flex h-[27vh] border-t border-gray-600">
        {/* Junction List */}
        <div className="w-1/2 border-r border-gray-600 p-4 overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-white">Danh sách nút giao</h2>
            {/* Search Bar */}
            <div className="w-[60%]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nút giao..."
                className="w-full px-3 py-2 text-gray-300 bg-gray-800 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 placeholder-gray-500"
              />
            </div>
          </div>
          <div className="h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar">
            {loading ? (
              <p className="text-gray-300">Đang tải...</p>
            ) : filteredJunctions.length > 0 ? (
              <ul>
                {filteredJunctions.map((junction) => (
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
              <p className="text-gray-300">Không tìm thấy nút giao phù hợp</p>
            )}
          </div>
        </div>
        {/* Junction Details */}
        <div className="w-1/2 p-4 overflow-hidden">
          <h2 className="text-lg font-bold mb-2 text-white">
            Thông tin nút giao
          </h2>
          <div className="h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar">
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
                {/* Current Traffic Light Phase Information */}
                <div className="mt-2">
                  <p>
                    <strong className="text-white">Pha đèn hiện tại: </strong>
                    {getCurrentPhase().phaseName}
                  </p>
                  <p>
                    <strong className="text-white">Khung giờ áp dụng: </strong>
                    {getCurrentPhase().timeRange}
                  </p>
                </div>
                {/* <Link href={`/junctions/${selectedJunction.junctionId}`}>
                  <button className="mt-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors">
                    Xem chi tiết
                  </button>
                </Link> */}
              </div>
            ) : (
              <p className="text-gray-300">
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
