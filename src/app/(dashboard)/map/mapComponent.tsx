"use client"; // Đánh dấu đây là component phía client

import React, { useEffect, useRef, useState, useCallback } from "react";
import Map, {
  MapRef,
  Marker,
  NavigationControl,
  Popup,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import SearchBar from "./searchBar";
import { useDashboardContext } from "@/app/(components)/client-layout";
import { MapPin } from "lucide-react";

export default function MapComponent() {
  const [junctions, setJunctions] = useState<any[]>([]);
  const [selectedJunction, setSelectedJunction] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showPopup, setShowPopup] = useState<any | null>(null); // State để quản lý popup
  const [currentLocation, setCurrentLocation] = useState<{
    longitude: number;
    latitude: number;
  } | null>(null); // State để lưu vị trí hiện tại

  const mapRef = useRef<MapRef>(null);
  const { collapsed } = useDashboardContext(); // Lấy trạng thái collapsed từ context

  // Animation options for faster flyTo
  const fastAnimationOptions = {
    speed: 2.5, // Tăng tốc độ (mặc định là 1.2)
    curve: 1, // Giảm độ cong (mặc định là 1.42), làm cho animation trực tiếp hơn
  };

  // Lấy vị trí hiện tại khi component được mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords: { longitude, latitude } }) =>
          setCurrentLocation({ longitude, latitude }),
        () =>
          setCurrentLocation({ longitude: 105.7718272, latitude: 20.9813504 }),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setCurrentLocation({ longitude: 105.7718272, latitude: 20.9813504 });
    }
  }, []);

  useEffect(() => {
    if (mapRef.current && currentLocation) {
      mapRef.current.flyTo({
        center: [currentLocation.longitude, currentLocation.latitude],
        zoom: 10,
        ...fastAnimationOptions,
      });
    }
  }, [currentLocation, mapRef]);

  // Lấy dữ liệu junction khi component được mount
  useEffect(() => {
    const fetchJunctions = async () => {
      const controller = new AbortController();
      const signal = controller.signal;
      const response = await fetch("/api/junctions", { signal });
      if (!response.ok) {
        throw new Error("Failed to fetch junctions");
      }
      const data = await response.json();
      setJunctions(data);
      controller.abort(); // Abort the request if it's still pending
    };

    fetchJunctions();
  }, []);

  // Resize bản đồ khi collapsed thay đổi
  useEffect(() => {
    if (mapRef.current) {
      // Đợi transition hoàn tất (300ms, khớp với duration-300 trong CSS)
      const timer = setTimeout(() => {
        mapRef.current?.resize();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [collapsed]);

  // Xử lý khi nhấn vào marker junction
  const handleJunctionClick = (junction: any) => {
    setSelectedJunction(junction);
    setShowPopup(junction); // Hiển thị popup cho junction được chọn
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [Number(junction.longitude), Number(junction.latitude)],
        zoom: 14,
        ...fastAnimationOptions, // Áp dụng animation nhanh
      });
    }
  };

  // Đóng popup
  const closePopup = () => {
    setShowPopup(null);
  };

  // Fast junction name matching
  const matchesQuery = (junctionName: string, query: string): boolean => {
    const junctionNameLower = junctionName.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    const nameWords = junctionNameLower.split(/\s+/);

    let nameIndex = 0;
    for (const queryWord of queryWords) {
      nameIndex = nameWords.findIndex(
        (nameWord, index) =>
          index >= nameIndex && nameWord.startsWith(queryWord)
      );
      if (nameIndex === -1) return false;
      nameIndex++;
    }
    return true;
  };

  // Xử lý tìm kiếm (khi chọn gợi ý từ autocomplete)
  const handleSearch = useCallback(
    (name: string) => {
      setSearchQuery(name);
      const junction = junctions.find((j) => j.junctionName === name); // Tìm junction dựa trên tên chính xác
      if (junction && mapRef.current) {
        setSelectedJunction(junction);
        setShowPopup(junction); // Hiển thị popup khi tìm kiếm
        mapRef.current.flyTo({
          center: [Number(junction.longitude), Number(junction.latitude)],
          zoom: 14,
          ...fastAnimationOptions, // Áp dụng animation nhanh
        });
      }
    },
    [fastAnimationOptions, junctions, mapRef]
  );

  // Xử lý khi nhấn nút "Xóa"
  const handleClear = useCallback(() => {
    setSearchQuery(""); // Xóa từ khóa tìm kiếm
    setSelectedJunction(null); // Xóa junction được chọn
    setShowPopup(null); // Đóng popup
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: currentLocation
          ? [currentLocation.longitude, currentLocation.latitude]
          : [105.7718272, 20.9813504],
        zoom: currentLocation ? 14 : 10,
      });
    }
  }, [currentLocation, mapRef]);

  // Lọc junction dựa trên từ khóa tìm kiếm
  const filteredJunctions = junctions.filter((junction) => {
    if (!searchQuery) return true;
    return matchesQuery(junction.junctionName, searchQuery);
  });

  // Hàm bay về vị trí hiện tại
  const flyToCurrentLocation = useCallback(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [currentLocation.longitude, currentLocation.latitude],
        zoom: 14,
        ...fastAnimationOptions, // Áp dụng animation nhanh
      });
    }
  }, [currentLocation]);

  return (
    <div className="relative">
      <SearchBar
        onSearch={handleSearch}
        onClear={handleClear}
        junctions={junctions}
      />
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 105.7718272, // Giá trị ban đầu, sẽ được ghi đè bởi vị trí GPS
          latitude: 20.9813504,
          zoom: 10,
        }}
        style={{ width: "100%", height: "100vh" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        language="vi"
      >
        {/* Marker cho vị trí hiện tại */}
        {currentLocation && (
          <Marker
            longitude={currentLocation.longitude}
            latitude={currentLocation.latitude}
            anchor="bottom"
          >
            <div className="relative">
              <MapPin
                className="w-8 h-8 text-blue-500"
                strokeWidth={2}
              />
              <div className="absolute top-0 left-0 w-8 h-8 rounded-full bg-blue-500 opacity-30 animate-ping" />
            </div>
          </Marker>
        )}

        {/* Hiển thị tất cả marker junction */}
        {filteredJunctions.map((junction) => (
          <React.Fragment key={junction.junctionId}>
            <Marker
              longitude={Number(junction.longitude)}
              latitude={Number(junction.latitude)}
              onClick={() => handleJunctionClick(junction)}
              color="red" // Biểu tượng pin màu đỏ cho junction
            />
            {/* Hiển thị popup khi marker được chọn */}
            {showPopup && showPopup.junctionId === junction.junctionId && (
              <Popup
                longitude={Number(junction.longitude)}
                latitude={Number(junction.latitude)}
                onClose={closePopup}
                closeOnClick={false}
                anchor="top"
              >
                <div className="p-2">
                  <h3 className="text-lg font-bold">{junction.junctionName}</h3>
                  <p>
                    <strong>Location:</strong> {junction.location}
                  </p>
                  <p>
                    <strong>Description:</strong>{" "}
                    {junction.description || "N/A"}
                  </p>
                </div>
              </Popup>
            )}
          </React.Fragment>
        ))}

        {/* Hiển thị marker trafficlight khi chọn junction */}
        {selectedJunction &&
          selectedJunction.trafficLights.map((trafficLight: any) => (
            <Marker
              key={trafficLight.trafficLightId}
              longitude={Number(trafficLight.longitude)}
              latitude={Number(trafficLight.latitude)}
              color="green" // Biểu tượng pin màu xanh cho trafficlight
            />
          ))}

        {/* Hiển thị marker camera khi chọn junction */}
        {selectedJunction &&
          selectedJunction.cameras.map((camera: any) => (
            <Marker
              key={camera.cameraId}
              longitude={Number(camera.longitude)}
              latitude={Number(camera.latitude)}
              color="blue" // Biểu tượng pin màu xanh dương cho camera
            />
          ))}

        {/* NavigationControl chỉ hiển thị các nút mặc định */}
        <NavigationControl position="top-right" />

        {/* Nút tùy chỉnh để bay về vị trí hiện tại */}
        <div className="absolute top-28 right-2 z-10">
          <button
            onClick={flyToCurrentLocation}
            className="bg-white p-2 rounded-md shadow-md hover:bg-gray-100"
            title="Bay về vị trí hiện tại"
          >
            <MapPin className="w-5 h-5 text-blue-500" />
          </button>
        </div>
      </Map>
    </div>
  );
}
