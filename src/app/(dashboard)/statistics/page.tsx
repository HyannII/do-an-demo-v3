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

// Vehicle types and colors
const vehicleTypes = ["Xe máy", "Xe con", "Xe tải", "Xe khách"];
const vehicleColors = [
  "rgba(255, 99, 132, 0.8)", // Xe máy
  "rgba(255, 206, 86, 0.8)", // Xe con
  "rgba(75, 192, 192, 0.8)", // Xe tải
  "rgba(153, 102, 255, 0.8)", // Xe khách
];

// Period options for data display
const periodOptions = [
  { value: "today", label: "Hôm nay" },
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "year", label: "Năm nay" },
];

// Interface for our statistics data
interface StatisticsData {
  cameraId: string;
  period: string;
  totalMotorcycleCount: number;
  totalCarCount: number;
  totalTruckCount: number;
  totalBusCount: number;
  hourlyData: {
    time: string;
    motorcycleCount: number;
    carCount: number;
    truckCount: number;
    busCount: number;
  }[];
  dailyData: {
    date: string;
    motorcycleCount: number;
    carCount: number;
    truckCount: number;
    busCount: number;
  }[];
}

// Get GMT+7 date
const getGMT7Date = (date = new Date()) => {
  // Create date with GMT+7 offset (7 hours * 60 minutes * 60 seconds * 1000 milliseconds)
  const gmtOffset = 7 * 60 * 60 * 1000;
  const utc = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
  return new Date(utc + gmtOffset);
};

