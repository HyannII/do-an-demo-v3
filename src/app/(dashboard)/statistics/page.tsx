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

// Format time string to GMT+7
const formatTimeToGMT7 = (timeString: string) => {
  // If timeString is already in GMT+7 format or doesn't contain time, return as is
  if (!timeString.includes(':')) return timeString;
  
  // For "HH:MM" format (usually from hourly data)
  try {
    const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
    // Ensure valid hours and minutes (basic validation)
    if (isNaN(hours) || isNaN(minutes)) return timeString;
    
    // We're assuming the time is already in GMT+7 from the server
    // Just format it properly for display
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error("Error parsing time string:", error);
    return timeString;
  }
};

// Format date to GMT+7
const formatDateToGMT7 = (dateString: string) => {
  try {
    // Create a Date object - assume the input is in UTC/ISO format
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    // Convert to GMT+7
    const gmt7Date = getGMT7Date(date);
    
    // Format the date for display
    return gmt7Date.toLocaleDateString('vi-VN');
  } catch (error) {
    console.error("Error parsing date string:", error);
    return dateString;
  }
};

// Use exact time from database without timezone conversion
const useExactTime = (timeString: string) => {
  // Return the time portion (HH:MM:SS) from the timestamp
  if (timeString && timeString.includes(' ')) {
    // Extract time part from "yyyy-mm-dd hh:mm:ss" format
    return timeString.split(' ')[1];
  }
  // If it's already a time format or not in expected format, return as is
  return timeString;
};

