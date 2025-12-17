import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 교사: ToDo 할당 API
 * 전체 학급 또는 특정 학생에게 할당
 */
export async function POST(request: Request) {
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

    const { classId, title, description, dueDate, studentIds } = await request.json()

    if (!classId || !title) {
      return NextResponse.json(
        { error: '학급 ID와 제목을 입력해주세요.' },
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

    // 특정 학생에게 할당하는 경우
    if (studentIds && studentIds.length > 0) {
      const todos = await Promise.all(
        studentIds.map(async (studentId: string) => {
          const { data: todo, error: todoError } = await supabase
            .from('todos')
            .insert({
              class_id: classId,
              owner_user_id: studentId,
              title,
              description,
              due_date: dueDate || null,
              source: 'teacher',
              created_by: user.id,
            })
            .select()
            .single()

          if (!todoError && todo) {
            // 초기 상태 생성
            await supabase.from('todo_status').insert({
              todo_id: todo.id,
              user_id: studentId,
              is_done: false,
            })
          }

          return todo
        })
      )

      return NextResponse.json({ todos }, { status: 201 })
    }

    // 전체 학급에 할당
    // 학급의 모든 학생 조회
    const { data: students } = await supabase
      .from('student_classes')
      .select('student_id')
      .eq('class_id', classId)

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: '학급에 학생이 없습니다.' },
        { status: 400 }
      )
    }

    // 각 학생에게 ToDo 생성
    const todos = await Promise.all(
      students.map(async (sc: any) => {
        const { data: todo, error: todoError } = await supabase
          .from('todos')
          .insert({
            class_id: classId,
            owner_user_id: sc.student_id,
            title,
            description,
            due_date: dueDate || null,
            source: 'teacher',
            created_by: user.id,
          })
          .select()
          .single()

        if (!todoError && todo) {
          await supabase.from('todo_status').insert({
            todo_id: todo.id,
            user_id: sc.student_id,
            is_done: false,
          })
        }

        return todo
      })
    )

    return NextResponse.json({ todos }, { status: 201 })
  } catch (error) {
    console.error('Create teacher todo error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

