// src/components/dashboard/sidebar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { navItems, NavItem } from "@/config/nav-items";
// import { ThemeToggle } from "@/components/ui/theme-toggle";

interface SidebarProps {
  user: { name?: string | null; email?: string | null };
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

export function Sidebar({ user, collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);

    // Auto-open folders based on active path
    const initialOpenFolders: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (item.type === "folder") {
        const shouldOpen = item.children.some(
          (child) => pathname === child.href
        );
        if (shouldOpen) {
          initialOpenFolders[item.title] = true;
        }
      }
    });
    setOpenFolders(initialOpenFolders);
  }, [pathname]);

  const toggleFolder = (folderTitle: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderTitle]: !prev[folderTitle],
    }));
  };

  if (!mounted) {
    return (
      <div className="w-16 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800" />
    );
  }

  return (
    <div
      className={`${
        collapsed ? "w-16" : "w-64"
      } h-screen fixed left-0 top-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col transition-width duration-300 ease-in-out`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item, index) => {
            if (item.type === "link") {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={`link-${index}`}
                  href={item.href}
                  className={`${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors`}
                >
                  <div className="mr-3 flex-shrink-0">{item.icon}</div>
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              );
            }

            if (item.type === "button") {
              return (
                <button
                  key={`button-${index}`}
                  onClick={item.onClick}
                  className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors"
                >
                  <div className="mr-3 flex-shrink-0">{item.icon}</div>
                  {!collapsed && <span>{item.title}</span>}
                </button>
              );
            }

            if (item.type === "folder") {
              const isOpen = openFolders[item.title] || false;
              const hasActiveChild = item.children.some(
                (child) => pathname === child.href
              );

              return (
                <div
                  key={`folder-${index}`}
                  className="space-y-1"
                >
                  <button
                    onClick={() => !collapsed && toggleFolder(item.title)}
                    className={`w-full ${
                      hasActiveChild && !collapsed
                        ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    } group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md transition-colors`}
                  >
                    <div className="flex items-center">
                      <div className="mr-3 flex-shrink-0">{item.icon}</div>
                      {!collapsed && <span>{item.title}</span>}
                    </div>
                    {!collapsed && (
                      <div className="flex-shrink-0">
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    )}
                  </button>

                  {!collapsed && isOpen && (
                    <div className="pl-6 space-y-1">
                      {item.children.map((child, childIndex) => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={`child-${index}-${childIndex}`}
                            href={child.href}
                            className={`${
                              isChildActive
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            } group flex items-center px-2 py-2 text-sm rounded-md transition-colors`}
                          >
                            <div className="mr-3 flex-shrink-0">
                              {child.icon}
                            </div>
                            <span>{child.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div
          className={`flex ${
            collapsed ? "justify-center" : "justify-between"
          } items-center mb-4`}
        >
          {/* {!collapsed && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Theme
            </span>
          )} */}
          {/* <ThemeToggle /> */}
        </div>

        {!collapsed && user && (
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
              {user.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {user.name || "User"}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {user.email || ""}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={`${
            collapsed ? "justify-center" : "justify-start"
          } w-full flex items-center px-2 py-2 text-sm font-medium rounded-md text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors`}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-3">Đăng xuất</span>}
        </button>
      </div>
    </div>
  );
}
