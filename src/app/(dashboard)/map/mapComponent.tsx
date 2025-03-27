// src/app/(components)/map/MapComponent.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Map, {
  MapRef,
  NavigationControl,
  ScaleControl,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useDashboardContext } from "@/app/(components)/client-layout";
import { MapPin } from "lucide-react";
import {
  Camera,
  CurrentLocation,
  DisplayOptions,
  Junction,
  MARKER_COLORS,
  TrafficLight,
  VMS,
} from "./mapComponent/mapConstants";
import GenericMarker from "./mapComponent/genericMarker";
import MapControls from "./mapComponent/mapControls";
import SearchBar from "./mapComponent/searchBar";

// Định nghĩa interface cho lịch sử tìm kiếm
interface SearchHistoryItem {
  name: string;
  timestamp: number; // Thời gian tìm kiếm (Unix timestamp)
}

export default function MapComponent() {
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [vmsBoards, setVmsBoards] = useState<VMS[]>([]);
  const [selectedJunction, setSelectedJunction] = useState<Junction | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showPopup, setShowPopup] = useState<any | null>(null);
  const [currentLocation, setCurrentLocation] =
    useState<CurrentLocation | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(
    () => {
      const savedHistory = localStorage.getItem("searchHistory");
      return savedHistory ? JSON.parse(savedHistory) : [];
    }
  );

  // Khởi tạo displayOptions từ localStorage
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(() =>
    JSON.parse(
      localStorage.getItem("mapDisplayOptions") ||
        '{"showJunctions":true,"showCameras":true,"showVMS":true}'
    )
  );

  // Khởi tạo mapStyle từ localStorage
  const [mapStyle, setMapStyle] = useState(
    localStorage.getItem("mapStyle") || "mapbox://styles/mapbox/streets-v12"
  );

  const mapRef = useRef<MapRef>(null);
  const { collapsed } = useDashboardContext();

  const fastAnimationOptions = {
    speed: 2.5,
    curve: 1,
  };

  // Lưu displayOptions vào localStorage
  useEffect(() => {
    localStorage.setItem("mapDisplayOptions", JSON.stringify(displayOptions));
  }, [displayOptions]);

  // Lưu mapStyle vào localStorage
  useEffect(() => {
    localStorage.setItem("mapStyle", mapStyle);
  }, [mapStyle]);

  // Lưu searchHistory vào localStorage
  useEffect(() => {
    localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  }, [searchHistory]);

  // Lấy vị trí hiện tại
  useEffect(() => {
    const getLocation = async () => {
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
              })
          );
          setCurrentLocation({
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
          });
        } catch {
          setCurrentLocation({ longitude: 105.7718272, latitude: 20.9813504 });
        }
      } else {
        setCurrentLocation({ longitude: 105.7718272, latitude: 20.9813504 });
      }
    };

    const id = setInterval(getLocation, 10000);
    getLocation();

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (mapRef.current && currentLocation) {
      mapRef.current.jumpTo({
        center: [currentLocation.longitude, currentLocation.latitude],
      });
    }
  }, [currentLocation, mapRef]);

  // Lấy dữ liệu Junction và VMS
  useEffect(() => {
    const fetchData = async () => {
      try {
        const junctionsResponse = await fetch("/api/junctions");
        if (!junctionsResponse.ok) {
          console.error("Failed to fetch junctions", junctionsResponse.status);
          return;
        }

        const junctionsData = await junctionsResponse.json();
        setJunctions(junctionsData);
      } catch (error) {
        console.error("Failed to fetch junctions", error);
      }

      try {
        const vmsResponse = await fetch("/api/vms");
        if (!vmsResponse.ok) {
          console.error("Failed to fetch VMS", vmsResponse.status);
          return;
        }

        const vmsData = await vmsResponse.json();
        setVmsBoards(vmsData);
      } catch (error) {
        console.error("Failed to fetch VMS", error);
      }
    };

    fetchData();
  }, []);

  // Resize bản đồ khi collapsed thay đổi
  useEffect(() => {
    if (mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.resize();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [collapsed]);

  useEffect(() => {
    const handleStorageChange = () => {
      const savedHistory = localStorage.getItem("searchHistory");
      setSearchHistory(savedHistory ? JSON.parse(savedHistory) : []);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Xử lý khi nhấn vào marker junction
  const handleJunctionClick = (junction: Junction) => {
    setSelectedJunction(junction);
    setShowPopup(junction);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [Number(junction.longitude), Number(junction.latitude)],
        zoom: 14,
        ...fastAnimationOptions,
      });
    }
  };

  // Xử lý khi nhấn vào marker VMS
  const handleVmsClick = (vms: VMS) => {
    setShowPopup(vms);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [Number(vms.longitude), Number(vms.latitude)],
        zoom: 14,
        ...fastAnimationOptions,
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

    let nameIndex = 0;
    for (const queryWord of queryWords) {
      const foundIndex = junctionNameLower.indexOf(queryWord, nameIndex);
      if (foundIndex === -1) return false;
      nameIndex = foundIndex + 1;
    }
    return true;
  };

  // Xử lý tìm kiếm
  const handleSearch = useCallback(
    (name: string) => {
      setSearchQuery(name);
      const junction = junctions.find((j) => j.junctionName === name);
      if (junction && mapRef.current) {
        setSelectedJunction(junction);
        setShowPopup(junction);
        mapRef.current.flyTo({
          center: [Number(junction.longitude), Number(junction.latitude)],
          zoom: 14,
          ...fastAnimationOptions,
        });
      }
    },
    [fastAnimationOptions, junctions, mapRef]
  );

  // Xử lý khi chọn một gợi ý từ dropdown (lưu vào lịch sử)
  const handleSuggestionSelect = (name: string) => {
    handleSearch(name);
    // Lưu vào lịch sử tìm kiếm
    setSearchHistory((prev) => {
      const existingIndex = prev.findIndex((item) => item.name === name);
      if (existingIndex === -1) {
        // Không có trong lịch sử, thêm vào
        return [
          { name, timestamp: Date.now() },
          ...prev.slice(0, 4), // Giới hạn 5 mục
        ];
      } else {
        // Đã có trong lịch sử, đưa lên đầu và xóa bớt
        const newHistory = [...prev];
        newHistory.splice(existingIndex, 1);
        newHistory.unshift({ name, timestamp: Date.now() });
        return newHistory;
      }
    });
  };

  // Xử lý khi nhấn nút "Xóa"
  const handleClear = useCallback(() => {
    setSearchQuery("");
    setSelectedJunction(null);
    setShowPopup(null);
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
        ...fastAnimationOptions,
      });
    }
  }, [currentLocation]);

  // Xử lý thay đổi trạng thái checkbox
  const handleDisplayOptionChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, checked } = e.target;
    setDisplayOptions((prev) => ({ ...prev, [name]: checked }));
  };

  // Xử lý thay đổi chế độ bản đồ
  const handleMapStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMapStyle(e.target.value);
  };

  // Hàm render nội dung popup cho Junction
  const renderJunctionPopup = (junction: Junction) => (
    <div className="p-2">
      <h3 className="text-lg font-bold">{junction.junctionName}</h3>
      <p>
        <strong>Location:</strong> {junction.location}
      </p>
      <p>
        <strong>Description:</strong> {junction.description || "N/A"}
      </p>
    </div>
  );

  // Hàm render nội dung popup cho VMS
  const renderVmsPopup = (vms: VMS) => (
    <div className="p-2">
      <h3 className="text-lg font-bold">{vms.vmsName}</h3>
      <p>
        <strong>Location:</strong> {vms.location}
      </p>
      <p>
        <strong>Message:</strong> {vms.message || "N/A"}
      </p>
      <p>
        <strong>Status:</strong> {vms.status}
      </p>
    </div>
  );

  // Hàm render nội dung popup rỗng
  const renderEmptyPopup = () => <></>;

  return (
    <div className="relative">
      <SearchBar
        onSearch={handleSearch}
        onClear={handleClear}
        onSuggestionSelect={handleSuggestionSelect}
        junctions={junctions}
        searchHistory={searchHistory}
      />
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 105.7718272,
          latitude: 20.9813504,
          zoom: 14,
        }}
        style={{ width: "100%", height: "94vh" }}
        mapStyle={mapStyle}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        language="vi"
      >
        {/* Marker vị trí hiện tại */}
        {currentLocation && (
          <GenericMarker<CurrentLocation>
            item={currentLocation}
            longitude={currentLocation.longitude}
            latitude={currentLocation.latitude}
            showPopup={showPopup}
            popupKey="currentLocation"
            onClosePopup={closePopup}
            renderPopupContent={renderEmptyPopup}
            isCurrentLocation={true}
          />
        )}

        {/* Hiển thị marker junction nếu được chọn */}
        {displayOptions.showJunctions &&
          filteredJunctions.map((junction) => (
            <GenericMarker<Junction>
              key={junction.junctionId}
              item={junction}
              longitude={Number(junction.longitude)}
              latitude={Number(junction.latitude)}
              color={MARKER_COLORS.JUNCTION}
              showPopup={showPopup}
              popupKey="junctionId"
              onClick={handleJunctionClick}
              onClosePopup={closePopup}
              renderPopupContent={renderJunctionPopup}
            />
          ))}

        {/* Hiển thị marker trafficlight khi chọn junction và showCameras = true */}
        {displayOptions.showCameras &&
          selectedJunction &&
          selectedJunction.trafficLights?.map((trafficLight: TrafficLight) => (
            <GenericMarker<TrafficLight>
              key={trafficLight.trafficLightId}
              item={trafficLight}
              longitude={Number(trafficLight.longitude)}
              latitude={Number(trafficLight.latitude)}
              color={MARKER_COLORS.TRAFFIC_LIGHT}
              showPopup={showPopup}
              popupKey="trafficLightId"
              onClosePopup={closePopup}
              renderPopupContent={renderEmptyPopup}
            />
          ))}

        {/* Hiển thị marker camera khi chọn junction và showCameras = true */}
        {displayOptions.showCameras &&
          selectedJunction &&
          selectedJunction.cameras?.map((camera: Camera) => (
            <GenericMarker<Camera>
              key={camera.cameraId}
              item={camera}
              longitude={Number(camera.longitude)}
              latitude={Number(camera.latitude)}
              color={MARKER_COLORS.CAMERA}
              showPopup={showPopup}
              popupKey="cameraId"
              onClosePopup={closePopup}
              renderPopupContent={renderEmptyPopup}
            />
          ))}

        {/* Hiển thị marker VMS nếu được chọn */}
        {displayOptions.showVMS &&
          vmsBoards.map((vms) => (
            <GenericMarker<VMS>
              key={vms.vmsId}
              item={vms}
              longitude={Number(vms.longitude)}
              latitude={Number(vms.latitude)}
              color={MARKER_COLORS.VMS}
              showPopup={showPopup}
              popupKey="vmsId"
              onClick={handleVmsClick}
              onClosePopup={closePopup}
              renderPopupContent={renderVmsPopup}
            />
          ))}

        {/* NavigationControl */}
        <NavigationControl position="top-right" />

        {/* Nút bay về vị trí hiện tại */}
        <div className="absolute top-28 right-2 z-10">
          <button
            onClick={flyToCurrentLocation}
            className="bg-white p-2 rounded-md shadow-md hover:bg-gray-100"
            title="Bay về vị trí hiện tại"
          >
            <MapPin className="w-5 h-5 text-blue-500" />
          </button>
        </div>

        {/* Control panel (checkbox và dropdown) */}
        <MapControls
          displayOptions={displayOptions}
          mapStyle={mapStyle}
          onDisplayOptionChange={handleDisplayOptionChange}
          onMapStyleChange={handleMapStyleChange}
        />
        <ScaleControl
          position="bottom-right"
          unit="metric"
        />
      </Map>
    </div>
  );
}