// Use exact date from database without timezone conversion
const useExactDate = (dateString: string) => {
  // If dateString is in "yyyy-mm-dd hh:mm:ss" format, extract the date part
  if (dateString && dateString.includes(' ')) {
    return dateString.split(' ')[0];
  }
  return dateString;
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
      const response = await fetch(`/api/cameras/${cameraId}/statistics?period=${period}`, {
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
      setLastUpdated(new Date());
      
      console.log(`Statistics data updated at ${new Date().toISOString()} for period ${period}`);
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
      if (!statisticsData.hourlyData || statisticsData.hourlyData.length === 0) {
        return null;
      }

      // Format time labels for display
      const formattedData = statisticsData.hourlyData.map(data => {
        // Extract time part for display (HH:MM format)
        const displayTime = data.time && data.time.includes(' ') 
          ? data.time.split(' ')[1].substring(0, 5)  // Extract HH:MM from timestamp
          : data.time;

        return {
          ...data,
          displayTime,
        };
      });

      console.log(`Rendering chart with ${formattedData.length} data points`);

      return {
        labels: formattedData.map(data => data.displayTime),
        datasets: [
          {
            label: "Xe máy",
            data: formattedData.map(data => data.motorcycleCount),
            borderColor: vehicleColors[0],
            backgroundColor: vehicleColors[0],
            fill: false,
            borderWidth: 2,
            pointHitRadius: 10,
          },
          {
            label: "Xe con",
            data: formattedData.map(data => data.carCount),
            borderColor: vehicleColors[1],
            backgroundColor: vehicleColors[1],
            fill: false,
            borderWidth: 2,
            pointHitRadius: 10,
          },
          {
            label: "Xe tải",
            data: formattedData.map(data => data.truckCount),
            borderColor: vehicleColors[2],
            backgroundColor: vehicleColors[2],
            fill: false,
            borderWidth: 2,
            pointHitRadius: 10,
          },
          {
            label: "Xe khách",
            data: formattedData.map(data => data.busCount),
            borderColor: vehicleColors[3],
            backgroundColor: vehicleColors[3],
            fill: false,
            borderWidth: 2,
            pointHitRadius: 10,
          },
        ],
      };
    }
    
    // For week, month, year, use daily data
    return {
      labels: statisticsData.dailyData.map(data => useExactDate(data.date)),
      datasets: [
        {
          label: "Xe máy",
          data: statisticsData.dailyData.map(data => data.motorcycleCount),
          borderColor: vehicleColors[0],
          backgroundColor: vehicleColors[0],
          fill: false,
          borderWidth: 2,
        },
        {
          label: "Xe con",
          data: statisticsData.dailyData.map(data => data.carCount),
          borderColor: vehicleColors[1],
          backgroundColor: vehicleColors[1],
          fill: false,
          borderWidth: 2,
        },
        {
          label: "Xe tải",
          data: statisticsData.dailyData.map(data => data.truckCount),
          borderColor: vehicleColors[2],
          backgroundColor: vehicleColors[2],
          fill: false,
          borderWidth: 2,
        },
        {
          label: "Xe khách",
          data: statisticsData.dailyData.map(data => data.busCount),
          borderColor: vehicleColors[3],
          backgroundColor: vehicleColors[3],
          fill: false,
          borderWidth: 2,
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

  // Format time without timezone correction
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const lineChartData = getChartData();
  const pieChartData = getPieChartData();

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-white dark:bg-gray-900">
      {/* Header with period selector - reduced height */}
      <div className="py-2 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Thống kê giao thông
          </h1>
          <div className="flex items-center gap-4">
            {selectedCamera && (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Chọn thời gian:
                </span>
                <select
                  className="p-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
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
                  className="p-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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

      {/* Charts Section - adjusted height */}
      <div className="flex flex-col md:flex-row h-[65%] bg-gray-100 dark:bg-gray-800">
        {/* Line Chart: Vehicle Count Over Time */}
        <div className="w-full md:w-3/5 p-3 md:p-4 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 overflow-hidden">
          <h2 className="text-md font-bold mb-1 text-gray-900 dark:text-white">
            {getChartTitle()}
          </h2>
          {lineChartData ? (
            <div className="h-[calc(100%-2rem)] overflow-y-hidden">
              <Line
                data={lineChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: selectedPeriod === "today" ? "Thời gian" : "Ngày",
                        color: "white",
                      },
                      ticks: {
                        color: "white",
                        maxRotation: 45,
                        minRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 15,
                      },
                      grid: {
                        color: "transparent",
                        display: true,
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
                        precision: 0,
                        callback: function(value) {
                          return value.toLocaleString();
                        }
                      },
                      grid: {
                        color: "rgba(255, 255, 255, 0.1)",
                      },
                      min: 0,
                      suggestedMax: undefined,
                    },
                  },
                  plugins: {
                    legend: {
                      labels: {
                        color: "white",
                        usePointStyle: true,
                        boxWidth: 10,
                        boxHeight: 10,
                      },
                      position: 'top',
                    },
                    tooltip: {
                      mode: 'index',
                      intersect: false,
                      displayColors: true,
                      callbacks: {
                        title: function(tooltipItems) {
                          if (tooltipItems.length > 0) {
                            const dataIndex = tooltipItems[0].dataIndex;
                            const datasetIndex = tooltipItems[0].datasetIndex;
                            
                            // Get the original time data
                            if (statisticsData && statisticsData.hourlyData) {
                              const originalData = statisticsData.hourlyData[dataIndex];
                              if (originalData && originalData.time) {
                                if (selectedPeriod === "today") {
                                  return `Thời gian: ${originalData.time}`;
                                }
                              }
                            }
                            
                            return tooltipItems[0].label || '';
                          }
                          return '';
                        },
                        label: function(context) {
                          let label = context.dataset.label || '';
                          if (label) {
                            label += ': ';
                          }
                          if (context.parsed.y !== null) {
                            label += context.parsed.y.toLocaleString();
                          }
                          return label;
                        },
                        footer: function(tooltipItems) {
                          // Add a footer note explaining these are aggregated counts
                          return [
                            'Tổng số xe trong khoảng thời gian này'
                          ];
                        }
                      }
                    },
                  },
                  elements: {
                    line: {
                      tension: 0.3,
                      borderJoinStyle: 'round',
                    },
                    point: {
                      radius: 4,
                      hoverRadius: 7,
                    },
                  },
                  layout: {
                    padding: {
                      left: 10,
                      right: 25,
                      top: 20,
                      bottom: 10
                    }
                  },
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center items-center h-[calc(100%-2rem)]">
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
        <div className="w-full md:w-2/5 p-3 md:p-4 overflow-hidden">
          <h2 className="text-md font-bold mb-1 text-gray-900 dark:text-white">
            Tỉ lệ loại xe {getPeriodLabel()}
          </h2>
          <div className="flex flex-col h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar">
            {pieChartData ? (
              <div className="flex-grow">
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
                />
              </div>
            ) : (
              <div className="flex justify-center items-center flex-grow">
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
              <div className="mt-2">
                <h3 className="text-sm font-semibold mb-1 text-gray-900 dark:text-white">
                  Tổng số phương tiện {getPeriodLabel()}
                </h3>
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Xe máy</p>
                      <p className="text-md font-bold text-blue-600 dark:text-blue-400">
                        {statisticsData.totalMotorcycleCount.toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Xe con</p>
                      <p className="text-md font-bold text-yellow-600 dark:text-yellow-400">
                        {statisticsData.totalCarCount.toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Xe tải</p>
                      <p className="text-md font-bold text-green-600 dark:text-green-400">
                        {statisticsData.totalTruckCount.toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Xe khách</p>
                      <p className="text-md font-bold text-purple-600 dark:text-purple-400">
                        {statisticsData.totalBusCount.toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1 border-t pt-1 text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Tổng số</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {(
                        statisticsData.totalMotorcycleCount +
                        statisticsData.totalCarCount +
                        statisticsData.totalTruckCount +
                        statisticsData.totalBusCount
                      ).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">
                  Cập nhật lúc: {formatTime(lastUpdated)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section with Two Columns - adjusted height */}
      <div className="flex flex-col md:flex-row h-[calc(35%-1px)] border-t border-gray-200 dark:border-gray-800">
        {/* Junction List */}
        <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 p-3 overflow-hidden">
          <h2 className="text-md font-bold mb-1 text-gray-900 dark:text-white">
            Danh sách nút giao
          </h2>
          <div className="h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar">
            {loading ? (
              <p className="text-gray-700 dark:text-gray-300">Đang tải...</p>
            ) : junctions.length > 0 ? (
              <ul>
                {junctions.map((junction) => (
                  <li
                    key={junction.junctionId}
                    className={`p-1.5 cursor-pointer rounded ${
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
        <div className="w-full md:w-1/2 p-3 overflow-hidden">
          <h2 className="text-md font-bold mb-1 text-gray-900 dark:text-white">
            Danh sách camera
          </h2>
          <div className="h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar">
            {selectedJunction &&
            selectedJunction.cameras &&
            selectedJunction.cameras.length > 0 ? (
              <ul>
                {selectedJunction.cameras.map((camera) => (
                  <li
                    key={camera.cameraId}
                    className={`p-1.5 cursor-pointer rounded ${
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

// Add this CSS to the top of your file to customize scrollbars
const styles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 5px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #555;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #777;
  }
`;

// Add the styles to the document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = styles;
  document.head.appendChild(styleElement);
}
