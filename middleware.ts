import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Route to permission mapping
const routePermissions: Record<string, string> = {
  "/map": "can-access-map",
  "/liveCamera": "can-access-live-camera",
  "/trafficLight": "can-access-traffic-light",
  "/utility/traffic-light-calculation": "can-access-traffic-light-calculator",
  "/statistics": "can-access-statistics",
  "/objectManagement": "can-access-object-management",
  "/settings": "can-access-settings",
  "/users/list": "can-access-user-list",
  "/users/pending": "can-access-user-pending",
  "/users/roles": "can-access-user-roles",
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle login/signup redirects
  if (pathname === "/login" || pathname === "/signup") {
    const token = await getToken({ req: request });
    if (token) {
      return NextResponse.redirect(new URL("/map", request.url));
    }
    return NextResponse.next();
  }

  // Check authentication for dashboard routes
  if (pathname.startsWith("/dashboard") || routePermissions[pathname]) {
    const token = await getToken({ req: request });

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Check permissions for specific routes
    const requiredPermission = routePermissions[pathname];
    if (requiredPermission) {
      try {
        // Fetch user permissions
        const response = await fetch(
          `${request.nextUrl.origin}/api/auth/permissions`,
          {
            headers: {
              Authorization: `Bearer ${token.sub}`,
              Cookie: request.headers.get("cookie") || "",
            },
          }
        );

        if (response.ok) {
          const permissions = await response.json();

          // Check if user has required permission
          if (!permissions[requiredPermission]) {
            // Redirect to a "no access" page or back to dashboard
            return NextResponse.redirect(new URL("/map", request.url));
          }
        }
      } catch (error) {
        console.error("Error checking permissions:", error);
        // On error, allow access but log the issue
      }
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/dashboard/:path*",
    "/map",
    "/liveCamera",
    "/trafficLight",
    "/utility/:path*",
    "/statistics",
    "/objectManagement",
    "/settings",
    "/users/:path*",
  ],
};
