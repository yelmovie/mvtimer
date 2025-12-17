import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabasePublicEnv } from '@/lib/supabase/env'
import { getPublicSiteUrl } from '@/lib/config/site'
import {
  createSupabaseAdminClient,
  getSupabaseAdminEnvStatus,
} from '@/lib/supabaseAdmin'
import { isTeacherRole } from '@/lib/routing'

type Body = {
  email?: string
}

function isValidEmail(email: string) {
  // minimal email validation (avoid over-restricting)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body
    const email = (body.email ?? '').trim()

    console.error('[teacher-reset-password] step=validate', {
      hasEmail: Boolean(email),
    })

    const env = getSupabasePublicEnv()
    if (!env.hasSupabaseUrl || !env.hasAnonKey || !env.isSupabaseUrlValidHttp) {
      console.error('[teacher-reset-password] step=env_missing_or_invalid', {
        hasSupabaseUrl: env.hasSupabaseUrl,
        hasAnonKey: env.hasAnonKey,
        isSupabaseUrlValidHttp: env.isSupabaseUrlValidHttp,
      })
      return NextResponse.json(
        { ok: false, message: '서버 설정이 올바르지 않아 요청을 처리할 수 없습니다.' },
        { status: 500 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { ok: false, message: '이메일을 입력해 주세요.' },
        { status: 400 }
      )
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, message: '이메일 형식을 확인해 주세요.' },
        { status: 400 }
      )
    }

    // teacher-only: verify role in profiles table (One Source of Truth)
    const adminEnv = getSupabaseAdminEnvStatus()
    if (
      !adminEnv.hasSupabaseUrl ||
      !adminEnv.isSupabaseUrlValidHttp ||
      !adminEnv.hasServiceRoleKey
    ) {
      console.error('[teacher-reset-password] step=admin_env_missing', {
        hasSupabaseUrl: adminEnv.hasSupabaseUrl,
        isSupabaseUrlValidHttp: adminEnv.isSupabaseUrlValidHttp,
        hasServiceRoleKey: adminEnv.hasServiceRoleKey,
      })
      return NextResponse.json(
        { ok: false, message: '서버 설정이 올바르지 않아 요청을 처리할 수 없습니다.' },
        { status: 500 }
      )
    }

    // 이메일로 profiles에서 교사 역할 확인 (One Source of Truth)
    const admin = createSupabaseAdminClient()
    
    // auth.users에서 이메일로 user_id 찾기 (admin API 사용)
    const { data: authUsers, error: listUsersErr } = await admin.auth.admin.listUsers()
    
    if (listUsersErr) {
      console.error('[teacher-reset-password] step=list_users_failed', {
        code: (listUsersErr as any)?.code,
        message: listUsersErr.message,
      })
      return NextResponse.json(
        { ok: false, message: '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 500 }
      )
    }

    const authUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (!authUser?.id) {
      return NextResponse.json(
        { ok: false, message: '교사 계정만 비밀번호 재설정이 가능합니다.' },
        { status: 400 }
      )
    }

    // profiles.role로 권한 확인 (One Source of Truth)
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('role')
      .eq('user_id', authUser.id)
      .single()

    if (profileErr || !profile) {
      console.error('[teacher-reset-password] step=select_profile_failed', {
        code: (profileErr as any)?.code,
        message: profileErr?.message,
      })
      return NextResponse.json(
        { ok: false, message: '교사 계정만 비밀번호 재설정이 가능합니다.' },
        { status: 400 }
      )
    }

    // 교사/관리자 역할이 아니면 차단
    if (!isTeacherRole(profile.role)) {
      return NextResponse.json(
        { ok: false, message: '교사 계정만 비밀번호 재설정이 가능합니다.' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const redirectTo = getPublicSiteUrl()

    console.error('[teacher-reset-password] step=resetPasswordForEmail_started')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) {
      console.error('[teacher-reset-password] step=resetPasswordForEmail_failed', {
        name: (error as any)?.name,
        code: (error as any)?.code,
        status: (error as any)?.status,
        message: error.message,
      })
      return NextResponse.json(
        {
          ok: false,
          message: '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        },
        { status: 500 }
      )
    }

    console.error('[teacher-reset-password] step=resetPasswordForEmail_success')
    return NextResponse.json({
      ok: true,
      message: '재설정 링크를 이메일로 보냈습니다. 메일함을 확인해 주세요.',
    })
  } catch (e) {
    console.error('[teacher-reset-password] step=unhandled_exception', e)
    return NextResponse.json(
      { ok: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


