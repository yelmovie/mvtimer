import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 학생 ToDo 목록 조회 API
 * 오늘 기준 달성률 계산 포함
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // 인증 확인
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

    // 학생 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'student') {
      return NextResponse.json(
        { error: '학생 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // 소속 학급 조회
    const { data: studentClasses } = await supabase
      .from('student_classes')
      .select('class_id')
      .eq('student_id', user.id)

    if (!studentClasses || studentClasses.length === 0) {
      return NextResponse.json({ todos: [], completionRate: 0 })
    }

    const classIds = studentClasses.map((sc) => sc.class_id)

    // 오늘 날짜의 ToDo 조회
    // 먼저 ToDo 목록 조회
    const { data: todosData, error: todosError } = await supabase
      .from('todos')
      .select('*')
      .in('class_id', classIds)
      .or(`owner_user_id.eq.${user.id},owner_user_id.is.null`)
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false })

    if (todosError) {
      console.error('Todos query error:', todosError)
      return NextResponse.json(
        { error: 'ToDo 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    // 각 ToDo의 상태 조회
    const todos = await Promise.all(
      (todosData || []).map(async (todo) => {
        const { data: status } = await supabase
          .from('todo_status')
          .select('is_done, done_at')
          .eq('todo_id', todo.id)
          .eq('user_id', user.id)
          .single()

        return {
          ...todo,
          todo_status: status ? [status] : [],
        }
      })
    )

    // 달성률 계산 (오늘 기준)
    const today = new Date().toISOString().split('T')[0]
    const todayTodos = todos?.filter(
      (todo) => !todo.due_date || todo.due_date <= today
    ) || []
    const completedCount = todayTodos.filter(
      (todo) => todo.todo_status?.[0]?.is_done
    ).length
    const completionRate =
      todayTodos.length > 0 ? (completedCount / todayTodos.length) * 100 : 0

    return NextResponse.json({
      todos: todos || [],
      completionRate: Math.round(completionRate),
    })
  } catch (error) {
    console.error('Get student todos error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 학생 ToDo 생성 API
 * source = 'student'로 고정
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

    const { title, description, dueDate, classId } = await request.json()

    if (!title || !classId) {
      return NextResponse.json(
        { error: '제목과 학급을 입력해주세요.' },
        { status: 400 }
      )
    }

    // 학생 권한 및 소속 학급 확인
    const { data: studentClass } = await supabase
      .from('student_classes')
      .select('class_id')
      .eq('student_id', user.id)
      .eq('class_id', classId)
      .single()

    if (!studentClass) {
      return NextResponse.json(
        { error: '소속 학급이 아닙니다.' },
        { status: 403 }
      )
    }

    // ToDo 생성
    const { data: todo, error: todoError } = await supabase
      .from('todos')
      .insert({
        class_id: classId,
        owner_user_id: user.id,
        title,
        description,
        due_date: dueDate || null,
        source: 'student',
        created_by: user.id,
      })
      .select()
      .single()

    if (todoError) {
      console.error('Create todo error:', todoError)
      return NextResponse.json(
        { error: 'ToDo 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 초기 상태 생성
    await supabase.from('todo_status').insert({
      todo_id: todo.id,
      user_id: user.id,
      is_done: false,
    })

    return NextResponse.json({ todo }, { status: 201 })
  } catch (error) {
    console.error('Create student todo error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

