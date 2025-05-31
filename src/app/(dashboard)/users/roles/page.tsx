"use client";

import React, { useState, useEffect } from "react";
import { Role } from "../../../../../types/interface";
import {
  PERMISSIONS,
  PERMISSION_CATEGORIES,
  getPermissionsByCategory,
  getAllPermissionKeys,
  DEFAULT_ROLE_PERMISSIONS,
} from "../../../../config/permissions";
import { ProtectedRoute } from "../../../../components/ProtectedRoute";

function RoleManagementPage() {
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
      permissions: {},
    });
    setIsModalOpen(true);
  };

  // Open modal for editing a role
  const openEditModal = (role: Role) => {
    setIsEditMode(true);
    setCurrentRole(role);
    setFormData({
      roleName: role.roleName,
      permissions: role.permissions || {},
    });
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentRole(null);
    setFormData({
      roleName: "",
      permissions: {},
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = isEditMode
        ? `/api/roles/${currentRole?.roleId}`
        : "/api/roles";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleName: formData.roleName,
          permissions: formData.permissions,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save role");
      }

      const savedRole = await response.json();

      if (isEditMode) {
        setRoles((prev) =>
          prev.map((role) =>
            role.roleId === currentRole?.roleId ? savedRole : role
          )
        );
      } else {
        setRoles((prev) => [...prev, savedRole]);
      }

      closeModal();
    } catch (error) {
      console.error("Error saving role:", error);
      alert("Có lỗi xảy ra khi lưu vai trò!");
    }
  };

  // Handle role deletion
  const handleDelete = async (roleId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa vai trò này?")) return;

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete role");
      }

      setRoles((prev) => prev.filter((role) => role.roleId !== roleId));
      setSelectedItems((prev) => prev.filter((id) => id !== roleId));
    } catch (error) {
      console.error("Error deleting role:", error);
      alert("Có lỗi xảy ra khi xóa vai trò!");
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa ${selectedItems.length} vai trò đã chọn?`
      )
    )
      return;

    try {
      await Promise.all(
        selectedItems.map((roleId) =>
          fetch(`/api/roles/${roleId}`, { method: "DELETE" })
        )
      );

      setRoles((prev) =>
        prev.filter((role) => !selectedItems.includes(role.roleId))
      );
      setSelectedItems([]);
    } catch (error) {
      console.error("Error bulk deleting roles:", error);
      alert("Có lỗi xảy ra khi xóa vai trò!");
    }
  };

  // Handle permission change
  const handlePermissionChange = (permissionKey: string, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionKey]: value,
      },
    }));
  };

  // Handle category toggle (select all/none in category)
  const handleCategoryToggle = (category: string) => {
    const categoryPermissions = getPermissionsByCategory(category);
    const allSelected = categoryPermissions.every(
      (p) => formData.permissions[p.key]
    );

    const updatedPermissions = { ...formData.permissions };
    categoryPermissions.forEach((permission) => {
      updatedPermissions[permission.key] = !allSelected;
    });

    setFormData((prev) => ({
      ...prev,
      permissions: updatedPermissions,
    }));
  };

  // Apply preset permissions
  const applyPresetPermissions = (preset: string) => {
    const presetPermissions: Record<string, boolean> = {};
    getAllPermissionKeys().forEach((key) => {
      presetPermissions[key] =
        (DEFAULT_ROLE_PERMISSIONS as any)[preset]?.includes(key) || false;
    });

    setFormData((prev) => ({
      ...prev,
      permissions: presetPermissions,
    }));
  };

  // Pagination calculations
  const totalPages = Math.ceil(roles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = roles.slice(startIndex, endIndex);
  const totalItems = roles.length;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)]">
        <div className="flex-1 p-6 bg-white dark:bg-gray-900 overflow-y-auto">
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-900 dark:text-white">Đang tải...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="flex-1 p-6 bg-white dark:bg-gray-900 overflow-y-auto">
        {/* Header */}
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Quản lý vai trò và phân quyền
        </h1>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded transition-colors hover:bg-blue-700"
          >
            Thêm vai trò
          </button>
          <button
            onClick={handleBulkDelete}
            className={`bg-red-600 text-white px-4 py-2 rounded transition-colors ${
              selectedItems.length === 0
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-red-700"
            }`}
            disabled={selectedItems.length === 0}
          >
            Xóa đã chọn ({selectedItems.length})
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
                  Tên vai trò
                </th>
                <th className="px-4 py-3 text-left text-gray-900 dark:text-white font-medium">
                  Số quyền
                </th>
                <th className="px-4 py-3 text-left text-gray-900 dark:text-white font-medium">
                  Ngày tạo
                </th>
                <th className="px-4 py-3 text-left text-gray-900 dark:text-white font-medium">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {currentItems.map((role) => (
                <tr
                  key={role.roleId}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(role.roleId)}
                      onChange={() => handleSelectItem(role.roleId)}
                      className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                    {role.roleName}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {
                      Object.values(role.permissions || {}).filter(
                        (p) => p === true
                      ).length
                    }{" "}
                    / {getAllPermissionKeys().length}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {role.createdAt
                      ? new Date(role.createdAt).toLocaleDateString("vi-VN")
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(role)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors hover:bg-blue-700"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(role.roleId)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors hover:bg-red-700"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {roles.length === 0 && (
            <div className="text-center text-gray-700 dark:text-gray-400 py-8">
              Chưa có vai trò nào được tạo.
            </div>
          )}
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
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {isEditMode ? "Chỉnh sửa vai trò" : "Thêm vai trò mới"}
            </h2>

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Role Name */}
              <div>
                <label className="block text-gray-900 dark:text-white mb-2">
                  Tên vai trò:
                </label>
                <input
                  type="text"
                  value={formData.roleName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      roleName: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-blue-500"
                  placeholder="Nhập tên vai trò..."
                  required
                />
              </div>

              {/* Preset Permissions */}
              <div>
                <label className="block text-gray-900 dark:text-white mb-2">
                  Mẫu quyền sẵn có:
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(DEFAULT_ROLE_PERMISSIONS).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyPresetPermissions(preset)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions by Category */}
              <div>
                <label className="block text-gray-900 dark:text-white mb-3">
                  Phân quyền chi tiết:
                </label>
                <div className="space-y-4">
                  {Object.values(PERMISSION_CATEGORIES).map((category) => {
                    const categoryPermissions =
                      getPermissionsByCategory(category);
                    const selectedCount = categoryPermissions.filter(
                      (p) => formData.permissions[p.key]
                    ).length;
                    const totalCount = categoryPermissions.length;

                    return (
                      <div
                        key={category}
                        className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-gray-900 dark:text-white font-medium">
                            {category}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700 dark:text-gray-300 text-sm">
                              {selectedCount}/{totalCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCategoryToggle(category)}
                              className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-white px-2 py-1 rounded text-xs transition-colors"
                            >
                              {selectedCount === totalCount
                                ? "Bỏ chọn tất cả"
                                : "Chọn tất cả"}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {categoryPermissions.map((permission) => (
                            <label
                              key={permission.key}
                              className="flex items-start space-x-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  formData.permissions[permission.key] || false
                                }
                                onChange={(e) =>
                                  handlePermissionChange(
                                    permission.key,
                                    e.target.checked
                                  )
                                }
                                className="mt-1 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-blue-500"
                              />
                              <div>
                                <div className="font-medium">
                                  {permission.label}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {permission.description}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                >
                  {isEditMode ? "Cập nhật" : "Thêm"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition-colors dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProtectedRoleManagementPage() {
  return (
    <ProtectedRoute requiredPermission="can-access-user-roles">
      <RoleManagementPage />
    </ProtectedRoute>
  );
}
