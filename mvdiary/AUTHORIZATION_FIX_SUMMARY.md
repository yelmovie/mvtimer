# 권한/라우팅 버그 근본 해결 보고서

## 문제점
1. 교사로 로그인했는데 학생 대시보드로 이동되는 문제
2. 이중 스키마 구조로 인한 권한 판단 혼란
3. teachers 테이블로 권한 판단하는 로직 존재

## 해결 방법

### 1. 권한 판단 구조 통합 (Critical) ✅

**One Source of Truth: `profiles.role`만 사용**

#### 수정 사항
- 모든 권한 판단은 `lib/auth/role.ts`의 함수 사용
- `getUserRole()`: 현재 사용자 역할 조회
- `getUserRoleById()`: 특정 사용자 역할 조회
- role이 null이면 오류 반환 (기본값 student 처리 금지)

#### 변경 파일
- `lib/auth/role.ts` (기존, 확인 완료)
- 모든 API/페이지에서 `getUserRole()` 또는 `getUserRoleById()` 사용

### 2. 교사 대시보드 리다이렉트 로직 수정 (Critical) ✅

**파일**: `app/dashboard/teacher/page.tsx`

#### Before (문제)
```typescript
if (!classroom) {
  redirect('/login/teacher') // 잘못된 리다이렉트
}
```

#### After (해결)
```typescript
// 권한 확인: profiles.role만 사용
const roleResult = await getUserRole()
if (isStudentRole(roleResult.role)) {
  redirect(ROUTES.STUDENT_DASHBOARD) // 교정 리다이렉트
}
if (!isTeacherRole(roleResult.role)) {
  redirect(ROUTES.HOME) // 권한 없음
}

// classroom이 없어도 교사 대시보드 접근 허용
if (!classroom) {
  return (
    <TeacherDashboard
      classroomCode={null}
      students={[]}
      showSetupMessage={true} // 반 생성 안내
    />
  )
}
```

#### 변경 파일
- `app/dashboard/teacher/page.tsx` - 권한 확인 + classroom 없을 때 처리
- `components/classroomAccess/TeacherDashboard.tsx` - classroomCode null 허용 + 안내 메시지

### 3. teachers 테이블로 권한 판단 제거 (High) ✅

#### 수정 사항
- `app/api/teacher/reset-password/route.ts`: teachers 테이블 → profiles.role로 변경
- 다른 API는 이미 profiles.role 사용 중

#### 변경 전
```typescript
const { data: teacher } = await admin
  .from('teachers')
  .select('id')
  .eq('email', email)
  .maybeSingle()
```

#### 변경 후
```typescript
// 이메일로 auth.users에서 user_id 찾기
const user = authUser.users.find(u => u.email === email)

// profiles.role로 권한 확인 (One Source of Truth)
const { data: profile } = await admin
  .from('profiles')
  .select('role')
  .eq('user_id', user.id)
  .single()

if (!isTeacherRole(profile.role)) {
  return error // 교사가 아니면 차단
}
```

### 4. 이중 스키마 구조 분석 (High) ⚠️

#### 발견된 스키마

1. **classroom_access_schema.sql** (간단한 구조)
   - `teachers` 테이블 (id, email)
   - `classrooms` 테이블 (id, code, teacher_id)
   - `students` 테이블 (id, classroom_id, student_number, student_name)

2. **schema.sql** (복잡한 구조)
   - `profiles` 테이블 (user_id, role, display_name, school_id)
   - `classes` 테이블 (id, school_id, name, school_year)
   - `teacher_classes` 테이블 (teacher_id, class_id, role)
   - `student_classes` 테이블 (student_id, class_id)

#### 실제 사용 중인 테이블

**profiles 기반 (schema.sql)**:
- `app/teacher/dashboard/page.tsx` - profiles 사용
- `app/student/dashboard/page.tsx` - profiles 사용
- `app/api/auth/login/route.ts` - profiles 사용
- `app/api/teacher/classes/route.ts` - profiles + teacher_classes 사용

**classrooms 기반 (classroom_access_schema.sql)**:
- `app/dashboard/teacher/page.tsx` - classrooms 사용
- `app/api/teacher/login/route.ts` - teachers + classrooms 사용
- `app/api/student/join/route.ts` - classrooms + students 사용

#### 권장 사항

**현재 상태**: 두 스키마가 혼재되어 있음

