"use client";

import React, { useState, useEffect } from "react";
import { User, Role } from "../../../../../types/interface";

interface PasswordFormData {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  adminPassword?: string;
}

interface CreateFormData {
  username: string;
  email: string;
  fullName: string;
  roleId: string;
  isActive: boolean;
  password?: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] =
    useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [formData, setFormData] = useState<CreateFormData>({
    username: "",
    email: "",
    fullName: "",
    roleId: "",
    isActive: true,
    password: "",
  });
  const [passwordFormData, setPasswordFormData] = useState<PasswordFormData>({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
    adminPassword: "",
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [loggedInUserResponse, usersResponse, rolesResponse] =
          await Promise.all([
            fetch("/api/auth/me"),
            fetch("/api/users"),
            fetch("/api/roles"),
          ]);

        if (
          !loggedInUserResponse.ok ||
          !usersResponse.ok ||
          !rolesResponse.ok
        ) {
          throw new Error("Failed to fetch data");
        }

        const loggedInUserData: User = await loggedInUserResponse.json();
        const usersData: User[] = await usersResponse.json();
        const rolesData: Role[] = await rolesResponse.json();

        setLoggedInUser(loggedInUserData);
        setRoles(rolesData);

        // Map roleId to roleName for filtering
        const loggedInUserRole = rolesData.find(
          (role) => role.roleId === loggedInUserData.roleId
        );
        const isAdmin = loggedInUserRole?.roleName === "Admin";
        const filteredUsers = isAdmin
          ? usersData
          : usersData.filter((user) => user.roleId === loggedInUserData.roleId);
        setUsers(filteredUsers);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        alert(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const isAdmin = () => {
    if (!loggedInUser || !roles.length) return false;
    const userRole = roles.find((role) => role.roleId === loggedInUser.roleId);
    return userRole?.roleName === "Admin";
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find((r) => r.roleId === roleId);
    return role?.roleName || "N/A";
  };

  const handleSelectItem = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const currentItems = users.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    if (selectedItems.length === currentItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentItems.map((item) => parseInt(item.userId)));
    }
  };

  const openCreateModal = () => {
    if (!isAdmin()) return;
    setIsEditMode(false);
    setFormData({
      username: "",
      email: "",
      fullName: "",
      roleId: "",
      isActive: true,
      password: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    if (selectedItems.length !== 1) return;

    const user = users.find((u) => parseInt(u.userId) === selectedItems[0]);
    if (!user) return;

    if (
      !isAdmin() &&
      parseInt(user.userId) !== parseInt(loggedInUser?.userId || "0")
    ) {
      alert("Bạn chỉ có thể chỉnh sửa thông tin của chính mình.");
      return;
    }

    setIsEditMode(true);
    setCurrentUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      roleId: user.roleId,
      isActive: user.isActive,
      password: "",
    });
    setIsModalOpen(true);
  };

  const openPasswordModal = () => {
    if (selectedItems.length !== 1) return;

    const user = users.find((u) => parseInt(u.userId) === selectedItems[0]);
    if (!user) return;

    if (
      !isAdmin() &&
      parseInt(user.userId) !== parseInt(loggedInUser?.userId || "0")
    ) {
      alert("Bạn chỉ có thể thay đổi mật khẩu của chính mình.");
      return;
    }

    setCurrentUser(user);
    setPasswordFormData({
      oldPassword: "",
      newPassword: "",
      confirmNewPassword: "",
      adminPassword: "",
    });
    setIsPasswordModalOpen(true);
  };

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

  const handlePasswordInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setPasswordFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const method = isEditMode ? "PUT" : "POST";
    const url = isEditMode ? `/api/users/${currentUser?.userId}` : `/api/users`;

    if (!isEditMode && !formData.password) {
      alert("Vui lòng nhập mật khẩu cho người dùng mới.");
      setIsSubmitting(false);
      return;
    }

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
          ...(method === "POST" && { password: formData.password }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            `Failed to ${isEditMode ? "update" : "create"} user`
        );
      }

      const updatedUser: User = await response.json();
      if (isEditMode) {
        setUsers(
          users.map((u) => (u.userId === updatedUser.userId ? updatedUser : u))
        );
      } else {
        setUsers([...users, updatedUser]);
      }

      setIsModalOpen(false);
      setSelectedItems([]);
    } catch (error: any) {
      console.error(`Error saving user:`, error);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (passwordFormData.newPassword !== passwordFormData.confirmNewPassword) {
      alert("Mật khẩu mới và xác nhận mật khẩu mới không khớp.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/users/${currentUser?.userId}/changePassword`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oldPassword: isAdmin() ? undefined : passwordFormData.oldPassword,
            newPassword: passwordFormData.newPassword,
            adminPassword: isAdmin()
              ? passwordFormData.adminPassword
              : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to change password");
      }

      alert("Đổi mật khẩu thành công!");
      setIsPasswordModalOpen(false);
      setSelectedItems([]);
    } catch (error: any) {
      console.error("Error changing password:", error);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin()) {
      alert("Chỉ admin mới có quyền xóa người dùng.");
      return;
    }

    if (selectedItems.includes(parseInt(loggedInUser?.userId || "0"))) {
      alert("Không thể xóa tài khoản đang đăng nhập.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedItems.length} selected users?`
      )
    )
      return;

    setIsSubmitting(true);
    try {
      await Promise.all(
        selectedItems.map(async (id) => {
          const response = await fetch(`/api/users/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.message || `Failed to delete user with ID ${id}`
            );
          }
        })
      );

      setUsers(
        users.filter((u) => !selectedItems.includes(parseInt(u.userId)))
      );
      setSelectedItems([]);
    } catch (error: any) {
      console.error(`Error deleting users:`, error);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItems = users.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = users.slice(startIndex, endIndex);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="flex-1 p-6 bg-white dark:bg-gray-900 overflow-y-auto">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Quản lý người dùng
        </h1>

        <div className="flex gap-2 mb-4">
          {isAdmin() && (
            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Thêm mới
            </button>
          )}
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
            onClick={openPasswordModal}
            className={`bg-orange-600 text-white px-4 py-2 rounded transition-colors ${
              selectedItems.length !== 1
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-orange-700"
            }`}
            disabled={selectedItems.length !== 1}
          >
            Đổi mật khẩu
          </button>
          {isAdmin() && (
            <button
              onClick={handleDelete}
              className={`bg-red-600 text-white px-4 py-2 rounded transition-colors ${
                selectedItems.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-red-700"
              }`}
              disabled={selectedItems.length === 0 || isSubmitting}
            >
              Xóa bỏ
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 border-2 border-gray-300 dark:border-gray-600">
            <thead>
              <tr>
                <th className="border-2 border-gray-300 dark:border-gray-600 p-2 text-left text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700">
                  <input
                    type="checkbox"
                    checked={
                      selectedItems.length === currentItems.length &&
                      currentItems.length > 0
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="border-2 border-gray-300 dark:border-gray-600 p-2 text-left text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700">
                  #
                </th>
                <th className="border-2 border-gray-300 dark:border-gray-600 p-2 text-left text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700">
                  Tên người dùng
                </th>
                <th className="border-2 border-gray-300 dark:border-gray-600 p-2 text-left text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700">
                  Họ tên
                </th>
                <th className="border-2 border-gray-300 dark:border-gray-600 p-2 text-left text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700">
                  Email
                </th>
                <th className="border-2 border-gray-300 dark:border-gray-600 p-2 text-left text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700">
                  Vai trò
                </th>
                <th className="border-2 border-gray-300 dark:border-gray-600 p-2 text-left text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700">
                  Trạng thái
                </th>
                <th className="border-2 border-gray-300 dark:border-gray-600 p-2 text-left text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700">
                  Ngày tạo
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="border-2 border-gray-300 dark:border-gray-600 p-2 text-center text-gray-700 dark:text-gray-300"
                  >
                    Đang tải...
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((user, index) => (
                  <tr key={user.userId}>
                    <td className="border-2 border-gray-300 dark:border-gray-600 p-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(parseInt(user.userId))}
                        onChange={() => handleSelectItem(parseInt(user.userId))}
                      />
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-600 p-2 text-gray-700 dark:text-gray-300">
                      {startIndex + index + 1}
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-600 p-2 text-gray-700 dark:text-gray-300">
                      {user.username}
                      {parseInt(user.userId) ===
                        parseInt(loggedInUser?.userId || "0") && " (Bạn)"}
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-600 p-2 text-gray-700 dark:text-gray-300">
                      {user.fullName}
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-600 p-2 text-gray-700 dark:text-gray-300">
                      {user.email}
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-600 p-2 text-gray-700 dark:text-gray-300">
                      {getRoleName(user.roleId)}
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-600 p-2 text-gray-700 dark:text-gray-300">
                      <span
                        className={`inline-block px-2 py-1 rounded text-white ${
                          user.isActive ? "bg-green-500" : "bg-red-500"
                        }`}
                      >
                        {user.isActive ? "Hoạt động" : "Không hoạt động"}
                      </span>
                    </td>
                    <td className="border-2 border-gray-300 dark:border-gray-600 p-2 text-gray-700 dark:text-gray-300">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="border-2 border-gray-300 dark:border-gray-600 p-2 text-center text-gray-700 dark:text-gray-300"
                  >
                    Không có người dùng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {isEditMode ? "Sửa người dùng" : "Thêm người dùng"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">
                  Tên người dùng
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">
                  Họ tên
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              {!isEditMode && (
                <div className="mb-4">
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">
                    Mật khẩu ban đầu
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              )}
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">
                  Vai trò
                </label>
                <select
                  name="roleId"
                  value={formData.roleId}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                  required
                  disabled={!isAdmin()}
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
                <label className="flex items-center text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="mr-2"
                    disabled={!isAdmin()}
                  />
                  Hoạt động
                </label>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="mr-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition-colors dark:bg-gray-500 dark:text-white dark:hover:bg-gray-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors ${
                    isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isSubmitting
                    ? "Đang xử lý..."
                    : isEditMode
                    ? "Cập nhật"
                    : "Thêm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Đổi mật khẩu
            </h2>
            <form onSubmit={handlePasswordSubmit}>
              {!isAdmin() && (
                <div className="mb-4">
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">
                    Mật khẩu cũ
                  </label>
                  <input
                    type="password"
                    name="oldPassword"
                    value={passwordFormData.oldPassword}
                    onChange={handlePasswordInputChange}
                    className="w-full p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              )}
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordFormData.newPassword}
                  onChange={handlePasswordInputChange}
                  className="w-full p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  name="confirmNewPassword"
                  value={passwordFormData.confirmNewPassword}
                  onChange={handlePasswordInputChange}
                  className="w-full p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              {isAdmin() && (
                <div className="mb-4">
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">
                    Mật khẩu admin
                  </label>
                  <input
                    type="password"
                    name="adminPassword"
                    value={passwordFormData.adminPassword}
                    onChange={handlePasswordInputChange}
                    className="w-full p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="mr-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition-colors dark:bg-gray-500 dark:text-white dark:hover:bg-gray-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors ${
                    isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isSubmitting ? "Đang xử lý..." : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
