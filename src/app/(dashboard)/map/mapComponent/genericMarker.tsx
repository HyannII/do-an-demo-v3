// src/app/(components)/map/GenericMarker.tsx
import React from "react";
import { Marker, Popup } from "react-map-gl/mapbox";
import { MapPin } from "lucide-react";

interface GenericMarkerProps<T> {
  item: T;
  longitude: number;
  latitude: number;
  color?: string;
  showPopup?: boolean;
  popupKey?: string;
  onClick?: (item: T) => void;
  onClosePopup?: () => void;
  renderPopupContent?: (item: T) => React.JSX.Element;
  isCurrentLocation?: boolean;
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
        color={isCurrentLocation ? undefined : color}
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
