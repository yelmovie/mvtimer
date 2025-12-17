-- ============================================
-- 나의 하루가 피어나다 (My Daily Bloom)
-- DB 스키마 v3
-- ============================================
-- 확장 전제: 다교사, 다학급, 대규모 학생 지원
-- 보안: RLS 필수, 모든 접근은 teacher_classes 기준
-- ============================================

-- 확장성: UUID 사용으로 분산 환경 대응
-- 성능: 인덱스 최적화 (class_id, user_id 중심)

-- ============================================
-- 1. 기본 테이블: 학교 및 학급
-- ============================================

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 학급 테이블
-- 확장성: school_id로 학교 단위 분리
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  school_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_class_per_school UNIQUE(school_id, name, school_year)
);

-- 인덱스: 학급 조회 최적화
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_year ON classes(school_year);

-- ============================================
-- 2. 사용자 프로필 (Supabase Auth 연동)
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  display_name TEXT NOT NULL,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: 역할 및 학교별 조회
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);

-- ============================================
-- 3. 교사-학급 다대다 관계 (핵심 구조)
-- ============================================
-- 확장성: 한 교사는 여러 학급 담당 가능
-- 권한: 모든 데이터 접근은 이 테이블 기준

CREATE TABLE IF NOT EXISTS teacher_classes (
  teacher_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('homeroom', 'subject', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (teacher_id, class_id)
);

-- 인덱스: 교사별, 학급별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher_id ON teacher_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_class_id ON teacher_classes(class_id);

-- ============================================
-- 4. 학생-학급 관계
-- ============================================

CREATE TABLE IF NOT EXISTS student_classes (
  student_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_student_classes_student_id ON student_classes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_classes_class_id ON student_classes(class_id);

-- ============================================
-- 5. ToDo 시스템
-- ============================================

-- ToDo 마스터 (학급 단위)
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  source TEXT NOT NULL CHECK (source IN ('student', 'teacher')),
  created_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: 학급별, 날짜별 조회
CREATE INDEX IF NOT EXISTS idx_todos_class_id ON todos(class_id);
CREATE INDEX IF NOT EXISTS idx_todos_owner_user_id ON todos(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_source ON todos(source);

-- ToDo 상태 (학생별 완료 여부)
CREATE TABLE IF NOT EXISTS todo_status (
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  is_done BOOLEAN DEFAULT FALSE,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (todo_id, user_id)
);

-- 인덱스: 학생별, 완료 여부 조회
CREATE INDEX IF NOT EXISTS idx_todo_status_user_id ON todo_status(user_id);
CREATE INDEX IF NOT EXISTS idx_todo_status_is_done ON todo_status(is_done);

-- ============================================
-- 6. 공지사항 / 알림장
-- ============================================

CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  publish_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: 학급별, 고정 공지, 발행일 조회
CREATE INDEX IF NOT EXISTS idx_notices_class_id ON notices(class_id);
CREATE INDEX IF NOT EXISTS idx_notices_pinned ON notices(pinned);
CREATE INDEX IF NOT EXISTS idx_notices_publish_at ON notices(publish_at);

-- 공지 읽음 여부 추적
CREATE TABLE IF NOT EXISTS notice_reads (
  notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (notice_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notice_reads_user_id ON notice_reads(user_id);

-- ============================================
-- 7. 1:1 채팅 (Supabase Realtime 사용)
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_chat_participants CHECK (
    (SELECT role FROM profiles WHERE user_id = student_id) = 'student' AND
    (SELECT role FROM profiles WHERE user_id = teacher_id) = 'teacher'
  )
);

-- 인덱스: 채팅 조회 최적화
CREATE INDEX IF NOT EXISTS idx_messages_class_id ON messages(class_id);
CREATE INDEX IF NOT EXISTS idx_messages_student_id ON messages(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_teacher_id ON messages(teacher_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ============================================
-- 8. 과제 제출
-- ============================================

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  size BIGINT NOT NULL CHECK (size <= 20971520), -- 20MB 제한
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_submission_per_todo UNIQUE(todo_id, user_id)
);

-- 인덱스: ToDo별, 사용자별 조회
CREATE INDEX IF NOT EXISTS idx_submissions_todo_id ON submissions(todo_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);

-- ============================================
-- 9. 개인 기록 (학생 메모)
-- ============================================

CREATE TABLE IF NOT EXISTS student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  note_date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_note_per_date UNIQUE(user_id, note_date)
);

-- 인덱스: 사용자별, 날짜별 조회
CREATE INDEX IF NOT EXISTS idx_student_notes_user_id ON student_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_note_date ON student_notes(note_date);

-- ============================================
-- 10. 시간표 (확장 가능)
-- ============================================

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=일요일
  period INTEGER NOT NULL,
  subject TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day_of_week ON schedules(day_of_week);

-- ============================================
-- 11. 교무수첩 (교사 개인 기록)
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_notes_teacher_id ON teacher_notes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_class_id ON teacher_notes(class_id);

-- ============================================
-- 12. 업데이트 트리거 함수
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todo_status_updated_at BEFORE UPDATE ON todo_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notices_updated_at BEFORE UPDATE ON notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_notes_updated_at BEFORE UPDATE ON student_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_notes_updated_at BEFORE UPDATE ON teacher_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 스키마 완료
-- ============================================
-- 다음 단계: RLS 정책 적용 (rls.sql 참조)

