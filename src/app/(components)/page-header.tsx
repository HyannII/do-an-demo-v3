"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { useDashboardContext } from "./client-layout";

interface PageHeaderProps {
  navItems: Array<any>;
}

export function PageHeader({ navItems }: PageHeaderProps) {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useDashboardContext();

  const pageTitle = useMemo(() => {
    const getTitle = (items: Array<any>): string => {
      for (const item of items) {
        if (item.type === "link" && item.href === pathname) return item.title;
        if (item.type === "folder" && item.children) {
          const childTitle = getTitle(item.children);
          if (childTitle) return childTitle;
        }
      }
      return "";
    };

    return getTitle(navItems) || "Dashboard";
  }, [pathname, navItems]);

  return (
    <div className="h-[6vh] w-full flex items-center pl-5 pr-4 bg-white dark:bg-gray-900">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <Menu className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      </button>
      <h1 className="ml-5 text-2xl font-bold text-gray-900 dark:text-white">
        {pageTitle}
      </h1>
    </div>
  );
}
