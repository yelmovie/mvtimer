export function getStudentChecklistStorageKey(params: {
  userId: string
  year: number
  monthIndex0: number
}) {
  const month = String(params.monthIndex0 + 1).padStart(2, '0')
  return `mvdiary:studentChecklist:${params.userId}:${params.year}-${month}`
}

export function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}


