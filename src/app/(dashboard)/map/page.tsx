// src/app/(dashboard)/dashboard/page.tsx
"use client";

import { PageHeader } from "@/app/(components)/page-header";
import { navItems } from "@/config/nav-items";

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 h-full space-y-4">
      <PageHeader navItems={navItems} />
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 flex-1">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Chào mừng bạn đến với Dashboard
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          Đây là trang chính của dashboard. Bạn có thể thêm các thành phần khác
          vào đây.
        </p>
      </div>
    </div>
  );
}
