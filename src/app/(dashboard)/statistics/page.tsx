"use client";

import React, { useState, useEffect } from "react";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Camera, Junction } from "../../../../types/interface";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

// Vehicle types
const vehicleTypes = ["Xe máy", "Xe thô sơ", "Xe con", "Xe tải", "Xe khách"];

// Colors for different vehicle types
const vehicleColors = [
  "rgba(255, 99, 132, 0.8)", // Xe máy
  "rgba(54, 162, 235, 0.8)", // Xe thô sơ
  "rgba(255, 206, 86, 0.8)", // Xe con
  "rgba(75, 192, 192, 0.8)", // Xe tải
  "rgba(153, 102, 255, 0.8)", // Xe khách
];

// Sample data for hourly vehicle stats
const sampleHourlyStats = Array.from({ length: 24 }, (_, i) => ({
  time: `${i.toString().padStart(2, "0")}:00`,
  motorbike: Math.floor(Math.random() * 50) + 20, // Random data for motorbikes (20-70)
  bicycle: Math.floor(Math.random() * 10) + 5, // Random data for bicycles (5-15)
  car: Math.floor(Math.random() * 30) + 10, // Random data for cars (10-40)
  truck: Math.floor(Math.random() * 20) + 5, // Random data for trucks (5-25)
  bus: Math.floor(Math.random() * 15) + 3, // Random data for buses (3-18)
}));

// Sample data for total vehicle stats
const sampleTotalStats = sampleHourlyStats.reduce(
  (acc, stat) => ({
    motorbike: acc.motorbike + stat.motorbike,
    bicycle: acc.bicycle + stat.bicycle,
    car: acc.car + stat.car,
    truck: acc.truck + stat.truck,
    bus: acc.bus + stat.bus,
  }),
  { motorbike: 0, bicycle: 0, car: 0, truck: 0, bus: 0 }
);

// Sample data structure for vehicle stats (commented out dynamic fields)
// interface HourlyVehicleStats {
//   time: string; // e.g., "00:00", "01:00", ..., "23:00"
//   motorbike: number; // Number of motorbikes at this time
//   bicycle: number; // Number of bicycles at this time
//   car: number; // Number of cars at this time
//   truck: number; // Number of trucks at this time
//   bus: number; // Number of buses at this time
// }

// interface TotalVehicleStats {
//   motorbike: number; // Total motorbikes in the day
//   bicycle: number; // Total bicycles in the day
//   car: number; // Total cars in the day
//   truck: number; // Total trucks in the day
//   bus: number; // Total buses in the day
// }

export default function StatisticsPage() {
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [selectedJunction, setSelectedJunction] = useState<Junction | null>(
    null
  );
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hourlyStats, setHourlyStats] = useState<any[]>(sampleHourlyStats);
  const [totalStats, setTotalStats] = useState<any | null>(sampleTotalStats);

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

  // Handle junction selection
  const handleJunctionSelect = (junction: Junction) => {
    setSelectedJunction(junction);
    setSelectedCamera(null); // Reset selected camera when changing junctions
  };

  // Handle camera selection
  const handleCameraSelect = (camera: Camera) => {
    setSelectedCamera(camera);
    setHourlyStats(sampleHourlyStats);
    setTotalStats(sampleTotalStats);
  };

  // Prepare data for the line chart
  const lineChartData = {
    labels: hourlyStats.map((stat) => stat.time),
    datasets: vehicleTypes.map((type, index) => ({
      label: type,
      data: hourlyStats.map((stat) => {
        switch (type) {
          case "Xe máy":
            return stat.motorbike;
          case "Xe thô sơ":
            return stat.bicycle;
          case "Xe con":
            return stat.car;
          case "Xe tải":
            return stat.truck;
          case "Xe khách":
            return stat.bus;
          default:
            return 0;
        }
      }),
      borderColor: vehicleColors[index],
      backgroundColor: vehicleColors[index],
      fill: false,
    })),
  };

  // Prepare data for the pie chart
  const pieChartData = totalStats
    ? {
        labels: vehicleTypes,
        datasets: [
          {
            data: [
              totalStats.motorbike,
              totalStats.bicycle,
              totalStats.car,
              totalStats.truck,
              totalStats.bus,
            ],
            backgroundColor: vehicleColors,
            borderColor: vehicleColors.map((color) =>
              color.replace("0.8", "1")
            ),
            borderWidth: 1,
          },
        ],
      }
    : { labels: [], datasets: [] };

  return (
    <div className="flex flex-col h-[94vh] overflow-hidden bg-white dark:bg-gray-900">
      {/* Charts Section */}
      <div className="flex h-[64vh] bg-gray-100 dark:bg-gray-800">
        {/* Line Chart: Vehicle Count Over Time */}
        <div className="w-3/5 p-12 border-r border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
            Số lượng xe theo thời gian trong ngày
          </h2>
          {hourlyStats.length > 0 ? (
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: "Thời gian",
                      color: "white",
                    },
                    ticks: {
                      color: "white",
                    },
                    grid: {
                      color: "transparent",
                    },
                  },
                  y: {
                    title: {
                      display: true,
                      text: "Số lượng xe",
                      color: "white",
                    },
                    ticks: {
                      color: "white",
                    },
                    grid: {
                      color: "rgba(255, 255, 255, 0.1)",
                    },
                  },
                },
                plugins: {
                  legend: {
                    labels: {
                      color: "white",
                    },
                  },
                },
              }}
              height={400}
            />
          ) : (
            <p className="text-gray-700 dark:text-gray-300">
              Chọn một camera để xem thống kê
            </p>
          )}
        </div>

        {/* Pie Chart: Vehicle Type Distribution */}
        <div className="w-2/5 p-12">
          <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
            Tỉ lệ loại xe trong ngày
          </h2>
          {totalStats ? (
            <Pie
              data={pieChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "right",
                    labels: {
                      color: "white",
                    },
                  },
                },
              }}
              height={400}
            />
          ) : (
            <p className="text-gray-700 dark:text-gray-300">
              Chọn một camera để xem thống kê
            </p>
          )}
        </div>
      </div>

      {/* Camera Selection Section */}
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
