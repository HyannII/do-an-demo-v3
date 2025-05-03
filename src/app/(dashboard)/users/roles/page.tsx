"use client";

import React, { useState, useEffect } from "react";
import { Role } from "../../../../../types/interface";

// Define permission keys (assumed structure for permissions object)
const permissionKeys = [
  { key: "canViewDashboard", label: "Xem Dashboard" },
  { key: "canEditUsers", label: "Chỉnh sửa người dùng" },
  { key: "canManageRoles", label: "Quản lý vai trò" },
  { key: "canViewStatistics", label: "Xem thống kê" },
  { key: "canManageCameras", label: "Quản lý camera" },
];

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    roleName: "",
    permissions: {} as Record<string, boolean>,
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Fetch roles on component mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch("/api/roles");
        if (!response.ok) {
          console.error("Failed to fetch roles", response.status);
          return;
        }
        const data = await response.json();
        setRoles(data);
      } catch (error) {
        console.error("Error fetching roles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  // Handle checkbox selection for table rows
  const handleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Handle select all checkboxes
  const handleSelectAll = () => {
    const currentItems = roles.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    if (selectedItems.length === currentItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentItems.map((item) => item.roleId));
    }
  };

  // Open modal for creating a new role
  const openCreateModal = () => {
    setIsEditMode(false);
    setFormData({
      roleName: "",
      permissions: permissionKeys.reduce((acc, perm) => {
        acc[perm.key] = false;
        return acc;
      }, {} as Record<string, boolean>),
    });
    setIsModalOpen(true);
  };

  // Open modal for editing an existing role
  const openEditModal = () => {
    if (selectedItems.length !== 1) return;

    const role = roles.find((r) => r.roleId === selectedItems[0]);
    if (!role) return;

    setIsEditMode(true);
    setCurrentRole(role);
    setFormData({
      roleName: role.roleName,
      permissions: permissionKeys.reduce((acc, perm) => {
        acc[perm.key] = role.permissions?.[perm.key] || false;
        return acc;
      }, {} as Record<string, boolean>),
    });
    setIsModalOpen(true);
  };

  // Handle form input changes for text fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle permission checkbox changes
  const handlePermissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [name]: checked,
      },
    }));
  };

  // Handle form submission for create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = isEditMode ? "PUT" : "POST";
    const url = isEditMode ? `/api/roles/${currentRole?.roleId}` : `/api/roles`;

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleName: formData.roleName,
          permissions: formData.permissions,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditMode ? "update" : "create"} role`);
      }

      const updatedRole = await response.json();
      if (isEditMode) {
        setRoles(
          roles.map((r) => (r.roleId === updatedRole.roleId ? updatedRole : r))
        );
      } else {
        setRoles([...roles, updatedRole]);
      }

      setIsModalOpen(false);
      setSelectedItems([]);
    } catch (error) {
      console.error(`Error saving role:`, error);
    }
  };

  // Handle delete selected roles
  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedItems.length} selected roles?`
      )
    )
      return;

    try {
      await Promise.all(
        selectedItems.map(async (id) => {
          const response = await fetch(`/api/roles/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            throw new Error(`Failed to delete role with ID ${id}`);
          }
        })
      );

      setRoles(roles.filter((r) => !selectedItems.includes(r.roleId)));
      setSelectedItems([]);
    } catch (error) {
      console.error(`Error deleting roles:`, error);
    }
  };

  // Pagination logic
  const totalItems = roles.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = roles.slice(startIndex, endIndex);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Main Content */}
      <div className="flex-1 p-6 bg-gray-900 overflow-y-auto">
        <h1 className="text-xl font-semibold text-white mb-4">
          Quản lý vai trò
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
                  Tên vai trò
                </th>
                <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                  Quyền hạn
                </th>
                <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                  Số lượng người dùng
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="border-2 border-gray-600 p-2 text-center text-gray-300"
                  >
                    Đang tải...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((role, index) => (
                  <tr key={role.roleId}>
                    <td className="border-2 border-gray-600 p-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(role.roleId)}
                        onChange={() => handleSelectItem(role.roleId)}
                      />
                    </td>
                    <td className="border-2 border-gray-600 p-2 text-gray-300">
                      {startIndex + index + 1}
                    </td>
                    <td className="border-2 border-gray-600 p-2 text-gray-300">
                      {role.roleName}
                    </td>
                    <td className="border-2 border-gray-600 p-2 text-gray-300">
                      {role.permissions
                        ? Object.entries(role.permissions)
                            .filter(([_, value]) => value)
                            .map(
                              ([key]) =>
                                permissionKeys.find((p) => p.key === key)?.label
                            )
                            .filter(Boolean)
                            .join(", ") || "Không có quyền"
                        : "Không có quyền"}
                    </td>
                    <td className="border-2 border-gray-600 p-2 text-gray-300">
                      {role.users?.length || 0}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="border-2 border-gray-600 p-2 text-center text-gray-300"
                  >
                    Không có vai trò nào
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
      </div>

      {/* Modal for Create/Edit Role */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">
              {isEditMode ? "Sửa vai trò" : "Thêm vai trò"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-1">Tên vai trò</label>
                <input
                  type="text"
                  name="roleName"
                  value={formData.roleName}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded bg-gray-700 text-gray-300 border border-gray-600 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-1">Quyền hạn</label>
                <div className="flex flex-col gap-2">
                  {permissionKeys.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center text-gray-300"
                    >
                      <input
                        type="checkbox"
                        name={perm.key}
                        checked={formData.permissions[perm.key] || false}
                        onChange={handlePermissionChange}
                        className="mr-2"
                      />
                      {perm.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="mr-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  {isEditMode ? "Cập nhật" : "Thêm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
