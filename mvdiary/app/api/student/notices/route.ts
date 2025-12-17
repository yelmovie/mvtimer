import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 학생 공지사항 조회 API
 * 소속 학급 공지만 조회, 읽음 여부 포함
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

    // 소속 학급 조회
    const { data: studentClasses } = await supabase
      .from('student_classes')
      .select('class_id')
      .eq('student_id', user.id)

    if (!studentClasses || studentClasses.length === 0) {
      return NextResponse.json({ notices: [] })
    }

    const classIds = studentClasses.map((sc) => sc.class_id)

    // 공지사항 조회 (발행일 기준)
    const { data: notices, error: noticesError } = await supabase
      .from('notices')
      .select('*')
      .in('class_id', classIds)
      .lte('publish_at', new Date().toISOString())
      .order('pinned', { ascending: false })
      .order('publish_at', { ascending: false })

    if (noticesError) {
      console.error('Notices query error:', noticesError)
      return NextResponse.json(
        { error: '공지사항을 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    // 각 공지사항의 읽음 여부 조회
    const noticesWithReadStatus = await Promise.all(
      (notices || []).map(async (notice) => {
        const { data: readData } = await supabase
          .from('notice_reads')
          .select('read_at')
          .eq('notice_id', notice.id)
          .eq('user_id', user.id)
          .single()

        return {
          ...notice,
          isRead: !!readData?.read_at,
        }
      })
    )

    return NextResponse.json({ notices: noticesWithReadStatus })
  } catch (error) {
    console.error('Get student notices error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

