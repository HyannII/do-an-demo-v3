"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Role } from "../../../../../types/interface";

interface PendingUser extends User {
  pendingApproval: string;
}

export default function PendingUsersPage() {
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<PendingUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const [approvalData, setApprovalData] = useState<{
    roleId: string;
    isActive: boolean;
  }>({
    roleId: "",
    isActive: true,
  });

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersResponse, rolesResponse] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/roles"),
        ]);

        if (!usersResponse.ok || !rolesResponse.ok) {
          throw new Error("Failed to fetch data");
        }

        const usersData: User[] = await usersResponse.json();
        const rolesData: Role[] = await rolesResponse.json();

        setRoles(rolesData);

        // Filter only pending users
        const pending = usersData.filter(
          (user) => user.isPending
        ) as PendingUser[];
        setPendingUsers(pending);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        setError(error.message || "An error occurred while fetching data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate pagination
  const totalItems = pendingUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = pendingUsers.slice(startIndex, endIndex);

  // Handle checkbox selection for table rows
  const handleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === currentItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentItems.map((user) => user.userId));
    }
  };

  const openApprovalModal = (user: PendingUser) => {
    setCurrentUser(user);
    // Set default role based on existing user data
    setApprovalData({
      roleId: user.roleId,
      isActive: true,
    });
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find((r) => r.roleId === roleId);
    return role?.roleName || "N/A";
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setApprovalData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleApprove = async (userId: string) => {
    if (!approvalData.roleId) {
      setError("Please select a role for this user");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...currentUser,
          roleId: approvalData.roleId,
          isActive: approvalData.isActive,
          isPending: false, // Mark user as approved
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to approve user");
      }

      // Update the UI - remove the approved user from the list
      setPendingUsers((prev) => prev.filter((user) => user.userId !== userId));

      setSuccess(
        `User ${currentUser?.username} has been approved successfully`
      );
      setCurrentUser(null);
    } catch (error: any) {
      console.error("Error approving user:", error);
      setError(error.message || "An error occurred while approving the user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reject user");
      }

      // Update the UI - remove the rejected user from the list
      setPendingUsers((prev) => prev.filter((user) => user.userId !== userId));

      setSuccess(
        `User registration for ${currentUser?.username} has been rejected`
      );
      setCurrentUser(null);
    } catch (error: any) {
      console.error("Error rejecting user:", error);
      setError(error.message || "An error occurred while rejecting the user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle bulk approve selected users
  const handleBulkApprove = async () => {
    if (selectedItems.length === 0) return;

    // For bulk approval, we'll approve all selected users with a default role
    // You may want to open a modal to select role for all
    const defaultRole = roles.find((role) => role.roleName === "User");
    if (!defaultRole) {
      setError("Default role 'User' not found. Please create it first.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const promises = selectedItems.map((userId) =>
        fetch(`/api/users/${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roleId: defaultRole.roleId,
            isActive: true,
            isPending: false,
          }),
        })
      );

      const responses = await Promise.all(promises);
      const failedRequests = responses.filter((response) => !response.ok);

      if (failedRequests.length > 0) {
        throw new Error(`Failed to approve ${failedRequests.length} users`);
      }

      // Update the UI - remove approved users from the list
      setPendingUsers((prev) =>
        prev.filter((user) => !selectedItems.includes(user.userId))
      );
      setSelectedItems([]);

      setSuccess(`Successfully approved ${selectedItems.length} users`);
    } catch (error: any) {
      console.error("Error in bulk approval:", error);
      setError(error.message || "An error occurred during bulk approval");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle bulk reject selected users
  const handleBulkReject = async () => {
    if (selectedItems.length === 0) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const promises = selectedItems.map((userId) =>
        fetch(`/api/users/${userId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        })
      );

      const responses = await Promise.all(promises);
      const failedRequests = responses.filter((response) => !response.ok);

      if (failedRequests.length > 0) {
        throw new Error(`Failed to reject ${failedRequests.length} users`);
      }

      // Update the UI - remove rejected users from the list
      setPendingUsers((prev) =>
        prev.filter((user) => !selectedItems.includes(user.userId))
      );
      setSelectedItems([]);

      setSuccess(`Successfully rejected ${selectedItems.length} users`);
    } catch (error: any) {
      console.error("Error in bulk rejection:", error);
      setError(error.message || "An error occurred during bulk rejection");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="flex-1 p-6 bg-gray-900 overflow-y-auto">
        {/* Header */}
        <h1 className="text-xl font-semibold text-white mb-4">
          Phê duyệt người dùng
        </h1>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleBulkApprove}
            className={`bg-blue-500 text-white px-4 py-2 rounded transition-colors ${
              selectedItems.length === 0
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-600"
            }`}
            disabled={selectedItems.length === 0 || isSubmitting}
          >
            Phê duyệt đã chọn
          </button>
          <button
            onClick={handleBulkReject}
            className={`bg-blue-500 text-white px-4 py-2 rounded transition-colors ${
              selectedItems.length === 0
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-600"
            }`}
            disabled={selectedItems.length === 0 || isSubmitting}
          >
            Từ chối đã chọn
          </button>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="bg-red-900 border border-red-600 text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900 border border-green-600 text-green-200 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

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
                  Ngày đăng ký
                </th>
                <th className="border-2 border-gray-600 p-2 text-left text-white bg-gray-700">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
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
                      {formatDate(user.pendingApproval)}
                    </td>
                    <td className="border-2 border-gray-600 p-2">
                      {currentUser?.userId === user.userId ? (
                        <div className="space-y-3 p-3 bg-gray-700 rounded">
                          <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Gán vai trò
                            </label>
                            <select
                              name="roleId"
                              value={approvalData.roleId}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 rounded bg-gray-600 text-gray-300 border border-gray-500 focus:outline-none focus:border-blue-500"
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

                          <div className="mb-2">
                            <label className="flex items-center text-sm font-medium text-gray-300">
                              <input
                                type="checkbox"
                                name="isActive"
                                checked={approvalData.isActive}
                                onChange={handleInputChange}
                                className="mr-2"
                              />
                              Tài khoản hoạt động
                            </label>
                          </div>

                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setCurrentUser(null)}
                              className="py-1 px-3 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                            >
                              Hủy
                            </button>
                            <button
                              onClick={() => handleApprove(user.userId)}
                              disabled={isSubmitting}
                              className="py-1 px-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
                            >
                              {isSubmitting ? "Đang xử lý..." : "Phê duyệt"}
                            </button>
                            <button
                              onClick={() => handleReject(user.userId)}
                              disabled={isSubmitting}
                              className="py-1 px-3 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                            >
                              {isSubmitting ? "Đang xử lý..." : "Từ chối"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openApprovalModal(user)}
                          className="py-1 px-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          Xem xét
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="border-2 border-gray-600 p-2 text-center text-gray-300"
                  >
                    Không có người dùng nào đang chờ phê duyệt
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
    </div>
  );
}
