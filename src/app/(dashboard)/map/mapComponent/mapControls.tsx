// src/app/(components)/map/MapControls.tsx
import React from "react";
import { DisplayOptions, mapStyles } from "./mapConstants";

interface MapControlsProps {
  displayOptions: DisplayOptions;
  mapStyle: string;
  onDisplayOptionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMapStyleChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export default function MapControls({
  displayOptions,
  mapStyle,
  onDisplayOptionChange,
  onMapStyleChange,
}: MapControlsProps) {
  return (
    <div className="absolute bottom-8 left-4 bg-white p-4 rounded-lg shadow-md z-10">
      {/* Checkbox để chọn hiển thị */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Hiển thị trên bản đồ
        </h3>
        <div className="flex flex-col gap-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="showJunctions"
              checked={displayOptions.showJunctions}
              onChange={onDisplayOptionChange}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Nút giao</span>
          </label>
        </div>
      </div>

      {/* Dropdown để chọn chế độ bản đồ */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Chế độ bản đồ
        </h3>
        <select
          value={mapStyle}
          onChange={onMapStyleChange}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        >
          {mapStyles.map((style) => (
            <option
              key={style.value}
              value={style.value}
            >
              {style.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
