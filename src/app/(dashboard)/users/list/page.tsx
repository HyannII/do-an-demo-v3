"use client";

import React, { useState, useEffect } from "react";
import { User, Role } from "../../../../../types/interface";

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullName: "",
    roleId: "",
    isActive: true,
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Fetch users and roles on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersResponse, rolesResponse] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/roles"),
        ]);

        if (!usersResponse.ok || !rolesResponse.ok) {
          console.error("Failed to fetch data");
          return;
        }

        const usersData = await usersResponse.json();
        const rolesData = await rolesResponse.json();

        setUsers(usersData);
        setRoles(rolesData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle checkbox selection
  const handleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Handle select all checkboxes
  const handleSelectAll = () => {
    const currentItems = users.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    if (selectedItems.length === currentItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentItems.map((item) => item.userId));
    }
  };

  // Open modal for creating a new user
  const openCreateModal = () => {
    setIsEditMode(false);
    setFormData({
      username: "",
      email: "",
      fullName: "",
      roleId: "",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Open modal for editing an existing user
  const openEditModal = () => {
    if (selectedItems.length !== 1) return;

    const user = users.find((u) => u.userId === selectedItems[0]);
    if (!user) return;

    setIsEditMode(true);
    setCurrentUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      roleId: user.roleId,
      isActive: user.isActive,
    });
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

  // Handle form submission for create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = isEditMode ? "PUT" : "POST";
    const url = isEditMode ? `/api/users/${currentUser?.userId}` : `/api/users`;

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          fullName: formData.fullName,
          roleId: formData.roleId,
          isActive: formData.isActive,
          // Note: passwordHash would typically be handled separately (e.g., during user creation)
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditMode ? "update" : "create"} user`);
      }

      const updatedUser = await response.json();
      if (isEditMode) {
        setUsers(
          users.map((u) => (u.userId === updatedUser.userId ? updatedUser : u))
        );
      } else {
        setUsers([...users, updatedUser]);
      }

      setIsModalOpen(false);
      setSelectedItems([]);
    } catch (error) {
      console.error(`Error saving user:`, error);
    }
  };

  // Handle delete selected users
  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedItems.length} selected users?`
      )
    )
      return;

    try {
      await Promise.all(
        selectedItems.map(async (id) => {
          const response = await fetch(`/api/users/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            throw new Error(`Failed to delete user with ID ${id}`);
          }
        })
      );

      setUsers(users.filter((u) => !selectedItems.includes(u.userId)));
      setSelectedItems([]);
    } catch (error) {
      console.error(`Error deleting users:`, error);
    }
  };

  // Pagination logic
  const totalItems = users.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = users.slice(startIndex, endIndex);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Main Content */}
      <div className="flex-1 p-6 bg-gray-900 overflow-y-auto">
        <h1 className="text-xl font-semibold text-white mb-4">
          Quản lý người dùng
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
                  Tên người dùng
                </th>
                <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                  Họ tên
                </th>
                <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                  Email
                </th>
                <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                  Vai trò
                </th>
                <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                  Trạng thái
                </th>
                <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                  Ngày tạo
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="border-2 border-gray-600 p-2 text-center text-gray-300"
                  >
                    Đang tải...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((user, index) => (
                  <tr key={user.userId}>
                    <td className="border-2 border-gray-600 p-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(user.userId)}
                        onChange={() => handleSelectItem(user.userId)}
                      />
                    </td>
                    <td className="border-2 border-gray-600 p-2 text-gray-300">
                      {startIndex + index + 1}
                    </td>
                    <td className="border-2 border-gray-600 p-2 text-gray-300">
                      {user.username}
                    </td>
                    <td className="border-2 border-gray-600 p-2 text-gray-300">
                      {user.fullName}
                    </td>
                    <td className="border-2 border-gray-600 p-2 text-gray-300">
                      {user.email}
                    </td>
                    <td className="border-2 border-gray-600 p-2 text-gray-300">
                      {roles.find((r) => r.roleId === user.roleId)?.roleName ||
                        "N/A"}
                    </td>
                    <td className="border-2 border-gray-600 p-2 text-gray-300">
                      <span
                        className={`inline-block px-2 py-1 rounded text-white ${
                          user.isActive ? "bg-green-500" : "bg-red-500"
                        }`}
                      >
                        {user.isActive ? "Hoạt động" : "Không hoạt động"}
                      </span>
                    </td>
                    <td className="border-2 border-gray-600 p-2 text-gray-300">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="border-2 border-gray-600 p-2 text-center text-gray-300"
                  >
                    Không có người dùng nào
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

      {/* Modal for Create/Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">
              {isEditMode ? "Sửa người dùng" : "Thêm người dùng"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-1">
                  Tên người dùng
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded bg-gray-700 text-gray-300 border border-gray-600 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-1">Họ tên</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded bg-gray-700 text-gray-300 border border-gray-600 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded bg-gray-700 text-gray-300 border border-gray-600 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-1">Vai trò</label>
                <select
                  name="roleId"
                  value={formData.roleId}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded bg-gray-700 text-gray-300 border border-gray-600 focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Chọn vai trò</option>
                  {roles.map((role) => (
                    <option
                      key={role.roleId}
                      value={role.roleId}
                    >
                      {role.roleName}
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
