import { NextResponse } from 'next/server'
import { createClient as createSsrClient } from '@/lib/supabase/server'
import { TEACHER_INVITE_CODE } from '@/lib/constants'
import { generateUniqueClassroomCode, normalizeClassroomCode } from '@/lib/classroom/code'
import { createAdminClient, getAdminEnvStatus } from '@/lib/supabase/admin'
import { getSupabasePublicEnv } from '@/lib/supabase/env'
import { createClient as createJsClient } from '@supabase/supabase-js'

type Body = {
  email?: string
  password?: string
  confirmPassword?: string
  inviteCode?: string
  acceptTerms?: boolean
  acceptPrivacy?: boolean
}

function getPublicEnvStatus() {
  const env = getSupabasePublicEnv()
  return {
    hasSupabaseUrl: env.hasSupabaseUrl,
    hasAnonKey: env.hasAnonKey,
    isSupabaseUrlHttp: env.isSupabaseUrlValidHttp,
  } as const
}

function jsonError(params: {
  status: number
  code: string
  message: string
  step?: string
  details?: unknown
}) {
  const includeDetails = process.env.NODE_ENV !== 'production'
  return NextResponse.json(
    {
      ok: false,
      code: params.code,
      message: params.message,
      error: params.message, // backward-compat for existing client
      ...(includeDetails
        ? {
            step: params.step,
            details: params.details,
          }
        : null),
    },
    { status: params.status }
  )
}

