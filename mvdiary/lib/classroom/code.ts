import { CLASSROOM_CODE_REGEX } from '@/lib/constants'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function normalizeClassroomCode(input: string) {
  return input.trim().toUpperCase()
}

export function isValidClassroomCode(code: string) {
  return CLASSROOM_CODE_REGEX.test(code)
}

export function generateClassroomCode() {
  const a = LETTERS[Math.floor(Math.random() * LETTERS.length)]
  const b = LETTERS[Math.floor(Math.random() * LETTERS.length)]
  const digits = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${a}${b}${digits}`
}

export async function generateUniqueClassroomCode(params: {
  exists: (code: string) => Promise<boolean>
  maxAttempts?: number
}) {
  const maxAttempts = params.maxAttempts ?? 20
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateClassroomCode()
    if (!isValidClassroomCode(code)) continue
    if (!(await params.exists(code))) return code
  }
  throw new Error('Failed to generate unique classroom code')
}


