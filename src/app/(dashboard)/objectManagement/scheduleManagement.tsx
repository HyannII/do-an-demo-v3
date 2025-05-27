"use client";

import React, { useState, useEffect } from "react";
import {
  ScheduleConfig,
  DaySchedule,
  TimeSlot,
  TrafficPattern,
  Junction,
} from "../../../../types/interface";

interface ScheduleManagementProps {
  schedules: ScheduleConfig[];
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleConfig[]>>;
  trafficPatterns: TrafficPattern[];
  junctions: Junction[];
}

const ScheduleManagement: React.FC<ScheduleManagementProps> = ({
  schedules,
  setSchedules,
  trafficPatterns,
  junctions,
}) => {
  const [selectedJunctionId, setSelectedJunctionId] = useState<string>("");
  const [filteredSchedules, setFilteredSchedules] = useState<ScheduleConfig[]>(
    []
  );
  const [editingSchedule, setEditingSchedule] = useState<ScheduleConfig | null>(
    null
  );
  const [showForm, setShowForm] = useState<boolean>(false);

  // Form state
  const [scheduleName, setScheduleName] = useState<string>("");
  const [mode, setMode] = useState<"auto" | "schedule">("auto");
  const [autoPatternId, setAutoPatternId] = useState<string>("");
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([]);

  const daysOfWeek = [
    { value: 1, label: "Thứ Hai" },
    { value: 2, label: "Thứ Ba" },
    { value: 3, label: "Thứ Tư" },
    { value: 4, label: "Thứ Năm" },
    { value: 5, label: "Thứ Sáu" },
    { value: 6, label: "Thứ Bảy" },
    { value: 0, label: "Chủ Nhật" },
  ];

  // Filter schedules by selected junction
  useEffect(() => {
    if (selectedJunctionId) {
      const filtered = schedules.filter(
        (schedule) => schedule.junctionId === selectedJunctionId
      );
      setFilteredSchedules(filtered);
    } else {
      setFilteredSchedules(schedules);
    }
  }, [selectedJunctionId, schedules]);

  // Initialize day schedules when mode changes
  useEffect(() => {
    if (mode === "schedule" && daySchedules.length === 0) {
      const initialSchedules = daysOfWeek.map((day) => ({
        dayOfWeek: day.value,
        timeSlots: [
          {
            slotId: `${day.value}_slot_${Date.now()}`,
            patternId: "",
            startTime: "06:00",
            endTime: "22:00",
            isActive: true,
          },
        ],
        isActive: true,
      }));
      setDaySchedules(initialSchedules);
    }
  }, [mode]);

  const resetForm = () => {
    setScheduleName("");
    setMode("auto");
    setAutoPatternId("");
    setDaySchedules([]);
    setEditingSchedule(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedJunctionId) {
      alert("Vui lòng chọn nút giao!");
      return;
    }

    if (mode === "auto" && !autoPatternId) {
      alert("Vui lòng chọn pattern tự động!");
      return;
    }

    if (
      mode === "schedule" &&
      daySchedules.some(
        (ds) =>
          ds.isActive &&
          ds.timeSlots.some((slot) => slot.isActive && !slot.patternId)
      )
    ) {
      alert("Vui lòng chọn pattern cho tất cả các khung giờ được kích hoạt!");
      return;
    }

    // Validate time slots don't overlap
    for (const daySchedule of daySchedules) {
      if (!daySchedule.isActive) continue;

      const activeSlots = daySchedule.timeSlots.filter((slot) => slot.isActive);
      for (let i = 0; i < activeSlots.length; i++) {
        for (let j = i + 1; j < activeSlots.length; j++) {
          const slot1 = activeSlots[i];
          const slot2 = activeSlots[j];

          const start1 = slot1.startTime;
          const end1 = slot1.endTime;
          const start2 = slot2.startTime;
          const end2 = slot2.endTime;

          // Check for overlap
          if (start1 < end2 && end1 > start2) {
            const dayLabel = daysOfWeek.find(
              (d) => d.value === daySchedule.dayOfWeek
            )?.label;
            alert(
              `Có khung giờ bị trùng lặp trong ngày ${dayLabel}! Vui lòng kiểm tra lại.`
            );
            return;
          }
        }
      }
    }

    try {
      const scheduleData = {
        scheduleName,
        junctionId: selectedJunctionId,
        mode,
        autoPatternId: mode === "auto" ? autoPatternId : undefined,
        daySchedules: mode === "schedule" ? daySchedules : [],
        isActive: true,
      };

      // Simulated API call - replace with actual API endpoint
      const response = editingSchedule
        ? await fetch(`/api/schedules/${editingSchedule.scheduleId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scheduleData),
          })
        : await fetch("/api/schedules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scheduleData),
          });

      if (!response.ok) {
        throw new Error("Failed to save schedule");
      }

      const savedSchedule = await response.json();

      if (editingSchedule) {
        setSchedules((prev) =>
          prev.map((s) =>
            s.scheduleId === editingSchedule.scheduleId ? savedSchedule : s
          )
        );
      } else {
        setSchedules((prev) => [...prev, savedSchedule]);
      }

      resetForm();
    } catch (error) {
      console.error("Error saving schedule:", error);
      alert("Có lỗi xảy ra khi lưu lịch trình!");
    }
  };

  const handleEdit = (schedule: ScheduleConfig) => {
    setEditingSchedule(schedule);
    setScheduleName(schedule.scheduleName);
    setSelectedJunctionId(schedule.junctionId);
    setMode(schedule.mode);
    setAutoPatternId(schedule.autoPatternId || "");
    setDaySchedules(schedule.daySchedules || []);
    setShowForm(true);
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa lịch trình này?")) return;

    try {
      // Simulated API call
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete schedule");
      }

      setSchedules((prev) => prev.filter((s) => s.scheduleId !== scheduleId));
    } catch (error) {
      console.error("Error deleting schedule:", error);
      alert("Có lỗi xảy ra khi xóa lịch trình!");
    }
  };

  const updateDaySchedule = (
    dayOfWeek: number,
    updates: Partial<DaySchedule>
  ) => {
    setDaySchedules((prev) =>
      prev.map((ds) =>
        ds.dayOfWeek === dayOfWeek ? { ...ds, ...updates } : ds
      )
    );
  };

  const addTimeSlot = (dayOfWeek: number) => {
    const newSlot: TimeSlot = {
      slotId: `${dayOfWeek}_slot_${Date.now()}_${Math.random()}`,
      patternId: "",
      startTime: "06:00",
      endTime: "22:00",
      isActive: true,
    };

    setDaySchedules((prev) =>
      prev.map((ds) =>
        ds.dayOfWeek === dayOfWeek
          ? { ...ds, timeSlots: [...ds.timeSlots, newSlot] }
          : ds
      )
    );
  };

  const removeTimeSlot = (dayOfWeek: number, slotId: string) => {
    setDaySchedules((prev) =>
      prev.map((ds) =>
        ds.dayOfWeek === dayOfWeek
          ? {
              ...ds,
              timeSlots: ds.timeSlots.filter((slot) => slot.slotId !== slotId),
            }
          : ds
      )
    );
  };

  const updateTimeSlot = (
    dayOfWeek: number,
    slotId: string,
    updates: Partial<TimeSlot>
  ) => {
    setDaySchedules((prev) =>
      prev.map((ds) =>
        ds.dayOfWeek === dayOfWeek
          ? {
              ...ds,
              timeSlots: ds.timeSlots.map((slot) =>
                slot.slotId === slotId ? { ...slot, ...updates } : slot
              ),
            }
          : ds
      )
    );
  };

  const getAvailablePatterns = () => {
    if (!selectedJunctionId) return [];
    return trafficPatterns.filter(
      (pattern) => pattern.junctionId === selectedJunctionId
    );
  };

  const getAutoPattern = () => {
    const patterns = getAvailablePatterns();
    return patterns.find((p) =>
      p.patternName.toLowerCase().includes("tự động")
    );
  };

  const handleToggleActive = async (
    scheduleId: string,
    currentStatus: boolean
  ) => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...schedules.find((s) => s.scheduleId === scheduleId),
          isActive: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle schedule status");
      }

      const updatedSchedule = await response.json();
      setSchedules((prev) =>
        prev.map((s) => (s.scheduleId === scheduleId ? updatedSchedule : s))
      );
    } catch (error) {
      console.error("Error toggling schedule status:", error);
      alert("Có lỗi xảy ra khi thay đổi trạng thái lịch trình!");
    }
  };

  return (
    <div className="flex-1 p-6 bg-gray-900 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-4">
          Quản lý Lịch trình Đèn Giao Thông
        </h1>

        {/* Junction Filter */}
        <div className="mb-4">
          <label className="block text-white mb-2">Chọn nút giao:</label>
          <select
            value={selectedJunctionId}
            onChange={(e) => setSelectedJunctionId(e.target.value)}
            className="px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg"
          >
            <option value="">Tất cả nút giao</option>
            {junctions.map((junction) => (
              <option
                key={junction.junctionId}
                value={junction.junctionId}
              >
                {junction.junctionName}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          disabled={!selectedJunctionId}
        >
          Thêm Lịch trình Mới
        </button>
      </div>

      {/* Schedule List */}
      <div className="space-y-4">
        {filteredSchedules.map((schedule) => (
          <div
            key={schedule.scheduleId}
            className="bg-gray-800 p-4 rounded-lg"
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {schedule.scheduleName}
                </h3>
                <p className="text-gray-400 text-sm">
                  Chế độ: {schedule.mode === "auto" ? "Tự động" : "Lên lịch"}
                </p>
                <p className="text-gray-400 text-sm">
                  Trạng thái: {schedule.isActive ? "Hoạt động" : "Tạm dừng"}
                </p>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() =>
                    handleToggleActive(schedule.scheduleId, schedule.isActive)
                  }
                  className={`${
                    schedule.isActive
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  } text-white px-3 py-1 rounded`}
                >
                  {schedule.isActive ? "Tạm dừng" : "Kích hoạt"}
                </button>
                <button
                  onClick={() => handleEdit(schedule)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded"
                >
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(schedule.scheduleId)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                >
                  Xóa
                </button>
              </div>
            </div>

            {/* Schedule Details */}
            {schedule.mode === "auto" ? (
              <div className="text-gray-300 text-sm">
                <p>
                  Pattern tự động:{" "}
                  {trafficPatterns.find(
                    (p) => p.patternId === schedule.autoPatternId
                  )?.patternName || "Không tìm thấy"}
                </p>
              </div>
            ) : (
              <div className="text-gray-300 text-sm">
                <p className="mb-2">Lịch trình theo ngày:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {schedule.daySchedules.map((ds) => {
                    const dayLabel = daysOfWeek.find(
                      (d) => d.value === ds.dayOfWeek
                    )?.label;

                    return (
                      <div
                        key={ds.dayOfWeek}
                        className="bg-gray-700 p-2 rounded"
                      >
                        <div className="font-medium mb-1">{dayLabel}</div>
                        <div className="text-xs space-y-1">
                          {ds.isActive ? (
                            ds.timeSlots.map((slot) => {
                              const pattern = trafficPatterns.find(
                                (p) => p.patternId === slot.patternId
                              );
                              return (
                                <div
                                  key={slot.slotId}
                                  className="bg-gray-600 p-1 rounded"
                                >
                                  <div className="text-yellow-300">
                                    {slot.startTime} - {slot.endTime}
                                  </div>
                                  <div>
                                    {pattern?.patternName || "Không có pattern"}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-gray-500">
                              Không hoạt động
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingSchedule ? "Chỉnh sửa Lịch trình" : "Thêm Lịch trình Mới"}
            </h2>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-white mb-2">Tên lịch trình:</label>
                <input
                  type="text"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-white mb-2">
                  Chế độ hoạt động:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center text-white">
                    <input
                      type="radio"
                      value="auto"
                      checked={mode === "auto"}
                      onChange={(e) =>
                        setMode(e.target.value as "auto" | "schedule")
                      }
                      className="mr-2"
                    />
                    Tự động (sử dụng pattern "Tự động")
                  </label>
                  <label className="flex items-center text-white">
                    <input
                      type="radio"
                      value="schedule"
                      checked={mode === "schedule"}
                      onChange={(e) =>
                        setMode(e.target.value as "auto" | "schedule")
                      }
                      className="mr-2"
                    />
                    Lên lịch (cài đặt pattern cho từng ngày)
                  </label>
                </div>
              </div>

              {/* Auto Mode Settings */}
              {mode === "auto" && (
                <div>
                  <label className="block text-white mb-2">
                    Pattern tự động:
                  </label>
                  <select
                    value={autoPatternId}
                    onChange={(e) => setAutoPatternId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                    required
                  >
                    <option value="">Chọn pattern</option>
                    {getAvailablePatterns().map((pattern) => (
                      <option
                        key={pattern.patternId}
                        value={pattern.patternId}
                      >
                        {pattern.patternName}
                      </option>
                    ))}
                  </select>

                  {getAutoPattern() && (
                    <p className="text-yellow-400 text-sm mt-2">
                      💡 Gợi ý: Tìm thấy pattern "
                      {getAutoPattern()?.patternName}" - có thể là pattern tự
                      động
                    </p>
                  )}
                </div>
              )}

              {/* Schedule Mode Settings */}
              {mode === "schedule" && (
                <div>
                  <label className="block text-white mb-3">
                    Lịch trình theo ngày:
                  </label>
                  <div className="space-y-4">
                    {daysOfWeek.map((day) => {
                      const daySchedule = daySchedules.find(
                        (ds) => ds.dayOfWeek === day.value
                      );
                      if (!daySchedule) return null;

                      return (
                        <div
                          key={day.value}
                          className="bg-gray-700 p-4 rounded-lg"
                        >
                          <div className="flex items-center mb-3">
                            <input
                              type="checkbox"
                              checked={daySchedule.isActive}
                              onChange={(e) =>
                                updateDaySchedule(day.value, {
                                  isActive: e.target.checked,
                                })
                              }
                              className="mr-3"
                            />
                            <h4 className="text-white font-medium">
                              {day.label}
                            </h4>
                          </div>

                          {daySchedule.isActive && (
                            <div className="space-y-3">
                              {daySchedule.timeSlots.map((slot, slotIndex) => (
                                <div
                                  key={slot.slotId}
                                  className="bg-gray-600 p-3 rounded-lg"
                                >
                                  <div className="flex justify-between items-center mb-3">
                                    <h5 className="text-white font-medium text-sm">
                                      Khung giờ {slotIndex + 1}
                                    </h5>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeTimeSlot(day.value, slot.slotId)
                                      }
                                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                                      disabled={
                                        daySchedule.timeSlots.length === 1
                                      }
                                    >
                                      Xóa
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-gray-300 text-sm mb-1">
                                        Pattern:
                                      </label>
                                      <select
                                        value={slot.patternId}
                                        onChange={(e) =>
                                          updateTimeSlot(
                                            day.value,
                                            slot.slotId,
                                            {
                                              patternId: e.target.value,
                                            }
                                          )
                                        }
                                        className="w-full px-2 py-1 bg-gray-500 text-white border border-gray-400 rounded text-sm"
                                        required
                                      >
                                        <option value="">Chọn pattern</option>
                                        {getAvailablePatterns().map(
                                          (pattern) => (
                                            <option
                                              key={pattern.patternId}
                                              value={pattern.patternId}
                                            >
                                              {pattern.patternName}
                                            </option>
                                          )
                                        )}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-gray-300 text-sm mb-1">
                                        Bắt đầu:
                                      </label>
                                      <input
                                        type="time"
                                        value={slot.startTime}
                                        onChange={(e) =>
                                          updateTimeSlot(
                                            day.value,
                                            slot.slotId,
                                            {
                                              startTime: e.target.value,
                                            }
                                          )
                                        }
                                        className="w-full px-2 py-1 bg-gray-500 text-white border border-gray-400 rounded text-sm"
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-gray-300 text-sm mb-1">
                                        Kết thúc:
                                      </label>
                                      <input
                                        type="time"
                                        value={slot.endTime}
                                        onChange={(e) =>
                                          updateTimeSlot(
                                            day.value,
                                            slot.slotId,
                                            {
                                              endTime: e.target.value,
                                            }
                                          )
                                        }
                                        className="w-full px-2 py-1 bg-gray-500 text-white border border-gray-400 rounded text-sm"
                                        required
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() => addTimeSlot(day.value)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm"
                              >
                                + Thêm khung giờ
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  {editingSchedule ? "Cập nhật" : "Thêm"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManagement;
