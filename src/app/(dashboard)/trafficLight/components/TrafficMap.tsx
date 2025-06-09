import React from "react";
import Map, { MapRef, Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Junction, TrafficLight } from "../../../../../types/interface";
import { TrafficLightState } from "../types";
import { getMarkerColor } from "../utils";

interface Props {
  selectedJunction: Junction | null;
  mapRef: React.RefObject<MapRef>;
  trafficLightState: TrafficLightState | null;
}

export default function TrafficMap({
  selectedJunction,
  mapRef,
  trafficLightState,
}: Props) {
  if (!selectedJunction) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-gray-400">Chọn một nút giao để xem bản đồ</p>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: Number(selectedJunction.longitude),
        latitude: Number(selectedJunction.latitude),
        zoom: 19,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/outdoors-v12"
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
      language="vi"
    >
      {selectedJunction.trafficLights.map(
        (trafficLight: TrafficLight, index: number) => {
          const displayName =
            trafficLight.lightName.length > 12
              ? trafficLight.lightName.substring(0, 12) + "..."
              : trafficLight.lightName;

          const markerColor = getMarkerColor(
            trafficLight.lightName,
            trafficLight.trafficLightId,
            trafficLightState
          );

          return (
            <Marker
              key={trafficLight.trafficLightId}
              longitude={Number(trafficLight.longitude)}
              latitude={Number(trafficLight.latitude)}
              anchor="bottom"
            >
              <div
                className="relative cursor-pointer hover:scale-110 transition-all duration-300"
                title={`${trafficLight.lightName}\nID: ${trafficLight.trafficLightId}\nTrạng thái: ${markerColor.state}\nVị trí: ${trafficLight.location}`}
              >
                {/* Speech Bubble Rectangle */}
                <div
                  className={`${markerColor.bg} text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg text-center min-w-[60px] max-w-[120px] break-words border-2 border-white transition-colors duration-300`}
                >
                  {displayName}
                </div>
                {/* Speech Bubble Pointer (Triangle) */}
                <div
                  className={`absolute left-1/2 transform -translate-x-1/2 bottom-[-6px] w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent ${markerColor.border}`}
                />

                {/* State indicator dot */}
                <div
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${markerColor.bg} border border-white shadow-sm`}
                ></div>
              </div>
            </Marker>
          );
        }
      )}
    </Map>
  );
}
