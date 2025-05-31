"use client";

import React, { useState, useEffect, useRef } from "react";
import Map, { MapRef, Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Camera, Junction } from "../../../../types/interface";
import { mapStyles } from "../../(dashboard)/map/mapComponent/mapConstants";

interface CameraManagementProps {
  cameras: Camera[];
  setCameras: React.Dispatch<React.SetStateAction<Camera[]>>;
  junctions: Junction[];
}

export default function CameraManagement({
  cameras,
  setCameras,
  junctions,
}: CameraManagementProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [currentItem, setCurrentItem] = useState<Camera | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filterJunctionId, setFilterJunctionId] = useState<string>(""); // State for filtering by Junction
  const [formData, setFormData] = useState({
    cameraName: "",
    cameraAddress: "",
    location: "",
    latitude: "",
    longitude: "",
    junctionId: "",
    isActive: true,
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [modalMapStyle, setModalMapStyle] = useState(
    "mapbox://styles/mapbox/streets-v12"
  );
  const itemsPerPage = 10;
  const mapRef = useRef<MapRef>(null);

  // Filter cameras based on selected junction
  const filteredCameras = filterJunctionId
    ? cameras.filter((camera) => camera.junctionId === filterJunctionId)
    : cameras;

  // Fly to junction coordinates when junctionId changes in the form
  useEffect(() => {
    if (isModalOpen && formData.junctionId && mapRef.current) {
      const selectedJunction = junctions.find(
        (junction) => junction.junctionId === formData.junctionId
      );
      if (
        selectedJunction &&
        selectedJunction.latitude &&
        selectedJunction.longitude
      ) {
        mapRef.current.flyTo({
          center: [selectedJunction.longitude, selectedJunction.latitude],
          zoom: 18,
          duration: 1000, // Smooth transition duration in milliseconds
        });
      } else {
        // Reset to default coordinates if no junction is selected or coordinates are missing
        mapRef.current.flyTo({
          center: [105.7718272, 20.9813504],
          zoom: 18,
          duration: 1000,
        });
      }
    }
  }, [formData.junctionId, isModalOpen, junctions]);

  // Handle checkbox selection
  const handleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Handle select all checkboxes
  const handleSelectAll = () => {
    const currentItems = filteredCameras.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    if (selectedItems.length === currentItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentItems.map((item) => item.cameraId));
    }
  };

  // Open modal for creating a new item
  const openCreateModal = () => {
    setIsEditMode(false);
    setFormData({
      cameraName: "",
      cameraAddress: "",
      location: "",
      latitude: "",
      longitude: "",
      junctionId: "",
      isActive: true,
    });
    setModalMapStyle("mapbox://styles/mapbox/streets-v12");
    setIsModalOpen(true);
  };

  // Open modal for editing an existing item
  const openEditModal = () => {
    if (selectedItems.length !== 1) return;

    const item = cameras.find((i) => i.cameraId === selectedItems[0]);
    if (!item) return;

    setIsEditMode(true);
    setCurrentItem(item);
    setFormData({
      cameraName: item.cameraName,
      cameraAddress: item.cameraAddress,
      location: item.location,
      latitude: item.latitude?.toString() || "",
      longitude: item.longitude?.toString() || "",
      junctionId: item.junctionId || "",
      isActive: item.isActive,
    });
    setModalMapStyle("mapbox://styles/mapbox/streets-v12");
    setIsModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // Handle map click to set latitude and longitude
  const handleMapClick = (event: any) => {
    const { lng, lat } = event.lngLat;
    setFormData((prev) => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
    }));
  };

  // Handle map style change
  const handleMapStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModalMapStyle(e.target.value);
  };

  // Handle junction filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterJunctionId(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
    setSelectedItems([]); // Clear selected items when filter changes
  };

  // Handle form submission for create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = isEditMode ? "PUT" : "POST";
    const url = isEditMode
      ? `/api/cameras/${currentItem?.cameraId}`
      : `/api/cameras`;

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cameraName: formData.cameraName,
          cameraAddress: formData.cameraAddress,
          location: formData.location,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          junctionId: formData.junctionId || null,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditMode ? "update" : "create"} camera`);
      }

      const updatedItem = await response.json();
      if (isEditMode) {
        setCameras(
          cameras.map((cam) =>
            cam.cameraId === updatedItem.cameraId ? updatedItem : cam
          )
        );
      } else {
        setCameras([...cameras, updatedItem]);
      }

      setIsModalOpen(false);
      setSelectedItems([]);
    } catch (error) {
      console.error(`Error saving camera:`, error);
    }
  };

  // Handle delete selected items
  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedItems.length} selected items?`
      )
    )
      return;

    try {
      await Promise.all(
        selectedItems.map(async (id) => {
          const response = await fetch(`/api/cameras/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            throw new Error(`Failed to delete camera with ID ${id}`);
          }
        })
      );

      setCameras(
        cameras.filter((cam) => !selectedItems.includes(cam.cameraId))
      );
      setSelectedItems([]);
    } catch (error) {
      console.error(`Error deleting camera:`, error);
    }
  };

  // Pagination logic
  const totalItems = filteredCameras.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredCameras.slice(startIndex, endIndex);

  return (
    <div className="flex-1 p-6 bg-white dark:bg-gray-900 overflow-y-auto">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Danh sách camera
      </h1>

      {/* Junction Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Lọc theo nút giao:
        </label>
        <select
          value={filterJunctionId}
          onChange={handleFilterChange}
          className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Tất cả nút giao</option>
          {junctions.map((junction) => (
            <option
              key={junction.junctionId}
              value={junction.junctionId}
            >
              {junction.junctionName}
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Thêm mới
        </button>
        <button
          onClick={openEditModal}
          className={`bg-blue-600 text-white px-4 py-2 rounded transition-colors ${
            selectedItems.length !== 1
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-blue-700"
          }`}
          disabled={selectedItems.length !== 1}
        >
          Chỉnh sửa
        </button>
        <button
          onClick={handleDelete}
          className={`bg-red-600 text-white px-4 py-2 rounded transition-colors ${
            selectedItems.length === 0
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-red-700"
          }`}
          disabled={selectedItems.length === 0}
        >
          Xóa bỏ
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-600">
        <table className="w-full">
          <thead className="bg-gray-200 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedItems.length === currentItems.length &&
                    currentItems.length > 0
                  }
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                />
              </th>
              <th className="px-4 py-3 text-left text-gray-900 dark:text-white font-medium">
                #
              </th>
              <th className="px-4 py-3 text-left text-gray-900 dark:text-white font-medium">
                Tên camera
              </th>
              <th className="px-4 py-3 text-left text-gray-900 dark:text-white font-medium">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-left text-gray-900 dark:text-white font-medium">
                Vị trí
              </th>
              <th className="px-4 py-3 text-left text-gray-900 dark:text-white font-medium">
                Nút giao
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-3 text-center text-gray-700 dark:text-gray-300"
                >
                  Đang tải...
                </td>
              </tr>
            ) : currentItems.length > 0 ? (
              currentItems.map((item, index) => (
                <tr
                  key={item.cameraId}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.cameraId)}
                      onChange={() => handleSelectItem(item.cameraId)}
                      className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {startIndex + index + 1}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                    {item.cameraName}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-white ${
                        item.isActive ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      {item.isActive ? "Hoạt động" : "Không hoạt động"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {item.location}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {junctions.find((j) => j.junctionId === item.junctionId)
                      ?.junctionName || "N/A"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-3 text-center text-gray-700 dark:text-gray-300"
                >
                  Không có camera nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:text-gray-500"
          >
            {"<"}
          </button>
          <span className="px-3 py-1 text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:text-gray-500"
          >
            {">"}
          </button>
        </div>
        <span className="text-gray-700 dark:text-gray-300">
          Displaying {startIndex + 1} to {Math.min(endIndex, totalItems)} of{" "}
          {totalItems}
        </span>
      </div>

      {/* Full-Screen Modal for Create/Edit Item */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 w-full h-full flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-600 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {isEditMode ? "Sửa Camera" : "Thêm Camera"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Form Fields */}
              <div className="w-1/3 p-6 overflow-y-auto">
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-gray-300 mb-1">
                      Tên Camera
                    </label>
                    <input
                      type="text"
                      name="cameraName"
                      value={formData.cameraName}
                      onChange={handleInputChange}
                      className="w-full p-2 rounded bg-gray-700 text-gray-300 border border-gray-600 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-300 mb-1">Địa chỉ</label>
                    <input
                      type="text"
                      name="cameraAddress"
                      value={formData.cameraAddress}
                      onChange={handleInputChange}
                      className="w-full p-2 rounded bg-gray-700 text-gray-300 border border-gray-600 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-300 mb-1">Vị trí</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full p-2 rounded bg-gray-700 text-gray-300 border border-gray-600 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-300 mb-1">Kinh độ</label>
                    <input
                      type="number"
                      step="0.000001"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      className="w-full p-2 rounded bg-gray-700 text-gray-300 border border-gray-600 focus:outline-none focus:border-blue-500"
                      readOnly
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-300 mb-1">Vĩ độ</label>
                    <input
                      type="number"
                      step="0.000001"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      className="w-full p-2 rounded bg-gray-700 text-gray-300 border border-gray-600 focus:outline-none focus:border-blue-500"
                      readOnly
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-300 mb-1">Nút giao</label>
                    <select
                      name="junctionId"
                      value={formData.junctionId}
                      onChange={handleInputChange}
                      className="w-full p-2 rounded bg-gray-700 text-gray-300 border border-gray-600 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Không chọn</option>
                      {junctions.map((junction) => (
                        <option
                          key={junction.junctionId}
                          value={junction.junctionId}
                        >
                          {junction.junctionName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="flex items-center text-gray-300">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      Hoạt động
                    </label>
                  </div>
                </form>
              </div>

              {/* Map for Selecting Location */}
              <div className="w-2/3 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-gray-300">
                    Chọn vị trí trên bản đồ
                  </label>
                  <div>
                    <label className="text-gray-300 mr-2">Chế độ bản đồ</label>
                    <select
                      value={modalMapStyle}
                      onChange={handleMapStyleChange}
                      className="p-2 rounded bg-gray-700 text-gray-300 border border-gray-600 focus:outline-none focus:border-blue-500"
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
                <Map
                  ref={mapRef}
                  initialViewState={{
                    longitude: formData.longitude
                      ? parseFloat(formData.longitude)
                      : 105.7718272,
                    latitude: formData.latitude
                      ? parseFloat(formData.latitude)
                      : 20.9813504,
                    zoom: 18,
                  }}
                  style={{ width: "100%", height: "100%" }}
                  mapStyle={modalMapStyle}
                  mapboxAccessToken={
                    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
                  }
                  onClick={handleMapClick}
                >
                  {formData.latitude && formData.longitude && (
                    <Marker
                      longitude={parseFloat(formData.longitude)}
                      latitude={parseFloat(formData.latitude)}
                      color="red"
                    />
                  )}
                  <NavigationControl position="top-right" />
                </Map>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-600 flex justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="mr-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                {isEditMode ? "Cập nhật" : "Thêm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
