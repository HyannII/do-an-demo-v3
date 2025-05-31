// src/app/(dashboard)/settings/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { User, Role } from "../../../../types/interface";

interface UserWithRole extends User {
  role: Role;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileUpdateData {
  username: string;
  email: string;
  fullName: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserWithRole | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<ProfileUpdateData>({
    username: "",
    email: "",
    fullName: "",
  });

  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const userData = await response.json();
          setUserInfo(userData);
          setProfileData({
            username: userData.username,
            email: userData.email,
            fullName: userData.fullName,
          });
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        setError("Không thể tải thông tin người dùng");
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchUserInfo();
    }
  }, [session]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!profileData.username || !profileData.email || !profileData.fullName) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      const response = await fetch(`/api/users/${session?.user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUserInfo(updatedUser);
        setSuccess("Cập nhật thông tin thành công!");
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Có lỗi xảy ra khi cập nhật thông tin");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Có lỗi xảy ra khi cập nhật thông tin");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setError("Vui lòng điền đầy đủ thông tin mật khẩu");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setSuccess("Đổi mật khẩu thành công!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setIsChangingPassword(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Có lỗi xảy ra khi đổi mật khẩu");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setError("Có lỗi xảy ra khi đổi mật khẩu");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <div className="text-gray-900 dark:text-white">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-white dark:bg-gray-900 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Cài đặt tài khoản
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Quản lý thông tin cá nhân và bảo mật tài khoản của bạn
          </p>
        </div>

        {/* Alert Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded-lg text-green-700 dark:text-green-400">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Information Section */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Thông tin cá nhân
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Chỉnh sửa
                </button>
              )}
            </div>

            {isEditing ? (
              <form
                onSubmit={handleProfileUpdate}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tên đăng nhập
                    </label>
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          username: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      value={profileData.fullName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          fullName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Lưu thay đổi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setProfileData({
                        username: userInfo?.username || "",
                        email: userInfo?.email || "",
                        fullName: userInfo?.fullName || "",
                      });
                    }}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Tên đăng nhập
                    </label>
                    <div className="text-gray-900 dark:text-white">
                      {userInfo?.username}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Email
                    </label>
                    <div className="text-gray-900 dark:text-white">
                      {userInfo?.email}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Họ và tên
                    </label>
                    <div className="text-gray-900 dark:text-white">
                      {userInfo?.fullName}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Vai trò
                    </label>
                    <div className="text-gray-900 dark:text-white">
                      {userInfo?.role?.roleName}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Password Change Section */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Đổi mật khẩu
              </h2>
              {!isChangingPassword && (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  Đổi mật khẩu
                </button>
              )}
            </div>

            {isChangingPassword ? (
              <form
                onSubmit={handlePasswordChange}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mật khẩu hiện tại
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Đổi mật khẩu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-gray-500 dark:text-gray-400">
                Nhấn "Đổi mật khẩu" để thay đổi mật khẩu hiện tại của bạn
              </div>
            )}
          </div>

          {/* Account Information Section */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Thông tin tài khoản
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    ID Người dùng
                  </label>
                  <div className="text-gray-900 dark:text-white font-mono text-sm">
                    {userInfo?.userId}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Ngày tạo tài khoản
                  </label>
                  <div className="text-gray-900 dark:text-white">
                    {userInfo?.createdAt
                      ? new Date(userInfo.createdAt).toLocaleDateString("vi-VN")
                      : "N/A"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Trạng thái tài khoản
                  </label>
                  <div
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      userInfo?.isActive
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    }`}
                  >
                    {userInfo?.isActive ? "Hoạt động" : "Đã khóa"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
