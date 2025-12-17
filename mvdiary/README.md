# 나의 하루가 피어나다 (My Daily Bloom)

학생-교사 연계 다이어리 웹앱

## 프로젝트 개요

초등학생의 자기주도 학습 습관 형성과 교사의 대규모 학급·학생 관리를 동시에 지원하는 학교 단위 확장형 학습 다이어리 웹앱입니다.

## 기술 스택

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Next.js Server Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (ID/PW)
- **Storage**: Supabase Storage

## 주요 기능

### 학생 기능
- 오늘의 ToDo List (학생 작성 + 교사 할당)
- 학습 지원 (시간표, 달력, 주간학습안내, 공지사항)
- 1:1 채팅 (담당 교사와)
- 개인 기록 (날짜별 메모)
- 과제 제출 (PDF, HWP, 최대 20MB)

### 교사 기능
- 학급 선택 (다대다 구조 지원)
- 학생 현황 모니터링 (ToDo 달성률)
- ToDo 할당 (전체 학급 또는 특정 학생)
- 공지/알림장 게시
- 채팅 & 피드백
- 교무수첩

## 설치 및 실행

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수를 설정하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 데이터베이스 설정

Supabase 대시보드에서 다음 SQL 파일을 순서대로 실행하세요:

1. `supabase/schema.sql` - 테이블 생성
2. `supabase/rls.sql` - RLS 정책 적용

### 4. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
mvdiary/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   │   ├── auth/          # 인증 API
│   │   ├── student/       # 학생 API
│   │   └── teacher/       # 교사 API
│   ├── student/           # 학생 페이지
│   └── teacher/           # 교사 페이지
├── components/            # React 컴포넌트
│   ├── auth/             # 인증 컴포넌트
│   ├── student/          # 학생 컴포넌트
│   └── teacher/          # 교사 컴포넌트
├── lib/                   # 유틸리티
│   └── supabase/         # Supabase 클라이언트
├── supabase/             # 데이터베이스 스키마
│   ├── schema.sql        # 테이블 정의
│   └── rls.sql           # RLS 정책
└── app/globals.css       # 글로벌 스타일 (디자인 토큰)
```

## 보안 원칙

- 모든 데이터는 기본 차단 (RLS)
- 서버 API에서 권한 재검증
- 클라이언트는 절대 신뢰하지 않음
- 모든 접근은 `teacher_classes` 기준으로 제한

## 디자인 시스템

- Material Design 3 준수
- 디자인 토큰 기반 CSS 변수
- 글래스모피즘 적용
- 태블릿 가로 16:9 기준
- Noto Sans KR 폰트 사용
- 웜/옐로 톤 사용 금지

## 확장성

- 다교사, 다학급 구조 지원
- 학급 수 무제한 확장 가능
- 대규모 학생 관리 최적화
- Polling 30초 (대시보드 집계)
- Realtime (채팅만 사용)

## 라이선스

MIT