function mapDbErrorToKoreanMessage(err: any) {
  const code = String(err?.code || '')
  const message = String(err?.message || '')

  // Supabase/PostgREST: missing table in schema cache
  if (
    code === 'PGRST205' ||
    /schema cache/i.test(message) ||
    /could not find the/i.test(message) ||
    /relation .* does not exist/i.test(message)
  ) {
    return '데이터베이스 테이블이 준비되지 않았습니다. Supabase에서 `supabase/classroom_access_schema.sql` 및 `supabase/classroom_access_rls.sql`를 실행해 주세요.'
  }

  // RLS / permission denied
  if (
    code === '42501' ||
    /row level security/i.test(message) ||
    /permission denied/i.test(message)
  ) {
    return '데이터베이스 권한 설정(RLS) 때문에 저장이 제한됩니다. Supabase에서 RLS 정책 적용 여부를 확인해 주세요.'
  }

  return ''
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body
    const email = (body.email ?? '').trim()
    const password = body.password ?? ''
    const confirmPassword = body.confirmPassword ?? ''
    const inviteCode = (body.inviteCode ?? '').trim()

    // safe request logging (no secrets)
    const bodyKeys = Object.keys(body || {}).filter(
      (k) => k !== 'password' && k !== 'confirmPassword'
    )
    console.error('[teacher-signup] step=request_received', { bodyKeys })

    // env validation (no values)
    const publicEnv = getPublicEnvStatus()
    if (!publicEnv.hasSupabaseUrl || !publicEnv.hasAnonKey || !publicEnv.isSupabaseUrlHttp) {
      const missing: string[] = []
      if (!publicEnv.hasSupabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
      if (!publicEnv.hasAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

      const reason = !publicEnv.hasSupabaseUrl || !publicEnv.hasAnonKey
        ? `필수 환경변수가 누락되었습니다: ${missing.join(', ')}`
        : 'NEXT_PUBLIC_SUPABASE_URL 형식이 올바르지 않습니다. (http/https URL 필요)'

      console.error('[teacher-signup] step=env_missing_or_invalid', {
        publicEnv,
        missing,
      })
      return jsonError({
        status: 500,
        code: 'SERVER_CONFIG_MISSING',
        message: `서버 설정이 올바르지 않아 회원가입을 처리할 수 없습니다. ${reason}`,
        step: 'env',
        details: { ...publicEnv, missing },
      })
    }

    if (!email || !password || !confirmPassword || !inviteCode) {
      return jsonError({
        status: 400,
        code: 'VALIDATION_FAILED',
        message: '모든 필드를 입력해주세요.',
        step: 'validate',
      })
    }
    if (password !== confirmPassword) {
      return jsonError({
        status: 400,
        code: 'PASSWORD_MISMATCH',
        message: '비밀번호가 일치하지 않습니다.',
        step: 'validate',
      })
    }
    if (inviteCode !== TEACHER_INVITE_CODE) {
      return jsonError({
        status: 400,
        code: 'INVITE_CODE_INVALID',
        message: '초대코드가 올바르지 않습니다. 다시 확인해 주세요.',
        step: 'validate',
      })
    }
    if (!body.acceptTerms || !body.acceptPrivacy) {
      return jsonError({
        status: 400,
        code: 'CONSENT_REQUIRED',
        message: '필수 약관에 동의해주세요.',
        step: 'validate',
      })
    }

    // Auth sign-up: use SSR client to support cookie/session when email confirmation is off
    const ssr = await createSsrClient()
    const publicRuntime = getSupabasePublicEnv()

    let signUpData: Awaited<ReturnType<typeof ssr.auth.signUp>>['data'] | null = null
    try {
      const res = await ssr.auth.signUp({ email, password })
      signUpData = res.data
      if (res.error) {
        const msg = res.error.message || '회원가입에 실패했습니다.'
        const isDup =
          /already registered/i.test(msg) ||
          /user.*exists/i.test(msg) ||
          /email.*exists/i.test(msg)

        console.error('[teacher-signup] step=auth_signup_failed', {
          message: msg,
          status: (res.error as any)?.status,
        })

        return jsonError({
          status: isDup ? 409 : 400,
          code: isDup ? 'EMAIL_ALREADY_EXISTS' : 'AUTH_SIGNUP_FAILED',
          message: isDup ? '이미 가입된 이메일입니다.' : msg,
          step: 'auth',
          details: { status: (res.error as any)?.status },
        })
      }
    } catch (err) {
      console.error('[teacher-signup] step=auth_signup_exception', err)
      return jsonError({
        status: 500,
        code: 'AUTH_SIGNUP_EXCEPTION',
        message: '회원가입 처리 중 오류가 발생했습니다.',
        step: 'auth',
        details:
          process.env.NODE_ENV !== 'production'
            ? { message: (err as any)?.message, stack: (err as any)?.stack }
            : undefined,
      })
    }

    const userId = signUpData?.user?.id
    if (!userId) {
      console.error('[teacher-signup] step=auth_missing_user', { hasUser: Boolean(signUpData?.user) })
      return jsonError({
        status: 500,
        code: 'AUTH_MISSING_USER',
        message: '회원가입 처리 중 오류가 발생했습니다.',
        step: 'auth',
      })
    }

    const tryEnsureTeacherAndClassroom = async (
      client: any,
      label: 'rls' | 'admin'
    ): Promise<
      | { ok: true }
      | {
          ok: false
          step:
            | 'db_upsert_teacher'
            | 'db_select_classroom'
            | 'db_insert_classroom'
          error: any
        }
    > => {
      // Ensure teacher row exists
      // - RLS: avoid upsert (may require UPDATE policy). Use INSERT and ignore duplicate key.
      // - Admin: upsert is fine (bypasses RLS and is idempotent).
      // 1. Ensure profile role is 'teacher' (Fix for default 'student' role trigger)
      {
        const { error } = await client
          .from('profiles')
          .update({ role: 'teacher' })
          .eq('user_id', userId);
          
        if (error) {
           console.error(`[teacher-signup] step=db_update_profile_role_failed (${label})`, {
            message: error.message,
            code: (error as any).code
          });
          // Do not fail signup. Login page will handle "role mismatch" or "profile missing" better now.
        } else {
           console.log(`[teacher-signup] step=db_update_profile_role_success (${label})`);
        }
      }

      // 2. Ensure teacher row exists
      {
        const { error } =
          label === 'admin'
            ? await client.from('teachers').upsert({ id: userId, email }, { onConflict: 'id' })
            : await client.from('teachers').insert({ id: userId, email })
        if (error) {
          // RLS insert: ignore duplicate key (id already exists)
          if (label === 'rls' && (error as any)?.code === '23505') {
            // continue
          } else {
            console.error(`[teacher-signup] step=db_upsert_teacher_failed (${label})`, {
              message: error.message,
              code: (error as any).code,
              details: (error as any).details,
              hint: (error as any).hint,
            })
            return { ok: false, step: 'db_upsert_teacher', error }
          }
        }
      }

      // Ensure classroom exists for this teacher
      const { data: existingClassroom, error: classroomSelErr } = await client
        .from('classrooms')
        .select('id, code')
        .eq('teacher_id', userId)
        .maybeSingle()

      if (classroomSelErr) {
        console.error(`[teacher-signup] step=db_select_classroom_failed (${label})`, {
          message: classroomSelErr.message,
          code: (classroomSelErr as any).code,
          details: (classroomSelErr as any).details,
          hint: (classroomSelErr as any).hint,
        })
        return { ok: false, step: 'db_select_classroom', error: classroomSelErr }
      }

      if (!existingClassroom) {
        const code = await generateUniqueClassroomCode({
          exists: async (c) => {
            const normalized = normalizeClassroomCode(c)
            const { data } = await client
              .from('classrooms')
              .select('id')
              .eq('code', normalized)
              .maybeSingle()
            return Boolean(data?.id)
          },
        })

        const { error: classroomInsErr } = await client.from('classrooms').insert({
          teacher_id: userId,
          code: normalizeClassroomCode(code),
        })
        if (classroomInsErr) {
          console.error(`[teacher-signup] step=db_insert_classroom_failed (${label})`, {
            message: classroomInsErr.message,
            code: (classroomInsErr as any).code,
            details: (classroomInsErr as any).details,
            hint: (classroomInsErr as any).hint,
          })
          return { ok: false, step: 'db_insert_classroom', error: classroomInsErr }
        }
      }

      return { ok: true }
    }

    // 1) First try with a JWT-backed client when signUp returned a session token.
    // This avoids relying on cookie propagation inside the same request.
    const accessToken = (signUpData as any)?.session?.access_token as string | undefined
    const rlsClient = accessToken
      ? createJsClient(publicRuntime.supabaseUrl, publicRuntime.anonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        })
      : ssr

    const rlsResult = await tryEnsureTeacherAndClassroom(rlsClient, 'rls')

    if (!rlsResult.ok) {
      // 2) Fallback to admin client if service role key exists (fixes common RLS/session timing issues)
      const adminEnv = getAdminEnvStatus()
      if (!adminEnv.hasServiceRoleKey) {
        console.error('[teacher-signup] step=admin_env_missing', { adminEnv })
        // Signup itself succeeded. Defer DB bootstrap (teachers/classrooms) to login flow.
        return NextResponse.json({
          ok: true,
          redirectPath: '/login/teacher',
          message: '회원가입이 완료되었습니다. 교사 로그인 후 이용해 주세요.',
        })
      }

      const admin = createAdminClient()
      const adminResult = await tryEnsureTeacherAndClassroom(admin, 'admin')
      if (!adminResult.ok) {
        const mapped = mapDbErrorToKoreanMessage(adminResult.error)
        return jsonError({
          status: 500,
          code:
            adminResult.step === 'db_upsert_teacher'
              ? 'DB_UPSERT_TEACHER_FAILED'
              : adminResult.step === 'db_select_classroom'
                ? 'DB_SELECT_CLASSROOM_FAILED'
                : 'DB_INSERT_CLASSROOM_FAILED',
          message:
            mapped ||
            (adminResult.step === 'db_upsert_teacher'
              ? '교사 정보 저장에 실패했습니다.'
              : adminResult.step === 'db_select_classroom'
                ? '교실 정보를 확인할 수 없습니다.'
                : '교실 생성에 실패했습니다.'),
          step: adminResult.step,
          details: {
            code: (adminResult.error as any)?.code,
            message: (adminResult.error as any)?.message,
          },
        })
      }
    }

    console.error('[teacher-signup] step=success', { userIdPresent: true })
    return NextResponse.json({ ok: true, redirectPath: '/dashboard/teacher' })
  } catch (e) {
    console.error('[teacher-signup] step=unhandled_exception', e)
    return jsonError({
      status: 500,
      code: 'UNHANDLED_EXCEPTION',
      message: '서버 오류가 발생했습니다.',
      step: 'unhandled',
      details:
        process.env.NODE_ENV !== 'production'
          ? { message: (e as any)?.message, stack: (e as any)?.stack }
          : undefined,
    })
  }
}


