// src/app/(dashboard)/settings/page.tsx
"use client";

import React, { useState } from "react";

const defaultVehicles = {
  Bắc: { xe_con: 0, xe_may: 0, xe_tai: 0, xe_khach: 0 },
  Nam: { xe_con: 0, xe_may: 0, xe_tai: 0, xe_khach: 0 },
  Đông: { xe_con: 0, xe_may: 0, xe_tai: 0, xe_khach: 0 },
  Tây: { xe_con: 0, xe_may: 0, xe_tai: 0, xe_khach: 0 },
};

const defaultTimingParams = {
  minCycleTime: 60, // x - Thời gian chu kỳ tối thiểu (giây)
  adjustmentFactor: 0.5, // a - Hệ số điều chỉnh (giây/PCU)
  minGreenTime: 10, // y - Thời gian đèn xanh tối thiểu cho mỗi pha (giây)
  yellowTime: 3, // Thời gian vàng cho mỗi pha (giây)
  allRedTime: 3, // Thời gian đỏ toàn phần sau mỗi pha (giây)
};

const vehicleLabels = {
  xe_con: "Xe con",
  xe_may: "Xe máy",
  xe_tai: "Xe tải",
  xe_khach: "Xe khách",
};

function calculateTiming(vehicles: any, timingParams: any) {
  // Constants
  const PCU = { xe_con: 1.0, xe_may: 0.17, xe_tai: 1.48, xe_khach: 3.7 };
  const x = timingParams.minCycleTime;
  const a = timingParams.adjustmentFactor;
  const y = timingParams.minGreenTime;
  const yellow_time = timingParams.yellowTime;
  const all_red_time = timingParams.allRedTime;
  const num_phases = 4;

  // 1. Congestion
  const congestion: Record<string, number> = {};
  Object.entries(vehicles).forEach(([dir, counts]: any) => {
    congestion[dir] =
      (counts.xe_con || 0) * PCU.xe_con +
      (counts.xe_may || 0) * PCU.xe_may +
      (counts.xe_tai || 0) * PCU.xe_tai +
      (counts.xe_khach || 0) * PCU.xe_khach;
  });
  console.log("Hệ số ùn tắc (PCU):", congestion);
  const total_congestion = Object.values(congestion).reduce((a, b) => a + b, 0);
  console.log("Tổng hệ số ùn tắc:", total_congestion);

  // 2. Cycle time
  const C = Math.ceil(Math.max(x, a * total_congestion));
  console.log("Thời gian chu kỳ:", C);

  // 3. Lost time
  const L = (yellow_time + all_red_time) * num_phases;
  console.log("Thời gian mất mát:", L);

  // 4. Total green
  const total_green_time = C - L;
  console.log("Tổng thời gian đèn xanh:", total_green_time);

  // 5. Allocate green
  const preliminary_green: Record<string, number> = {};
  const rounded_green: Record<string, number> = {};
  const sumCong = Object.values(congestion).reduce((a, b) => a + b, 0);
  Object.entries(congestion).forEach(([dir, Ci]) => {
    const prop = sumCong ? Ci / sumCong : 0.25;
    preliminary_green[dir] = Math.max(y, prop * total_green_time);
    rounded_green[dir] = Math.round(preliminary_green[dir]);
  });
  console.log("Thời gian đèn xanh sơ bộ:", preliminary_green);
  console.log("Thời gian đèn xanh làm tròn:", rounded_green);

  // 6. Adjust green
  let total_rounded = Object.values(rounded_green).reduce((a, b) => a + b, 0);
  let excess = total_rounded - total_green_time;
  let final_green = { ...rounded_green };
  if (excess > 0) {
    const adjustable = Object.fromEntries(
      Object.entries(final_green).filter(([_, g]) => g > y)
    );
    const total_adjustable = Object.values(adjustable).reduce(
      (a, b) => a + b,
      0
    );
    let reductions: Record<string, number> = {};
    let reductionFractions: [string, number][] = [];
    Object.entries(adjustable).forEach(([dir, g]) => {
      const rawReduction = excess * (g / total_adjustable);
      reductions[dir] = Math.floor(rawReduction);
      reductionFractions.push([dir, rawReduction - Math.floor(rawReduction)]);
    });
    let remaining =
      excess - Object.values(reductions).reduce((a, b) => a + b, 0);
    if (remaining > 0) {
      // Sắp xếp theo phần thập phân giảm dần
      reductionFractions.sort((a, b) => b[1] - a[1]);
      for (let i = 0; i < Math.min(remaining, reductionFractions.length); i++) {
        reductions[reductionFractions[i][0]] += 1;
      }
    }
    Object.entries(reductions).forEach(([dir, red]) => {
      final_green[dir] -= red;
    });
  }
  console.log("Thời gian đèn xanh cuối cùng:", final_green);

  // 7. Format phases
  const phase_order = ["Bắc", "Nam", "Đông", "Tây"];
  let current_time = 0;
  let result: string[] = [];
  for (const dir of phase_order) {
    const green = final_green[dir];
    const yellow_start = current_time + green;
    const yellow_end = yellow_start + yellow_time;
    const all_red_end = yellow_end + all_red_time;
    result.push(
      `${dir}: Xanh (${current_time}–${yellow_start}), Vàng (${yellow_start}–${yellow_end}), Đỏ chung (${yellow_end}–${all_red_end}).`
    );
    current_time = all_red_end;
  }
  console.log("Kết quả cấu hình pha đèn:", result);
  return result;
}

