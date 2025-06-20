"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Hls from "hls.js";
import {
  Camera,
  Junction,
  CameraDataSummary,
} from "../../../../types/interface";

export default function LiveCamera() {
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [filteredJunctions, setFilteredJunctions] = useState<Junction[]>([]);
  const [selectedJunction, setSelectedJunction] = useState<Junction | null>(
    null
  );
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [cameraData, setCameraData] = useState<CameraDataSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [videoLoading, setVideoLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isAutoQuality, setIsAutoQuality] = useState<boolean>(true);
  const [qualityLevels, setQualityLevels] = useState<
    { height: number; bitrate: number; level: number }[]
  >([]);
  const [wasDocumentHidden, setWasDocumentHidden] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [latestCameraData, setLatestCameraData] = useState<{
    status: string;
    data?: {
      cameraId: string;
      motorcycleCount: number;
      carCount: number;
      truckCount: number;
      busCount: number;
      timestamp: string;
      camera: any;
      lastUpdated: string;
    };
    message?: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryAttempts = useRef<number>(0);
  const maxRecoveryAttempts = 3;

  // Create HLS config with optimized settings
  const hlsConfig = {
    maxBufferLength: 30, // Increase buffer length for smoother playback
    maxMaxBufferLength: 60, // Maximum buffer size
    liveSyncDurationCount: 15, // Live sync window
    liveDurationInfinity: true,
    enableWorker: true, // Use web workers for better performance
    lowLatencyMode: true, // Reduce latency
    backBufferLength: 30, // Keep 30s of backward buffer
    fragLoadingMaxRetry: 8, // Increase retry attempts for fragment loading
    manifestLoadingMaxRetry: 8, // Increase retry attempts for manifest loading
    levelLoadingMaxRetry: 8, // Increase retry attempts for level loading
    fragLoadingRetryDelay: 500, // Initial retry delay for fragment loading (ms)
    manifestLoadingRetryDelay: 500, // Initial retry delay for manifest loading (ms)
    levelLoadingRetryDelay: 500, // Initial retry delay for level loading (ms)
    fragLoadingMaxRetryTimeout: 5000, // Maximum retry timeout for fragment loading (ms)
    manifestLoadingMaxRetryTimeout: 5000, // Maximum retry timeout for manifest loading (ms)
    levelLoadingMaxRetryTimeout: 5000, // Maximum retry timeout for level loading (ms)
    startLevel: -1, // Auto select initial quality level
    abrEwmaDefaultEstimate: 16384, // Default bitrate estimate
    abrEwmaFastLive: 3.0, // Fast live adaptation
    abrEwmaSlowLive: 9.0, // Slow live adaptation
    startFragPrefetch: true, // Prefetch initial fragments
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
        setFilteredJunctions(data);
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

  // Filter junctions based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredJunctions(junctions);
      return;
    }

    const filtered = junctions.filter((junction) =>
      junction.junctionName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredJunctions(filtered);
  }, [searchQuery, junctions]);

  // Initialize and set up HLS player with error handling and recovery
  const initializeHlsPlayer = useCallback(
    (video: HTMLVideoElement, url: string) => {
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

      setVideoLoading(true);

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
            level: index,
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
            console.error("Fatal HLS error:", data.type, data.details);

            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Try to recover network error
                if (recoveryAttempts.current < maxRecoveryAttempts) {
                  console.log(
                    `Attempting to recover from network error (${
                      recoveryAttempts.current + 1
                    }/${maxRecoveryAttempts})`
                  );
                  recoveryAttempts.current += 1;
                  hls.startLoad();
                  setStreamError("Đang kết nối lại...");
                } else {
                  setStreamError(
                    "Không thể kết nối đến luồng video. Vui lòng thử lại sau."
                  );
                  hls.destroy();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                // Try to recover media error
                if (recoveryAttempts.current < maxRecoveryAttempts) {
                  console.log(
                    `Attempting to recover from media error (${
                      recoveryAttempts.current + 1
                    }/${maxRecoveryAttempts})`
                  );
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
            console.warn("Non-fatal HLS error:", data.type, data.details);
          }
        });

        // Track when buffering starts/ends to show loading indicators
        hls.on(Hls.Events.BUFFER_CREATED, () => {
          setStreamError(null);
        });

        // Track when stream is successfully playing
        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          if (
            streamError === "Đang kết nối lại..." ||
            streamError === "Đang khôi phục luồng video..."
          ) {
            setStreamError(null);
          }
          // Reset recovery attempts counter when fragments are successfully buffered
          recoveryAttempts.current = 0;
          setVideoLoading(false);
        });

        return hls;
      } catch (error) {
        console.error("Error initializing HLS:", error);
        setStreamError("Lỗi khởi tạo trình phát video.");
        setVideoLoading(false);
        return null;
      }
    },
    [streamError]
  );

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
      if (document.visibilityState === "hidden") {
        setWasDocumentHidden(true);
      } else if (document.visibilityState === "visible" && wasDocumentHidden) {
        // Document became visible after being hidden
        console.log("Tab is now visible, reloading stream...");

        const video = videoRef.current;
        if (video && selectedCamera && selectedCamera.cameraAddress) {
          // Reset stream error and recovery attempts
          setStreamError(null);
          recoveryAttempts.current = 0;
          setVideoLoading(true); // Set video as loading while we reinitialize

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
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Clean up
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedCamera, initializeHlsPlayer, wasDocumentHidden]);

  // Get GMT+7 date
  const getGMT7Date = (date = new Date()) => {
    // Create date with GMT+7 offset (7 hours * 60 minutes * 60 seconds * 1000 milliseconds)
    const gmtOffset = 7 * 60 * 60 * 1000;
    const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
    return new Date(utc + gmtOffset);
  };

  // Function to fetch camera data
  const fetchCameraData = async (cameraId: string) => {
    setDataLoading(true);
    try {
      // Add timestamp parameter to bust cache
      const timestamp = Date.now();
      const response = await fetch(
        `/api/cameras/${cameraId}/data?timestamp=${timestamp}`,
        {
          cache: "no-store",
          headers: {
            Pragma: "no-cache",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch camera data", response.status);
        return;
      }
      const data = await response.json();

      // Update data without showing loading state
      setCameraData(data);
      setLastUpdated(getGMT7Date());

      console.log(
        `Camera data updated at ${getGMT7Date().toISOString()} (GMT+7)`
      );
      if (data && data.totalMotorcycleCount !== undefined) {
        console.log(
          `Received counts - Motorcycles: ${data.totalMotorcycleCount}, Cars: ${data.totalCarCount}, Trucks: ${data.totalTruckCount}, Buses: ${data.totalBusCount}`
        );
      }
    } catch (error) {
      console.error("Error fetching camera data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Function to fetch latest camera data
  const fetchLatestCameraData = async (cameraId: string) => {
    setDataLoading(true);
    try {
      const timestamp = Date.now();
      console.log(
        `Fetching latest camera data for camera ${cameraId} at ${new Date().toISOString()}`
      );

      const response = await fetch(
        `/api/cameras/${cameraId}/latest-data?timestamp=${timestamp}`,
        {
          cache: "no-store",
          headers: {
            Pragma: "no-cache",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch latest camera data", response.status);
        return;
      }
      const data = await response.json();

      console.log(`Received latest camera data:`, {
        status: data.status,
        cameraId: data.data?.cameraId,
        timestamp: data.data?.timestamp,
        motorcycles: data.data?.motorcycleCount,
        cars: data.data?.carCount,
        trucks: data.data?.truckCount,
        buses: data.data?.busCount,
        lastUpdated: data.data?.lastUpdated,
      });

      setLatestCameraData(data);
      setLastUpdated(new Date());

      console.log(`Latest camera data updated at ${new Date().toISOString()}`);
    } catch (error) {
      console.error("Error fetching latest camera data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Manually force refresh data
  const handleForceRefresh = () => {
    if (selectedCamera) {
      fetchLatestCameraData(selectedCamera.cameraId);
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
      setLatestCameraData(null);
      return;
    }

    // Initial data fetch using latest camera data
    fetchLatestCameraData(selectedCamera.cameraId);

    // Set up automatic refresh every 3 seconds
    intervalRef.current = setInterval(() => {
      fetchLatestCameraData(selectedCamera.cameraId);
    }, 3000);

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
    setCameraData(null); // Clear camera data when junction changes
    setLatestCameraData(null); // Clear latest camera data when junction changes
  };

  const handleCameraSelect = (camera: Camera) => {
    // Keep any previous data if changing to a camera of the same type
    // This prevents the table from disappearing during camera switch
    const keepingPreviousData =
      selectedCamera && (cameraData || latestCameraData);

    setSelectedCamera(camera);
    setVideoLoading(true); // Set video as loading when a new camera is selected

    // Don't clear camera data immediately when switching between cameras
    // Let the data update naturally with the next fetch instead
    if (!keepingPreviousData) {
      setCameraData(null);
      setLatestCameraData(null);
    }
  };

  // Format time for the last updated timestamp in GMT+7
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Bangkok", // Use GMT+7 timezone
    });
  };

  // Add a new function to toggle play/pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.error("Error playing video:", e));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Function to toggle fullscreen
  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document
        .exitFullscreen()
        .catch((err) => console.error("Error exiting fullscreen:", err));
    } else {
      video
        .requestFullscreen()
        .catch((err) => console.error("Error requesting fullscreen:", err));
    }
  };

  // Update isPlaying state when video plays or pauses
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [selectedCamera]);

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
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                >
                  Your browser does not support the video tag.
                </video>

                {/* Custom Video Controls - Play Button at bottom left */}
                <div className="absolute bottom-4 left-4">
                  <button
                    onClick={togglePlay}
                    className="text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors focus:outline-none"
                  >
                    {isPlaying ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Fullscreen Button at bottom right */}
                <div className="absolute bottom-4 right-4">
                  <button
                    onClick={toggleFullscreen}
                    className="text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors focus:outline-none"
                    title="Toàn màn hình"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z" />
                    </svg>
                  </button>
                </div>

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
                            setVideoLoading(true); // Show loading indicator when retrying
                            const hls = initializeHlsPlayer(
                              videoRef.current,
                              selectedCamera.cameraAddress
                            );
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
                {!streamError && videoLoading && (
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
                    />
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
                  </svg>
                </button>
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {getGMT7Date().toLocaleDateString("vi-VN")}
              </span>
            </div>
          </div>

          {!selectedCamera ? (
            <div className="flex justify-center items-center h-40">
              <span className="text-gray-500 dark:text-gray-400">
                Chọn camera để xem dữ liệu
              </span>
            </div>
          ) : !latestCameraData || latestCameraData.status === "error" ? (
            <div className="flex justify-center items-center h-40">
              <span className="text-gray-500 dark:text-gray-400">
                {latestCameraData?.message || "Không có dữ liệu"}
              </span>
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
                      {latestCameraData?.data?.motorcycleCount || 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300">
                      Xe con
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                      {latestCameraData?.data?.carCount || 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300">
                      Xe tải
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                      {latestCameraData?.data?.truckCount || 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300">
                      Xe khách
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-700 dark:text-gray-300">
                      {latestCameraData?.data?.busCount || 0}
                    </td>
                  </tr>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-gray-800 dark:text-white font-semibold">
                      Tổng cộng
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-700 p-2 text-center text-gray-800 dark:text-white font-semibold">
                      {(latestCameraData?.data?.motorcycleCount || 0) +
                        (latestCameraData?.data?.carCount || 0) +
                        (latestCameraData?.data?.truckCount || 0) +
                        (latestCameraData?.data?.busCount || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center justify-end">
                  <span className="mr-1">
                    {dataLoading ? (
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse mr-1"
                        title="Đang cập nhật dữ liệu"
                      ></span>
                    ) : (
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1"
                        title="Dữ liệu đã cập nhật"
                      ></span>
                    )}
                  </span>
                  Cập nhật lúc: {formatTime(lastUpdated)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Section with Three Columns */}
      <div className="flex h-[30vh] border-t border-gray-200 dark:border-gray-800">
        {/* Junction List */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 p-4 overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Danh sách nút giao
            </h2>
            {/* Search Bar */}
            <div className="w-[60%]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nút giao..."
                className="w-full px-3 py-2 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 placeholder-gray-500"
              />
            </div>
          </div>
          <div className="h-[calc(100%-2rem)] overflow-y-auto">
            {loading ? (
              <p className="text-gray-700 dark:text-gray-300">Đang tải...</p>
            ) : filteredJunctions.length > 0 ? (
              <ul>
                {filteredJunctions.map((junction) => (
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
                Không tìm thấy nút giao phù hợp
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