export default function StatisticsPage() {
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [selectedJunction, setSelectedJunction] = useState<Junction | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("today");
  const [loading, setLoading] = useState<boolean>(true);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [statisticsData, setStatisticsData] = useState<StatisticsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(getGMT7Date());

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

  // Function to fetch statistics data
  const fetchStatisticsData = async (cameraId: string, period: string) => {
    setDataLoading(true);
    try {
      // Add timestamp parameter to bust cache
      const timestamp = Date.now();
      const response = await fetch(`/api/cameras/${cameraId}/statistics?period=${period}&timestamp=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!response.ok) {
        console.error("Failed to fetch statistics data", response.status);
        return;
      }
      const data = await response.json();
      setStatisticsData(data);
      setLastUpdated(getGMT7Date());
      
      console.log(`Statistics data updated at ${getGMT7Date().toISOString()} (GMT+7) for period ${period}`);
      if (data && data.totalMotorcycleCount !== undefined) {
        console.log(`Total counts - Motorcycles: ${data.totalMotorcycleCount}, Cars: ${data.totalCarCount}, Trucks: ${data.totalTruckCount}, Buses: ${data.totalBusCount}`);
      }
    } catch (error) {
      console.error("Error fetching statistics data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Manually force refresh data
  const handleForceRefresh = () => {
    if (selectedCamera) {
      fetchStatisticsData(selectedCamera.cameraId, selectedPeriod);
    }
  };

  // Fetch statistics data when camera or period changes
  useEffect(() => {
    if (!selectedCamera) {
      setStatisticsData(null);
      return;
    }

    fetchStatisticsData(selectedCamera.cameraId, selectedPeriod);
  }, [selectedCamera, selectedPeriod]);

  // Handle junction selection
  const handleJunctionSelect = (junction: Junction) => {
    setSelectedJunction(junction);
    setSelectedCamera(null); // Reset selected camera when changing junctions
    setStatisticsData(null);  // Clear statistics data
  };

  // Handle camera selection
  const handleCameraSelect = (camera: Camera) => {
    setSelectedCamera(camera);
  };

  // Handle period selection
  const handlePeriodChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(event.target.value);
  };

  // Determine chart data based on selected period
  const getChartData = () => {
    if (!statisticsData) return null;

    // For today, use hourly data
    if (selectedPeriod === "today") {
      return {
        labels: statisticsData.hourlyData.map((data) => data.time),
        datasets: [
          {
            label: "Xe máy",
            data: statisticsData.hourlyData.map((data) => data.motorcycleCount),
            borderColor: vehicleColors[0],
            backgroundColor: vehicleColors[0],
            fill: false,
          },
          {
            label: "Xe con",
            data: statisticsData.hourlyData.map((data) => data.carCount),
            borderColor: vehicleColors[1],
            backgroundColor: vehicleColors[1],
            fill: false,
          },
          {
            label: "Xe tải",
            data: statisticsData.hourlyData.map((data) => data.truckCount),
            borderColor: vehicleColors[2],
            backgroundColor: vehicleColors[2],
            fill: false,
          },
          {
            label: "Xe khách",
            data: statisticsData.hourlyData.map((data) => data.busCount),
            borderColor: vehicleColors[3],
            backgroundColor: vehicleColors[3],
            fill: false,
          },
        ],
      };
    }
    
    // For week, month, year, use daily data
    return {
      labels: statisticsData.dailyData.map((data) => {
        // Format the date more nicely for display
        const date = new Date(data.date);
        return date.toLocaleDateString('vi-VN');
      }),
      datasets: [
        {
          label: "Xe máy",
          data: statisticsData.dailyData.map((data) => data.motorcycleCount),
          borderColor: vehicleColors[0],
          backgroundColor: vehicleColors[0],
          fill: false,
        },
        {
          label: "Xe con",
          data: statisticsData.dailyData.map((data) => data.carCount),
          borderColor: vehicleColors[1],
          backgroundColor: vehicleColors[1],
          fill: false,
        },
        {
          label: "Xe tải",
          data: statisticsData.dailyData.map((data) => data.truckCount),
          borderColor: vehicleColors[2],
          backgroundColor: vehicleColors[2],
          fill: false,
        },
        {
          label: "Xe khách",
          data: statisticsData.dailyData.map((data) => data.busCount),
          borderColor: vehicleColors[3],
          backgroundColor: vehicleColors[3],
          fill: false,
        },
      ],
    };
  };

  // Prepare data for the pie chart
  const getPieChartData = () => {
    if (!statisticsData) return null;

    return {
      labels: vehicleTypes,
      datasets: [
        {
          data: [
            statisticsData.totalMotorcycleCount,
            statisticsData.totalCarCount,
            statisticsData.totalTruckCount,
            statisticsData.totalBusCount,
          ],
          backgroundColor: vehicleColors,
          borderColor: vehicleColors.map((color) => color.replace("0.8", "1")),
          borderWidth: 1,
        },
      ],
    };
  };

  // Get chart title based on period
  const getChartTitle = () => {
    switch (selectedPeriod) {
      case "today":
        return "Số lượng xe theo giờ trong ngày";
      case "week":
        return "Số lượng xe theo ngày trong tuần này";
      case "month":
        return "Số lượng xe theo ngày trong tháng này";
      case "year":
        return "Số lượng xe theo ngày trong năm nay";
      default:
        return "Số lượng xe theo thời gian";
    }
  };

  // Get period label for pie chart
  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case "today":
        return "hôm nay";
      case "week":
        return "tuần này";
      case "month":
        return "tháng này";
      case "year":
        return "năm nay";
      default:
        return "hôm nay";
    }
  };

  // Format time for the last updated timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Bangkok' // Use GMT+7 timezone
    });
  };

  const lineChartData = getChartData();
  const pieChartData = getPieChartData();

  return (
    <div className="flex flex-col h-[94vh] overflow-hidden bg-white dark:bg-gray-900">
      {/* Header with period selector */}
      <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Thống kê giao thông
          </h1>
          <div className="flex items-center gap-4">
            {selectedCamera && (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Chọn thời gian:
                </span>
                <select
                  className="p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={selectedPeriod}
                  onChange={handlePeriodChange}
                >
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button 
                  onClick={handleForceRefresh}
                  className="p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Làm mới dữ liệu"
                  disabled={dataLoading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className={dataLoading ? "animate-spin" : ""}>
                    <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                  </svg>
                </button>
              </>
            )}
            {dataLoading && (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Đang tải...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="flex h-[60vh] bg-gray-100 dark:bg-gray-800">
        {/* Line Chart: Vehicle Count Over Time */}
        <div className="w-3/5 p-12 border-r border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
            {getChartTitle()}
          </h2>
          {lineChartData ? (
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: selectedPeriod === "today" ? "Giờ" : "Ngày",
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
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-700 dark:text-gray-300">
                {!selectedCamera 
                  ? "Chọn một camera để xem thống kê"
                  : dataLoading 
                    ? "Đang tải dữ liệu..."
                    : "Không có dữ liệu cho giai đoạn này"}
              </p>
            </div>
          )}
        </div>

        {/* Pie Chart: Vehicle Type Distribution */}
        <div className="w-2/5 p-12">
          <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
            Tỉ lệ loại xe {getPeriodLabel()}
          </h2>
          {pieChartData ? (
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
              height={300}
            />
          ) : (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-700 dark:text-gray-300">
                {!selectedCamera 
                  ? "Chọn một camera để xem thống kê"
                  : dataLoading 
                    ? "Đang tải dữ liệu..."
                    : "Không có dữ liệu cho giai đoạn này"}
              </p>
            </div>
          )}

          {statisticsData && (
            <div className="mt-6">
              <h3 className="text-md font-semibold mb-2 text-gray-900 dark:text-white">
                Tổng số phương tiện {getPeriodLabel()}
              </h3>
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Xe máy</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {statisticsData.totalMotorcycleCount.toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Xe con</p>
                    <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                      {statisticsData.totalCarCount.toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Xe tải</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {statisticsData.totalTruckCount.toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Xe khách</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {statisticsData.totalBusCount.toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-t pt-2 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tổng số</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(
                      statisticsData.totalMotorcycleCount +
                      statisticsData.totalCarCount +
                      statisticsData.totalTruckCount +
                      statisticsData.totalBusCount
                    ).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
              <div className="text-xs text-right text-gray-500 dark:text-gray-400 mt-2">
                Cập nhật lúc: {formatTime(lastUpdated)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section with Two Columns */}
      <div className="flex h-[29vh] border-t border-gray-200 dark:border-gray-800">
        {/* Junction List */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-800 p-4 overflow-hidden">
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
        <div className="w-1/2 p-4 overflow-hidden">
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
                {selectedJunction
                  ? "Không có camera nào cho nút giao này"
                  : "Chọn một nút giao để xem danh sách camera"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
