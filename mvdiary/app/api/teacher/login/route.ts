import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import {
  generateUniqueClassroomCode,
  normalizeClassroomCode,
} from "@/lib/classroom/code";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import {
  createSupabaseAdminClient,
  getSupabaseAdminEnvStatus,
} from "@/lib/supabaseAdmin";
import { getDashboardPathByRole, isStudentRole, type UserRole } from "@/lib/routing";
import { getUserRoleById } from "@/lib/auth/role";

type Body = {
  email?: string;
  password?: string;
};

function mapDbErrorToKoreanMessage(err: any) {
  const code = String(err?.code || "");
  const message = String(err?.message || "");

  // service role 키/프로젝트 설정 오류 등 (서버 설정 문제)
  if (/invalid api key/i.test(message) || /unauthorized/i.test(message)) {
    return "서버 설정이 올바르지 않아 교사 정보 저장을 처리할 수 없습니다.";
  }

  if (
    code === "PGRST205" ||
    /schema cache/i.test(message) ||
    /relation .* does not exist/i.test(message)
  ) {
    return "데이터베이스 테이블이 준비되지 않았습니다. Supabase에서 `supabase/classroom_access_schema.sql` 및 `supabase/classroom_access_rls.sql`를 실행해 주세요.";
  }

  if (
    code === "42501" ||
    /row level security/i.test(message) ||
    /permission denied/i.test(message)
  ) {
    return "데이터베이스 권한 설정(RLS) 때문에 저장이 제한됩니다. Supabase에서 RLS 정책 적용 여부를 확인해 주세요.";
  }

  return "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const email = (body.email ?? "").trim();
    const password = body.password ?? "";

    // step=validate
    console.error("[teacher-login] step=validate", {
      hasEmail: Boolean(email),
      hasPassword: Boolean(password),
    });

    // env check (no values)
    const env = getSupabasePublicEnv();
    if (!env.hasSupabaseUrl || !env.hasAnonKey || !env.isSupabaseUrlValidHttp) {
      console.error("[teacher-login] step=env_missing_or_invalid", {
        hasSupabaseUrl: env.hasSupabaseUrl,
        hasAnonKey: env.hasAnonKey,
        isSupabaseUrlValidHttp: env.isSupabaseUrlValidHttp,
      });
      return NextResponse.json(
        {
          ok: false,
          message: "서버 설정이 올바르지 않아 로그인을 처리할 수 없습니다.",
        },
        { status: 500 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        {
          ok: false,
          message: "이메일과 비밀번호를 입력해주세요.",
        },
        { status: 400 }
      );
    }

    const supabase = await createRouteClient();

    console.error("[teacher-login] step=signInWithPassword_started");
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      console.error("[teacher-login] step=signInWithPassword_failed", {
        name: (authError as any)?.name,
        code: (authError as any)?.code,
        status: (authError as any)?.status,
        message: authError?.message,
      });

      const rawMsg = String(authError?.message || "");
      const status = Number((authError as any)?.status || 0);
      const isInvalidCredentials =
        /invalid login credentials/i.test(rawMsg) ||
        /invalid.*credentials/i.test(rawMsg) ||
        /invalid.*email.*or.*password/i.test(rawMsg);

      if (isInvalidCredentials || status === 400 || status === 401) {
        return NextResponse.json(
          {
            ok: false,
            code: "invalid_credentials",
            message: "이메일 또는 비밀번호가 올바르지 않습니다.",
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          message: "서버 오류가 발생했습니다.",
        },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // 역할 확인: One Source of Truth 사용
    const roleResult = await getUserRoleById(userId);
    
    // role이 null이면 오류 처리 (기본값 student로 보내지 않음)
    if (roleResult.error || !roleResult.role) {
      console.error("[teacher-login] step=role_check_failed", {
        userId,
        error: roleResult.error,
      });
      return NextResponse.json(
        {
          ok: false,
          code: "role_not_found",
          message: roleResult.error || "사용자 역할을 확인할 수 없습니다.",
        },
        { status: 403 }
      );
    }

    const userRole = roleResult.role;

    // 학생 역할인 경우 차단 (교사 로그인 페이지는 교사 전용)
    if (isStudentRole(userRole)) {
      console.error("[teacher-login] step=student_role_detected", { userId, userRole });
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_role",
          message: "교사 로그인 페이지는 교사만 사용할 수 있습니다.",
        },
        { status: 403 }
      );
    }

    // 로그인 성공 후 프로필 저장은 서버에서만 admin(service role)로 1회 수행 (RLS 영향 제거)
    console.error("[teacher-login] step=admin_profile_save_started");
    let profileSaved = true;
    let partialMessage = "로그인되었습니다.";
    try {
      const adminEnv = getSupabaseAdminEnvStatus();
      if (
        !adminEnv.hasSupabaseUrl ||
        !adminEnv.isSupabaseUrlValidHttp ||
        !adminEnv.hasServiceRoleKey
      ) {
        console.error("[teacher-login] step=admin_env_missing", {
          hasSupabaseUrl: adminEnv.hasSupabaseUrl,
          isSupabaseUrlValidHttp: adminEnv.isSupabaseUrlValidHttp,
          hasServiceRoleKey: adminEnv.hasServiceRoleKey,
        });
        // Keep login session even if DB bootstrap failed.
        profileSaved = false;
        partialMessage =
          "교사 기본 정보 저장에 실패했지만 로그인은 계속됩니다. (나중에 자동 재시도)";
        throw new Error("admin_env_missing");
      }

      const admin = createSupabaseAdminClient();

      const { error: teacherUpsertErr } = await admin
        .from("teachers")
        .upsert({ id: userId, email }, { onConflict: "id" });
      if (teacherUpsertErr) {
        console.error("[teacher-login] step=admin_upsert_teacher_failed", {
          code: (teacherUpsertErr as any)?.code,
          message: teacherUpsertErr.message,
          mapped: mapDbErrorToKoreanMessage(teacherUpsertErr),
        });
        // Keep login session even if DB bootstrap failed.
        profileSaved = false;
        partialMessage =
          "교사 기본 정보 저장에 실패했지만 로그인은 계속됩니다. (나중에 자동 재시도)";
        throw new Error("teacher_upsert_failed");
      }

      const { data: existingClassroom, error: classroomSelErr } = await admin
        .from("classrooms")
        .select("id, code")
        .eq("teacher_id", userId)
        .maybeSingle();
      if (classroomSelErr) {
        console.error("[teacher-login] step=admin_select_classroom_failed", {
          code: (classroomSelErr as any)?.code,
          message: classroomSelErr.message,
          mapped: mapDbErrorToKoreanMessage(classroomSelErr),
        });
        // Keep login session even if DB bootstrap failed.
        profileSaved = false;
        partialMessage =
          "교사 기본 정보 저장에 실패했지만 로그인은 계속됩니다. (나중에 자동 재시도)";
        throw new Error("classroom_select_failed");
      }

      if (!existingClassroom) {
        const code = await generateUniqueClassroomCode({
          exists: async (c) => {
            const normalized = normalizeClassroomCode(c);
            const { data } = await admin
              .from("classrooms")
              .select("id")
              .eq("code", normalized)
              .maybeSingle();
            return Boolean(data?.id);
          },
        });

        const { error: classroomInsErr } = await admin
          .from("classrooms")
          .insert({
            teacher_id: userId,
            code: normalizeClassroomCode(code),
          });
        if (classroomInsErr) {
          console.error("[teacher-login] step=admin_insert_classroom_failed", {
            code: (classroomInsErr as any)?.code,
            message: classroomInsErr.message,
            mapped: mapDbErrorToKoreanMessage(classroomInsErr),
          });
          // Keep login session even if DB bootstrap failed.
          profileSaved = false;
          partialMessage =
            "교사 기본 정보 저장에 실패했지만 로그인은 계속됩니다. (나중에 자동 재시도)";
          throw new Error("classroom_insert_failed");
        }
      }

      console.error("[teacher-login] step=admin_profile_save_success");
    } catch (e) {
      // IMPORTANT: Do not block login on DB bootstrap failures.
      console.error("[teacher-login] step=admin_profile_save_exception", e);
      profileSaved = false;
      partialMessage =
        "교사 기본 정보 저장에 실패했지만 로그인은 계속됩니다. (나중에 자동 재시도)";
    }

    console.error("[teacher-login] step=signInWithPassword_success", {
      hasUserId: Boolean(userId),
      userRole: userRole as UserRole,
    });
    
    // 역할 기반 올바른 대시보드 경로 결정 (One Source of Truth)
    const redirectPath = getDashboardPathByRole(userRole as UserRole);
    
    return NextResponse.json({
      ok: true,
      profileSaved,
      message: partialMessage,
      redirectPath,
    });
  } catch (e) {
    console.error("[teacher-login] step=unhandled_exception", e);
    return NextResponse.json(
      {
        ok: false,
        message: "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
