// src/app/(components)/map/GenericMarker.tsx
import React, { JSX } from "react";
import { Marker, Popup } from "react-map-gl/mapbox";
import { MapPin } from "lucide-react";

interface GenericMarkerProps<T> {
  item: T;
  longitude: number;
  latitude: number;
  color?: string; // Màu sắc của marker (không bắt buộc nếu là vị trí hiện tại)
  showPopup?: any; // Có hiển thị popup không
  popupKey?: string; // Key để xác định popup (ví dụ: junctionId, vmsId)
  onClick?: (item: T) => void; // Sự kiện click
  onClosePopup?: () => void; // Đóng popup
  renderPopupContent?: (item: T) => JSX.Element; // Hàm render nội dung popup
  isCurrentLocation?: boolean; // Xác định marker có phải là vị trí hiện tại không
}

export default function GenericMarker<T>({
  item,
  longitude,
  latitude,
  color,
  showPopup,
  popupKey,
  onClick,
  onClosePopup,
  renderPopupContent,
  isCurrentLocation = false,
}: GenericMarkerProps<T>) {
  return (
    <>
      <Marker
        longitude={longitude}
        latitude={latitude}
        color={isCurrentLocation ? undefined : color} // Không dùng color nếu là vị trí hiện tại
        onClick={onClick ? () => onClick(item) : undefined}
        anchor="bottom"
      >
        {isCurrentLocation ? (
          <div className="relative">
            <MapPin
              className="w-8 h-8 text-blue-500"
              strokeWidth={2}
            />
            <div className="absolute top-0 left-0 w-8 h-8 rounded-full bg-blue-500 opacity-30 animate-ping" />
          </div>
        ) : null}
      </Marker>
      {showPopup && popupKey && renderPopupContent && onClosePopup && (
        <Popup
          longitude={longitude}
          latitude={latitude}
          onClose={onClosePopup}
          closeOnClick={false}
          anchor="top"
        >
          {renderPopupContent(item)}
        </Popup>
      )}
    </>
  );
}
