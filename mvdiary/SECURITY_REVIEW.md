# Supabase 보안 리뷰 보고서
**작성일**: 2025-01-XX  
**리뷰어**: 시니어 보안 리뷰어  
**프로젝트**: mvdiary (나의 하루가 피어나다)

---

## 📋 실행 요약

이 프로젝트는 **Supabase (Postgres + Auth + RLS)** 기반 웹앱입니다. 전반적으로 보안 구조는 양호하나, 몇 가지 **Critical/High** 이슈가 발견되었습니다.

**즉시 조치 필요**: 2건 (Critical)  
**우선 조치 권장**: 3건 (High)  
**개선 권장**: 4건 (Medium/Low)

---

## 1. 비밀정보 유출 스캔 결과

### ✅ 안전한 항목

| 항목 | 위치 | 상태 | 설명 |
|------|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/env.ts` | ✅ 안전 | 프론트엔드 노출 허용 (Supabase 표준) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/env.ts` | ✅ 안전 | 프론트엔드 노출 허용 (RLS로 보호) |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabaseAdmin.ts` | ✅ 안전 | 서버 전용 (`server-only` 가드) |
| `.env*.local` | `.gitignore` | ✅ 안전 | Git에서 제외됨 |

### ⚠️ 확인 필요

| 항목 | 위치 | 상태 | 설명 |
|------|------|------|------|
| Git 히스토리 | - | ⚠️ 확인 필요 | `.env` 파일이 과거에 커밋되었는지 확인 필요 |
| `scripts/seed-teacher-admin.mjs` | Line 200-201 | ⚠️ Medium | 콘솔에 비밀번호 출력 (개발용 스크립트) |

**조치**:
- Git 히스토리에서 `.env` 파일 커밋 여부 확인
- 만약 커밋되었다면 **즉시 키 로테이션** 필요
- `scripts/seed-teacher-admin.mjs`는 개발 환경에서만 실행, 운영 배포 시 제외

---

## 2. Supabase Auth 인증 구조 점검

### ✅ 양호한 부분

1. **서버 사이드 인증 검증**: 모든 API 라우트에서 `supabase.auth.getUser()`로 재검증
2. **세션 관리**: SSR 클라이언트로 쿠키 기반 세션 관리
3. **로그아웃 처리**: `/api/auth/logout`에서 세션 정리

### ⚠️ 발견된 이슈

#### **Critical: 이중 스키마 구조로 인한 혼란**

**위치**: `supabase/classroom_access_schema.sql` vs `supabase/schema.sql`

**문제**:
- 두 개의 서로 다른 스키마 파일이 존재
- `classroom_access_*`는 `teachers/classrooms/students` 테이블 사용
- `schema.sql`은 `profiles/teacher_classes/student_classes` 테이블 사용
- 어떤 스키마가 실제로 적용되었는지 불명확

**영향**:
- RLS 정책이 잘못된 테이블에 적용될 수 있음
- API가 존재하지 않는 테이블을 참조할 수 있음

**수정 제안**:
```sql
-- 1. 현재 적용된 스키마 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. 사용하지 않는 스키마 파일 제거 또는 명확히 문서화
-- 3. 단일 스키마로 통합 권장
```

---

## 3. RLS (Row Level Security) 규칙 점검

### ✅ 양호한 부분

1. **RLS 활성화**: `classroom_access_rls.sql`에서 모든 테이블에 RLS 활성화
2. **명시적 정책**: `auth.uid()` 기반 정책으로 교사만 자신의 데이터 접근
3. **SECURITY DEFINER RPC**: `join_student` 함수로 학생 입장 처리

### ⚠️ 발견된 이슈

#### **High: 이중 RLS 파일 존재**

**위치**: 
- `supabase/classroom_access_rls.sql` (teachers/classrooms/students)
- `supabase/rls.sql` (profiles/teacher_classes/student_classes)

**문제**:
- 두 개의 RLS 파일이 서로 다른 테이블 구조를 가정
- 어떤 정책이 실제로 적용되었는지 불명확

**수정 제안**:
```sql
-- 현재 적용된 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

#### **Medium: profiles 테이블 RLS 정책 확인 필요**

**위치**: `supabase/rls.sql` Line 137-164

**문제**:
- `profiles` 테이블의 SELECT 정책이 복잡함
- 교사가 담당 학급 학생 프로필을 조회할 수 있지만, `teacher_classes` 테이블이 실제로 존재하는지 확인 필요

**수정 제안**:
- 현재 적용된 스키마에 맞는 RLS 정책만 유지
- 사용하지 않는 정책 제거

---

## 4. 교사/학생 권한 분리 점검

### ✅ 양호한 부분

