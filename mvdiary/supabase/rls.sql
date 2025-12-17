-- ============================================
-- Row Level Security (RLS) 정책
-- 나의 하루가 피어나다 v3
-- ============================================
-- 보안 원칙: 모든 데이터는 기본 차단, 명시적 허용만
-- 접근 기준: teacher_classes 테이블을 통한 권한 검증
-- ============================================

-- ============================================
-- 1. 기본 RLS 활성화
-- ============================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_notes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 헬퍼 함수: 권한 검증
-- ============================================

-- 사용자가 특정 학급의 교사인지 확인
CREATE OR REPLACE FUNCTION is_teacher_of_class(class_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teacher_classes
    WHERE teacher_id = auth.uid()
      AND class_id = class_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자가 특정 학급의 학생인지 확인
CREATE OR REPLACE FUNCTION is_student_of_class(class_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM student_classes
    WHERE student_id = auth.uid()
      AND class_id = class_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자가 관리자인지 확인
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자가 담당 학급 목록 조회 (교사용)
CREATE OR REPLACE FUNCTION get_teacher_class_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT class_id FROM teacher_classes
  WHERE teacher_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자가 소속 학급 목록 조회 (학생용)
CREATE OR REPLACE FUNCTION get_student_class_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT class_id FROM student_classes
  WHERE student_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. schools 테이블 정책
-- ============================================

-- 모든 사용자는 자신의 학교 정보 조회 가능
CREATE POLICY "Users can view their own school"
  ON schools FOR SELECT
  USING (
    id IN (
      SELECT school_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- 관리자만 학교 생성/수정 가능
CREATE POLICY "Admins can manage schools"
  ON schools FOR ALL
  USING (is_admin());

-- ============================================
-- 4. classes 테이블 정책
-- ============================================

-- 교사: 담당 학급 조회
CREATE POLICY "Teachers can view their classes"
  ON classes FOR SELECT
  USING (
    id IN (SELECT * FROM get_teacher_class_ids())
    OR school_id IN (SELECT school_id FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 학생: 소속 학급 조회
CREATE POLICY "Students can view their classes"
  ON classes FOR SELECT
  USING (
    id IN (SELECT * FROM get_student_class_ids())
  );

-- 관리자: 학교 내 모든 학급 관리
CREATE POLICY "Admins can manage classes"
  ON classes FOR ALL
  USING (
    school_id IN (SELECT school_id FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 5. profiles 테이블 정책
-- ============================================

-- 사용자는 자신의 프로필 조회/수정 가능
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

-- 교사: 담당 학급 학생 프로필 조회
CREATE POLICY "Teachers can view students in their classes"
  ON profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      role = 'student'
      AND user_id IN (
        SELECT student_id FROM student_classes
        WHERE class_id IN (SELECT * FROM get_teacher_class_ids())
      )
    )
  );

-- 관리자: 학교 내 모든 프로필 조회
CREATE POLICY "Admins can view all profiles in school"
  ON profiles FOR SELECT
  USING (
    school_id IN (SELECT school_id FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 6. teacher_classes 테이블 정책
-- ============================================

-- 교사: 자신의 담당 학급 조회
CREATE POLICY "Teachers can view their class assignments"
  ON teacher_classes FOR SELECT
  USING (teacher_id = auth.uid());

-- 관리자: 모든 교사-학급 관계 조회
CREATE POLICY "Admins can view all teacher classes"
  ON teacher_classes FOR SELECT
  USING (
    class_id IN (
      SELECT id FROM classes
      WHERE school_id IN (SELECT school_id FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    )
  );

-- ============================================
-- 7. student_classes 테이블 정책
-- ============================================

-- 학생: 자신의 소속 학급 조회
CREATE POLICY "Students can view their classes"
  ON student_classes FOR SELECT
  USING (student_id = auth.uid());

-- 교사: 담당 학급 학생 조회
CREATE POLICY "Teachers can view students in their classes"
  ON student_classes FOR SELECT
  USING (
    class_id IN (SELECT * FROM get_teacher_class_ids())
  );

-- ============================================
-- 8. todos 테이블 정책
-- ============================================

-- 학생: 소속 학급의 ToDo 조회
CREATE POLICY "Students can view todos in their classes"
  ON todos FOR SELECT
  USING (
    class_id IN (SELECT * FROM get_student_class_ids())
    OR owner_user_id = auth.uid()
  );

-- 학생: 자신의 ToDo 생성/수정
CREATE POLICY "Students can manage own todos"
  ON todos FOR ALL
  USING (
    owner_user_id = auth.uid()
    AND source = 'student'
  );

-- 교사: 담당 학급의 ToDo 조회/생성/수정
CREATE POLICY "Teachers can manage todos in their classes"
  ON todos FOR ALL
  USING (
    class_id IN (SELECT * FROM get_teacher_class_ids())
  );

-- ============================================
-- 9. todo_status 테이블 정책
-- ============================================

-- 학생: 자신의 ToDo 상태 조회/수정
CREATE POLICY "Students can manage own todo status"
  ON todo_status FOR ALL
  USING (user_id = auth.uid());

-- 교사: 담당 학급 학생의 ToDo 상태 조회
CREATE POLICY "Teachers can view todo status in their classes"
  ON todo_status FOR SELECT
  USING (
    todo_id IN (
      SELECT id FROM todos
      WHERE class_id IN (SELECT * FROM get_teacher_class_ids())
    )
  );

-- ============================================
-- 10. notices 테이블 정책
-- ============================================

-- 학생: 소속 학급 공지 조회
CREATE POLICY "Students can view notices in their classes"
  ON notices FOR SELECT
  USING (
    class_id IN (SELECT * FROM get_student_class_ids())
    AND publish_at <= NOW()
  );

-- 교사: 담당 학급 공지 관리
CREATE POLICY "Teachers can manage notices in their classes"
  ON notices FOR ALL
  USING (
    class_id IN (SELECT * FROM get_teacher_class_ids())
  );

-- ============================================
-- 11. notice_reads 테이블 정책
-- ============================================

-- 학생: 자신의 읽음 기록 조회/생성
CREATE POLICY "Students can manage own notice reads"
  ON notice_reads FOR ALL
  USING (user_id = auth.uid());

-- 교사: 담당 학급 학생의 읽음 기록 조회
CREATE POLICY "Teachers can view notice reads in their classes"
  ON notice_reads FOR SELECT
  USING (
    notice_id IN (
      SELECT id FROM notices
      WHERE class_id IN (SELECT * FROM get_teacher_class_ids())
    )
  );

-- ============================================
-- 12. messages 테이블 정책
-- ============================================

-- 학생: 자신이 참여한 채팅 조회/생성
CREATE POLICY "Students can manage own messages"
  ON messages FOR ALL
  USING (student_id = auth.uid());

-- 교사: 담당 학급 학생과의 채팅 조회/생성
CREATE POLICY "Teachers can manage messages with students"
  ON messages FOR ALL
  USING (
    teacher_id = auth.uid()
    AND class_id IN (SELECT * FROM get_teacher_class_ids())
  );

-- ============================================
-- 13. submissions 테이블 정책
-- ============================================

-- 학생: 자신의 제출물 관리
CREATE POLICY "Students can manage own submissions"
  ON submissions FOR ALL
  USING (user_id = auth.uid());

-- 교사: 담당 학급 학생의 제출물 조회
CREATE POLICY "Teachers can view submissions in their classes"
  ON submissions FOR SELECT
  USING (
    todo_id IN (
      SELECT id FROM todos
      WHERE class_id IN (SELECT * FROM get_teacher_class_ids())
    )
  );

-- ============================================
-- 14. student_notes 테이블 정책
-- ============================================

-- 학생: 자신의 메모만 조회/관리 (교사 비공개)
CREATE POLICY "Students can manage own notes"
  ON student_notes FOR ALL
  USING (user_id = auth.uid());

-- ============================================
-- 15. schedules 테이블 정책
-- ============================================

-- 학생: 소속 학급 시간표 조회
CREATE POLICY "Students can view schedules in their classes"
  ON schedules FOR SELECT
  USING (
    class_id IN (SELECT * FROM get_student_class_ids())
  );

-- 교사: 담당 학급 시간표 관리
CREATE POLICY "Teachers can manage schedules in their classes"
  ON schedules FOR ALL
  USING (
    class_id IN (SELECT * FROM get_teacher_class_ids())
  );

-- ============================================
-- 16. teacher_notes 테이블 정책
-- ============================================

-- 교사: 자신의 교무수첩만 조회/관리
CREATE POLICY "Teachers can manage own notes"
  ON teacher_notes FOR ALL
  USING (
    teacher_id = auth.uid()
    AND class_id IN (SELECT * FROM get_teacher_class_ids())
  );

-- ============================================
-- RLS 정책 완료
-- ============================================
-- 보안 검증: 모든 접근은 teacher_classes 기준으로 제한됨
-- 다음 단계: API 라우트 구현

