"use client";

import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./mapComponent"), {
  ssr: false,
  loading: () => <div>Loading map...</div>,
});

export default function MapPage() {
  return (
    <div className="w-full h-full">
      <MapComponent />
    </div>
  );
}
