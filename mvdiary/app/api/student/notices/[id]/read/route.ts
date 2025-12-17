import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 공지사항 읽음 처리 API
 */
export async function POST(
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

    // 읽음 기록 생성/업데이트
    const { error } = await supabase.from('notice_reads').upsert({
      notice_id: params.id,
      user_id: user.id,
      read_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Mark notice read error:', error)
      return NextResponse.json(
        { error: '읽음 처리에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark notice read error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

