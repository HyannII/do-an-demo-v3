"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Hls from "hls.js";
import { Camera, Junction } from "../../../../types/interface";

export default function LiveCamera() {
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [selectedJunction, setSelectedJunction] = useState<Junction | null>(
    null
  );
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Fetch junctions and their cameras on component mount
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
          setSelectedJunction(data[0]); // Auto-select the first junction, but not the camera
        }
      } catch (error) {
        console.error("Error fetching junctions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJunctions();
  }, []);

  // Handle HLS playback when a camera is selected
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedCamera || !selectedCamera.cameraAddress) return;

    // Clean up any existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(selectedCamera.cameraAddress);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((error) => {
          console.error("Error playing video:", error);
        });
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = selectedCamera.cameraAddress;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch((error) => {
          console.error("Error playing video:", error);
        });
      });

      return () => {
        video.src = "";
        video.removeEventListener("loadedmetadata", () => {});
      };
    } else {
      alert("Your browser does not support HLS playback.");
    }
  }, [selectedCamera]);

  const handleJunctionSelect = (junction: Junction) => {
    setSelectedJunction(junction);
    setSelectedCamera(null); // Reset selected camera when changing junctions
  };

  const handleCameraSelect = (camera: Camera) => {
    setSelectedCamera(camera);
  };

  return (
    <div className="flex flex-col h-[94vh] overflow-hidden bg-white dark:bg-gray-900">
      {/* Top Section: Live Stream and Table Side by Side */}
      <div className="flex h-[65vh] bg-gray-100 dark:bg-gray-800">
        {/* Live Stream Section (Left Side) */}
        <div className="w-3/4 flex items-center justify-center">
          {selectedCamera ? (
            <div className="w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                id="hls-video"
                controls
                autoPlay
                muted
                className="max-w-full max-h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              Chọn một camera để xem luồng trực tiếp
            </p>
          )}
        </div>

        {/* Table Section (Right Side) */}
        <div className="w-1/4 p-4 overflow-y-auto">
          <table className="w-full border-separate border-spacing-0 border-2 border-gray-300 dark:border-gray-700">
            <thead>
              <tr>
                <th className="border-2 border-gray-300 dark:border-gray-700 p-2 text-left text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800">
                  Loại phương tiện
                </th>
                <th className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800">
                  Làn 1
                </th>
                <th className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800">
                  Làn 2
                </th>
                <th className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800">
                  Làn 3
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300">
                  Xe máy
                </td>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                  {/* Placeholder for data */}
                </td>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                  {/* Placeholder for data */}
                </td>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                  {/* Placeholder for data */}
                </td>
              </tr>
              <tr>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300">
                  Xe thô sơ
                </td>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                  {/* Placeholder for data */}
                </td>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                  {/* Placeholder for data */}
                </td>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                  {/* Placeholder for data */}
                </td>
              </tr>
              <tr>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300">
                  Xe con
                </td>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                  {/* Placeholder for data */}
                </td>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                  {/* Placeholder for data */}
                </td>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                  {/* Placeholder for data */}
                </td>
              </tr>
              <tr>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300">
                  Xe tải
                </td>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                  {/* Placeholder for data */}
                </td>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                  {/* Placeholder for data */}
                </td>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                  {/* Placeholder for data */}
                </td>
              </tr>
              <tr>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300">
                  Xe khách
                </td>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                  {/* Placeholder for data */}
                </td>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                  {/* Placeholder for data */}
                </td>
                <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                  {/* Placeholder for data */}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section with Three Columns */}
      <div className="flex h-[30vh] border-t border-gray-200 dark:border-gray-800">
        {/* Junction List */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 p-4 overflow-hidden">
          <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
            Danh sách nút giao
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
                Không có nút giao nào
              </p>
            )}
          </div>
        </div>

        {/* Camera List */}
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
                    className={`p-2 cursor-pointer rounded ${
                      selectedCamera?.cameraId === camera.cameraId
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    } transition-colors`}
                    onClick={() => handleCameraSelect(camera)}
                  >
                    {camera.cameraName}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-700 dark:text-gray-300">
                Không có camera nào cho nút giao này
              </p>
            )}
          </div>
        </div>

        {/* Camera Details */}
        <div className="w-1/3 p-4 overflow-hidden">
          <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
            Thông tin camera
          </h2>
          <div className="h-[calc(100%-2rem)] overflow-y-auto">
            {selectedCamera ? (
              <div className="text-gray-700 dark:text-gray-300">
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Tên camera:
                  </strong>{" "}
                  {selectedCamera.cameraName}
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Vị trí:
                  </strong>{" "}
                  {selectedCamera.location}
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Kinh độ:
                  </strong>{" "}
                  {selectedCamera.longitude}
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Vĩ độ:
                  </strong>{" "}
                  {selectedCamera.latitude}
                </p>
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Trạng thái:
                  </strong>{" "}
                  {selectedCamera.isActive ? "Hoạt động" : "Không hoạt động"}
                </p>
                <Link href={`/cameras/${selectedCamera.cameraId}`}>
                  <button className="mt-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors">
                    Xem chi tiết
                  </button>
                </Link>
              </div>
            ) : (
              <p className="text-gray-700 dark:text-gray-300">
                Chọn một camera để xem thông tin
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
