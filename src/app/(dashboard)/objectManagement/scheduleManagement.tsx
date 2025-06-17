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

  // Copy functionality state
  const [showCopyModal, setShowCopyModal] = useState<boolean>(false);
  const [sourceDayOfWeek, setSourceDayOfWeek] = useState<number | null>(null);
  const [selectedTargetDays, setSelectedTargetDays] = useState<number[]>([]);

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
      // Sort so active schedules appear first
      const sorted = filtered.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return 0;
      });
      setFilteredSchedules(sorted);
    } else {
      // Don't show any schedules when no junction is selected
      setFilteredSchedules([]);
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

      // Refetch all schedules to ensure other schedules in the same junction are updated
      const schedulesResponse = await fetch("/api/schedules");
      if (schedulesResponse.ok) {
        const updatedSchedules = await schedulesResponse.json();
        setSchedules(updatedSchedules);
      } else {
        // Fallback: update local state
        if (editingSchedule) {
          setSchedules((prev) =>
            prev.map((s) =>
              s.scheduleId === editingSchedule.scheduleId ? savedSchedule : s
            )
          );
        } else {
          setSchedules((prev) => [...prev, savedSchedule]);
        }
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
      const scheduleToUpdate = schedules.find(
        (s) => s.scheduleId === scheduleId
      );
      if (!scheduleToUpdate) {
        alert("Không tìm thấy lịch trình!");
        return;
      }

      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scheduleToUpdate,
          isActive: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle schedule status");
      }

      // Refetch all schedules to ensure other schedules in the same junction are updated
      const schedulesResponse = await fetch("/api/schedules");
      if (schedulesResponse.ok) {
        const updatedSchedules = await schedulesResponse.json();
        setSchedules(updatedSchedules);
      } else {
        // Fallback: just update the current schedule
        const updatedSchedule = await response.json();
        setSchedules((prev) =>
          prev.map((s) => (s.scheduleId === scheduleId ? updatedSchedule : s))
        );
      }
    } catch (error) {
      console.error("Error toggling schedule status:", error);
      alert("Có lỗi xảy ra khi thay đổi trạng thái lịch trình!");
    }
  };

  // Copy functionality functions
  const handleCopyDay = (dayOfWeek: number) => {
    setSourceDayOfWeek(dayOfWeek);
    setSelectedTargetDays([]);
    setShowCopyModal(true);
  };

  const handleTargetDayToggle = (dayOfWeek: number) => {
    setSelectedTargetDays((prev) =>
      prev.includes(dayOfWeek)
        ? prev.filter((day) => day !== dayOfWeek)
        : [...prev, dayOfWeek]
    );
  };

  const executeCopy = () => {
    if (sourceDayOfWeek === null || selectedTargetDays.length === 0) {
      return;
    }

    const sourceSchedule = daySchedules.find(
      (ds) => ds.dayOfWeek === sourceDayOfWeek
    );
    if (!sourceSchedule) {
      return;
    }

    setDaySchedules((prev) =>
      prev.map((ds) => {
        if (selectedTargetDays.includes(ds.dayOfWeek)) {
          // Copy time slots with new IDs
          const copiedTimeSlots = sourceSchedule.timeSlots.map((slot) => ({
            ...slot,
            slotId: `${ds.dayOfWeek}_slot_${Date.now()}_${Math.random()}`,
          }));

          return {
            ...ds,
            timeSlots: copiedTimeSlots,
            isActive: sourceSchedule.isActive,
          };
        }
        return ds;
      })
    );

    // Close modal and reset state
    setShowCopyModal(false);
    setSourceDayOfWeek(null);
    setSelectedTargetDays([]);
  };

  const cancelCopy = () => {
    setShowCopyModal(false);
    setSourceDayOfWeek(null);
    setSelectedTargetDays([]);
  };

  return (
    <div className="flex-1 p-6 bg-white dark:bg-gray-900 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Quản lý lịch trình hoạt động đèn giao thông
        </h1>

        {/* Junction Selection */}
        <div className="mb-4">
          <label className="block text-gray-900 dark:text-white mb-2 font-medium">
            Chọn nút giao để quản lý:
          </label>
          <select
            value={selectedJunctionId}
            onChange={(e) => setSelectedJunctionId(e.target.value)}
            className="px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg w-full md:w-1/2 focus:outline-none focus:border-blue-500"
          >
            <option value="">-- Vui lòng chọn nút giao --</option>
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

        {/* Show button only when junction is selected */}
        {selectedJunctionId && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Thêm lịch trình mới
          </button>
        )}
      </div>

      {/* Content based on junction selection */}
      {!selectedJunctionId ? (
        <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-gray-500 dark:text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Chọn nút giao để bắt đầu
          </h3>
          <p className="text-gray-700 dark:text-gray-400">
            Vui lòng chọn một nút giao từ danh sách trên để xem và quản lý các
            lịch trình hoạt động tương ứng.
          </p>
        </div>
      ) : (
        <>
          {/* Schedule List */}
          <div className="space-y-4">
            {filteredSchedules.length > 0 ? (
              filteredSchedules.map((schedule) => (
                <div
                  key={schedule.scheduleId}
                  className={`p-4 rounded-lg relative border ${
                    schedule.isActive
                      ? "bg-green-50 dark:bg-gray-800 border-2 border-green-500"
                      : "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600"
                  }`}
                >
                  {/* Active badge */}
                  {schedule.isActive && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      ĐANG HOẠT ĐỘNG
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3
                        className={`text-lg font-semibold ${
                          schedule.isActive
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {schedule.scheduleName}
                      </h3>
                      <p className="text-gray-700 dark:text-gray-400 text-sm">
                        Chế độ:{" "}
                        {schedule.mode === "auto" ? "Tự động" : "Lên lịch"}
                      </p>
                      <p
                        className={`text-sm ${
                          schedule.isActive
                            ? "text-green-600 dark:text-green-300"
                            : "text-gray-700 dark:text-gray-400"
                        }`}
                      >
                        Trạng thái:{" "}
                        {schedule.isActive ? "Hoạt động" : "Tạm dừng"}
                      </p>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() =>
                          handleToggleActive(
                            schedule.scheduleId,
                            schedule.isActive
                          )
                        }
                        className={`${
                          schedule.isActive
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        } text-white px-3 py-1 rounded transition-colors`}
                      >
                        {schedule.isActive ? "Tạm dừng" : "Kích hoạt"}
                      </button>
                      <button
                        onClick={() => handleEdit(schedule)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(schedule.scheduleId)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  {/* Schedule Details */}
                  {schedule.mode === "auto" ? (
                    <div className="text-gray-700 dark:text-gray-300 text-sm">
                      <p>
                        Pattern tự động:{" "}
                        {trafficPatterns.find(
                          (p) => p.patternId === schedule.autoPatternId
                        )?.patternName || "Không tìm thấy"}
                      </p>
                    </div>
                  ) : (
                    <div className="text-gray-700 dark:text-gray-300 text-sm">
                      <p className="mb-2">Lịch trình theo ngày:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {schedule.daySchedules.map((ds) => {
                          const dayLabel = daysOfWeek.find(
                            (d) => d.value === ds.dayOfWeek
                          )?.label;

                          return (
                            <div
                              key={ds.dayOfWeek}
                              className="bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600"
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
                                        className="bg-gray-100 dark:bg-gray-600 p-1 rounded"
                                      >
                                        <div className="text-blue-600 dark:text-yellow-300">
                                          {slot.startTime} - {slot.endTime}
                                        </div>
                                        <div>
                                          {pattern?.patternName ||
                                            "Không có pattern"}
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
              ))
            ) : (
              <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg text-center border border-gray-200 dark:border-gray-600">
                <div className="mb-4">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Chưa có lịch trình nào
                </h3>
                <p className="text-gray-700 dark:text-gray-400 mb-4">
                  Nút giao này chưa có lịch trình hoạt động nào. Hãy tạo lịch
                  trình đầu tiên.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Tạo lịch trình đầu tiên
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingSchedule ? "Chỉnh sửa lịch trình" : "Thêm lịch trình mới"}
            </h2>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-gray-900 dark:text-white mb-2">
                  Tên lịch trình:
                </label>
                <input
                  type="text"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Ví dụ: Lịch trình giờ cao điểm, Lịch trình cuối tuần..."
                  required
                />
              </div>

              <div>
                <label className="block text-gray-900 dark:text-white mb-2">
                  Chế độ hoạt động:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center text-gray-900 dark:text-white">
                    <input
                      type="radio"
                      value="auto"
                      checked={mode === "auto"}
                      onChange={(e) =>
                        setMode(e.target.value as "auto" | "schedule")
                      }
                      className="mr-2"
                    />
                    Tự động (sử dụng một mẫu pha cố định)
                  </label>
                  <label className="flex items-center text-gray-900 dark:text-white">
                    <input
                      type="radio"
                      value="schedule"
                      checked={mode === "schedule"}
                      onChange={(e) =>
                        setMode(e.target.value as "auto" | "schedule")
                      }
                      className="mr-2"
                    />
                    Lên lịch (cài đặt mẫu pha cho từng ngày và khung giờ)
                  </label>
                </div>
              </div>

              {/* Auto Mode Settings */}
              {mode === "auto" && (
                <div>
                  <label className="block text-gray-900 dark:text-white mb-2">
                    Mẫu pha tự động:
                  </label>
                  <select
                    value={autoPatternId}
                    onChange={(e) => setAutoPatternId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">Chọn mẫu pha</option>
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
                    <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-2">
                      💡 Gợi ý: Tìm thấy mẫu pha "
                      {getAutoPattern()?.patternName}" - có thể là mẫu pha tự
                      động
                    </p>
                  )}
                </div>
              )}

              {/* Schedule Mode Settings */}
              {mode === "schedule" && (
                <div>
                  <label className="block text-gray-900 dark:text-white mb-3">
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
                          className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
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
                              <h4 className="text-gray-900 dark:text-white font-medium">
                                {day.label}
                              </h4>
                            </div>

                            {daySchedule.isActive &&
                              daySchedule.timeSlots.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyDay(day.value)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors"
                                  title="Sao chép cấu hình ngày này"
                                >
                                  Sao chép
                                </button>
                              )}
                          </div>

                          {daySchedule.isActive && (
                            <div className="space-y-3">
                              {daySchedule.timeSlots.map((slot, slotIndex) => (
                                <div
                                  key={slot.slotId}
                                  className="bg-white dark:bg-gray-600 p-3 rounded-lg border border-gray-200 dark:border-gray-500"
                                >
                                  <div className="flex justify-between items-center mb-3">
                                    <h5 className="text-gray-900 dark:text-white font-medium text-sm">
                                      Khung giờ {slotIndex + 1}
                                    </h5>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeTimeSlot(day.value, slot.slotId)
                                      }
                                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition-colors"
                                      disabled={
                                        daySchedule.timeSlots.length === 1
                                      }
                                    >
                                      Xóa
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-gray-700 dark:text-gray-300 text-sm mb-1">
                                        Mẫu pha:
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
                                        className="w-full px-2 py-1 bg-white dark:bg-gray-500 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-400 rounded text-sm focus:outline-none focus:border-blue-500"
                                        required
                                      >
                                        <option value="">Chọn mẫu pha</option>
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
                                      <label className="block text-gray-700 dark:text-gray-300 text-sm mb-1">
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
                                        className="w-full px-2 py-1 bg-white dark:bg-gray-500 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-400 rounded text-sm focus:outline-none focus:border-blue-500"
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-gray-700 dark:text-gray-300 text-sm mb-1">
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
                                        className="w-full px-2 py-1 bg-white dark:bg-gray-500 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-400 rounded text-sm focus:outline-none focus:border-blue-500"
                                        required
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() => addTimeSlot(day.value)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm transition-colors"
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
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editingSchedule ? "Cập nhật" : "Thêm"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copy Modal */}
      {showCopyModal && sourceDayOfWeek !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Sao chép cấu hình lịch trình
            </h2>

            <div className="space-y-4">
              {/* Source day info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <h3 className="text-blue-800 dark:text-blue-300 font-medium mb-2">
                  Ngày nguồn:{" "}
                  {daysOfWeek.find((d) => d.value === sourceDayOfWeek)?.label}
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {(() => {
                    const sourceSchedule = daySchedules.find(
                      (ds) => ds.dayOfWeek === sourceDayOfWeek
                    );
                    if (
                      !sourceSchedule ||
                      sourceSchedule.timeSlots.length === 0
                    ) {
                      return (
                        <span className="text-gray-500">
                          Không có khung giờ nào
                        </span>
                      );
                    }
                    return (
                      <div className="space-y-1">
                        {sourceSchedule.timeSlots.map((slot, index) => {
                          const pattern = trafficPatterns.find(
                            (p) => p.patternId === slot.patternId
                          );
                          return (
                            <div
                              key={slot.slotId}
                              className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600"
                            >
                              <span>
                                Khung giờ {index + 1}: {slot.startTime} -{" "}
                                {slot.endTime}
                              </span>
                              <span className="text-blue-600 dark:text-blue-400">
                                {pattern?.patternName || "Không có pattern"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Target days selection */}
              <div>
                <label className="block text-gray-900 dark:text-white mb-3 font-medium">
                  Chọn các ngày để sao chép đến:
                </label>
                <div className="space-y-2">
                  {daysOfWeek.map((day) => (
                    <label
                      key={day.value}
                      className={`flex items-center p-2 rounded border transition-colors ${
                        day.value === sourceDayOfWeek
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTargetDays.includes(day.value)}
                        onChange={() => handleTargetDayToggle(day.value)}
                        disabled={day.value === sourceDayOfWeek}
                        className="mr-3"
                      />
                      <span className="text-gray-900 dark:text-white">
                        {day.label}
                        {day.value === sourceDayOfWeek && " (ngày nguồn)"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedTargetDays.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-700">
                  <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                    ⚠️ Cấu hình hiện tại của các ngày được chọn sẽ bị thay thế
                    hoàn toàn bởi cấu hình từ ngày nguồn.
                  </p>
                </div>
              )}

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={executeCopy}
                  disabled={selectedTargetDays.length === 0}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedTargetDays.length === 0
                      ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  Sao chép ({selectedTargetDays.length} ngày)
                </button>
                <button
                  type="button"
                  onClick={cancelCopy}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManagement;
