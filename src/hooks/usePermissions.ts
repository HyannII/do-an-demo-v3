"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getAllPermissionKeys } from "../config/permissions";

export interface UserPermissions {
  [key: string]: boolean;
}

export const usePermissions = () => {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (status === "loading") return;

      if (!session?.user) {
        setPermissions({});
        setLoading(false);
        return;
      }

      try {
        // Fetch user's role and permissions
        const response = await fetch("/api/auth/permissions");

        if (response.ok) {
          const userPermissions = await response.json();
          setPermissions(userPermissions);
        } else {
          console.error(
            "Failed to fetch permissions, status:",
            response.status
          );

          // Fallback: Try to get user info to check if admin
          try {
            const userResponse = await fetch("/api/auth/me");
            if (userResponse.ok) {
              const userData = await userResponse.json();

              // If user is admin, give all permissions
              if (userData.role?.roleName?.toLowerCase().includes("admin")) {
                const allPermissions: Record<string, boolean> = {};
                getAllPermissionKeys().forEach((key) => {
                  allPermissions[key] = true;
                });
                setPermissions(allPermissions);
              } else {
                // For non-admin users, give basic permissions if we can't fetch from API
                setPermissions({
                  "can-access-map": true,
                  "can-access-live-camera": true,
                  "can-access-traffic-light": true,
                  "can-access-traffic-light-calculator": true,
                  "can-access-statistics": true,
                  "can-access-utility": true,
                });
              }
            } else {
              // Ultimate fallback - basic permissions
              setPermissions({
                "can-access-map": true,
                "can-access-live-camera": true,
              });
            }
          } catch (fallbackError) {
            console.error("Fallback permission fetch failed:", fallbackError);
            // Ultimate fallback - basic permissions
            setPermissions({
              "can-access-map": true,
              "can-access-live-camera": true,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);

        // Fallback: Give basic permissions to avoid breaking the app
        setPermissions({
          "can-access-map": true,
          "can-access-live-camera": true,
          "can-access-traffic-light": true,
          "can-access-traffic-light-calculator": true,
          "can-access-statistics": true,
          "can-access-utility": true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, [session, status]);

  const hasPermission = (permission: string): boolean => {
    return permissions[permission] === true;
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some((permission) => hasPermission(permission));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every((permission) => hasPermission(permission));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    loading,
  };
};
