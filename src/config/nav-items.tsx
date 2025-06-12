// src/config/nav-items.ts
import {
  LayoutDashboard,
  Settings,
  FileText,
  Users,
  BarChart,
  Calendar,
  Map,
  Video,
  Cctv,
  RectangleEllipsis,
  ListTree,
  ContactRound,
  FolderKey,
  KeyRound,
  ScrollText,
  Calculator,
  Wrench,
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
    icon: <Map />,
  },
  {
    type: "link",
    title: "Camera",
    href: "/liveCamera",
    icon: <Cctv />,
  },
  {
    type: "link",
    title: "Đèn giao thông",
    href: "/trafficLight",
    icon: <RectangleEllipsis />,
  },
  {
    type: "link",
    title: "Thống kê",
    href: "/statistics",
    icon: <BarChart />,
  },
  {
    type: "link",
    title: "Quản lí danh mục",
    href: "/objectManagement",
    icon: <ListTree />,
  },
  {
    type: "folder",
    title: "Tiện ích",
    icon: <Wrench />,
    children: [
      {
        type: "link",
        title: "Tính toán thời gian đèn",
        href: "/utility/traffic-light-calculation",
        icon: <Calculator />,
      },
      {
        type: "link",
        title: "TCP Testing",
        href: "/utility/tcp-testing",
        icon: <Wrench />,
      },
    ],
  },
  {
    type: "folder",
    title: "Quản lý người dùng",
    icon: <Users />,
    children: [
      {
        type: "link",
        title: "Danh sách người dùng",
        href: "/users/list",
        icon: <ContactRound />,
      },
      {
        type: "link",
        title: "Phê duyệt người dùng",
        href: "/users/pending",
        icon: <FileText />,
      },
      {
        type: "link",
        title: "Phân quyền",
        href: "/users/roles",
        icon: <KeyRound />,
      },
    ],
  },
  {
    type: "link",
    title: "Cài đặt tài khoản",
    href: "/settings",
    icon: <Settings />,
  },
];
