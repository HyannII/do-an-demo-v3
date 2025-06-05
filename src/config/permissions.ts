// src/config/permissions.ts

export interface Permission {
  key: string;
  label: string;
  description: string;
  category: string;
}

export const PERMISSION_CATEGORIES = {
  NAVIGATION: "Điều hướng",
  USER_MANAGEMENT: "Quản lý người dùng",
  OBJECT_MANAGEMENT: "Quản lý danh mục",
  MONITORING: "Giám sát",
  UTILITY: "Tiện ích",
  SYSTEM: "Hệ thống",
} as const;

export const PERMISSIONS: Permission[] = [
  // Navigation permissions
  {
    key: "can-access-map",
    label: "Truy cập Bản đồ",
    description: "Quyền xem và sử dụng trang bản đồ",
    category: PERMISSION_CATEGORIES.NAVIGATION,
  },
  {
    key: "can-access-live-camera",
    label: "Truy cập Camera trực tiếp",
    description: "Quyền xem camera trực tiếp",
    category: PERMISSION_CATEGORIES.MONITORING,
  },
  {
    key: "can-access-traffic-light",
    label: "Truy cập Đèn giao thông",
    description: "Quyền xem và điều khiển đèn giao thông",
    category: PERMISSION_CATEGORIES.MONITORING,
  },
  {
    key: "can-access-traffic-light-calculator",
    label: "Truy cập Tính toán đèn giao thông",
    description: "Quyền sử dụng công cụ tính toán thời gian đèn giao thông",
    category: PERMISSION_CATEGORIES.UTILITY,
  },
  {
    key: "can-access-tcp-testing",
    label: "Truy cập TCP Testing",
    description: "Quyền sử dụng công cụ kiểm tra TCP Server",
    category: PERMISSION_CATEGORIES.UTILITY,
  },
  {
    key: "can-access-statistics",
    label: "Truy cập Thống kê",
    description: "Quyền xem các báo cáo và thống kê",
    category: PERMISSION_CATEGORIES.MONITORING,
  },
  {
    key: "can-access-object-management",
    label: "Truy cập Quản lý danh mục",
    description: "Quyền truy cập trang quản lý danh mục",
    category: PERMISSION_CATEGORIES.OBJECT_MANAGEMENT,
  },

  // Utility permissions
  {
    key: "can-access-utility",
    label: "Truy cập Tiện ích",
    description: "Quyền truy cập menu tiện ích",
    category: PERMISSION_CATEGORIES.UTILITY,
  },

  // User management permissions
  {
    key: "can-access-user-management",
    label: "Truy cập Quản lý người dùng",
    description: "Quyền truy cập menu quản lý người dùng",
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
  },
  {
    key: "can-access-user-list",
    label: "Truy cập Danh sách người dùng",
    description: "Quyền xem danh sách người dùng",
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
  },
  {
    key: "can-access-user-pending",
    label: "Truy cập Phê duyệt người dùng",
    description: "Quyền phê duyệt người dùng mới",
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
  },
  {
    key: "can-access-user-roles",
    label: "Truy cập Phân quyền",
    description: "Quyền quản lý vai trò và phân quyền",
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
  },
  {
    key: "can-edit-users",
    label: "Chỉnh sửa người dùng",
    description: "Quyền tạo, sửa, xóa người dùng",
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
  },
  {
    key: "can-manage-roles",
    label: "Quản lý vai trò",
    description: "Quyền tạo, sửa, xóa vai trò và gán quyền",
    category: PERMISSION_CATEGORIES.USER_MANAGEMENT,
  },

  // Object management permissions
  {
    key: "can-manage-cameras",
    label: "Quản lý Camera",
    description: "Quyền quản lý camera trong danh mục",
    category: PERMISSION_CATEGORIES.OBJECT_MANAGEMENT,
  },
  {
    key: "can-manage-traffic-lights",
    label: "Quản lý Đèn giao thông",
    description: "Quyền quản lý đèn giao thông trong danh mục",
    category: PERMISSION_CATEGORIES.OBJECT_MANAGEMENT,
  },
  {
    key: "can-manage-junctions",
    label: "Quản lý Nút giao",
    description: "Quyền quản lý nút giao trong danh mục",
    category: PERMISSION_CATEGORIES.OBJECT_MANAGEMENT,
  },
  {
    key: "can-manage-traffic-patterns",
    label: "Quản lý Mẫu pha đèn",
    description: "Quyền quản lý mẫu pha đèn giao thông",
    category: PERMISSION_CATEGORIES.OBJECT_MANAGEMENT,
  },
  {
    key: "can-manage-schedules",
    label: "Quản lý Lịch trình hoạt động",
    description: "Quyền quản lý lịch trình hoạt động đèn giao thông",
    category: PERMISSION_CATEGORIES.OBJECT_MANAGEMENT,
  },

  // System permissions
  {
    key: "can-view-system-logs",
    label: "Xem nhật ký hệ thống",
    description: "Quyền xem nhật ký hoạt động hệ thống",
    category: PERMISSION_CATEGORIES.SYSTEM,
  },
  {
    key: "can-manage-system-config",
    label: "Quản lý cấu hình hệ thống",
    description: "Quyền thay đổi cấu hình hệ thống",
    category: PERMISSION_CATEGORIES.SYSTEM,
  },
  {
    key: "can-access-settings",
    label: "Truy cập Cài đặt",
    description: "Quyền truy cập trang cài đặt hệ thống",
    category: PERMISSION_CATEGORIES.SYSTEM,
  },
];

// Helper functions
export const getPermissionsByCategory = (category: string): Permission[] => {
  return PERMISSIONS.filter((permission) => permission.category === category);
};

export const getPermissionByKey = (key: string): Permission | undefined => {
  return PERMISSIONS.find((permission) => permission.key === key);
};

export const getAllPermissionKeys = (): string[] => {
  return PERMISSIONS.map((permission) => permission.key);
};

// Default permission sets for common roles
export const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: getAllPermissionKeys(),
  USER: [
    "can-access-map",
    "can-access-live-camera",
    "can-access-traffic-light",
    "can-access-statistics",
    "can-access-utility",
    "can-access-traffic-light-calculator",
  ],
  OPERATOR: [
    "can-access-map",
    "can-access-live-camera",
    "can-access-traffic-light",
    "can-access-statistics",
    "can-access-object-management",
    "can-access-utility",
    "can-access-traffic-light-calculator",
    "can-manage-traffic-patterns",
    "can-manage-schedules",
  ],
  MANAGER: [
    "can-access-map",
    "can-access-live-camera",
    "can-access-traffic-light",
    "can-access-statistics",
    "can-access-object-management",
    "can-access-utility",
    "can-access-traffic-light-calculator",
    "can-access-user-management",
    "can-access-user-list",
    "can-access-user-pending",
    "can-edit-users",
    "can-manage-cameras",
    "can-manage-traffic-lights",
    "can-manage-junctions",
    "can-manage-traffic-patterns",
    "can-manage-schedules",
  ],
} as const;
