# 라우팅/권한 버그 수정 완료 보고서

## 문제점
교사로 로그인했는데 학생 대시보드(`/student/dashboard`)로 들어가는 문제

## 해결 방법

### 1. One Source of Truth 생성

#### `lib/routing.ts` (신규)
- 모든 라우트 경로 상수화
- 역할 기반 대시보드 경로 결정 함수: `getDashboardPathByRole()`
- 역할 검증 함수: `isTeacherRole()`, `isStudentRole()`

#### `lib/auth/role.ts` (신규)
- 역할 조회 함수: `getUserRole()`, `getUserRoleById()`
- 모든 역할 조회는 이 함수를 통해 수행
- role이 null이면 오류 반환 (기본값 student로 보내지 않음)

### 2. 수정된 파일 목록

1. **lib/routing.ts** (신규)
   - 라우트 경로 상수 및 역할 기반 분기 로직

2. **lib/auth/role.ts** (신규)
   - 역할 조회 함수 (재사용 가능)

3. **app/api/teacher/login/route.ts**
   - `getUserRoleById()` 사용으로 역할 확인
   - role이 null이면 오류 반환 (기본값 처리 금지)
   - 학생 역할 차단 (403)

4. **app/api/auth/login/route.ts**
   - `getUserRoleById()` 사용으로 역할 확인
   - role이 null이면 오류 반환

5. **app/page.tsx**
   - `getUserRole()` 사용으로 역할 확인
   - role이 null이면 홈에 머물러서 로그인 유도

6. **app/student/dashboard/page.tsx**
   - `getUserRole()` 사용으로 역할 확인
   - 학생이 아니면 교사 대시보드로 교정 리다이렉트

7. **app/teacher/dashboard/page.tsx**
   - `getUserRole()` 사용으로 역할 확인
   - 교사가 아니면 학생 대시보드로 교정 리다이렉트

## 핵심 변경 사항

### Before (문제)
```typescript
// 하드코딩된 경로
const redirectPath = profile.role === 'student' ? '/student/dashboard' : '/teacher/dashboard'

// role이 null일 때 기본값 처리 (위험)
if (!profile) {
  // 기본값으로 student 처리하거나 무시
}
```

### After (해결)
```typescript
// One Source of Truth 사용
import { getDashboardPathByRole } from '@/lib/routing'
import { getUserRole } from '@/lib/auth/role'

const roleResult = await getUserRole()
if (roleResult.error || !roleResult.role) {
  // 오류 처리 (기본값 student로 보내지 않음)
  return error
}
const redirectPath = getDashboardPathByRole(roleResult.role)
```

## 라우트 가드

### `/student/dashboard`
- 학생 역할만 접근 가능
- 교사/관리자가 접근 시 → `/teacher/dashboard`로 교정 리다이렉트
- role이 null → `/`로 리다이렉트

### `/teacher/dashboard`
- 교사/관리자 역할만 접근 가능
- 학생이 접근 시 → `/student/dashboard`로 교정 리다이렉트
- role이 null → `/`로 리다이렉트

## 회귀 테스트 체크리스트

### 1. 교사 계정 로그인
- [ ] `/login/teacher`에서 교사 계정으로 로그인
- [ ] `/teacher/dashboard`로 정상 리다이렉트
- [ ] 교사 대시보드 화면 정상 표시

### 2. 학생 계정 로그인
- [ ] `/enter` 또는 학생 입장 페이지에서 학생 입장
- [ ] `/student/dashboard`로 정상 리다이렉트
- [ ] 학생 대시보드 화면 정상 표시

### 3. 직접 URL 접근 테스트
- [ ] 교사 계정으로 로그인 후 브라우저에서 `/student/dashboard` 직접 입력
- [ ] 자동으로 `/teacher/dashboard`로 교정 리다이렉트되는지 확인
- [ ] 학생 계정으로 로그인 후 브라우저에서 `/teacher/dashboard` 직접 입력
- [ ] 자동으로 `/student/dashboard`로 교정 리다이렉트되는지 확인

### 4. 새로고침 테스트 (SSR/CSR)
- [ ] 교사 대시보드에서 새로고침 (F5)
- [ ] role이 유지되어 `/teacher/dashboard`에 머무는지 확인
- [ ] 학생 대시보드에서 새로고침 (F5)
- [ ] role이 유지되어 `/student/dashboard`에 머무는지 확인

### 5. 루트 페이지 접근
- [ ] 교사 계정으로 로그인 후 `/` 접근
- [ ] 자동으로 `/teacher/dashboard`로 리다이렉트되는지 확인
- [ ] 학생 계정으로 로그인 후 `/` 접근
- [ ] 자동으로 `/student/dashboard`로 리다이렉트되는지 확인

### 6. 역할 없음 케이스
- [ ] profiles 테이블에 role이 없는 사용자로 로그인 시도
- [ ] 오류 메시지 표시 및 리다이렉트되지 않는지 확인

### 7. API 엔드포인트 테스트
- [ ] `/api/teacher/login` - 교사 역할 확인 및 올바른 경로 반환
- [ ] `/api/auth/login` - 역할 확인 및 올바른 경로 반환

## 테스트 절차

### 로컬 환경에서 테스트

1. **개발 서버 실행**
   ```bash
   npm run dev
   ```

2. **교사 계정 테스트**
   - 브라우저에서 `http://localhost:3000/login/teacher` 접근
   - 교사 계정으로 로그인
   - `/teacher/dashboard`로 리다이렉트되는지 확인
   - 브라우저 주소창에 `/student/dashboard` 직접 입력
   - 자동으로 `/teacher/dashboard`로 교정되는지 확인

3. **학생 계정 테스트**
   - 브라우저에서 `http://localhost:3000/enter` 접근
   - 학생 입장 정보 입력
   - `/student/dashboard`로 리다이렉트되는지 확인
   - 브라우저 주소창에 `/teacher/dashboard` 직접 입력
   - 자동으로 `/student/dashboard`로 교정되는지 확인

4. **새로고침 테스트**
   - 각 대시보드에서 F5로 새로고침
   - role이 유지되어 올바른 대시보드에 머무는지 확인

## 변경 파일 요약

### 신규 파일
- `lib/routing.ts` - 라우트 경로 상수 및 역할 기반 분기
- `lib/auth/role.ts` - 역할 조회 함수

### 수정 파일
- `app/api/teacher/login/route.ts`
- `app/api/auth/login/route.ts`
- `app/page.tsx`
- `app/student/dashboard/page.tsx`
- `app/teacher/dashboard/page.tsx`
- `components/classroomAccess/TeacherLoginPage.tsx`
- `components/classroomAccess/StudentEnterPage.tsx`

## 보안 개선 사항

1. **기본값 처리 제거**: role이 null일 때 기본값 student로 보내지 않음
2. **역할 검증 강화**: 모든 라우트에서 역할 재확인
3. **교정 리다이렉트**: 잘못된 역할로 접근 시 올바른 대시보드로 자동 이동
4. **One Source of Truth**: 모든 역할/경로 분기 로직을 한 곳에 집중

## 다음 단계 (선택사항)

1. 미들웨어에서 라우트 가드 추가 (성능 최적화)
2. 클라이언트 사이드 role 캐싱 (불필요한 API 호출 감소)
3. 역할 변경 시 세션 무효화 로직 추가

