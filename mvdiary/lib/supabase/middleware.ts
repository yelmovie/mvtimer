import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublicEnv } from '@/lib/supabase/env'

/**
 * 미들웨어용 Supabase 클라이언트
 * 인증 상태 확인 및 리다이렉트 처리
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const env = getSupabasePublicEnv()
  if (!env.hasSupabaseUrl || !env.hasAnonKey || !env.isSupabaseUrlValidHttp) {
    // middleware에서 값 노출 금지: 존재 여부만
    console.error('[supabase-middleware] missing_or_invalid_env', {
      hasSupabaseUrl: env.hasSupabaseUrl,
      hasAnonKey: env.hasAnonKey,
      isSupabaseUrlValidHttp: env.isSupabaseUrlValidHttp,
    })
    return response
  }

  const supabase = createServerClient(
    env.supabaseUrl,
    env.anonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

