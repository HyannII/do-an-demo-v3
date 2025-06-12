import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Add paths that should be dynamic
const dynamicPaths = [
  '/utility/tcp-testing',
  '/settings',
  '/map',
  '/users/list',
  '/users/pending',
  '/users/roles',
  '/utility/traffic-light-calculation',
  '/trafficLight',
  '/objectManagement',
  '/liveCamera',
  '/statistics'
]

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Check if the path is in our dynamic paths list
  if (dynamicPaths.some(dynamicPath => path.startsWith(dynamicPath))) {
    // Add cache control headers for dynamic routes
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'no-store, must-revalidate')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 