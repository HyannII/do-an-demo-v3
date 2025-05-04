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
} from "./mapComponent/mapConstants";
import GenericMarker from "./mapComponent/genericMarker";
import MapControls from "./mapComponent/mapControls";
import SearchBar from "./mapComponent/searchBar";
import Link from "next/link";

// Định nghĩa interface cho lịch sử tìm kiếm
interface SearchHistoryItem {
  name: string;
  timestamp: number; // Thời gian tìm kiếm (Unix timestamp)
}

// Định nghĩa interface cho trạng thái popup
interface PopupState {
  id: string; // Unique ID của item (junctionId, trafficLightId, cameraId, etc.)
  type: "junction" | "trafficLight" | "camera" | "currentLocation"; // Loại item
}

export default function MapComponent() {
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [selectedJunction, setSelectedJunction] = useState<Junction | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showPopup, setShowPopup] = useState<PopupState | null>(null); // Thay đổi showPopup để lưu ID và type
  const [currentLocation, setCurrentLocation] =
    useState<CurrentLocation | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(
    () => {
      const savedHistory = localStorage.getItem("searchHistory");
      return savedHistory ? JSON.parse(savedHistory) : [];
    }
  );

  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(() =>
    JSON.parse(
      localStorage.getItem("mapDisplayOptions") ||
        '{"showJunctions":true,"showCameras":true}'
    )
  );

  const [mapStyle, setMapStyle] = useState(
    localStorage.getItem("mapStyle") || "mapbox://styles/mapbox/streets-v12"
  );

  const mapRef = useRef<MapRef>(null);
  const { collapsed } = useDashboardContext();

  const fastAnimationOptions = {
    speed: 2.5,
    curve: 1,
  };

  useEffect(() => {
    localStorage.setItem("mapDisplayOptions", JSON.stringify(displayOptions));
  }, [displayOptions]);

  useEffect(() => {
    localStorage.setItem("mapStyle", mapStyle);
  }, [mapStyle]);

  useEffect(() => {
    localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  }, [searchHistory]);

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

    getLocation();
  }, []);

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
    };

    fetchData();
  }, []);

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

  const handleJunctionClick = (junction: Junction) => {
    setSelectedJunction(junction);
    setShowPopup({ id: junction.junctionId, type: "junction" }); // Chỉ lưu ID và type
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [Number(junction.longitude), Number(junction.latitude)],
        zoom: 14,
        ...fastAnimationOptions,
      });
    }
  };

  const handleTrafficLightClick = (trafficLight: TrafficLight) => {
    setShowPopup({ id: trafficLight.trafficLightId, type: "trafficLight" });
  };

  const handleCameraClick = (camera: Camera) => {
    setShowPopup({ id: camera.cameraId, type: "camera" });
  };

  const handleCurrentLocationClick = () => {
    setShowPopup({ id: "currentLocation", type: "currentLocation" });
  };

  const closePopup = () => {
    setShowPopup(null);
  };

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

  const handleSearch = useCallback(
    (name: string) => {
      setSearchQuery(name);
      const junction = junctions.find((j) => j.junctionName === name);
      if (junction && mapRef.current) {
        setSelectedJunction(junction);
        setShowPopup({ id: junction.junctionId, type: "junction" });
        mapRef.current.flyTo({
          center: [Number(junction.longitude), Number(junction.latitude)],
          zoom: 14,
          ...fastAnimationOptions,
        });
      }
    },
    [fastAnimationOptions, junctions, mapRef]
  );

  const handleSuggestionSelect = (name: string) => {
    handleSearch(name);
    setSearchHistory((prev) => {
      const existingIndex = prev.findIndex((item) => item.name === name);
      if (existingIndex === -1) {
        return [{ name, timestamp: Date.now() }, ...prev.slice(0, 4)];
      } else {
        const newHistory = [...prev];
        newHistory.splice(existingIndex, 1);
        newHistory.unshift({ name, timestamp: Date.now() });
        return newHistory;
      }
    });
  };

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

  const filteredJunctions = junctions.filter((junction) => {
    if (!searchQuery) return true;
    return matchesQuery(junction.junctionName, searchQuery);
  });

  const flyToCurrentLocation = useCallback(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [currentLocation.longitude, currentLocation.latitude],
        zoom: 14,
        ...fastAnimationOptions,
      });
    }
  }, [currentLocation]);

  const handleDisplayOptionChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, checked } = e.target;
    setDisplayOptions((prev) => ({ ...prev, [name]: checked }));
  };

  const handleMapStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMapStyle(e.target.value);
  };

  const renderJunctionPopup = (junction: Junction) => (
    <div className="p-2">
      <h3 className="text-lg font-bold">{junction.junctionName}</h3>
      <p>
        <strong>Location:</strong> {junction.location}
      </p>
      <Link href={`/liveCamera`}>
        <button className="w-full mt-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
          Xem camera
        </button>
      </Link>
      <Link href={`/trafficLight`}>
        <button className="w-full mt-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
          Xem đèn giao thông
        </button>
      </Link>
    </div>
  );

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
        {currentLocation && (
          <GenericMarker<CurrentLocation>
            item={currentLocation}
            longitude={currentLocation.longitude}
            latitude={currentLocation.latitude}
            showPopup={
              showPopup?.id === "currentLocation" &&
              showPopup?.type === "currentLocation"
            }
            popupKey="currentLocation"
            onClick={handleCurrentLocationClick}
            onClosePopup={closePopup}
            renderPopupContent={renderEmptyPopup}
            isCurrentLocation={true}
          />
        )}

        {displayOptions.showJunctions &&
          filteredJunctions.map((junction) => (
            <GenericMarker<Junction>
              key={junction.junctionId}
              item={junction}
              longitude={Number(junction.longitude)}
              latitude={Number(junction.latitude)}
              color={MARKER_COLORS.JUNCTION}
              showPopup={
                showPopup?.id === junction.junctionId &&
                showPopup?.type === "junction"
              }
              popupKey="junctionId"
              onClick={handleJunctionClick}
              onClosePopup={closePopup}
              renderPopupContent={renderJunctionPopup}
            />
          ))}

        {displayOptions.showCameras &&
          selectedJunction &&
          selectedJunction.trafficLights?.map((trafficLight: TrafficLight) => (
            <GenericMarker<TrafficLight>
              key={trafficLight.trafficLightId}
              item={trafficLight}
              longitude={Number(trafficLight.longitude)}
              latitude={Number(trafficLight.latitude)}
              color={MARKER_COLORS.TRAFFIC_LIGHT}
              showPopup={
                showPopup?.id === trafficLight.trafficLightId &&
                showPopup?.type === "trafficLight"
              }
              popupKey="trafficLightId"
              onClick={handleTrafficLightClick}
              onClosePopup={closePopup}
              renderPopupContent={renderEmptyPopup}
            />
          ))}

        {displayOptions.showCameras &&
          selectedJunction &&
          selectedJunction.cameras?.map((camera: Camera) => (
            <GenericMarker<Camera>
              key={camera.cameraId}
              item={camera}
              longitude={Number(camera.longitude)}
              latitude={Number(camera.latitude)}
              color={MARKER_COLORS.CAMERA}
              showPopup={
                showPopup?.id === camera.cameraId &&
                showPopup?.type === "camera"
              }
              popupKey="cameraId"
              onClick={handleCameraClick}
              onClosePopup={closePopup}
              renderPopupContent={renderEmptyPopup}
            />
          ))}

        <NavigationControl position="top-right" />

        <div className="absolute top-28 right-2 z-10">
          <button
            onClick={flyToCurrentLocation}
            className="bg-white p-2 rounded-md shadow-md hover:bg-gray-100"
            title="Bay về vị trí hiện tại"
          >
            <MapPin className="w-5 h-5 text-blue-500" />
          </button>
        </div>

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
