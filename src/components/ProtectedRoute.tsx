"use client";

import { ReactNode } from "react";
import { usePermissions } from "../hooks/usePermissions";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission: string;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  fallback = null,
}) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-white">Đang kiểm tra quyền truy cập...</div>
      </div>
    );
  }

  if (!hasPermission(requiredPermission)) {
    return (
      fallback || (
        <div className="flex h-[calc(100vh-64px)]">
          <div className="flex-1 p-6 bg-gray-900 overflow-y-auto">
            <div className="text-center py-12">
              <div className="mb-4">
                <svg
                  className="mx-auto h-16 w-16 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Không có quyền truy cập
              </h3>
              <p className="text-gray-400">
                Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản
                trị viên để được cấp quyền.
              </p>
            </div>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
};
