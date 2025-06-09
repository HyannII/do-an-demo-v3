import React, { useRef, useEffect, useState } from "react";
import { Junction, TrafficPattern } from "../../../../../types/interface";
import { TrafficLightState, CurrentPhaseInfo } from "../types";
import {
  getStateColor,
  getStateLabel,
  buildLightNameMapping,
  getLightTimeline,
} from "../utils";

interface Props {
  selectedJunction: Junction | null;
  activePattern: TrafficPattern | null;
  currentPhaseInfo: CurrentPhaseInfo | null;
  trafficLightState: TrafficLightState | null;
  connectionFailed: boolean;
}

export default function TrafficLightChart({
  selectedJunction,
  activePattern,
  currentPhaseInfo,
  trafficLightState,
  connectionFailed,
}: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(600);

  useEffect(() => {
    if (chartRef.current) {
      setChartWidth(chartRef.current.offsetWidth - 140);
    }
    const handleResize = () => {
      if (chartRef.current) {
        setChartWidth(chartRef.current.offsetWidth - 140);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle connection failure
  if (connectionFailed) {
    return (
      <div
        ref={chartRef}
        className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 h-full flex flex-col overflow-hidden"
      >
        <h2 className="text-gray-900 dark:text-white font-bold mb-2 text-sm">
          Biểu đồ thời gian pha đèn
        </h2>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-600 dark:text-red-400 text-center">
            Mất kết nối, đang thử lại...
          </p>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (!selectedJunction || !activePattern) {
    return (
      <div
        ref={chartRef}
        className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 h-full flex flex-col overflow-hidden"
      >
        <h2 className="text-gray-900 dark:text-white font-bold mb-2 text-sm">
          Biểu đồ thời gian pha đèn
        </h2>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400 text-center">
            {!selectedJunction
              ? "Chọn một nút giao để xem biểu đồ"
              : "Đang tải dữ liệu pha đèn..."}
          </p>
        </div>
      </div>
    );
  }

  const config = activePattern.timingConfiguration;
  if (!config || !config.phases) return null;

  const cycleDuration = config.cycleDuration || config.cycleTime || 120;

  // Build light name mapping
  const lightNameMap = buildLightNameMapping(
    trafficLightState,
    config,
    selectedJunction
  );
  const lightNames = Object.keys(lightNameMap);

  return (
    <div
      ref={chartRef}
      className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 h-full flex flex-col overflow-hidden"
    >
      <h2 className="text-gray-900 dark:text-white font-bold mb-2 text-sm">
        Biểu đồ thời gian pha đèn ({lightNames.length} đèn)
      </h2>

      {/* Current Phase Indicator */}
      {currentPhaseInfo && (
        <div className="mb-3 p-2 rounded border border-gray-500 text-sm flex-shrink-0">
          <div className="flex items-center justify-center gap-4 w-full">
            <span className="text-gray-900 dark:text-white font-semibold py-2">
              Thời gian:{" "}
            </span>
            <span className="text-gray-900 dark:text-white py-2">
              {currentPhaseInfo.cycleTime}s/{cycleDuration}s
            </span>
          </div>
          {trafficLightState && (
            <div
              className="mt-1 grid gap-1 text-xs"
              style={{
                gridTemplateColumns: `repeat(${Math.min(
                  lightNames.length,
                  4
                )}, 1fr)`,
              }}
            >
              {lightNames.slice(0, 8).map((lightName) => {
                const state =
                  trafficLightState.lights_state[lightName] || "red";
                const countdown = trafficLightState.countdowns[lightName];
                const displayName =
                  lightName.length > 8
                    ? lightName.substring(0, 8) + "..."
                    : lightName;
                return (
                  <div
                    key={lightName}
                    className="text-center"
                  >
                    <span className="text-gray-400">{displayName}: </span>
                    <span
                      className={`font-bold ${
                        state === "green"
                          ? "text-green-400"
                          : state === "yellow"
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {state === "green"
                        ? "Xanh"
                        : state === "yellow"
                        ? "Vàng"
                        : "Đỏ"}
                      {countdown !== null && ` (${countdown}s)`}
                    </span>
                  </div>
                );
              })}
              {lightNames.length > 8 && (
                <div className="text-center text-gray-400 text-xs">
                  +{lightNames.length - 8} đèn khác...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chart area */}
      <div className="flex-1">
        <div className="h-full w-full">
          {lightNames.map((lightName) => {
            const timeline = getLightTimeline(lightName, config, cycleDuration);
            const displayName =
              lightName.length > 12
                ? lightName.substring(0, 12) + "..."
                : lightName;

            return (
              <div
                key={lightName}
                className="mb-1 last:mb-0"
              >
                <div className="flex items-center h-6">
                  {/* Light name label */}
                  <div className="w-16 text-right pr-2 flex-shrink-0">
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {displayName}
                    </span>
                  </div>

                  {/* Timeline */}
                  <div
                    className="relative flex-1 w-full h-full"
                    style={{ height: "18px" }}
                  >
                    <div className="absolute inset-0 bg-gray-700"></div>
                    {timeline.map((segment, segIndex) => (
                      <div
                        key={`${lightName}-${segIndex}`}
                        className="absolute top-0 h-full flex items-center justify-center text-xs font-medium text-gray-900 dark:text-white"
                        style={{
                          left: `${(segment.startTime / cycleDuration) * 100}%`,
                          width: `${(segment.duration / cycleDuration) * 100}%`,
                          backgroundColor: getStateColor(segment.state),
                        }}
                        title={`${lightName} - ${getStateLabel(
                          segment.state
                        )}: ${segment.startTime}s - ${
                          segment.startTime + segment.duration
                        }s (${segment.duration}s)`}
                      ></div>
                    ))}

                    {/* Current time indicator */}
                    {currentPhaseInfo && (
                      <div
                        className="absolute top-0 h-full w-0.5 bg-blue-400 dark:bg-yellow-400 z-10"
                        style={{
                          left: `${
                            (currentPhaseInfo.cycleTime / cycleDuration) * 100
                          }%`,
                        }}
                        title={`Thời gian hiện tại: ${currentPhaseInfo.cycleTime}s`}
                      >
                        <div className="absolute -top-2 -left-1 w-3 h-3  bg-blue-400 dark:bg-yellow-400 rounded-full border border-white"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cycle duration info */}
      <div className="mt-2 pt-2 border-t border-gray-700 flex-shrink-0">
        <div className="text-xs text-gray-400 text-center">
          Chu kỳ: {cycleDuration}s | Số đèn: {lightNames.length}
        </div>
      </div>
    </div>
  );
}
