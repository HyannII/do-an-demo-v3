"use client";

import React, { useState, useEffect } from "react";
import CameraManagement from "./camera";
import TrafficLightManagement from "./trafficLight";
import JunctionManagement from "./junction";
import { Camera, TrafficLight, Junction } from "../../../../types/interface";

export default function ManagementPage() {
  const [selectedObject, setSelectedObject] = useState<
    "camera" | "trafficLight" | "junction"
  >("camera");
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [trafficLights, setTrafficLights] = useState<TrafficLight[]>([]);
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch all data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [camerasResponse, trafficLightsResponse, junctionsResponse] =
          await Promise.all([
            fetch("/api/cameras"),
            fetch("/api/trafficLights"),
            fetch("/api/junctions"),
          ]);

        if (
          !camerasResponse.ok ||
          !trafficLightsResponse.ok ||
          !junctionsResponse.ok
        ) {
          console.error("Failed to fetch data");
          return;
        }

        const camerasData = await camerasResponse.json();
        const trafficLightsData = await trafficLightsResponse.json();
        const junctionsData = await junctionsResponse.json();

        setCameras(camerasData);
        setTrafficLights(trafficLightsData);
        setJunctions(junctionsData);
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
      <div className="w-64 bg-gray-900 border-r border-gray-600 p-4">
        <h2 className="text-lg font-bold text-white mb-4">
          Danh sách danh mục
        </h2>
        <ul>
          <li
            className={`p-2 cursor-pointer rounded mb-2 ${
              selectedObject === "camera"
                ? "bg-blue-900/30 text-blue-400"
                : "text-white hover:bg-gray-700"
            } transition-colors`}
            onClick={() => setSelectedObject("camera")}
          >
            Camera
          </li>
          <li
            className={`p-2 cursor-pointer rounded mb-2 ${
              selectedObject === "trafficLight"
                ? "bg-blue-900/30 text-blue-400"
                : "text-white hover:bg-gray-700"
            } transition-colors`}
            onClick={() => setSelectedObject("trafficLight")}
          >
            Ðèn Giao Thông
          </li>
          <li
            className={`p-2 cursor-pointer rounded ${
              selectedObject === "junction"
                ? "bg-blue-900/30 text-blue-400"
                : "text-white hover:bg-gray-700"
            } transition-colors`}
            onClick={() => setSelectedObject("junction")}
          >
            Nút Giao
          </li>
        </ul>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex-1 p-6 bg-gray-900 overflow-y-auto text-white">
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
      ) : (
        <JunctionManagement
          junctions={junctions}
          setJunctions={setJunctions}
        />
      )}
    </div>
  );
}
