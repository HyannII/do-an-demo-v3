"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Map, { MapRef, Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Junction, TrafficLight } from "../../../../types/interface";

export default function JunctionMap() {
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [selectedJunction, setSelectedJunction] = useState<Junction | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const mapRef = useRef<MapRef>(null);

  // Fetch junctions and their traffic lights on component mount
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
          setSelectedJunction(data[0]); // Auto-select the first junction
        }
      } catch (error) {
        console.error("Error fetching junctions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJunctions();
  }, []);

  // Center the map on the selected junction
  useEffect(() => {
    if (selectedJunction && mapRef.current) {
      mapRef.current.flyTo({
        center: [
          Number(selectedJunction.longitude),
          Number(selectedJunction.latitude),
        ],
        zoom: 18,
        speed: 2.5,
        curve: 1,
      });
    }
  }, [selectedJunction]);

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

  // Placeholder countdown timer (replace with real data if available)
  const getCountdownTimer = () => {
    return 24; // Static value for now, matching the image
  };

  // Get traffic light phase data from timingConfiguration
  const getPhaseData = () => {
    if (
      !selectedJunction ||
      !selectedJunction.trafficPatterns ||
      selectedJunction.trafficPatterns.length === 0
    ) {
      return [];
    }

    // Use the first traffic pattern for simplicity
    const pattern = selectedJunction.trafficPatterns[0];
    const timing = pattern.timingConfiguration;

    // Assuming timingConfiguration contains green, yellow, red durations for each phase
    // We'll simulate 4 phases to match the image
    return [
      {
        bd: "00",
        green: timing.green || 25,
        yellow: timing.yellow || 3,
        red: timing.red || 2,
        cycle:
          (timing.green || 25) + (timing.yellow || 3) + (timing.red || 2) + 2,
      },
      {
        bd: "30",
        green: timing.green || 25,
        yellow: timing.yellow || 3,
        red: timing.red || 2,
        cycle:
          (timing.green || 25) + (timing.yellow || 3) + (timing.red || 2) + 2,
      },
      {
        bd: "00",
        green: timing.green || 25,
        yellow: timing.yellow || 3,
        red: timing.red || 2,
        cycle:
          (timing.green || 25) + (timing.yellow || 3) + (timing.red || 2) + 2,
      },
      {
        bd: "30",
        green: timing.green || 25,
        yellow: timing.yellow || 3,
        red: timing.red || 2,
        cycle:
          (timing.green || 25) + (timing.yellow || 3) + (timing.red || 2) + 2,
      },
    ];
  };

  return (
    <div className="flex flex-col h-[94vh] overflow-hidden bg-white dark:bg-gray-900">
      {/* Top Section: Mapbox Map and Table Side by Side */}
      <div className="flex h-[65vh] bg-gray-100 dark:bg-gray-800">
        {/* Mapbox Map Section (Left Side) */}
        <div className="w-3/4">
          {selectedJunction ? (
            <Map
              ref={mapRef}
              initialViewState={{
                longitude: Number(selectedJunction.longitude),
                latitude: Number(selectedJunction.latitude),
                zoom: 18,
                minZoom: 18,
                maxZoom: 18,
              }}
              style={{ width: "100%", height: "100%" }}
              mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
              mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
              language="vi"
            >
              {selectedJunction.trafficLights.map(
                (trafficLight: TrafficLight) => (
                  <Marker
                    key={trafficLight.trafficLightId}
                    longitude={Number(trafficLight.longitude)}
                    latitude={Number(trafficLight.latitude)}
                    anchor="center"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full ${getTrafficLightColor(
                          trafficLight.status
                        )} border-2 border-white shadow-md`}
                      />
                      <div className="mt-1 text-white font-bold text-sm bg-black bg-opacity-50 rounded px-1">
                        {getCountdownTimer()}
                      </div>
                    </div>
                  </Marker>
                )
              )}
            </Map>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">
                Chọn một ngã tư để xem bản đồ
              </p>
            </div>
          )}
        </div>

        {/* Traffic Light Phase Table (Right Side) */}
        <div className="w-1/4 p-4 overflow-y-auto">
          <table className="w-full border-separate border-spacing-0 border-2 border-gray-300 dark:border-gray-700">
            <thead>
              <tr>
                <th className="border-2 border-gray-300 dark:border-gray-700 p-2 text-left text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800">
                  Pha
                </th>
                <th className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800">
                  BD
                </th>
                <th className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800">
                  X
                </th>
                <th className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800">
                  V
                </th>
                <th className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800">
                  TD
                </th>
                <th className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800">
                  Chu kỳ
                </th>
              </tr>
            </thead>
            <tbody>
              {getPhaseData().map((phase, index) => (
                <tr key={index}>
                  <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300">
                    Pha {index + 1}
                  </td>
                  <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                    {phase.bd}
                  </td>
                  <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                    {phase.green}
                  </td>
                  <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                    {phase.yellow}
                  </td>
                  <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                    {phase.red}
                  </td>
                  <td className="border-2 border-gray-300 dark:border-gray-700 p-2 flex items-center justify-between">
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
                    <span className="text-gray-700 dark:text-gray-300 ml-2">
                      {phase.cycle}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedJunction && getPhaseData().length > 0 && (
            <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              Tổng thời gian chu kỳ tính bằng: {getPhaseData()[0].cycle} giây
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section with Three Columns */}
      <div className="flex h-[30vh] border-t border-gray-200 dark:border-gray-800">
        {/* Junction List */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 p-4 overflow-hidden">
          <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
            Danh sách ngã tư
          </h2>
          <div className="h-[calc(100%-2rem)] overflow-y-auto">
            {loading ? (
              <p className="text-gray-700 dark:text-gray-300">Đang tải...</p>
            ) : junctions.length > 0 ? (
              <ul>
                {junctions.map((junction) => (
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
                Không có ngã tư nào
              </p>
            )}
          </div>
        </div>

        {/* Camera List (Optional, can be removed if not needed) */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 p-4 overflow-hidden">
          <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
            Danh sách camera
          </h2>
          <div className="h-[calc(100%-2rem)] overflow-y-auto">
            {selectedJunction &&
            selectedJunction.cameras &&
            selectedJunction.cameras.length > 0 ? (
              <ul>
                {selectedJunction.cameras.map((camera) => (
                  <li
                    key={camera.cameraId}
                    className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded"
                  >
                    {camera.cameraName}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-700 dark:text-gray-300">
                Không có camera nào cho ngã tư này
              </p>
            )}
          </div>
        </div>

        {/* Junction Details */}
        <div className="w-1/3 p-4 overflow-hidden">
          <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
            Thông tin ngã tư
          </h2>
          <div className="h-[calc(100%-2rem)] overflow-y-auto">
            {selectedJunction ? (
              <div className="text-gray-700 dark:text-gray-300">
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Tên ngã tư:
                  </strong>{" "}
                  {selectedJunction.junctionName}
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Vị trí:
                  </strong>{" "}
                  {selectedJunction.location}
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Kinh độ:
                  </strong>{" "}
                  {selectedJunction.longitude}
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Vĩ độ:
                  </strong>{" "}
                  {selectedJunction.latitude}
                </p>
                <Link href={`/junctions/${selectedJunction.junctionId}`}>
                  <button className="mt-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors">
                    Xem chi tiết
                  </button>
                </Link>
              </div>
            ) : (
              <p className="text-gray-700 dark:text-gray-300">
                Chọn một ngã tư để xem thông tin
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