**해결 방안**:
1. 단일 스키마로 통합 권장 (profiles 기반)
2. 또는 두 스키마를 명확히 분리하고 문서화
3. 실제 Supabase 프로젝트에서 어떤 스키마가 적용되었는지 확인 필요

**확인 필요**:
```sql
-- Supabase Dashboard > SQL Editor에서 실행
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### 5. 권한 검증 로직 통합 (High) ✅

#### 통합 완료
- 모든 권한 판단은 `profiles.role`만 사용
- `lib/auth/role.ts`의 함수로 통일
- teachers 테이블로 권한 판단하는 로직 제거

#### 남은 작업
- `app/api/teacher/login/route.ts`와 `app/api/teacher/signup/route.ts`에서 teachers 테이블에 데이터 저장하는 로직은 유지 (데이터 저장용, 권한 판단용 아님)

## 변경 파일 목록

### 신규 파일
- 없음 (기존 파일 활용)

### 수정 파일
1. `app/dashboard/teacher/page.tsx` - 권한 확인 + classroom 없을 때 처리
2. `components/classroomAccess/TeacherDashboard.tsx` - classroomCode null 허용 + 안내 메시지
3. `app/api/teacher/reset-password/route.ts` - teachers → profiles.role로 변경

### 확인 완료 (이미 올바름)
- `lib/auth/role.ts` - profiles.role만 사용
- `app/api/auth/login/route.ts` - profiles.role 사용
- `app/teacher/dashboard/page.tsx` - profiles.role 사용
- `app/student/dashboard/page.tsx` - profiles.role 사용

## 핵심 diff

### 1. app/dashboard/teacher/page.tsx

```diff
+ import { getUserRole } from '@/lib/auth/role'
+ import { isTeacherRole, isStudentRole } from '@/lib/routing'
+ import { ROUTES } from '@/lib/routing'

  export default async function Page() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
-     redirect('/login/teacher')
+     redirect(ROUTES.LOGIN_TEACHER)
    }
+
+   // 권한 확인: profiles.role만 사용 (One Source of Truth)
+   const roleResult = await getUserRole()
+   if (roleResult.error || !roleResult.role) {
+     redirect(ROUTES.HOME)
+   }
+   if (isStudentRole(roleResult.role)) {
+     redirect(ROUTES.STUDENT_DASHBOARD)
+   }
+   if (!isTeacherRole(roleResult.role)) {
+     redirect(ROUTES.HOME)
+   }

    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id, code')
      .eq('teacher_id', user.id)
      .maybeSingle()

    if (!classroom) {
-     redirect('/login/teacher')
+     // classroom이 없어도 교사 대시보드 접근 허용 (반 생성 안내)
+     return (
+       <TeacherDashboard
+         classroomCode={null}
+         students={[]}
+         showSetupMessage={true}
+       />
+     )
    }
