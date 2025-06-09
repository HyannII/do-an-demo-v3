import React from "react";
import { Junction } from "../../../../../types/interface";

interface Props {
  junctions: Junction[];
  filteredJunctions: Junction[];
  selectedJunction: Junction | null;
  searchQuery: string;
  loading: boolean;
  onJunctionSelect: (junction: Junction) => void;
  onSearchChange: (query: string) => void;
}

export default function JunctionList({
  junctions,
  filteredJunctions,
  selectedJunction,
  searchQuery,
  loading,
  onJunctionSelect,
  onSearchChange,
}: Props) {
  return (
    <div className="w-1/2 border-r border-gray-200 dark:border-gray-600 p-4 overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Danh sách nút giao
        </h2>
        {/* Search Bar */}
        <div className="w-[60%]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm nút giao..."
            className="w-full px-3 py-2 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 placeholder-gray-500"
          />
        </div>
      </div>
      <div className="h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar">
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
                onClick={() => onJunctionSelect(junction)}
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
  );
}
