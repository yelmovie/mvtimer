import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicEnv, getSupabaseServiceRoleEnv } from '@/lib/supabase/env'

/**
 * 서버 전용 Supabase Admin 클라이언트 (Service Role)
 * - RLS를 우회할 수 있으므로 Route Handler 등 서버에서만 사용
 * - 절대 클라이언트/브라우저 코드에서 import 하지 말 것
 */
export function createSupabaseAdminClient() {
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

export function getSupabaseAdminEnvStatus() {
  const pub = getSupabasePublicEnv()
  const srv = getSupabaseServiceRoleEnv()
  return {
    hasSupabaseUrl: pub.hasSupabaseUrl,
    isSupabaseUrlValidHttp: pub.isSupabaseUrlValidHttp,
    hasServiceRoleKey: srv.hasServiceRoleKey,
  } as const
}


