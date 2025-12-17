function stripBomAndTrim(value: string | undefined) {
  if (typeof value !== 'string') return ''
  return value.replace(/^\uFEFF/, '').trim()
}

export function getSupabasePublicEnv() {
  const supabaseUrl = stripBomAndTrim(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const anonKey = stripBomAndTrim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  let isUrlValidHttp = false
  try {
    const u = new URL(supabaseUrl)
    isUrlValidHttp = u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    isUrlValidHttp = false
  }

  return {
    supabaseUrl,
    anonKey,
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(anonKey),
    isSupabaseUrlValidHttp: isUrlValidHttp,
  } as const
}

export function getSupabaseServiceRoleEnv() {
  const serviceRoleKey = stripBomAndTrim(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  )
  return {
    serviceRoleKey,
    hasServiceRoleKey: Boolean(serviceRoleKey),
  } as const
}


