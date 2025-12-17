import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 미들웨어: 인증 상태 확인 및 보호된 라우트 처리
 */
export async function middleware(request: NextRequest) {
  // Public/static should always pass through (defense-in-depth even if matcher changes)
  const { pathname } = request.nextUrl
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/enter') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/assets')
  ) {
    return NextResponse.next()
  }

  // Keep existing Supabase session refresh behavior for protected areas.
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Protect only authenticated areas (explicit allowlist).
    // NOTE: '/dashboard/student' uses a separate student-session cookie flow and must stay public.
    '/student/:path*',
    '/teacher/:path*',
    '/dashboard/teacher/:path*',
  ],
}

