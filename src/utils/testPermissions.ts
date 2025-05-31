// src/utils/testPermissions.ts
// Utility to test permissions functionality

export const testPermissionsAPI = async () => {
  try {
    console.log("Testing /api/auth/me...");
    const meResponse = await fetch("/api/auth/me");
    console.log("Auth/me status:", meResponse.status);

    if (meResponse.ok) {
      const meData = await meResponse.json();
      console.log("User data:", meData);
    } else {
      console.error("Auth/me failed:", await meResponse.text());
    }

    console.log("Testing /api/auth/permissions...");
    const permissionsResponse = await fetch("/api/auth/permissions");
    console.log("Permissions status:", permissionsResponse.status);

    if (permissionsResponse.ok) {
      const permissionsData = await permissionsResponse.json();
      console.log("Permissions data:", permissionsData);
    } else {
      console.error("Permissions failed:", await permissionsResponse.text());
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
};

// Basic permissions for testing
export const basicPermissions = {
  "can-access-map": true,
  "can-access-live-camera": true,
  "can-access-traffic-light": true,
  "can-access-statistics": true,
  "can-access-object-management": false,
  "can-access-settings": false,
  "can-access-user-management": false,
  "can-access-user-list": false,
  "can-access-user-pending": false,
  "can-access-user-roles": false,
  "can-edit-users": false,
  "can-manage-roles": false,
  "can-manage-cameras": false,
  "can-manage-traffic-lights": false,
  "can-manage-junctions": false,
  "can-manage-traffic-patterns": false,
  "can-manage-schedules": false,
  "can-view-system-logs": false,
  "can-manage-system-config": false,
};

// Admin permissions for testing
export const adminPermissions = {
  "can-access-map": true,
  "can-access-live-camera": true,
  "can-access-traffic-light": true,
  "can-access-statistics": true,
  "can-access-object-management": true,
  "can-access-settings": true,
  "can-access-user-management": true,
  "can-access-user-list": true,
  "can-access-user-pending": true,
  "can-access-user-roles": true,
  "can-edit-users": true,
  "can-manage-roles": true,
  "can-manage-cameras": true,
  "can-manage-traffic-lights": true,
  "can-manage-junctions": true,
  "can-manage-traffic-patterns": true,
  "can-manage-schedules": true,
  "can-view-system-logs": true,
  "can-manage-system-config": true,
};
