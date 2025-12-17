import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabasePublicEnv } from '@/lib/supabase/env'

/**
 * Route Handler 전용 Supabase SSR 클라이언트
 * - API 라우트에서는 쿠키 set/remove가 반드시 동작해야 하므로 try/catch로 삼키지 않음
 * - 서버 컴포넌트에서는 사용하지 말 것
 */
export async function createRouteClient() {
  const cookieStore = await cookies()
  const env = getSupabasePublicEnv()

  if (!env.hasSupabaseUrl || !env.hasAnonKey || !env.isSupabaseUrlValidHttp) {
    throw new Error('Missing or invalid Supabase public env')
  }

  return createServerClient(env.supabaseUrl, env.anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options })
      },
    },
  })
}


