import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 교사: 학급별 학생 목록 및 ToDo 달성률 조회 API
 * 선택된 class_id 기준으로 필터링
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    if (!classId) {
      return NextResponse.json(
        { error: '학급 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 담당 학급 확인
    const { data: teacherClass } = await supabase
      .from('teacher_classes')
      .select('class_id')
      .eq('teacher_id', user.id)
      .eq('class_id', classId)
      .single()

    if (!teacherClass) {
      return NextResponse.json(
        { error: '담당 학급이 아닙니다.' },
        { status: 403 }
      )
    }

    // 학급 학생 목록 조회
    const { data: students, error: studentsError } = await supabase
      .from('student_classes')
      .select('student_id, profiles(display_name, user_id)')
      .eq('class_id', classId)

    if (studentsError) {
      console.error('Students query error:', studentsError)
      return NextResponse.json(
        { error: '학생 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    // 오늘 날짜
    const today = new Date().toISOString().split('T')[0]

    // 각 학생의 ToDo 달성률 계산
    const studentsWithProgress = await Promise.all(
      (students || []).map(async (sc: any) => {
        const studentId = sc.student_id

        // 오늘 기준 ToDo 조회
        const { data: todos } = await supabase
          .from('todos')
          .select('id, todo_status!inner(is_done)')
          .eq('class_id', classId)
          .or(`owner_user_id.eq.${studentId},owner_user_id.is.null`)
          .lte('due_date', today)
          .eq('todo_status.user_id', studentId)

        const totalTodos = todos?.length || 0
        const completedTodos =
          todos?.filter((t: any) => t.todo_status?.[0]?.is_done).length || 0
        const completionRate =
          totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0

        return {
          id: studentId,
          displayName: sc.profiles?.display_name || '',
          completionRate: Math.round(completionRate),
          totalTodos,
          completedTodos,
        }
      })
    )

    return NextResponse.json({ students: studentsWithProgress })
  } catch (error) {
    console.error('Get teacher students error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

