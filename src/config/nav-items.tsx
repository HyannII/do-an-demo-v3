// src/config/nav-items.ts
import {
  LayoutDashboard,
  Settings,
  FileText,
  Users,
  BarChart,
  Calendar,
  Map,
} from "lucide-react";

import React from "react";

// Định nghĩa các loại phần tử điều hướng
export interface BaseNavItem {
  title: string;
  icon: React.ReactNode;
}

export interface NavLinkItem extends BaseNavItem {
  type: "link";
  href: string;
}

export interface NavButtonItem extends BaseNavItem {
  type: "button";
  onClick: () => void;
}

export interface NavFolderItem extends BaseNavItem {
  type: "folder";
  children: NavLinkItem[];
}

export type NavItem = NavLinkItem | NavButtonItem | NavFolderItem;

// Hàm xử lý cho nút bấm
export const handleExportData = () => {
  console.log("Exporting data...");
  alert("Exporting data... This would trigger your export function");
};

// Cấu hình các phần tử điều hướng
export const navItems: NavItem[] = [
  {
    type: "link",
    title: "Bản đồ",
    href: "/map",
    icon: <Map className="w-5 h-5" />,
  },
  {
    type: "folder",
    title: "Báo cáo",
    icon: <FileText className="w-5 h-5" />,
    children: [
      {
        type: "link",
        title: "Báo cáo hàng ngày",
        href: "/reports/daily",
        icon: <Calendar className="w-4 h-4" />,
      },
      {
        type: "link",
        title: "Báo cáo tháng",
        href: "/reports/monthly",
        icon: <BarChart className="w-4 h-4" />,
      },
    ],
  },
  {
    type: "folder",
    title: "Quản lý người dùng",
    icon: <Users className="w-5 h-5" />,
    children: [
      {
        type: "link",
        title: "Danh sách người dùng",
        href: "/users/list",
        icon: <Users className="w-4 h-4" />,
      },
      {
        type: "link",
        title: "Phân quyền",
        href: "/users/roles",
        icon: <Settings className="w-4 h-4" />,
      },
    ],
  },
  {
    type: "button",
    title: "Xuất dữ liệu",
    icon: <FileText className="w-5 h-5" />,
    onClick: handleExportData,
  },
  {
    type: "link",
    title: "Cài đặt",
    href: "/settings",
    icon: <Settings className="w-5 h-5" />,
  },
];
