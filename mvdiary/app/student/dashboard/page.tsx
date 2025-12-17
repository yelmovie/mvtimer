import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentDashboard from '@/components/student/StudentDashboard'
import { isStudentRole, ROUTES } from '@/lib/routing'
import { getUserRole } from '@/lib/auth/role'

/**
 * 학생 대시보드 페이지
 * 인증 및 권한 확인 후 렌더링
 */
export default async function StudentDashboardPage() {
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

  // 학생 역할이 아니면 차단 및 올바른 대시보드로 교정 리다이렉트
  if (!isStudentRole(roleResult.role)) {
    // 교사/관리자인 경우 교사 대시보드로 리다이렉트
    redirect(ROUTES.TEACHER_DASHBOARD)
  }

  // 프로필 정보 조회 (display_name)
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .single()

  return <StudentDashboard displayName={profile?.display_name || ''} userId={user.id} />
}

