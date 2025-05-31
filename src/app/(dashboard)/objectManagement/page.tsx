"use client";

import React, { useState, useEffect } from "react";
import CameraManagement from "./camera";
import TrafficLightManagement from "./trafficLight";
import JunctionManagement from "./junction";
import TrafficPatternManagement from "./trafficPattern";
import ScheduleManagement from "./scheduleManagement";
import {
  Camera,
  TrafficLight,
  Junction,
  TrafficPattern,
  ScheduleConfig,
} from "../../../../types/interface";

export default function ManagementPage() {
  const [selectedObject, setSelectedObject] = useState<
    "camera" | "trafficLight" | "junction" | "trafficPattern" | "schedule"
  >("camera");
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [trafficLights, setTrafficLights] = useState<TrafficLight[]>([]);
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [trafficPatterns, setTrafficPatterns] = useState<TrafficPattern[]>([]);
  const [schedules, setSchedules] = useState<ScheduleConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch all data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          camerasResponse,
          trafficLightsResponse,
          junctionsResponse,
          trafficPatternsResponse,
          schedulesResponse,
        ] = await Promise.all([
          fetch("/api/cameras"),
          fetch("/api/trafficLights"),
          fetch("/api/junctions"),
          fetch("/api/trafficPatterns"),
          fetch("/api/schedules").catch(() => ({ ok: false, json: () => [] })), // Fallback for schedules API
        ]);

        if (
          !camerasResponse.ok ||
          !trafficLightsResponse.ok ||
          !junctionsResponse.ok ||
          !trafficPatternsResponse.ok
        ) {
          console.error("Failed to fetch data");
          return;
        }

        const camerasData = await camerasResponse.json();
        const trafficLightsData = await trafficLightsResponse.json();
        const junctionsData = await junctionsResponse.json();
        const trafficPatternsData = await trafficPatternsResponse.json();
        const schedulesData = schedulesResponse.ok
          ? await schedulesResponse.json()
          : [];

        setCameras(camerasData);
        setTrafficLights(trafficLightsData);
        setJunctions(junctionsData);
        setTrafficPatterns(trafficPatternsData);
        setSchedules(schedulesData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Nested Sidebar for Object Selection */}
      <div className="w-64 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-600 p-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Danh sách danh mục
        </h2>
        <ul>
          <li
            className={`p-2 cursor-pointer rounded mb-2 ${
              selectedObject === "camera"
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            } transition-colors`}
            onClick={() => setSelectedObject("camera")}
          >
            Camera
          </li>
          <li
            className={`p-2 cursor-pointer rounded mb-2 ${
              selectedObject === "trafficLight"
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            } transition-colors`}
            onClick={() => setSelectedObject("trafficLight")}
          >
            Ðèn giao thông
          </li>
          <li
            className={`p-2 cursor-pointer rounded mb-2 ${
              selectedObject === "junction"
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            } transition-colors`}
            onClick={() => setSelectedObject("junction")}
          >
            Nút giao thông
          </li>
          <li
            className={`p-2 cursor-pointer rounded mb-2 ${
              selectedObject === "trafficPattern"
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            } transition-colors`}
            onClick={() => setSelectedObject("trafficPattern")}
          >
            Mẫu pha đèn giao thông
          </li>
          <li
            className={`p-2 cursor-pointer rounded ${
              selectedObject === "schedule"
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            } transition-colors`}
            onClick={() => setSelectedObject("schedule")}
          >
            Lịch trình hoạt động
          </li>
        </ul>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex-1 p-6 bg-white dark:bg-gray-900 overflow-y-auto text-gray-900 dark:text-white">
          Ðang tải...
        </div>
      ) : selectedObject === "camera" ? (
        <CameraManagement
          cameras={cameras}
          setCameras={setCameras}
          junctions={junctions}
        />
      ) : selectedObject === "trafficLight" ? (
        <TrafficLightManagement
          trafficLights={trafficLights}
          setTrafficLights={setTrafficLights}
          junctions={junctions}
        />
      ) : selectedObject === "trafficPattern" ? (
        <TrafficPatternManagement
          trafficPatterns={trafficPatterns}
          setTrafficPatterns={setTrafficPatterns}
          junctions={junctions}
        />
      ) : selectedObject === "schedule" ? (
        <ScheduleManagement
          schedules={schedules}
          setSchedules={setSchedules}
          trafficPatterns={trafficPatterns}
          junctions={junctions}
        />
      ) : (
        <JunctionManagement
          junctions={junctions}
          setJunctions={setJunctions}
        />
      )}
    </div>
  );
}
