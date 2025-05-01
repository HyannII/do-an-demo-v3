"use client";

import React, { useState, useEffect, useRef } from "react";
import Map, { MapRef, Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Camera, Junction } from "../../../../types/interface";
import { mapStyles } from "../../(dashboard)/map/mapComponent/mapConstants";

interface JunctionManagementProps {
  junctions: Junction[];
  setJunctions: React.Dispatch<React.SetStateAction<Junction[]>>;
}

export default function JunctionManagement({
  junctions,
  setJunctions,
}: JunctionManagementProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [currentItem, setCurrentItem] = useState<Junction | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    junctionName: "",
    location: "",
    latitude: "",
    longitude: "",
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [modalMapStyle, setModalMapStyle] = useState(
    "mapbox://styles/mapbox/streets-v12"
  );
  const itemsPerPage = 10;
  const mapRef = useRef<MapRef>(null);

  // Handle checkbox selection
  const handleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Handle select all checkboxes
  const handleSelectAll = () => {
    const currentItems = junctions.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    if (selectedItems.length === currentItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentItems.map((item) => item.junctionId));
    }
  };

  // Open modal for creating a new item
  const openCreateModal = () => {
    setIsEditMode(false);
    setFormData({
      junctionName: "",
      location: "",
      latitude: "",
      longitude: "",
    });
    setModalMapStyle("mapbox://styles/mapbox/streets-v12");
    setIsModalOpen(true);
  };

  // Open modal for editing an existing item
  const openEditModal = () => {
    if (selectedItems.length !== 1) return;

    const item = junctions.find((i) => i.junctionId === selectedItems[0]);
    if (!item) return;

    setIsEditMode(true);
    setCurrentItem(item);
    setFormData({
      junctionName: item.junctionName,
      location: item.location,
      latitude: item.latitude?.toString() || "",
      longitude: item.longitude?.toString() || "",
    });
    setModalMapStyle("mapbox://styles/mapbox/streets-v12");
    setIsModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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

  // Handle form submission for create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = isEditMode ? "PUT" : "POST";
    const url = isEditMode
      ? `/api/junctions/${currentItem?.junctionId}`
      : `/api/junctions`;

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          junctionName: formData.junctionName,
          location: formData.location,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to ${isEditMode ? "update" : "create"} junction`
        );
      }

      const updatedItem = await response.json();
      if (isEditMode) {
        setJunctions(
          junctions.map((j) =>
            j.junctionId === updatedItem.junctionId ? updatedItem : j
          )
        );
      } else {
        setJunctions([...junctions, updatedItem]);
      }

      setIsModalOpen(false);
      setSelectedItems([]);
    } catch (error) {
      console.error(`Error saving junction:`, error);
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
          const response = await fetch(`/api/junctions/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            throw new Error(`Failed to delete junction with ID ${id}`);
          }
        })
      );

      setJunctions(
        junctions.filter((j) => !selectedItems.includes(j.junctionId))
      );
      setSelectedItems([]);
    } catch (error) {
      console.error(`Error deleting junction:`, error);
    }
  };

  // Pagination logic
  const totalItems = junctions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = junctions.slice(startIndex, endIndex);

  return (
    <div className="flex-1 p-6 bg-gray-900 overflow-y-auto">
      <h1 className="text-xl font-semibold text-white mb-4">
        Danh sách nút giao
      </h1>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={openCreateModal}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Thêm mới
        </button>
        <button
          onClick={openEditModal}
          className={`bg-blue-500 text-white px-4 py-2 rounded transition-colors ${
            selectedItems.length !== 1
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-blue-600"
          }`}
          disabled={selectedItems.length !== 1}
        >
          Chỉnh sửa
        </button>
        <button
          onClick={handleDelete}
          className={`bg-blue-500 text-white px-4 py-2 rounded transition-colors ${
            selectedItems.length === 0
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-blue-600"
          }`}
          disabled={selectedItems.length === 0}
        >
          Xóa bỏ
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 border-2 border-gray-600">
          <thead>
            <tr>
              <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                <input
                  type="checkbox"
                  checked={
                    selectedItems.length === currentItems.length &&
                    currentItems.length > 0
                  }
                  onChange={handleSelectAll}
                />
              </th>
              <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                #
              </th>
              <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                Tên nút giao
              </th>
              <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                Vị trí
              </th>
              <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                Kinh độ
              </th>
              <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                Vĩ độ
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="border-2 border-gray-600 p-2 text-center text-gray-300"
                >
                  Đang tải...
                </td>
              </tr>
            ) : currentItems.length > 0 ? (
              currentItems.map((item, index) => (
                <tr key={item.junctionId}>
                  <td className="border-2 border-gray-600 p-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.junctionId)}
                      onChange={() => handleSelectItem(item.junctionId)}
                    />
                  </td>
                  <td className="border-2 border-gray-600 p-2 text-gray-300">
                    {startIndex + index + 1}
                  </td>
                  <td className="border-2 border-gray-600 p-2 text-gray-300">
                    {item.junctionName}
                  </td>
                  <td className="border-2 border-gray-600 p-2 text-gray-300">
                    {item.location}
                  </td>
                  <td className="border-2 border-gray-600 p-2 text-gray-300">
                    {item.latitude || "N/A"}
                  </td>
                  <td className="border-2 border-gray-600 p-2 text-gray-300">
                    {item.longitude || "N/A"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="border-2 border-gray-600 p-2 text-center text-gray-300"
                >
                  Không có nút giao nào
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
            className="px-3 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-600 disabled:text-gray-500"
          >
            {"<"}
          </button>
          <span className="px-3 py-1 text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-600 disabled:text-gray-500"
          >
            {">"}
          </button>
        </div>
        <span className="text-gray-300">
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
                {isEditMode ? "Sửa Nút Giao" : "Thêm Nút Giao"}
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
                      Tên Nút Giao
                    </label>
                    <input
                      type="text"
                      name="junctionName"
                      value={formData.junctionName}
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
                    zoom: 14,
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