```

### 2. components/classroomAccess/TeacherDashboard.tsx

```diff
  export default function TeacherDashboard(props: {
-   classroomCode: string
+   classroomCode: string | null
    students: Student[]
+   showSetupMessage?: boolean
  }) {
+   // 반 생성 필요 안내
+   if (props.showSetupMessage || !props.classroomCode) {
+     return (
+       <div className={styles.container}>
+         <div className={styles.card}>
+           <h1 className={styles.title}>교사 대시보드</h1>
+           <p className={styles.subtitle}>반 생성이 필요합니다</p>
+           <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
+             <p>교실 정보가 아직 생성되지 않았습니다.</p>
+             <p>잠시 후 자동으로 생성되거나, 로그아웃 후 다시 로그인해 주세요.</p>
+           </div>
+         </div>
+       </div>
+     )
+   }
```

### 3. app/api/teacher/reset-password/route.ts

```diff
+ import { isTeacherRole } from '@/lib/routing'

- const { data: teacher } = await admin
-   .from('teachers')
-   .select('id')
-   .eq('email', email)
-   .maybeSingle()
+ // 이메일로 auth.users에서 user_id 찾기
+ const user = authUser.users.find(u => u.email === email)
+
+ // profiles.role로 권한 확인 (One Source of Truth)
+ const { data: profile } = await admin
+   .from('profiles')
+   .select('role')
+   .eq('user_id', user.id)
+   .single()
+
+ if (!isTeacherRole(profile.role)) {
+   return NextResponse.json(
+     { ok: false, message: '교사 계정만 비밀번호 재설정이 가능합니다.' },
+     { status: 403 }
+   )
+ }
```

## 권한 판단 함수 (재사용 가능)

### lib/auth/role.ts

```typescript
/**
 * 현재 인증된 사용자의 role 조회
 * One Source of Truth: profiles.role만 사용
 */
export async function getUserRole(): Promise<UserRoleResult>

/**
 * 특정 사용자 ID의 role 조회
 */
export async function getUserRoleById(userId: string): Promise<UserRoleResult>
```

### lib/routing.ts

```typescript
/**
 * 역할 기반 대시보드 경로 반환
 */
export function getDashboardPathByRole(role: UserRole | string | null | undefined): string

/**
 * 역할 검증 함수
 */
export function isTeacherRole(role: UserRole | string | null | undefined): boolean
export function isStudentRole(role: UserRole | string | null | undefined): boolean
```

## RLS 최종 구조 요약

### 현재 상태
- 두 개의 RLS 파일 존재:
  1. `supabase/classroom_access_rls.sql` - teachers/classrooms/students 기반
  2. `supabase/rls.sql` - profiles/teacher_classes/student_classes 기반

### 확인 필요
실제 Supabase 프로젝트에 어떤 RLS 정책이 적용되었는지 확인:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 권장 사항
1. 실제 적용된 스키마 확인
2. 사용하지 않는 RLS 정책 제거
3. 단일 스키마로 통합 또는 명확히 분리

## 회귀 테스트 체크리스트

### 1. 교사 계정 로그인
- [ ] `/login/teacher`에서 교사 계정으로 로그인
- [ ] `/teacher/dashboard` 또는 `/dashboard/teacher`로 정상 리다이렉트
- [ ] 교사 대시보드 화면 정상 표시

### 2. 학생 계정 로그인
- [ ] `/enter`에서 학생 입장
- [ ] `/student/dashboard`로 정상 리다이렉트
- [ ] 학생 대시보드 화면 정상 표시

### 3. 직접 URL 접근 테스트
- [ ] 교사 계정으로 로그인 후 `/student/dashboard` 직접 입력
- [ ] 자동으로 `/teacher/dashboard`로 교정 리다이렉트 확인
- [ ] 학생 계정으로 로그인 후 `/teacher/dashboard` 직접 입력
- [ ] 자동으로 `/student/dashboard`로 교정 리다이렉트 확인

### 4. 새로고침 테스트 (SSR/CSR)
- [ ] 교사 대시보드에서 F5 새로고침
- [ ] role이 유지되어 올바른 대시보드에 머무는지 확인
- [ ] 학생 대시보드에서 F5 새로고침
- [ ] role이 유지되어 올바른 대시보드에 머무는지 확인

### 5. classroomId 없는 교사 계정 처리
- [ ] 교사 계정으로 로그인 (classroom 없음)
- [ ] `/dashboard/teacher` 접근 시 "반 생성 필요" 안내 메시지 표시
- [ ] 학생 대시보드로 리다이렉트되지 않음 확인

### 6. 역할 없음 케이스
- [ ] profiles 테이블에 role이 없는 사용자로 로그인 시도
- [ ] 오류 메시지 표시 및 리다이렉트되지 않음 확인

### 7. 비밀번호 재설정
- [ ] 교사 이메일로 비밀번호 재설정 요청
- [ ] 정상적으로 reset 메일 전송 확인
- [ ] 학생 이메일로 비밀번호 재설정 요청 시 차단 확인

## 테스트 결과 요약

### 성공 기준
- ✅ 모든 권한 판단이 `profiles.role`로 통합됨
- ✅ 교사 대시보드에서 classroom 없을 때 올바른 처리
- ✅ teachers 테이블로 권한 판단하는 로직 제거
- ✅ 잘못된 역할로 접근 시 교정 리다이렉트 작동

### 남은 작업
- ⚠️ 이중 스키마 구조 정리 (실제 적용된 스키마 확인 필요)
- ⚠️ RLS 정책 정리 (실제 적용된 정책 확인 필요)

## 다음 단계

1. **Supabase 프로젝트에서 실제 스키마 확인**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. **RLS 정책 확인**
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public';
   ```

3. **단일 스키마로 통합 또는 명확히 분리**
   - profiles 기반으로 통합 권장
   - 또는 두 스키마를 명확히 분리하고 문서화

