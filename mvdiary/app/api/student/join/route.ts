import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  CLASSROOM_CODE_REGEX,
  MAX_STUDENTS_PER_CLASS,
  MAX_STUDENT_NO,
  MIN_STUDENT_NO,
} from '@/lib/constants'
import { encodeStudentSession, STUDENT_SESSION_COOKIE_NAME } from '@/lib/student/session'

type Body = {
  classroomCode?: string
  studentNumber?: number | string
  studentName?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body

    const classroomCode = (body.classroomCode ?? '').trim().toUpperCase()
    const studentName = (body.studentName ?? '').trim()
    const studentNumberRaw = body.studentNumber
    const studentNumber =
      typeof studentNumberRaw === 'string' ? Number(studentNumberRaw) : Number(studentNumberRaw)

    if (!classroomCode || !studentName || !Number.isFinite(studentNumber)) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 })
    }

    if (!CLASSROOM_CODE_REGEX.test(classroomCode)) {
      return NextResponse.json({ error: '교실 코드 형식이 올바르지 않습니다.' }, { status: 400 })
    }

    if (studentNumber < MIN_STUDENT_NO || studentNumber > MAX_STUDENT_NO || !Number.isInteger(studentNumber)) {
      return NextResponse.json(
        { error: `학생 번호는 ${MIN_STUDENT_NO}~${MAX_STUDENT_NO} 사이여야 합니다.` },
        { status: 400 }
      )
    }

    if (studentName.length < 2 || studentName.length > 10) {
      return NextResponse.json({ error: '이름은 2~10자여야 합니다.' }, { status: 400 })
    }

    const supabase = await createClient()

    // Use SECURITY DEFINER RPC to avoid public table access.
    const { data, error } = await supabase.rpc('join_student', {
      p_classroom_code: classroomCode,
      p_student_number: studentNumber,
      p_student_name: studentName,
    })

    if (error) {
      const msg = String(error.message || '')
      if (msg.includes('Student slot already taken')) {
        return NextResponse.json(
          { error: '해당 번호는 이미 사용 중입니다. 다른 번호를 선택해 주세요.' },
          { status: 409 }
        )
      }
      if (msg.includes('Classroom not found')) {
        return NextResponse.json({ error: '교실을 찾을 수 없습니다.' }, { status: 404 })
      }
      return NextResponse.json({ error: '입장에 실패했습니다.' }, { status: 400 })
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row?.classroom_id || !row?.classroom_code) {
      return NextResponse.json({ error: '입장 처리에 실패했습니다.' }, { status: 500 })
    }

    const res = NextResponse.json({ success: true, redirectPath: '/dashboard/student' })
    res.cookies.set({
      name: STUDENT_SESSION_COOKIE_NAME,
      value: encodeStudentSession({
        classroomId: row.classroom_id,
        classroomCode: row.classroom_code,
        studentNumber,
        studentName,
      }),
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    })
    return res
  } catch (e) {
    console.error('Student join error:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}


