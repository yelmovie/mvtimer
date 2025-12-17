import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicEnv, getSupabaseServiceRoleEnv } from '@/lib/supabase/env'

/**
 * 서버 전용(Admin) Supabase 클라이언트
 * - RLS를 우회할 수 있으므로 Route Handler 등 "서버"에서만 사용
 * - 절대 클라이언트 번들로 노출하지 말 것
 */
export function createAdminClient() {
  const pub = getSupabasePublicEnv()
  const srv = getSupabaseServiceRoleEnv()

  if (!pub.hasSupabaseUrl || !pub.isSupabaseUrlValidHttp || !srv.hasServiceRoleKey) {
    throw new Error('Missing Supabase admin env')
  }

  return createClient(pub.supabaseUrl, srv.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export function getAdminEnvStatus() {
  const pub = getSupabasePublicEnv()
  const srv = getSupabaseServiceRoleEnv()
  return {
    hasSupabaseUrl: pub.hasSupabaseUrl,
    isSupabaseUrlValidHttp: pub.isSupabaseUrlValidHttp,
    hasServiceRoleKey: srv.hasServiceRoleKey,
  } as const
}


