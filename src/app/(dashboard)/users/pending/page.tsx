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
        const pending = usersData.filter(user => user.isPending) as PendingUser[];
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
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
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
      setPendingUsers(prev => prev.filter(user => user.userId !== userId));
      
      setSuccess(`User ${currentUser?.username} has been approved successfully`);
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
      setPendingUsers(prev => prev.filter(user => user.userId !== userId));
      
      setSuccess(`User registration for ${currentUser?.username} has been rejected`);
      setCurrentUser(null);
    } catch (error: any) {
      console.error("Error rejecting user:", error);
      setError(error.message || "An error occurred while rejecting the user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="container p-4">
      <h1 className="text-2xl font-bold mb-6">Pending User Approvals</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">
          <div className="spinner"></div>
          <p className="mt-2">Loading...</p>
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="text-center py-10">
          <p>No pending user registrations to approve</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border">Username</th>
                <th className="py-2 px-4 border">Full Name</th>
                <th className="py-2 px-4 border">Email</th>
                <th className="py-2 px-4 border">Registration Date</th>
                <th className="py-2 px-4 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((user) => (
                <tr key={user.userId}>
                  <td className="py-2 px-4 border">{user.username}</td>
                  <td className="py-2 px-4 border">{user.fullName}</td>
                  <td className="py-2 px-4 border">{user.email}</td>
                  <td className="py-2 px-4 border">{formatDate(user.pendingApproval)}</td>
                  <td className="py-2 px-4 border">
                    {currentUser?.userId === user.userId ? (
                      <div className="space-y-4 p-2 bg-gray-50 rounded">
                        <div className="mb-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assign Role
                          </label>
                          <select
                            name="roleId"
                            value={approvalData.roleId}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                          >
                            <option value="">Select a role</option>
                            {roles.map((role) => (
                              <option key={role.roleId} value={role.roleId}>
                                {role.roleName}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="mb-2">
                          <label className="flex items-center text-sm font-medium text-gray-700">
                            <input
                              type="checkbox"
                              name="isActive"
                              checked={approvalData.isActive}
                              onChange={handleInputChange}
                              className="mr-2"
                            />
                            Active account
                          </label>
                        </div>
                        
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setCurrentUser(null)}
                            className="py-1 px-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleApprove(user.userId)}
                            disabled={isSubmitting}
                            className="py-1 px-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                          >
                            {isSubmitting ? "Processing..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleReject(user.userId)}
                            disabled={isSubmitting}
                            className="py-1 px-3 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                          >
                            {isSubmitting ? "Processing..." : "Reject"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => openApprovalModal(user)}
                        className="py-1 px-3 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 