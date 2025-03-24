"use client";
import { PageHeader } from "@/app/(components)/page-header";
import { navItems } from "@/config/nav-items";

// src/app/(dashboard)/settings/page.tsx
export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader navItems={navItems} />
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Cài đặt tài khoản
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          Đây là trang cài đặt. Bạn có thể thêm các tùy chọn cài đặt tại đây.
        </p>
      </div>
    </div>
  );
}
