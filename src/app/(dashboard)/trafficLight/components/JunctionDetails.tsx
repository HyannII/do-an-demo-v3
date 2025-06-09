import React from "react";
import { Junction, TrafficPattern } from "../../../../../types/interface";
import { TrafficLightState, ActiveSchedule } from "../types";

interface Props {
  selectedJunction: Junction | null;
  activePattern: TrafficPattern | null;
  activeSchedule: ActiveSchedule | null;
  trafficLightState: TrafficLightState | null;
  currentPhaseInfo: any;
}

export default function JunctionDetails({
  selectedJunction,
  activePattern,
  activeSchedule,
  trafficLightState,
  currentPhaseInfo,
}: Props) {
  // Determine the current phase based on current_time
  const getCurrentPhase = () => {
    if (!activePattern || !trafficLightState) {
      return {
        phaseName: "Không xác định",
        lightName: "N/A",
        timeRange: "N/A",
        scheduleInfo: "N/A",
      };
    }

    let timeRange = "N/A";
    let scheduleInfo = "Mẫu mặc định";

    if (activeSchedule) {
      timeRange = `${activeSchedule.startTime} - ${activeSchedule.endTime}`;
      scheduleInfo = `${activeSchedule.scheduleId}`;
    } else if (
      activePattern.timingConfiguration?.activeTime?.startHour !== undefined &&
      activePattern.timingConfiguration?.activeTime?.endHour !== undefined
    ) {
      const { startHour, endHour } =
        activePattern.timingConfiguration.activeTime;
      timeRange = `${String(startHour).padStart(2, "0")}:00–${String(
        endHour
      ).padStart(2, "0")}:00`;
    }

    return {
      phaseName: activePattern.patternName,
      lightName: currentPhaseInfo?.lightName || "N/A",
      timeRange: timeRange,
      scheduleInfo: scheduleInfo,
    };
  };

  return (
    <div className="w-1/2 p-4 overflow-hidden">
      <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
        Thông tin nút giao
      </h2>
      <div className="h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar">
        {selectedJunction ? (
          <div className="text-gray-700 dark:text-gray-300">
            <p>
              <strong className="text-gray-900 dark:text-white">
                Tên nút giao:{" "}
              </strong>
              {selectedJunction.junctionName}
            </p>
            <p>
              <strong className="text-gray-900 dark:text-white">
                Vị trí:{" "}
              </strong>
              {selectedJunction.location}
            </p>
            <p>
              <strong className="text-gray-900 dark:text-white">
                Kinh độ:{" "}
              </strong>
              {selectedJunction.longitude}
            </p>
            <p>
              <strong className="text-gray-900 dark:text-white">Vĩ độ: </strong>
              {selectedJunction.latitude}
            </p>
            {/* Current Traffic Light Phase Information */}
            <div className="mt-2">
              <p>
                <strong className="text-gray-900 dark:text-white">
                  Pha đèn hiện tại:{" "}
                </strong>
                {getCurrentPhase().phaseName}
              </p>
              <p>
                <strong className="text-gray-900 dark:text-white">
                  Đèn đang hoạt động:{" "}
                </strong>
                {getCurrentPhase().lightName}
              </p>
              <p>
                <strong className="text-gray-900 dark:text-white">
                  Khung giờ áp dụng:{" "}
                </strong>
                {getCurrentPhase().timeRange}
              </p>
              {selectedJunction && trafficLightState && (
                <p>
                  <strong className="text-gray-900 dark:text-white">
                    Tổng số đèn:{" "}
                  </strong>
                  {Object.keys(trafficLightState.lights_state).length} đèn
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-700 dark:text-gray-300">
            Chọn một nút giao để xem thông tin
          </p>
        )}
      </div>
    </div>
  );
}
