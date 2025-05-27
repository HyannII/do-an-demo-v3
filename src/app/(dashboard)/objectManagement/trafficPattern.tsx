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
  const [lightDirectionMapping, setLightDirectionMapping] = useState<{
    [lightId: string]: string;
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
    setShowQuickSetup(false);
    setLightDirectionMapping({});
    setEditingPattern(null);
    setShowForm(false);
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
          lightDirectionMapping,
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
    // Load mapping đã lưu hoặc reset về rỗng
    setLightDirectionMapping(config.lightDirectionMapping || {});
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

  // Parse quick setup text and create phases automatically
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

      // Map hướng theo tên đèn (giả sử đèn được đặt tên theo hướng)
      const directionMap: { [key: string]: string[] } = {
        Bắc: [],
        Nam: [],
        Đông: [],
        Tây: [],
      };

      // Tìm đèn theo hướng dựa trên tên đèn và mapping thủ công
      selectedJunction.trafficLights.forEach((light) => {
        // Ưu tiên sử dụng mapping thủ công
        if (lightDirectionMapping[light.trafficLightId]) {
          const direction = lightDirectionMapping[light.trafficLightId];
          if (directionMap[direction]) {
            directionMap[direction].push(light.trafficLightId);
          }
        } else {
          // Auto-detect từ trường location (vị trí)
          const directionMatch = light.location.match(/hướng\s+([^\s,]+)/i);
          if (directionMatch) {
            const direction = directionMatch[1];
            if (direction === "Bắc" && directionMap["Bắc"]) {
              directionMap["Bắc"].push(light.trafficLightId);
            } else if (direction === "Nam" && directionMap["Nam"]) {
              directionMap["Nam"].push(light.trafficLightId);
            } else if (direction === "Đông" && directionMap["Đông"]) {
              directionMap["Đông"].push(light.trafficLightId);
            } else if (direction === "Tây" && directionMap["Tây"]) {
              directionMap["Tây"].push(light.trafficLightId);
            }
          }
        }
      });

      lines.forEach((line) => {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (!match) return;

        const direction = match[1].trim();
        const configs = match[2];

        // Parse các trạng thái đèn: Xanh (0–58), Vàng (58–61), Đỏ chung (61–64)
        const stateMatches = configs.match(
          /(Xanh|Vàng|Đỏ chung)\s*\((\d+)–(\d+)\)/g
        );

        if (stateMatches && directionMap[direction]) {
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

              // Đặt trạng thái cho đèn của hướng hiện tại
              const lightColor =
                state === "Xanh"
                  ? "green"
                  : state === "Vàng"
                  ? "yellow"
                  : "red";
              directionMap[direction].forEach((lightId) => {
                lightStates[lightId] = lightColor;
              });

              phases.push({
                phaseId: `${direction}_${state}_${Date.now()}_${Math.random()}`,
                phaseName: `${direction} - ${state}`,
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
        const debugInfo = Object.entries(directionMap)
          .map(([dir, lights]) => `${dir}: ${lights.length} đèn`)
          .join("\n");

        alert(`Không thể parse cấu hình pattern. 
        
Thông tin debug:
${debugInfo}

Vui lòng kiểm tra:
1. Định dạng text đúng như ví dụ
2. Tên đèn có chứa từ khóa hướng hoặc đã được phân loại thủ công
3. Có ít nhất một đèn được gán cho mỗi hướng cần cấu hình`);
        return;
      }

      // Sắp xếp phases theo thời gian bắt đầu
      phases.sort((a, b) => a.startTime - b.startTime);

      setPatternConfig((prev) => ({
        ...prev,
        cycleDuration: maxTime,
        phases,
        lightDirectionMapping,
      }));

      setShowQuickSetup(false);
      alert("Đã tạo pattern thành công từ cấu hình quick setup!");
    } catch (error) {
      console.error("Error parsing quick setup:", error);
      alert("Có lỗi xảy ra khi parse cấu hình pattern!");
    }
  };

  const getQuickSetupExample = () => {
    return `Bắc: Xanh (0–58), Vàng (58–61), Đỏ chung (61–64).
Nam: Xanh (64–106), Vàng (106–109), Đỏ chung (109–112).
Đông: Xanh (112–122), Vàng (122–125), Đỏ chung (125–128).
Tây: Xanh (128–173), Vàng (173–176), Đỏ chung (176–179).`;
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

    // Tạo map hướng và đèn
    const directionMap: { [key: string]: string[] } = {
      Bắc: [],
      Nam: [],
      Đông: [],
      Tây: [],
    };

    // Phân loại đèn theo hướng
    selectedJunction.trafficLights.forEach((light) => {
      if (directionMapping[light.trafficLightId]) {
        const direction = directionMapping[light.trafficLightId];
        if (directionMap[direction]) {
          directionMap[direction].push(light.trafficLightId);
        }
      } else {
        // Auto-detect từ trường location (vị trí)
        const directionMatch = light.location.match(/hướng\s+([^\s,]+)/i);
        if (directionMatch) {
          const direction = directionMatch[1];
          if (direction === "Bắc" && directionMap["Bắc"]) {
            directionMap["Bắc"].push(light.trafficLightId);
          } else if (direction === "Nam" && directionMap["Nam"]) {
            directionMap["Nam"].push(light.trafficLightId);
          } else if (direction === "Đông" && directionMap["Đông"]) {
            directionMap["Đông"].push(light.trafficLightId);
          } else if (direction === "Tây" && directionMap["Tây"]) {
            directionMap["Tây"].push(light.trafficLightId);
          }
        }
      }
    });

    // Tạo timeline cho mỗi hướng, gộp đỏ và đỏ chung liền nhau
    const getDirectionTimelineMerged = (direction: string) => {
      const lightIds = directionMap[direction];
      if (!lightIds || lightIds.length === 0) return [];

      const sortedPhases = [...config.phases].sort(
        (a, b) => a.startTime - b.startTime
      );
      const timeline = [];
      let prev: any = null;
      for (const phase of sortedPhases) {
        const state = phase.lightStates[lightIds[0]];
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
      directionMapping,
      directionMap,
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
      <div className="bg-gray-800 p-6 rounded-lg">
        <h4 className="text-lg font-semibold mb-6 text-white">
          Dòng thời gian pha đèn trong một chu kỳ ({cycleDuration} giây) -{" "}
          {pattern.patternName}
        </h4>

        <div
          className="relative w-full"
          ref={chartRef}
        >
          {/* Direction timelines */}
          <div className="space-y-4">
            {Object.entries(directionMap).map(([direction, lightIds]) => {
              const timeline = getDirectionTimelineMerged(direction);

              return (
                <div
                  key={direction}
                  className="relative"
                >
                  <div className="text-sm text-gray-300 mb-2 font-medium">
                    Hướng {direction} ({lightIds.length} đèn)
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
                        {lightIds.length === 0
                          ? "Không có đèn được phân loại"
                          : "Không có dữ liệu timeline"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-gray-300 font-medium">Chú thích:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-300">Đèn xanh</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-gray-300">Đèn vàng</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-gray-300">Đèn đỏ</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 p-6 bg-gray-900 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-4">
          Quản lý Pattern Đèn Giao Thông
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
          Thêm Pattern Mới
        </button>
      </div>

      {/* Pattern List */}
      <div className="space-y-4">
        {filteredPatterns.map((pattern) => (
          <div
            key={pattern.patternId}
            className="bg-gray-800 p-4 rounded-lg"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
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
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                >
                  {selectedPattern?.patternId === pattern.patternId
                    ? "Ẩn"
                    : "Xem"}
                </button>
                <button
                  onClick={() => handleEdit(pattern)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded"
                >
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(pattern.patternId)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                >
                  Xóa
                </button>
              </div>
            </div>

            {selectedPattern?.patternId === pattern.patternId && (
              <GanttChart
                pattern={pattern}
                directionMapping={
                  (pattern.timingConfiguration as PatternConfig)
                    .lightDirectionMapping || {}
                }
              />
            )}
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingPattern ? "Chỉnh sửa Pattern" : "Thêm Pattern Mới"}
            </h2>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-white mb-2">Tên Pattern:</label>
                <input
                  type="text"
                  value={patternName}
                  onChange={(e) => setPatternName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-white mb-2">
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
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                  min="1"
                  required
                />
              </div>

              {/* Quick Setup Section */}
              <div className="border-t border-gray-600 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    Cấu hình nhanh Pattern
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowQuickSetup(!showQuickSetup)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                  >
                    {showQuickSetup ? "Ẩn" : "Hiện"} Quick Setup
                  </button>
                </div>

                {showQuickSetup && (
                  <div className="bg-gray-700 p-4 rounded-lg space-y-4">
                    {/* Light Direction Mapping */}
                    {selectedJunctionId && (
                      <div>
                        <h4 className="text-white font-medium mb-3">
                          Phân loại đèn theo hướng (tùy chọn):
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {junctions
                            .find((j) => j.junctionId === selectedJunctionId)
                            ?.trafficLights.map((light) => (
                              <div
                                key={light.trafficLightId}
                                className="bg-gray-600 p-3 rounded"
                              >
                                <div className="text-white text-sm mb-2">
                                  {light.lightName}
                                </div>
                                <select
                                  value={
                                    lightDirectionMapping[
                                      light.trafficLightId
                                    ] || ""
                                  }
                                  onChange={(e) =>
                                    setLightDirectionMapping((prev) => ({
                                      ...prev,
                                      [light.trafficLightId]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2 py-1 bg-gray-500 text-white border border-gray-400 rounded text-sm"
                                >
                                  <option value="">Tự động phát hiện</option>
                                  <option value="Bắc">Bắc</option>
                                  <option value="Nam">Nam</option>
                                  <option value="Đông">Đông</option>
                                  <option value="Tây">Tây</option>
                                </select>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-white mb-2 text-sm">
                        Nhập cấu hình pattern (một dòng cho mỗi hướng):
                      </label>
                      <textarea
                        value={quickSetupText}
                        onChange={(e) => setQuickSetupText(e.target.value)}
                        placeholder={getQuickSetupExample()}
                        className="w-full px-3 py-2 bg-gray-600 text-white border border-gray-500 rounded-lg text-sm font-mono"
                        rows={6}
                      />
                    </div>

                    <div className="bg-gray-600 p-3 rounded border-l-4 border-blue-500">
                      <h4 className="text-white font-medium mb-2">
                        Định dạng:
                      </h4>
                      <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap">
                        {getQuickSetupExample()}
                      </pre>
                    </div>

                    <div className="bg-yellow-800 p-3 rounded border-l-4 border-yellow-500">
                      <p className="text-yellow-200 text-sm">
                        <strong>Lưu ý:</strong> Hệ thống sẽ tự động phát hiện
                        hướng từ trường "Vị trí" của đèn (ví dụ: "Ngã tư ABC,
                        hướng Bắc"). Nếu không tự động phát hiện được, hãy phân
                        loại thủ công ở mục trên.
                      </p>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={parseQuickSetup}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
                      >
                        Áp dụng Quick Setup
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickSetupText("");
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
                  <label className="block text-white">Các pha đèn:</label>
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
                        className="bg-gray-700 p-4 rounded-lg"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className="block text-white text-sm mb-1">
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
                              className="w-full px-2 py-1 bg-gray-600 text-white border border-gray-500 rounded"
                            />
                          </div>

                          <div>
                            <label className="block text-white text-sm mb-1">
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
                              className="w-full px-2 py-1 bg-gray-600 text-white border border-gray-500 rounded"
                              min="0"
                            />
                          </div>

                          <div>
                            <label className="block text-white text-sm mb-1">
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
                              className="w-full px-2 py-1 bg-gray-600 text-white border border-gray-500 rounded"
                              min="1"
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <label className="text-white text-sm">
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
                            <div className="border-t border-gray-600 pt-4">
                              <label className="block text-white text-sm mb-2">
                                Trạng thái đèn trong pha này:
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {selectedJunction.trafficLights.map((light) => (
                                  <div
                                    key={light.trafficLightId}
                                    className="bg-gray-600 p-3 rounded"
                                  >
                                    <div className="text-white text-sm mb-2">
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
                                      className="w-full px-2 py-1 bg-gray-500 text-white border border-gray-400 rounded text-sm"
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

export default TrafficPatternManagement;
