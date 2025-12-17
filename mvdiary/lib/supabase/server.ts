import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabasePublicEnv } from '@/lib/supabase/env'

/**
 * 서버 사이드 Supabase 클라이언트
 * RLS 정책과 함께 서버에서 권한 검증에 사용
 * 
 * 보안 원칙:
 * - 모든 데이터 접근은 서버에서 재검증
 * - 클라이언트는 절대 신뢰하지 않음
 */
export async function createClient() {
  const cookieStore = await cookies()

  const env = getSupabasePublicEnv()
  if (!env.hasSupabaseUrl || !env.hasAnonKey || !env.isSupabaseUrlValidHttp) {
    throw new Error('Missing or invalid Supabase public env')
  }

  return createServerClient(
    env.supabaseUrl,
    env.anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // 서버 컴포넌트에서만 set 가능
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // 서버 컴포넌트에서만 remove 가능
          }
        },
      },
    }
  )
}

