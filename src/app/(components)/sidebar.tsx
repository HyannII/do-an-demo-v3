"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronDown, ChevronUp } from "lucide-react";
import { signOut } from "next-auth/react";
import { navItems, NavItem } from "@/config/nav-items";
import { usePermissions } from "../../hooks/usePermissions";

interface SidebarProps {
  user: { name?: string | null; email?: string | null };
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  junctionId?: string; // Add junctionId as an optional prop
}

// Map navigation routes to required permissions
const routePermissions: Record<string, string> = {
  "/map": "can-access-map",
  "/liveCamera": "can-access-live-camera",
  "/trafficLight": "can-access-traffic-light",
  "/utility/traffic-light-calculation": "can-access-traffic-light-calculator",
  "/utility/tcp-testing": "can-access-tcp-testing",
  "/statistics": "can-access-statistics",
  "/objectManagement": "can-access-object-management",
  "/settings": "can-access-settings",
  "/users/list": "can-access-user-list",
  "/users/pending": "can-access-user-pending",
  "/users/roles": "can-access-user-roles",
};

// Map folder titles to required permissions
const folderPermissions: Record<string, string> = {
  "Quản lý người dùng": "can-access-user-management",
  "Tiện ích": "can-access-utility",
};

// Default accessible routes when permissions fail to load
const defaultAccessibleRoutes = [
  "/map",
  "/liveCamera",
  "/trafficLight",
  "/utility/traffic-light-calculation",
  "/utility/tcp-testing",
  "/statistics",
];

export function Sidebar({
  user,
  collapsed,
  junctionId,
}: SidebarProps) {
  const pathname = usePathname();
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const { hasPermission, loading, permissions } =
    usePermissions();

  // Auto-open folders based on active path
  useEffect(() => {
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

  // Check if user has permission to access a route
  const canAccessRoute = (href: string): boolean => {
    const permission = routePermissions[href];

    // If still loading permissions, show default routes
    if (loading) {
      return defaultAccessibleRoutes.includes(href);
    }

    // If no permission required or if permissions object is empty (fallback), allow basic routes
    if (!permission) {
      return true;
    }

    // Check if permissions object is empty (API failed), allow default routes
    if (Object.keys(permissions).length === 0) {
      return defaultAccessibleRoutes.includes(href);
    }

    return hasPermission(permission);
  };

  // Check if user can access any child in a folder
  const canAccessFolder = (children: NavItem[], folderTitle?: string): boolean => {
    // First check if user has explicit folder permission
    if (folderTitle && folderPermissions[folderTitle]) {
      const folderPermission = folderPermissions[folderTitle];
      if (
        !hasPermission(folderPermission) &&
        Object.keys(permissions).length > 0
      ) {
        return false;
      }
    }

    // Then check if user can access any child
    return children.some((child) => {
      // Only check href for link items
      if (child.type === "link") {
        return canAccessRoute(child.href);
      }
      // For buttons and other types, allow access
      return true;
    });
  };

  // Filter nav items based on permissions
  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => {
        if (item.type === "link") {
          return canAccessRoute(item.href);
        }
        if (item.type === "folder") {
          // Show folder if user has access to any child
          const hasAccessToChildren = canAccessFolder(
            item.children,
            item.title
          );
          if (!hasAccessToChildren) return false;

          // Filter children based on permissions
          const accessibleChildren = item.children.filter((child) => {
            if (child.type === "link") {
              return canAccessRoute(child.href);
            }
            return true; // Allow buttons and other types
          });
          return accessibleChildren.length > 0;
        }
        return true; // Show buttons and other types
      })
      .map((item) => {
        if (item.type === "folder") {
          // Return folder with filtered children
          return {
            ...item,
            children: item.children.filter((child) => {
              if (child.type === "link") {
                return canAccessRoute(child.href);
              }
              return true; // Allow buttons and other types
            }),
          };
        }
        return item;
      });
  };

  const accessibleNavItems = filterNavItems(navItems);

  return (
    <div
      className={`${
        collapsed ? "w-16" : "w-64"
      } h-screen fixed left-0 top-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col transition-all duration-300 ease-in-out`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 h-[6vh]">
        {!collapsed && (
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {loading && !collapsed && (
          <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
            Đang tải menu...
          </div>
        )}

        <nav className="space-y-1 px-2">
          {accessibleNavItems.map((item, index) => {
            if (item.type === "link") {
              // Handle the "Camera" link specifically
              if (
                item.title === "Camera" &&
                item.href.includes("[junctionId]")
              ) {
                // If junctionId isn't provided, you can skip rendering or set a fallback href
                if (!junctionId) {
                  return null; // Skip rendering the link if junctionId is not available
                }

                const resolvedHref = `/junctionCameras/${junctionId}`;
                const isActive = pathname === resolvedHref;

                return (
                  <Link
                    key={`link-${index}`}
                    href={resolvedHref}
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

              // Handle other links normally
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

          {/* Show message if no items are accessible */}
          {accessibleNavItems.length === 0 && !loading && (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Không có quyền truy cập menu nào
              </p>
            </div>
          )}
        </nav>
      </div>

      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800">
        <div
          className={`flex ${
            collapsed ? "justify-center" : "justify-between"
          } items-center mb-4`}
        >
          {/* Theme toggle commented out */}
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