export default function SettingsPage() {
  const [tab, setTab] = useState<"account" | "timing">("account");
  const [vehicles, setVehicles] = useState<any>(defaultVehicles);
  const [timingParams, setTimingParams] = useState<any>(defaultTimingParams);
  const [result, setResult] = useState<string[]>([]);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-600 p-4">
        <h2 className="text-lg font-bold text-white mb-4">Cài đặt hệ thống</h2>
        <ul>
          <li
            className={`p-2 cursor-pointer rounded mb-2 ${
              tab === "account"
                ? "bg-blue-900/30 text-blue-400"
                : "text-white hover:bg-gray-700"
            } transition-colors`}
            onClick={() => setTab("account")}
          >
            Cài đặt tài khoản
          </li>
          <li
            className={`p-2 cursor-pointer rounded ${
              tab === "timing"
                ? "bg-blue-900/30 text-blue-400"
                : "text-white hover:bg-gray-700"
            } transition-colors`}
            onClick={() => setTab("timing")}
          >
            Tính toán thời gian đèn
          </li>
        </ul>
      </div>
      {/* Main Content */}
      <div className="flex-1 p-6 bg-gray-900 overflow-y-auto">
        {tab === "account" && (
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Cài đặt tài khoản
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Đây là trang cài đặt. Bạn có thể thêm các tùy chọn cài đặt tại
              đây.
            </p>
          </div>
        )}
        {tab === "timing" && (
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Tính toán thời gian đèn dựa trên số lượng phương tiện
            </h2>
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                setResult(calculateTiming(vehicles, timingParams));
              }}
            >
              {/* Section: Số lượng phương tiện */}
              <div className="border-b border-gray-200 dark:border-gray-600 pb-6">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                  Số lượng phương tiện theo hướng
                </h3>
                <div className="space-y-4">
                  {Object.keys(vehicles).map((dir) => (
                    <div
                      key={dir}
                      className="grid grid-cols-5 gap-4 items-center"
                    >
                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                        {dir}
                      </div>
                      {Object.keys(vehicleLabels).map((type) => (
                        <div key={type}>
                          <label className="block text-xs text-gray-500 mb-1">
                            {vehicleLabels[type]}
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={vehicles[dir][type]}
                            onChange={(e) =>
                              setVehicles((prev: any) => ({
                                ...prev,
                                [dir]: {
                                  ...prev[dir],
                                  [type]: parseInt(e.target.value) || 0,
                                },
                              }))
                            }
                            className="w-20 px-2 py-1 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section: Tham số tính toán */}
              <div className="pb-6">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                  Tham số tính toán thời gian đèn
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Điều chỉnh các tham số dưới đây để tối ưu hóa thuật toán tính
                  toán thời gian đèn giao thông
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Thời gian chu kỳ tối thiểu (x) - giây
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Thời gian chu kỳ tối thiểu cho một chu kỳ đèn hoàn chỉnh
                    </p>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={timingParams.minCycleTime}
                      onChange={(e) =>
                        setTimingParams((prev: any) => ({
                          ...prev,
                          minCycleTime: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Hệ số điều chỉnh (a) - giây/PCU
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Hệ số tính toán chu kỳ dựa trên mật độ giao thông (PCU)
                    </p>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={timingParams.adjustmentFactor}
                      onChange={(e) =>
                        setTimingParams((prev: any) => ({
                          ...prev,
                          adjustmentFactor: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Thời gian đèn xanh tối thiểu cho mỗi pha (y) - giây
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Thời gian đèn xanh tối thiểu để đảm bảo an toàn giao thông
                    </p>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={timingParams.minGreenTime}
                      onChange={(e) =>
                        setTimingParams((prev: any) => ({
                          ...prev,
                          minGreenTime: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Thời gian vàng cho mỗi pha - giây
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Thời gian đèn vàng cảnh báo trước khi chuyển sang đỏ
                    </p>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={timingParams.yellowTime}
                      onChange={(e) =>
                        setTimingParams((prev: any) => ({
                          ...prev,
                          yellowTime: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Thời gian đỏ toàn phần sau mỗi pha - giây
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Thời gian tất cả đèn đỏ để đảm bảo khoảng trống an toàn
                      khi chuyển pha
                    </p>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={timingParams.allRedTime}
                      onChange={(e) =>
                        setTimingParams((prev: any) => ({
                          ...prev,
                          allRedTime: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Tính toán thời gian đèn
                </button>
                <button
                  type="button"
                  onClick={() => setTimingParams(defaultTimingParams)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Reset về mặc định
                </button>
              </div>
            </form>
            {result.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                  Kết quả cấu hình pha đèn:
                </h3>
                <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
                  {result.join("\n")}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
