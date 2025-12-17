import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicEnv } from '@/lib/supabase/env'

/**
 * 클라이언트 사이드 Supabase 클라이언트
 * 브라우저에서만 사용하며, 서버에서는 절대 사용하지 않음
 */
export function createClient() {
  const env = getSupabasePublicEnv()
  if (!env.hasSupabaseUrl || !env.hasAnonKey || !env.isSupabaseUrlValidHttp) {
    throw new Error('Missing or invalid Supabase public env')
  }
  return createBrowserClient(
    env.supabaseUrl,
    env.anonKey
  )
}

