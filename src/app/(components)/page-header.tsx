// src/components/dashboard/page-header.tsx
"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

interface PageHeaderProps {
  navItems: Array<any>;
}

export function PageHeader({ navItems }: PageHeaderProps) {
  const pathname = usePathname();

  const pageTitle = useMemo(() => {
    // Tìm kiếm tiêu đề dựa vào pathname hiện tại
    // Đầu tiên tìm trong các mục link trực tiếp
    const directItem = navItems.find(
      (item) => item.type === "link" && item.href === pathname
    );

    if (directItem) {
      return directItem.title;
    }

    // Nếu không tìm thấy, tìm trong các thư mục con
    for (const item of navItems) {
      if (item.type === "folder" && item.children) {
        const childItem = item.children.find((child) => child.href === pathname);
        if (childItem) {
          return childItem.title;
        }
      }
    }

    // Giá trị mặc định nếu không tìm thấy
    return "Dashboard";
  }, [pathname, navItems]);

  return (
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
      {pageTitle}
    </h1>
  );
}