function stripBomAndTrim(value: string | undefined) {
  if (typeof value !== 'string') return ''
  return value.replace(/^\uFEFF/, '').trim()
}

export function getPublicSiteUrl() {
  const raw = stripBomAndTrim(process.env.NEXT_PUBLIC_SITE_URL)
  if (raw) return raw
  return 'http://localhost:3000'
}


