"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Hls from "hls.js";
import { Camera, Junction, CameraDataSummary } from "../../../../types/interface";

export default function LiveCamera() {
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [selectedJunction, setSelectedJunction] = useState<Junction | null>(
    null
  );
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [cameraData, setCameraData] = useState<CameraDataSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isAutoQuality, setIsAutoQuality] = useState<boolean>(true);
  const [qualityLevels, setQualityLevels] = useState<{ height: number; bitrate: number; level: number }[]>([]);
  const [wasDocumentHidden, setWasDocumentHidden] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryAttempts = useRef<number>(0);
  const maxRecoveryAttempts = 3;

  // Create HLS config with optimized settings
  const hlsConfig = {
    maxBufferLength: 30,           // Increase buffer length for smoother playback
    maxMaxBufferLength: 60,        // Maximum buffer size
    liveSyncDurationCount: 15,      // Live sync window
    liveDurationInfinity: true,
    enableWorker: true,            // Use web workers for better performance
    lowLatencyMode: true,          // Reduce latency
    backBufferLength: 30,          // Keep 30s of backward buffer
    fragLoadingMaxRetry: 8,        // Increase retry attempts for fragment loading
    manifestLoadingMaxRetry: 8,    // Increase retry attempts for manifest loading
    levelLoadingMaxRetry: 8,       // Increase retry attempts for level loading
    fragLoadingRetryDelay: 500,    // Initial retry delay for fragment loading (ms)
    manifestLoadingRetryDelay: 500,// Initial retry delay for manifest loading (ms)
    levelLoadingRetryDelay: 500,   // Initial retry delay for level loading (ms)
    fragLoadingMaxRetryTimeout: 5000,   // Maximum retry timeout for fragment loading (ms)
    manifestLoadingMaxRetryTimeout: 5000,// Maximum retry timeout for manifest loading (ms)
    levelLoadingMaxRetryTimeout: 5000,   // Maximum retry timeout for level loading (ms)
    startLevel: -1,                // Auto select initial quality level
    abrEwmaDefaultEstimate: 16384,// Default bitrate estimate
    abrEwmaFastLive: 3.0,          // Fast live adaptation 
    abrEwmaSlowLive: 9.0,          // Slow live adaptation
    startFragPrefetch: true,       // Prefetch initial fragments
  };

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

  // Initialize and set up HLS player with error handling and recovery
  const initializeHlsPlayer = useCallback((video: HTMLVideoElement, url: string) => {
    if (!Hls.isSupported()) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        video.addEventListener("loadedmetadata", () => {
          video.play().catch((error) => {
            console.error("Error playing video:", error);
            setStreamError("Không thể phát video. Vui lòng thử lại.");
          });
        });
      } else {
        setStreamError("Trình duyệt của bạn không hỗ trợ phát video HLS.");
      }
      return null;
    }

    // Clean up any existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    try {
      // Create new HLS instance with optimized config
      const hls = new Hls(hlsConfig);
      hls.loadSource(url);
      hls.attachMedia(video);

      // Handle quality levels for adaptive streaming
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const levels = data.levels.map((level, index) => ({
          height: level.height,
          bitrate: level.bitrate,
          level: index
        }));
        setQualityLevels(levels);
        
        // Start playback when manifest is ready
        video.play().catch((error) => {
          console.error("Error playing video:", error);
          setStreamError("Không thể phát video. Vui lòng thử lại.");
        });
      });

      // Error handling and recovery
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('Fatal HLS error:', data.type, data.details);
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try to recover network error
              if (recoveryAttempts.current < maxRecoveryAttempts) {
                console.log(`Attempting to recover from network error (${recoveryAttempts.current + 1}/${maxRecoveryAttempts})`);
                recoveryAttempts.current += 1;
                hls.startLoad();
                setStreamError("Đang kết nối lại...");
              } else {
                setStreamError("Không thể kết nối đến luồng video. Vui lòng thử lại sau.");
                hls.destroy();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              // Try to recover media error
              if (recoveryAttempts.current < maxRecoveryAttempts) {
                console.log(`Attempting to recover from media error (${recoveryAttempts.current + 1}/${maxRecoveryAttempts})`);
                recoveryAttempts.current += 1;
                hls.recoverMediaError();
                setStreamError("Đang khôi phục luồng video...");
              } else {
                setStreamError("Lỗi phát luồng video. Vui lòng thử lại.");
                hls.destroy();
              }
              break;
            default:
              // Cannot recover from other errors
              setStreamError("Lỗi không xác định. Vui lòng thử lại.");
              hls.destroy();
              break;
          }
        } else {
          // Non-fatal errors, log but don't take action
          console.warn('Non-fatal HLS error:', data.type, data.details);
        }
      });

      // Track when buffering starts/ends to show loading indicators
      hls.on(Hls.Events.BUFFER_CREATED, () => {
        setStreamError(null);
      });

      // Track when stream is successfully playing
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (streamError === "Đang kết nối lại..." || streamError === "Đang khôi phục luồng video...") {
          setStreamError(null);
        }
        // Reset recovery attempts counter when fragments are successfully buffered
        recoveryAttempts.current = 0;
      });

      return hls;
    } catch (error) {
      console.error("Error initializing HLS:", error);
      setStreamError("Lỗi khởi tạo trình phát video.");
      return null;
    }
  }, [streamError]);

  // Handle HLS playback when a camera is selected
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedCamera || !selectedCamera.cameraAddress) return;

    // Reset stream error and recovery attempts
    setStreamError(null);
    recoveryAttempts.current = 0;

    // Initialize the HLS player
    const hls = initializeHlsPlayer(video, selectedCamera.cameraAddress);
    if (hls) {
      hlsRef.current = hls;
    }

    // Clean up
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setQualityLevels([]);
    };
  }, [selectedCamera, initializeHlsPlayer]);

  // Handle page visibility change to reload stream when tab is changed or app is minimized
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setWasDocumentHidden(true);
      } else if (document.visibilityState === 'visible' && wasDocumentHidden) {
        // Document became visible after being hidden
        console.log('Tab is now visible, reloading stream...');
        
        const video = videoRef.current;
        if (video && selectedCamera && selectedCamera.cameraAddress) {
          // Reset stream error and recovery attempts
          setStreamError(null);
          recoveryAttempts.current = 0;
          
          // Re-initialize the HLS player
          const hls = initializeHlsPlayer(video, selectedCamera.cameraAddress);
          if (hls) {
            hlsRef.current = hls;
          }
        }
        
        setWasDocumentHidden(false);
      }
    };

    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedCamera, initializeHlsPlayer, wasDocumentHidden]);

  // Get GMT+7 date
  const getGMT7Date = (date = new Date()) => {
    // Create date with GMT+7 offset (7 hours * 60 minutes * 60 seconds * 1000 milliseconds)
    const gmtOffset = 7 * 60 * 60 * 1000;
    const utc = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
    return new Date(utc + gmtOffset);
  };

  // Function to fetch camera data
  const fetchCameraData = async (cameraId: string) => {
    setDataLoading(true);
    try {
      // Add timestamp parameter to bust cache
      const timestamp = Date.now();
      const response = await fetch(`/api/cameras/${cameraId}/data?timestamp=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!response.ok) {
        console.error("Failed to fetch camera data", response.status);
        return;
      }
      const data = await response.json();
      setCameraData(data);
      setLastUpdated(getGMT7Date());

      console.log(`Camera data updated at ${getGMT7Date().toISOString()} (GMT+7)`);
      if (data && data.totalMotorcycleCount !== undefined) {
        console.log(`Received counts - Motorcycles: ${data.totalMotorcycleCount}, Cars: ${data.totalCarCount}, Trucks: ${data.totalTruckCount}, Buses: ${data.totalBusCount}`);
      }
    } catch (error) {
      console.error("Error fetching camera data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Manually force refresh data
  const handleForceRefresh = () => {
    if (selectedCamera) {
      fetchCameraData(selectedCamera.cameraId);
    }
  };

  // Fetch camera data when a camera is selected and set up auto-refresh
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!selectedCamera) {
      setCameraData(null);
      return;
    }

    // Initial data fetch
    fetchCameraData(selectedCamera.cameraId);

    // Set up automatic refresh every 5 seconds
    intervalRef.current = setInterval(() => {
      fetchCameraData(selectedCamera.cameraId);
    }, 5000);

    // Clean up on component unmount or when camera changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectedCamera]);

  const handleJunctionSelect = (junction: Junction) => {
    setSelectedJunction(junction);
    setSelectedCamera(null); // Reset selected camera when changing junctions
    setCameraData(null);     // Clear camera data
  };

  const handleCameraSelect = (camera: Camera) => {
    setSelectedCamera(camera);
  };

  // Format time for the last updated timestamp in GMT+7
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Bangkok' // Use GMT+7 timezone
    });
  };

  return (
    <div className="flex flex-col h-[94vh] overflow-hidden bg-white dark:bg-gray-900">
      {/* Top Section: Live Stream and Table Side by Side */}
      <div className="flex h-[64vh] bg-gray-100 dark:bg-gray-800">
        {/* Live Stream Section (Left Side) */}
        <div className="w-3/4 flex flex-col h-full">
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            {selectedCamera ? (
              <div className="w-full h-full flex items-center justify-center relative">
                <video
                  ref={videoRef}
                  id="hls-video"
                  controls
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                >
                  Your browser does not support the video tag.
                </video>
                {streamError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                    <div className="text-white text-center p-4">
                      <p className="mb-2">{streamError}</p>
                      <button 
                        onClick={() => {
                          // Reset and retry stream initialization
                          if (selectedCamera && videoRef.current) {
                            setStreamError(null);
                            recoveryAttempts.current = 0;
                            const hls = initializeHlsPlayer(videoRef.current, selectedCamera.cameraAddress);
                            if (hls) {
                              hlsRef.current = hls;
                            }
                          }
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                      >
                        Thử lại
                      </button>
                    </div>
                  </div>
                )}
                {!streamError && dataLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-white text-center">
                      <div className="inline-block w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin mb-2"></div>
                      <p>Đang tải luồng video...</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <p className="text-gray-500 dark:text-gray-400">
                  Chọn một camera để xem luồng trực tiếp
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Table Section (Right Side) */}
        <div className="w-1/4 p-4 overflow-y-auto">
          <div className="mb-3 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Thống kê phương tiện
            </h3>
            <div className="flex items-center">
              {selectedCamera && (
                <button 
                  onClick={handleForceRefresh}
                  className="mr-2 p-1 rounded-full text-gray-500 hover:text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Làm mới dữ liệu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                  </svg>
                </button>
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {getGMT7Date().toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>
          
          {dataLoading && !cameraData ? (
            <div className="flex justify-center items-center h-40">
              <span className="text-gray-500 dark:text-gray-400">Đang tải dữ liệu...</span>
            </div>
          ) : !selectedCamera ? (
            <div className="flex justify-center items-center h-40">
              <span className="text-gray-500 dark:text-gray-400">Chọn camera để xem dữ liệu</span>
            </div>
          ) : (
            <>
              <table className="w-full border-separate border-spacing-0 border-2 border-gray-300 dark:border-gray-700">
                <thead>
                  <tr>
                    <th className="border-2 border-gray-300 dark:border-gray-700 p-2 text-left text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800">
                      Loại phương tiện
                    </th>
                    <th className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800">
                      Số lượng
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300">
                      Xe máy
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                      {cameraData?.totalMotorcycleCount || 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300">
                      Xe con
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                      {cameraData?.totalCarCount || 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300">
                      Xe tải
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                      {cameraData?.totalTruckCount || 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300">
                      Xe khách
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                      {cameraData?.totalBusCount || 0}
                    </td>
                  </tr>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-gray-800 dark:text-white font-semibold">
                      Tổng cộng
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-800 dark:text-white font-semibold">
                      {(cameraData?.totalMotorcycleCount || 0) + 
                      (cameraData?.totalCarCount || 0) + 
                      (cameraData?.totalTruckCount || 0) + 
                      (cameraData?.totalBusCount || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-2 text-xs text-right text-gray-500 dark:text-gray-400 flex items-center justify-end">
                <span className="mr-1">
                  {dataLoading ? (
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse mr-1"></span>
                  ) : (
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1"></span>
                  )}
                </span>
                Cập nhật lúc: {formatTime(lastUpdated)}
              </div>
            </>
          )}
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
