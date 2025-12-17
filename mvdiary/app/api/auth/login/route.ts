import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getDashboardPathByRole } from '@/lib/routing'
import { getUserRoleById } from '@/lib/auth/role'

/**
 * 로그인 API
 * ID/PW 기반 인증 후 role 기반 자동 분기 정보 반환
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 로그인
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json(
        { error: '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.' },
        { status: 401 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 역할 확인: One Source of Truth 사용
    const roleResult = await getUserRoleById(authData.user.id)
    
    // role이 null이면 오류 처리 (기본값 student로 보내지 않음)
    if (roleResult.error || !roleResult.role) {
      return NextResponse.json(
        { error: roleResult.error || '사용자 역할을 확인할 수 없습니다.' },
        { status: 403 }
      )
    }

    // 프로필 정보 조회 (display_name, school_id)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, school_id')
      .eq('user_id', authData.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '프로필 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // role 기반 리다이렉트 경로 반환 (One Source of Truth)
    const redirectPath = getDashboardPathByRole(roleResult.role)

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: roleResult.role,
        displayName: profile.display_name,
        schoolId: profile.school_id,
      },
      redirectPath,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

