import { STUDENT_SESSION_COOKIE } from '@/lib/constants'

export type StudentSession = {
  classroomId: string
  classroomCode: string
  studentNumber: number
  studentName: string
}

export function encodeStudentSession(session: StudentSession) {
  // Minimal: base64 JSON (httpOnly cookie). Not cryptographically signed.
  // If tamper-proofing is required, add HMAC signing with a server secret.
  const json = JSON.stringify(session)
  return Buffer.from(json, 'utf8').toString('base64')
}

export function decodeStudentSession(raw: string | undefined): StudentSession | null {
  if (!raw) return null
  try {
    const json = Buffer.from(raw, 'base64').toString('utf8')
    const parsed = JSON.parse(json) as StudentSession
    if (
      !parsed ||
      typeof parsed.classroomId !== 'string' ||
      typeof parsed.classroomCode !== 'string' ||
      typeof parsed.studentNumber !== 'number' ||
      typeof parsed.studentName !== 'string'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export const STUDENT_SESSION_COOKIE_NAME = STUDENT_SESSION_COOKIE