1. **서버 사이드 권한 검증**: API 라우트에서 `profiles.role` 확인
2. **RLS 기반 분리**: 테이블 레벨에서 권한 강제

### ⚠️ 발견된 이슈

#### **High: 이중 스키마로 인한 권한 검증 불일치**

**위치**: 
- `app/api/teacher/classes/route.ts` (profiles 테이블 사용)
- `app/dashboard/teacher/page.tsx` (classrooms 테이블 사용)

**문제**:
- 일부 API는 `profiles` 테이블의 `role` 필드로 권한 확인
- 일부 페이지는 `classrooms` 테이블의 `teacher_id`로 권한 확인
- 두 스키마가 혼재되어 있음

**수정 제안**:
```typescript
// 단일 권한 검증 함수 생성
// lib/auth/checkTeacherRole.ts
export async function checkTeacherRole(userId: string): Promise<boolean> {
  const supabase = await createClient()
  
  // 현재 적용된 스키마에 맞게 수정
  // Option 1: profiles 테이블 사용
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single()
  
  // Option 2: teachers 테이블 사용
  // const { data } = await supabase
  //   .from('teachers')
  //   .select('id')
  //   .eq('id', userId)
  //   .single()
  
  return data?.role === 'teacher' || data?.role === 'admin'
}
```

#### **Medium: 클라이언트에서 role 체크하는 부분**

**위치**: `app/page.tsx` Line 24

**문제**:
```typescript
if (profile.role === 'student') {
  // 클라이언트에서 role 체크
}
```

**영향**: UI 숨김만으로 권한을 막고 있음 (서버 검증은 별도로 있음)

**수정 제안**: 이미 서버 사이드 검증이 있으므로 Low 우선순위, 하지만 일관성 유지 권장

---

## 5. 입력값 검증 및 XSS 점검

### ✅ 양호한 부분

1. **입력 길이 제한**: 학생 이름 2-10자, 교실 코드 형식 검증
2. **정규식 검증**: `CLASSROOM_CODE_REGEX` 사용
3. **XSS 방지**: `dangerouslySetInnerHTML` 사용 없음

### ⚠️ 발견된 이슈

#### **Low: 에러 메시지에 내부 구조 노출 가능성**

**위치**: `app/api/teacher/login/route.ts` Line 32

**문제**:
```typescript
return "데이터베이스 테이블이 준비되지 않았습니다. Supabase에서 `supabase/classroom_access_schema.sql` 및 `supabase/classroom_access_rls.sql`를 실행해 주세요.";
```

**영향**: 내부 파일 구조가 사용자에게 노출됨

**수정 제안**:
```typescript
return "데이터베이스 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.";
```

---

## 6. 파일 업로드 / 스토리지 보안

### ✅ 확인 결과

- 현재 코드베이스에서 Supabase Storage 사용 없음
- `submissions` 테이블에 `file_path` 필드가 있으나 실제 업로드 로직 미구현

**권장사항**: 향후 구현 시
- Storage bucket에 RLS 정책 적용
- 파일 타입/용량 제한
- 사용자별 경로 분리 (`{user_id}/{file_id}`)

---

## 7. 로그 / 에러 처리 점검

### ✅ 양호한 부분

1. **민감 정보 보호**: `console.error`에 비밀번호/토큰 출력 없음
2. **구조화된 로깅**: `[teacher-login] step=...` 형식으로 추적 가능

### ⚠️ 발견된 이슈

#### **Medium: 개발 스크립트에서 비밀번호 출력**

**위치**: `scripts/seed-teacher-admin.mjs` Line 200-201

**문제**:
```javascript
console.log(`Admin login: ${adminEmail} / ${adminPassword}`)
```

**영향**: 개발 환경에서만 실행되지만, 로그 파일에 남을 수 있음

