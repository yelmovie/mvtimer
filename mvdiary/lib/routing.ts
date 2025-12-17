/**
 * 라우팅 경로 상수 및 역할 기반 리다이렉트 로직
 * One Source of Truth: 모든 역할/경로 분기는 여기서 관리
 */

export const ROUTES = {
  HOME: '/',
  LOGIN_TEACHER: '/login/teacher',
  LOGIN_STUDENT: '/enter',
  SIGNUP: '/signup',
  TEACHER_DASHBOARD: '/teacher/dashboard',
  STUDENT_DASHBOARD: '/student/dashboard',
  TEACHER_RESET_PASSWORD: '/teacher/reset-password',
} as const

export type UserRole = 'student' | 'teacher' | 'admin'

/**
 * 역할 기반 대시보드 경로 반환
 * @param role 사용자 역할
 * @returns 대시보드 경로
 */
export function getDashboardPathByRole(role: UserRole | string | null | undefined): string {
  if (role === 'student') {
    return ROUTES.STUDENT_DASHBOARD
  }
  // teacher, admin, 또는 기타 모든 경우 교사 대시보드
  return ROUTES.TEACHER_DASHBOARD
}

/**
 * 역할이 교사/관리자인지 확인
 */
export function isTeacherRole(role: UserRole | string | null | undefined): boolean {
  return role === 'teacher' || role === 'admin'
}

/**
 * 역할이 학생인지 확인
 */
export function isStudentRole(role: UserRole | string | null | undefined): boolean {
  return role === 'student'
}

