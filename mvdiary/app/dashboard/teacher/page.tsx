import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TeacherDashboard from '@/components/classroomAccess/TeacherDashboard'
import { getUserRole } from '@/lib/auth/role'
import { isTeacherRole, isStudentRole } from '@/lib/routing'
import { ROUTES } from '@/lib/routing'

/**
 * 교사 대시보드 페이지 (classroom_access 스키마 기반)
 * 권한 판단: profiles.role만 사용 (One Source of Truth)
 */
export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.LOGIN_TEACHER)
  }

  // 권한 확인: profiles.role만 사용 (One Source of Truth)
  const roleResult = await getUserRole()
  
  // role이 null이면 홈으로 리다이렉트
  if (roleResult.error || !roleResult.role) {
    redirect(ROUTES.HOME)
  }

  // 학생 역할인 경우 학생 대시보드로 교정 리다이렉트
  if (isStudentRole(roleResult.role)) {
    redirect(ROUTES.STUDENT_DASHBOARD)
  }

  // 교사/관리자 역할이 아니면 홈으로
  if (!isTeacherRole(roleResult.role)) {
    redirect(ROUTES.HOME)
  }

  // classroom 조회 (classroom_access 스키마)
  const { data: classroom, error: classroomError } = await supabase
    .from('classrooms')
    .select('id, code')
    .eq('teacher_id', user.id)
    .maybeSingle()

  // classroom이 없을 때 처리
  // - DB 저장 실패 / RLS 오류 / 네트워크 오류 → 세션 유지 + 오류 안내
  // - 반 생성 필요 → 안내 메시지 표시
  // - 어떤 경우에도 학생 대시보드로 자동 이동시키지 않음
  if (!classroom) {
    // RLS 오류인지 확인
    if (classroomError) {
      console.error('[dashboard/teacher] classroom query error:', classroomError)
      // 세션은 유지하고, 빈 상태로 대시보드 표시 (오류 안내는 컴포넌트에서)
    }
    
    // classroom이 없어도 교사 대시보드 접근은 허용 (반 생성 안내 표시)
    return (
      <TeacherDashboard
        classroomCode={null}
        students={[]}
        showSetupMessage={true}
      />
    )
  }

  // 학생 목록 조회
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('student_number, student_name, created_at')
    .eq('classroom_id', classroom.id)
    .order('student_number', { ascending: true })

  if (studentsError) {
    console.error('[dashboard/teacher] students query error:', studentsError)
  }

  return (
    <TeacherDashboard
      classroomCode={classroom.code}
      students={(students ?? []).map((s: any) => ({
        studentNumber: s.student_number,
        studentName: s.student_name,
      }))}
    />
  )
}


