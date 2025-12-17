import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 학생 ToDo 상태 업데이트 API
 * 교사 항목은 완료 체크만 가능, 제목 수정 불가
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const { isDone } = await request.json()

    // ToDo 정보 조회
    const { data: todo, error: todoError } = await supabase
      .from('todos')
      .select('source, owner_user_id')
      .eq('id', params.id)
      .single()

    if (todoError || !todo) {
      return NextResponse.json(
        { error: 'ToDo를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 교사 항목은 완료 체크만 가능
    if (todo.source === 'teacher' && todo.owner_user_id !== user.id) {
      // 완료 상태만 업데이트 가능
      const { error: statusError } = await supabase
        .from('todo_status')
        .upsert({
          todo_id: params.id,
          user_id: user.id,
          is_done: isDone,
          done_at: isDone ? new Date().toISOString() : null,
        })

      if (statusError) {
        return NextResponse.json(
          { error: '상태 업데이트에 실패했습니다.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    // 학생 자신의 ToDo는 수정 가능
    if (todo.owner_user_id === user.id && todo.source === 'student') {
      const { title, description, dueDate, isDone: statusDone } = await request.json()

      // ToDo 업데이트
      const updateData: any = {}
      if (title !== undefined) updateData.title = title
      if (description !== undefined) updateData.description = description
      if (dueDate !== undefined) updateData.due_date = dueDate

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('todos')
          .update(updateData)
          .eq('id', params.id)
          .eq('owner_user_id', user.id)

        if (updateError) {
          return NextResponse.json(
            { error: 'ToDo 수정에 실패했습니다.' },
            { status: 500 }
          )
        }
      }

      // 상태 업데이트
      if (statusDone !== undefined) {
        await supabase.from('todo_status').upsert({
          todo_id: params.id,
          user_id: user.id,
          is_done: statusDone,
          done_at: statusDone ? new Date().toISOString() : null,
        })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: '권한이 없습니다.' },
      { status: 403 }
    )
  } catch (error) {
    console.error('Update student todo error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

