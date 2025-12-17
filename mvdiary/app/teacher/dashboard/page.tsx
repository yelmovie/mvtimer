import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TeacherDashboard from '@/components/teacher/TeacherDashboard'
import { isStudentRole, ROUTES, isTeacherRole } from '@/lib/routing'
import { getUserRole } from '@/lib/auth/role'

/**
 * 교사 대시보드 페이지
 * 인증 및 권한 확인 후 렌더링
 */
export default async function TeacherDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.HOME)
  }

  // 역할 확인: One Source of Truth 사용
  const roleResult = await getUserRole()
  
  // role이 null이면 홈으로 리다이렉트
  if (roleResult.error || !roleResult.role) {
    redirect(ROUTES.HOME)
  }

  // 학생 역할인 경우 학생 대시보드로 리다이렉트 (교사가 잘못 들어오는 경우 방지)
  if (isStudentRole(roleResult.role)) {
    redirect(ROUTES.STUDENT_DASHBOARD)
  }

  // 교사/관리자 역할이 아니면 홈으로
  if (!isTeacherRole(roleResult.role)) {
    redirect(ROUTES.HOME)
  }

  // 프로필 정보 조회 (display_name)
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .single()

  return <TeacherDashboard displayName={profile?.display_name || ''} />
}