**수정 제안**:
```javascript
console.log(`Admin login: ${adminEmail} / [REDACTED]`)
// 또는 환경변수로 제어
if (process.env.VERBOSE_LOGGING === 'true') {
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`)
}
```

---

## 8. 최종 산출물

### 발견된 보안 이슈 표

| Severity | 위치 | 문제 설명 | 영향 | 수정 제안 |
|----------|------|-----------|------|-----------|
| **Critical** | `supabase/` (이중 스키마) | 두 개의 서로 다른 스키마 파일 존재 | RLS 정책 불일치, API 오류 가능 | 현재 적용된 스키마 확인 후 단일화 |
| **Critical** | `app/dashboard/teacher/page.tsx` | classroom 없으면 리다이렉트 | DB 저장 실패 시 접근 불가 | 세션 유지 + 안내 메시지 표시 |
| **High** | `supabase/` (이중 RLS) | 두 개의 RLS 파일 존재 | 정책 충돌 가능 | 현재 적용된 정책 확인 후 정리 |
| **High** | 권한 검증 로직 | 이중 스키마로 인한 불일치 | 권한 우회 가능성 | 단일 권한 검증 함수로 통합 |
| **Medium** | `scripts/seed-teacher-admin.mjs` | 콘솔에 비밀번호 출력 | 로그 파일 노출 | 비밀번호 마스킹 |
| **Medium** | 에러 메시지 | 내부 파일 구조 노출 | 정보 유출 | 일반적인 메시지로 변경 |
| **Low** | `app/page.tsx` | 클라이언트 role 체크 | UI 숨김만 (서버 검증 별도) | 일관성 유지 권장 |

---

### 즉시 조치 필요 Top 5

1. **현재 적용된 스키마 확인 및 단일화** (Critical)
   ```sql
   -- Supabase Dashboard > SQL Editor에서 실행
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. **교사 대시보드 접근 로직 수정** (Critical)
   - `app/dashboard/teacher/page.tsx`에서 classroom 없어도 접근 허용
   - 안내 메시지 표시

3. **RLS 정책 확인 및 정리** (High)
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public';
   ```

4. **권한 검증 함수 통합** (High)
   - 단일 권한 검증 함수 생성
   - 모든 API에서 일관되게 사용

5. **개발 스크립트 보안 강화** (Medium)
   - 비밀번호 출력 제거 또는 마스킹

---

### 최소 변경 코드 / RLS 패치 예시

#### 1. 교사 대시보드 접근 수정

**파일**: `app/dashboard/teacher/page.tsx`

```typescript
export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login/teacher')

  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id, code')
    .eq('teacher_id', user.id)
    .maybeSingle()

  // 수정: classroom 없어도 접근 허용
  if (!classroom) {
    return (
      <TeacherDashboard
        classroomCode={null}
        students={[]}
        showSetupMessage={true}
      />
    )
  }

  // ... 기존 코드
}
```

#### 2. 권한 검증 함수 통합

**파일**: `lib/auth/checkTeacherRole.ts` (신규)

```typescript
import { createClient } from '@/lib/supabase/server'

/**
 * 교사 권한 확인 (단일 함수로 통합)
 * 현재 적용된 스키마에 맞게 수정 필요
 */
export async function checkTeacherRole(userId: string): Promise<boolean> {
  const supabase = await createClient()
  
  // Option 1: profiles 테이블 사용 시
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single()
  
  if (profile?.role === 'teacher' || profile?.role === 'admin') {
    return true
  }
  
  // Option 2: teachers 테이블 사용 시 (fallback)
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('id', userId)
    .single()
  
  return Boolean(teacher?.id)
}
```

---

### 회귀 테스트 체크리스트

#### 로그인 테스트
- [ ] 교사 로그인 성공 시 `/teacher/dashboard` 접근 가능
- [ ] DB 저장 실패해도 세션 유지 및 대시보드 접근 가능
- [ ] 학생 로그인 시 `/student/dashboard` 접근 가능

#### 교사 권한 테스트
- [ ] 교사만 `/api/teacher/classes` 접근 가능
- [ ] 교사만 자신의 classroom 데이터 조회 가능
- [ ] 다른 교사의 classroom 데이터 접근 불가 (RLS)

#### 학생 권한 테스트
- [ ] 학생은 `join_student` RPC로만 입장 가능
- [ ] 학생은 다른 classroom 코드로 입장 불가
- [ ] 학생은 교사 전용 API 접근 불가

#### 배포 후 접근 확인
- [ ] 프로덕션 환경에서 `.env` 파일이 Git에 커밋되지 않았는지 확인
- [ ] Supabase Dashboard에서 RLS 정책이 올바르게 적용되었는지 확인
- [ ] 모든 테이블에 RLS가 활성화되어 있는지 확인

---

## 결론

전반적으로 **Supabase 보안 모델을 잘 따르고 있으나**, **이중 스키마 구조**로 인한 혼란이 가장 큰 위험 요소입니다. 

**우선순위**:
1. 현재 적용된 스키마 확인 및 문서화
2. 교사 대시보드 접근 로직 수정 (Critical)
3. RLS 정책 확인 및 정리
4. 권한 검증 로직 통합

**예상 작업 시간**: 2-4시간 (스키마 확인 포함)

---

**확인 필요 사항**:
- 현재 Supabase 프로젝트에 어떤 스키마가 실제로 적용되어 있는지
- `classroom_access_*` 스키마와 `schema.sql` 중 어떤 것이 사용 중인지
- Git 히스토리에 `.env` 파일이 커밋되었는지

