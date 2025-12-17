import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 현재 사용자 정보 조회 API
 * 서버에서 권한 재검증
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // 인증 상태 확인
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

    // 프로필 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, display_name, school_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '프로필 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: profile.role,
        displayName: profile.display_name,
        schoolId: profile.school_id,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

