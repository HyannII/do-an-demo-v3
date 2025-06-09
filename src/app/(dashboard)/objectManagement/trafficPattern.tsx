"use client";

import React, { useState, useEffect } from "react";
import { TrafficPattern, Junction } from "../../../../types/interface";

interface TrafficPatternManagementProps {
  trafficPatterns: TrafficPattern[];
  setTrafficPatterns: React.Dispatch<React.SetStateAction<TrafficPattern[]>>;
  junctions: Junction[];
}

interface PhaseConfig {
  phaseId: string;
  phaseName: string;
  startTime: number; // seconds from start
  duration: number; // seconds
  isActive: boolean;
  lightStates: {
    [lightId: string]: "red" | "yellow" | "green";
  };
}

interface PatternConfig {
  cycleDuration: number; // total cycle time in seconds
  phases: PhaseConfig[];
  lightDirectionMapping?: { [lightId: string]: string };
}

const TrafficPatternManagement: React.FC<TrafficPatternManagementProps> = ({
  trafficPatterns,
  setTrafficPatterns,
  junctions,
}) => {
  const [selectedJunctionId, setSelectedJunctionId] = useState<string>("");
  const [filteredPatterns, setFilteredPatterns] = useState<TrafficPattern[]>(
    []
  );
  const [editingPattern, setEditingPattern] = useState<TrafficPattern | null>(
    null
  );
  const [showForm, setShowForm] = useState<boolean>(false);
  const [selectedPattern, setSelectedPattern] = useState<TrafficPattern | null>(
    null
  );

  // Form state
  const [patternName, setPatternName] = useState<string>("");
  const [patternConfig, setPatternConfig] = useState<PatternConfig>({
    cycleDuration: 120,
    phases: [],
  });
  const [quickSetupText, setQuickSetupText] = useState<string>("");
  const [showQuickSetup, setShowQuickSetup] = useState<boolean>(false);
  const [quickSetupLights, setQuickSetupLights] = useState<{
    [lightId: string]: {
      lightName: string;
      greenStart: number;
      greenDuration: number;
      yellowDuration: number;
      redDuration: number;
    };
  }>({});

  // Filter patterns by selected junction
  useEffect(() => {
    if (selectedJunctionId) {
      const filtered = trafficPatterns.filter(
        (pattern) => pattern.junctionId === selectedJunctionId
      );
      setFilteredPatterns(filtered);
    } else {
      setFilteredPatterns(trafficPatterns);
    }
  }, [selectedJunctionId, trafficPatterns]);

  const resetForm = () => {
    setPatternName("");
    setPatternConfig({
      cycleDuration: 120,
      phases: [],
    });
    setQuickSetupText("");
    setQuickSetupLights({});
    setShowQuickSetup(false);
    setEditingPattern(null);
    setShowForm(false);
  };

  // Add light to structured quick setup
  const addLightToQuickSetup = (lightId: string, lightName: string) => {
    // Tự động tính toán thời gian bắt đầu dựa trên đèn cuối cùng
    const existingLights = Object.values(quickSetupLights);
    let suggestedStart = 0;

    if (existingLights.length > 0) {
      const lastLight = existingLights[existingLights.length - 1];
      suggestedStart =
        lastLight.greenStart +
        lastLight.greenDuration +
        lastLight.yellowDuration +
        lastLight.redDuration;
    }

    setQuickSetupLights((prev) => ({
      ...prev,
      [lightId]: {
        lightName,
        greenStart: suggestedStart,
        greenDuration: 45,
        yellowDuration: 3,
        redDuration: 3,
      },
    }));
  };

  // Remove light from structured quick setup
  const removeLightFromQuickSetup = (lightId: string) => {
    setQuickSetupLights((prev) => {
      const newLights = { ...prev };
      delete newLights[lightId];
      return newLights;
    });
  };

  // Update light config in structured quick setup
  const updateLightQuickSetup = (
    lightId: string,
    field: string,
    value: number
  ) => {
    setQuickSetupLights((prev) => ({
      ...prev,
      [lightId]: {
        ...prev[lightId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedJunctionId) {
      alert("Vui lòng chọn nút giao!");
      return;
    }

    try {
      const patternData = {
        patternName,
        junctionId: selectedJunctionId,
        timingConfiguration: {
          ...patternConfig,
        },
      };

      const response = editingPattern
        ? await fetch(`/api/trafficPatterns/${editingPattern.patternId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patternData),
          })
        : await fetch("/api/trafficPatterns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patternData),
          });

      if (!response.ok) {
        throw new Error("Failed to save pattern");
      }

      const savedPattern = await response.json();

      if (editingPattern) {
        setTrafficPatterns((prev) =>
          prev.map((p) =>
            p.patternId === editingPattern.patternId ? savedPattern : p
          )
        );
      } else {
        setTrafficPatterns((prev) => [...prev, savedPattern]);
      }

      resetForm();
    } catch (error) {
      console.error("Error saving pattern:", error);
      alert("Có lỗi xảy ra khi lưu pattern!");
    }
  };

  const handleEdit = (pattern: TrafficPattern) => {
    setEditingPattern(pattern);
    setPatternName(pattern.patternName);
    setSelectedJunctionId(pattern.junctionId);
    const config = pattern.timingConfiguration as PatternConfig;
    setPatternConfig(config);
    setShowForm(true);
  };

  const handleDelete = async (patternId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa pattern này?")) return;

    try {
      const response = await fetch(`/api/trafficPatterns/${patternId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete pattern");
      }

      setTrafficPatterns((prev) =>
        prev.filter((p) => p.patternId !== patternId)
      );
    } catch (error) {
      console.error("Error deleting pattern:", error);
      alert("Có lỗi xảy ra khi xóa pattern!");
    }
  };

  const addPhase = () => {
    const newPhase: PhaseConfig = {
      phaseId: Date.now().toString(),
      phaseName: `Pha ${patternConfig.phases.length + 1}`,
      startTime: patternConfig.phases.reduce(
        (acc, phase) => acc + phase.duration,
        0
      ),
      duration: 30,
      isActive: true,
      lightStates: {},
    };

    setPatternConfig((prev) => ({
      ...prev,
      phases: [...prev.phases, newPhase],
    }));
  };

  const updatePhase = (phaseId: string, updates: Partial<PhaseConfig>) => {
    setPatternConfig((prev) => ({
      ...prev,
      phases: prev.phases.map((phase) =>
        phase.phaseId === phaseId ? { ...phase, ...updates } : phase
      ),
    }));
  };

  const removePhase = (phaseId: string) => {
    setPatternConfig((prev) => ({
      ...prev,
      phases: prev.phases.filter((phase) => phase.phaseId !== phaseId),
    }));
  };

  // Parse structured quick setup and create phases automatically
  const parseStructuredQuickSetup = () => {
    if (!selectedJunctionId || Object.keys(quickSetupLights).length === 0) {
      alert("Vui lòng chọn nút giao và cấu hình ít nhất một đèn!");
      return;
    }

    const selectedJunction = junctions.find(
      (j) => j.junctionId === selectedJunctionId
    );
    if (!selectedJunction) {
      alert("Không tìm thấy nút giao được chọn!");
      return;
    }

    try {
      const phases: PhaseConfig[] = [];
      let maxTime = 0;

      Object.entries(quickSetupLights).forEach(([lightId, config]) => {
        const {
          lightName,
          greenStart,
          greenDuration,
          yellowDuration,
          redDuration,
        } = config;

        // Validate times
        if (
          greenStart < 0 ||
          greenDuration <= 0 ||
          yellowDuration <= 0 ||
          redDuration <= 0
        ) {
          throw new Error(`Thời gian không hợp lệ cho đèn ${lightName}`);
        }

        // Phase xanh
        const greenEndTime = greenStart + greenDuration;
        phases.push({
          phaseId: `${lightName}_green_${Date.now()}_${Math.random()}`,
          phaseName: `${lightName} - Xanh`,
          startTime: greenStart,
          duration: greenDuration,
          isActive: true,
          lightStates: {
            ...Object.fromEntries(
              selectedJunction.trafficLights.map((l) => [
                l.trafficLightId,
                "red" as const,
              ])
            ),
            [lightId]: "green",
          },
        });

        // Phase vàng
        phases.push({
          phaseId: `${lightName}_yellow_${Date.now()}_${Math.random()}`,
          phaseName: `${lightName} - Vàng`,
          startTime: greenEndTime,
          duration: yellowDuration,
          isActive: true,
          lightStates: {
            ...Object.fromEntries(
              selectedJunction.trafficLights.map((l) => [
                l.trafficLightId,
                "red" as const,
              ])
            ),
            [lightId]: "yellow",
          },
        });

        // Phase đỏ chung
        const yellowEndTime = greenEndTime + yellowDuration;
        phases.push({
          phaseId: `${lightName}_red_${Date.now()}_${Math.random()}`,
          phaseName: `${lightName} - Đỏ chung`,
          startTime: yellowEndTime,
          duration: redDuration,
          isActive: true,
          lightStates: Object.fromEntries(
            selectedJunction.trafficLights.map((l) => [
              l.trafficLightId,
              "red" as const,
            ])
          ),
        });

        maxTime = Math.max(maxTime, yellowEndTime + redDuration);
      });

      // Sắp xếp phases theo thời gian bắt đầu
      phases.sort((a, b) => a.startTime - b.startTime);

      setPatternConfig((prev) => ({
        ...prev,
        cycleDuration: maxTime,
        phases,
      }));

      setShowQuickSetup(false);
      alert("Đã tạo pattern thành công từ cấu hình structured!");
    } catch (error) {
      console.error("Error parsing structured quick setup:", error);
      alert(
        `Có lỗi xảy ra: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Parse quick setup text and create phases automatically (legacy)
  const parseQuickSetup = () => {
    if (!selectedJunctionId || !quickSetupText.trim()) {
      alert("Vui lòng chọn nút giao và nhập cấu hình pattern!");
      return;
    }

    const selectedJunction = junctions.find(
      (j) => j.junctionId === selectedJunctionId
    );
    if (!selectedJunction) {
      alert("Không tìm thấy nút giao được chọn!");
      return;
    }

    try {
      const lines = quickSetupText.trim().split("\n");
      const phases: PhaseConfig[] = [];
      let maxTime = 0;

      // Map tên đèn và id
      const lightNameToIdMap: { [lightName: string]: string } = {};
      const lightIdToNameMap: { [lightId: string]: string } = {};

      selectedJunction.trafficLights.forEach((light) => {
        lightNameToIdMap[light.lightName] = light.trafficLightId;
        lightIdToNameMap[light.trafficLightId] = light.lightName;
      });

      // Tạo map để lưu trữ các đèn theo tên/nhãn
      const lightMap: { [key: string]: string[] } = {};

      lines.forEach((line) => {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (!match) return;

        const lightName = match[1].trim();
        const configs = match[2];

        // Parse các trạng thái đèn: Xanh (0–58), Vàng (58–61), Đỏ chung (61–64)
        const stateMatches = configs.match(
          /(Xanh|Vàng|Đỏ chung)\s*\((\d+)–(\d+)\)/g
        );

        // Kiểm tra xem tên đèn có tồn tại trong junction không
        const lightId = lightNameToIdMap[lightName];
        if (stateMatches && lightId) {
          // Thêm lightId vào lightMap nếu chưa có
          if (!lightMap[lightName]) {
            lightMap[lightName] = [lightId];
          }

          stateMatches.forEach((stateMatch) => {
            const stateDetail = stateMatch.match(
              /(Xanh|Vàng|Đỏ chung)\s*\((\d+)–(\d+)\)/
            );
            if (stateDetail) {
              const state = stateDetail[1];
              const startTime = parseInt(stateDetail[2]);
              const endTime = parseInt(stateDetail[3]);
              const duration = endTime - startTime;

              maxTime = Math.max(maxTime, endTime);

              // Tạo light states cho phase này
              const lightStates: {
                [lightId: string]: "red" | "yellow" | "green";
              } = {};

              // Đặt tất cả đèn thành đỏ mặc định
              selectedJunction.trafficLights.forEach((light) => {
                lightStates[light.trafficLightId] = "red";
              });

              // Đặt trạng thái cho đèn hiện tại
              const lightColor =
                state === "Xanh"
                  ? "green"
                  : state === "Vàng"
                  ? "yellow"
                  : "red";
              lightStates[lightId] = lightColor;

              phases.push({
                phaseId: `${lightName}_${state}_${Date.now()}_${Math.random()}`,
                phaseName: `${lightName} - ${state}`,
                startTime,
                duration,
                isActive: true,
                lightStates,
              });
            }
          });
        }
      });

      if (phases.length === 0) {
        // Hiển thị thông tin debug để giúp người dùng
        const availableLights = selectedJunction.trafficLights
          .map((light) => light.lightName)
          .join(", ");

        alert(`Không thể parse cấu hình pattern. 
        
Đèn có sẵn trong nút giao:
${availableLights}

Vui lòng kiểm tra:
1. Định dạng text đúng như ví dụ
2. Tên đèn phải khớp chính xác với tên đèn trong hệ thống
3. Có ít nhất một pha được cấu hình cho pattern`);
        return;
      }

      // Sắp xếp phases theo thời gian bắt đầu
      phases.sort((a, b) => a.startTime - b.startTime);

      setPatternConfig((prev) => ({
        ...prev,
        cycleDuration: maxTime,
        phases,
      }));

      setShowQuickSetup(false);
      alert("Đã tạo pattern thành công từ cấu hình quick setup!");
    } catch (error) {
      console.error("Error parsing quick setup:", error);
      alert("Có lỗi xảy ra khi parse cấu hình pattern!");
    }
  };

  // Helper to check if a state is considered 'red' (red or gray)
  const isRedState = (state: string) => state === "red" || state === "gray";

  const GanttChart = ({
    pattern,
    directionMapping,
  }: {
    pattern: TrafficPattern;
    directionMapping: { [lightId: string]: string };
  }) => {
    const config = pattern.timingConfiguration as PatternConfig;
    const selectedJunction = junctions.find(
      (j) => j.junctionId === pattern.junctionId
    );

    const chartRef = React.useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = React.useState(800);

    React.useEffect(() => {
      if (chartRef.current) {
        setChartWidth(chartRef.current.offsetWidth);
      }
      const handleResize = () => {
        if (chartRef.current) {
          setChartWidth(chartRef.current.offsetWidth);
        }
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    if (!config || !config.phases || !selectedJunction) return null;

    const cycleDuration = config.cycleDuration || 179;
    const timeScale = chartWidth / cycleDuration; // pixels per second, full width

    // Tạo map đèn theo tên
    const lightMap: { [lightName: string]: string } = {};
    const lightIdToNameMap: { [lightId: string]: string } = {};

    // Mapping tên đèn với ID
    selectedJunction.trafficLights.forEach((light) => {
      lightMap[light.lightName] = light.trafficLightId;
      lightIdToNameMap[light.trafficLightId] = light.lightName;
    });

    // Lấy danh sách các đèn có pha được cấu hình
    const activeLights = new Set<string>();
    config.phases.forEach((phase) => {
      Object.keys(phase.lightStates).forEach((lightId) => {
        if (
          selectedJunction.trafficLights.find(
            (l) => l.trafficLightId === lightId
          )
        ) {
          activeLights.add(lightId);
        }
      });
    });

    // Tạo timeline cho mỗi đèn, gộp đỏ và đỏ chung liền nhau
    const getLightTimelineMerged = (lightId: string) => {
      const sortedPhases = [...config.phases].sort(
        (a, b) => a.startTime - b.startTime
      );
      const timeline = [];
      let prev: any = null;

      for (const phase of sortedPhases) {
        const state = phase.lightStates[lightId] || "red";
        // Gộp đỏ ("red") và đỏ chung ("gray") nếu liền nhau
        if (
          prev &&
          isRedState(prev.state) &&
          isRedState(state) &&
          prev.startTime + prev.duration === phase.startTime
        ) {
          prev.duration += phase.duration;
        } else {
          if (prev) timeline.push(prev);
          prev = {
            startTime: phase.startTime,
            duration: phase.duration,
            state,
            phaseName: phase.phaseName,
          };
        }
      }
      if (prev) timeline.push(prev);
      return timeline;
    };

    // Debug information
    console.log("GanttChart Debug Info:", {
      pattern: pattern.patternName,
      lightMap,
      activeLights: Array.from(activeLights),
      phases: config.phases,
      trafficLights: selectedJunction?.trafficLights,
    });

    // Tạo time markers động
    const getTimeMarkers = () => {
      const markers = new Set<number>();

      // Thêm mốc 0 và cycleDuration
      markers.add(0);
      markers.add(cycleDuration);

      // Thêm các mốc thời gian từ các pha
      config.phases.forEach((phase) => {
        markers.add(phase.startTime);
        markers.add(phase.startTime + phase.duration);
      });

      // Chuyển Set thành Array và sắp xếp
      return Array.from(markers).sort((a, b) => a - b);
    };

    const getStateColor = (state: string) => {
      switch (state) {
        case "green":
          return "bg-green-500";
        case "yellow":
          return "bg-yellow-500";
        case "red":
          return "bg-red-500";
        default:
          return "bg-gray-500";
      }
    };

    const getStateLabel = (state: string) => {
      switch (state) {
        case "green":
          return "Xanh";
        case "yellow":
          return "Vàng";
        case "red":
          return "Đỏ";
        default:
          return "Chung";
      }
    };

    return (
      <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
        <h4 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">
          Dòng thời gian pha đèn trong một chu kỳ ({cycleDuration} giây) -{" "}
          {pattern.patternName}
        </h4>

        <div
          className="relative w-full"
          ref={chartRef}
        >
          {/* Light timelines */}
          <div className="space-y-4">
            {Array.from(activeLights).map((lightId) => {
              const lightName = lightIdToNameMap[lightId];
              const timeline = getLightTimelineMerged(lightId);

              return (
                <div
                  key={lightId}
                  className="relative"
                >
                  <div className="text-sm text-gray-900 dark:text-gray-300 mb-2 font-medium">
                    {lightName}
                  </div>
                  <div className="relative h-8 bg-gray-700 rounded overflow-hidden">
                    {timeline.length > 0 ? (
                      timeline.map((segment, index) => {
                        const isGreen = segment.state === "green";
                        const isRed = isRedState(segment.state);
                        return (
                          <div
                            key={index}
                            className={`absolute h-full ${getStateColor(
                              segment.state
                            )}`}
                            style={{
                              left: `${segment.startTime * timeScale}px`,
                              width: `${segment.duration * timeScale}px`,
                            }}
                            title={`${getStateLabel(segment.state)}: ${
                              segment.startTime
                            }s - ${segment.startTime + segment.duration}s`}
                          >
                            {(isGreen || isRed) &&
                              segment.duration * timeScale > 30 && (
                                <span className="text-xs text-white p-1 font-medium select-none">
                                  {segment.startTime}–
                                  {segment.startTime + segment.duration}s
                                </span>
                              )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-gray-400">
                        Không có dữ liệu timeline
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-gray-900 dark:text-gray-300 font-medium">
              Chú thích:
            </span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-900 dark:text-gray-300">Đèn xanh</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-gray-900 dark:text-gray-300">Đèn vàng</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-gray-900 dark:text-gray-300">Đèn đỏ</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 p-6 bg-white dark:bg-gray-900 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Quản lý mẫu pha đèn giao thông
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
            Thêm mẫu pha mới
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Chọn nút giao để bắt đầu
          </h3>
          <p className="text-gray-700 dark:text-gray-400">
            Vui lòng chọn một nút giao từ danh sách trên để xem và quản lý các
            mẫu pha đèn giao thông tương ứng.
          </p>
        </div>
      ) : (
        <>
          {/* Selected Junction Info */}

          {/* Pattern List */}
          <div className="space-y-4">
            {filteredPatterns.length > 0 ? (
              filteredPatterns.map((pattern) => (
                <div
                  key={pattern.patternId}
                  className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {pattern.patternName}
                    </h3>
                    <div className="space-x-2">
                      <button
                        onClick={() =>
                          setSelectedPattern(
                            selectedPattern?.patternId === pattern.patternId
                              ? null
                              : pattern
                          )
                        }
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors"
                      >
                        {selectedPattern?.patternId === pattern.patternId
                          ? "Ẩn"
                          : "Xem"}
                      </button>
                      <button
                        onClick={() => handleEdit(pattern)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(pattern.patternId)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  {selectedPattern?.patternId === pattern.patternId && (
                    <GanttChart
                      pattern={pattern}
                      directionMapping={{}}
                    />
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
                      d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Chưa có mẫu pha đèn nào
                </h3>
                <p className="text-gray-700 dark:text-gray-400 mb-4">
                  Nút giao này chưa có mẫu pha đèn giao thông nào. Hãy tạo mẫu
                  pha đầu tiên.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Tạo mẫu pha đầu tiên
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
              {editingPattern ? "Chỉnh sửa mẫu pha" : "Thêm mẫu pha mới"}
            </h2>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-gray-900 dark:text-white mb-2">
                  Tên mẫu pha:
                </label>
                <input
                  type="text"
                  value={patternName}
                  onChange={(e) => setPatternName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Ví dụ: Giờ cao điểm sáng, Giờ thường..."
                  required
                />
              </div>

              <div>
                <label className="block text-gray-900 dark:text-white mb-2">
                  Thời gian chu kỳ (giây):
                </label>
                <input
                  type="number"
                  value={patternConfig.cycleDuration}
                  onChange={(e) =>
                    setPatternConfig((prev) => ({
                      ...prev,
                      cycleDuration: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  min="1"
                  required
                />
              </div>

              {/* Quick Setup Section */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Cấu hình nhanh Pattern
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowQuickSetup(!showQuickSetup)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                  >
                    {showQuickSetup ? "Ẩn" : "Hiện"} Cấu hình nhanh
                  </button>
                </div>

                {showQuickSetup && (
                  <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg space-y-4">
                    {/* Available Traffic Lights Info */}
                    {selectedJunctionId && (
                      <div>
                        <h4 className="text-gray-900 dark:text-white font-medium mb-3">
                          Đèn giao thông có sẵn trong nút giao:
                        </h4>
                        <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded border border-blue-200 dark:border-blue-700">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {junctions
                              .find((j) => j.junctionId === selectedJunctionId)
                              ?.trafficLights.map((light) => (
                                <div
                                  key={light.trafficLightId}
                                  className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                                >
                                  {light.lightName}
                                </div>
                              ))}
                          </div>
                          <p className="text-blue-700 dark:text-blue-300 text-xs mt-2">
                            💡 Sử dụng chính xác các tên đèn này trong cấu hình
                            quick setup bên dưới
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-gray-900 dark:text-white text-sm font-medium">
                          Cấu hình thời gian cho từng đèn:
                        </label>
                        {selectedJunctionId && (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                const selectedLight = junctions
                                  .find(
                                    (j) => j.junctionId === selectedJunctionId
                                  )
                                  ?.trafficLights.find(
                                    (l) => l.trafficLightId === e.target.value
                                  );
                                if (selectedLight) {
                                  addLightToQuickSetup(
                                    selectedLight.trafficLightId,
                                    selectedLight.lightName
                                  );
                                }
                                e.target.value = ""; // Reset selection
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white border border-blue-600 rounded text-sm hover:bg-blue-700"
                          >
                            <option value="">+ Thêm đèn</option>
                            {junctions
                              .find((j) => j.junctionId === selectedJunctionId)
                              ?.trafficLights.filter(
                                (light) =>
                                  !quickSetupLights[light.trafficLightId]
                              )
                              .map((light) => (
                                <option
                                  key={light.trafficLightId}
                                  value={light.trafficLightId}
                                >
                                  {light.lightName}
                                </option>
                              ))}
                          </select>
                        )}
                      </div>

                      {Object.keys(quickSetupLights).length > 0 && (
                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900 rounded border border-green-200 dark:border-green-700">
                          <div className="text-green-800 dark:text-green-200 text-sm font-medium">
                            📊 Tổng quan Pattern:{" "}
                            {Math.max(
                              ...Object.values(quickSetupLights).map(
                                (config) =>
                                  config.greenStart +
                                  config.greenDuration +
                                  config.yellowDuration +
                                  config.redDuration
                              )
                            )}
                            s chu kỳ
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        {Object.entries(quickSetupLights).map(
                          ([lightId, config]) => (
                            <div
                              key={lightId}
                              className="bg-white dark:bg-gray-600 p-4 rounded-lg border border-gray-200 dark:border-gray-500"
                            >
                              <div className="flex justify-between items-center mb-3">
                                <h5 className="text-gray-900 dark:text-white font-medium">
                                  {config.lightName}
                                </h5>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeLightFromQuickSetup(lightId)
                                  }
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  ✕ Xóa
                                </button>
                              </div>

                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-gray-700 dark:text-gray-300 text-xs mb-1">
                                    Bắt đầu xanh (s):
                                  </label>
                                  <input
                                    type="number"
                                    value={config.greenStart}
                                    onChange={(e) =>
                                      updateLightQuickSetup(
                                        lightId,
                                        "greenStart",
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-full px-2 py-1 bg-white dark:bg-gray-500 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-400 rounded text-sm"
                                    min="0"
                                  />
                                </div>

                                <div>
                                  <label className="block text-gray-700 dark:text-gray-300 text-xs mb-1">
                                    Thời gian xanh (s):
                                  </label>
                                  <input
                                    type="number"
                                    value={config.greenDuration}
                                    onChange={(e) =>
                                      updateLightQuickSetup(
                                        lightId,
                                        "greenDuration",
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                    className="w-full px-2 py-1 bg-white dark:bg-gray-500 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-400 rounded text-sm"
                                    min="1"
                                  />
                                </div>

                                <div>
                                  <label className="block text-gray-700 dark:text-gray-300 text-xs mb-1">
                                    Thời gian vàng (s):
                                  </label>
                                  <input
                                    type="number"
                                    value={config.yellowDuration}
                                    onChange={(e) =>
                                      updateLightQuickSetup(
                                        lightId,
                                        "yellowDuration",
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                    className="w-full px-2 py-1 bg-white dark:bg-gray-500 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-400 rounded text-sm"
                                    min="1"
                                  />
                                </div>

                                <div>
                                  <label className="block text-gray-700 dark:text-gray-300 text-xs mb-1">
                                    Thời gian đỏ (s):
                                  </label>
                                  <input
                                    type="number"
                                    value={config.redDuration}
                                    onChange={(e) =>
                                      updateLightQuickSetup(
                                        lightId,
                                        "redDuration",
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                    className="w-full px-2 py-1 bg-white dark:bg-gray-500 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-400 rounded text-sm"
                                    min="1"
                                  />
                                </div>
                              </div>

                              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                Kết thúc:{" "}
                                {config.greenStart +
                                  config.greenDuration +
                                  config.yellowDuration +
                                  config.redDuration}
                                s
                              </div>
                            </div>
                          )
                        )}

                        {Object.keys(quickSetupLights).length === 0 && (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <p>Chưa có đèn nào được cấu hình.</p>
                            <p className="text-sm">
                              Sử dụng dropdown "Thêm đèn" ở trên để bắt đầu.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded border-l-4 border-blue-500">
                      <p className="text-blue-800 dark:text-blue-200 text-sm">
                        <strong>💡 Hướng dẫn:</strong> Chọn đèn từ dropdown và
                        cấu hình thời gian cho từng pha. Hệ thống sẽ tự động tạo
                        các pha Xanh → Vàng → Đỏ cho mỗi đèn.
                      </p>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={parseStructuredQuickSetup}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
                        disabled={Object.keys(quickSetupLights).length === 0}
                      >
                        Tạo Pattern từ Cấu hình
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickSetupLights({});
                          setPatternConfig((prev) => ({ ...prev, phases: [] }));
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                      >
                        Xóa tất cả
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Phases Management */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-gray-900 dark:text-white">
                    Các pha đèn:
                  </label>
                  <button
                    type="button"
                    onClick={addPhase}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                  >
                    Thêm Pha
                  </button>
                </div>

                <div className="space-y-3">
                  {patternConfig.phases.map((phase, index) => {
                    const selectedJunction = junctions.find(
                      (j) => j.junctionId === selectedJunctionId
                    );

                    return (
                      <div
                        key={phase.phaseId}
                        className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="block text-gray-900 dark:text-white text-sm mb-1">
                              Tên pha:
                            </label>
                            <input
                              type="text"
                              value={phase.phaseName}
                              onChange={(e) =>
                                updatePhase(phase.phaseId, {
                                  phaseName: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 bg-white dark:bg-gray-600 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-500 rounded"
                            />
                          </div>

                          <div>
                            <label className="block text-gray-900 dark:text-white text-sm mb-1">
                              Thời gian bắt đầu (s):
                            </label>
                            <input
                              type="number"
                              value={phase.startTime}
                              onChange={(e) =>
                                updatePhase(phase.phaseId, {
                                  startTime: parseInt(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1 bg-white dark:bg-gray-600 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-500 rounded"
                              min="0"
                            />
                          </div>

                          <div>
                            <label className="block text-gray-900 dark:text-white text-sm mb-1">
                              Thời lượng (s):
                            </label>
                            <input
                              type="number"
                              value={phase.duration}
                              onChange={(e) =>
                                updatePhase(phase.phaseId, {
                                  duration: parseInt(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1 bg-white dark:bg-gray-600 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-500 rounded"
                              min="1"
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <label className="text-gray-900 dark:text-white text-sm">
                              Hoạt động:
                            </label>
                            <input
                              type="checkbox"
                              checked={phase.isActive}
                              onChange={(e) =>
                                updatePhase(phase.phaseId, {
                                  isActive: e.target.checked,
                                })
                              }
                              className="form-checkbox"
                            />
                            <button
                              type="button"
                              onClick={() => removePhase(phase.phaseId)}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>

                        {/* Traffic Light States for this phase */}
                        {selectedJunction &&
                          selectedJunction.trafficLights.length > 0 && (
                            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                              <label className="block text-gray-900 dark:text-white text-sm mb-2">
                                Trạng thái đèn trong pha này:
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {selectedJunction.trafficLights.map((light) => (
                                  <div
                                    key={light.trafficLightId}
                                    className="bg-white dark:bg-gray-600 p-3 rounded border border-gray-200 dark:border-gray-500"
                                  >
                                    <div className="text-gray-900 dark:text-white text-sm mb-2">
                                      {light.lightName}
                                    </div>
                                    <select
                                      value={
                                        phase.lightStates[
                                          light.trafficLightId
                                        ] || "red"
                                      }
                                      onChange={(e) =>
                                        updatePhase(phase.phaseId, {
                                          lightStates: {
                                            ...phase.lightStates,
                                            [light.trafficLightId]: e.target
                                              .value as
                                              | "red"
                                              | "yellow"
                                              | "green",
                                          },
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-white dark:bg-gray-500 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-400 rounded text-sm"
                                    >
                                      <option value="red">🔴 Đỏ</option>
                                      <option value="yellow">🟡 Vàng</option>
                                      <option value="green">🟢 Xanh</option>
                                    </select>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  {editingPattern ? "Cập nhật" : "Thêm"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white"
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

export default TrafficPatternManagement;
