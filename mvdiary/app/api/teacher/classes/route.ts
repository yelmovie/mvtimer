import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 교사 담당 학급 목록 조회 API
 * teacher_classes 기준으로 조회
 */
export async function GET() {
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

    // 교사 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
      return NextResponse.json(
        { error: '교사 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    // 담당 학급 조회
    const { data: teacherClasses, error: classesError } = await supabase
      .from('teacher_classes')
      .select('class_id, role, classes(id, name, school_year, schools(id, name))')
      .eq('teacher_id', user.id)

    if (classesError) {
      console.error('Teacher classes query error:', classesError)
      return NextResponse.json(
        { error: '학급 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ classes: teacherClasses || [] })
  } catch (error) {
    console.error('Get teacher classes error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

