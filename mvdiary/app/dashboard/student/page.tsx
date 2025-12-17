import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import StudentDashboard from '@/components/classroomAccess/StudentDashboard'
import { decodeStudentSession, STUDENT_SESSION_COOKIE_NAME } from '@/lib/student/session'

export default async function Page() {
  const cookieStore = await cookies()
  const raw = cookieStore.get(STUDENT_SESSION_COOKIE_NAME)?.value
  const session = decodeStudentSession(raw)

  if (!session) redirect('/enter')

  return (
    <StudentDashboard
      classroomCode={session.classroomCode}
      studentNumber={session.studentNumber}
      studentName={session.studentName}
    />
  )
}


