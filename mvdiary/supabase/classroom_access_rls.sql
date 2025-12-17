-- ============================================
-- Classroom Access System (Supabase) - RLS + RPC
-- Policy goals:
-- - Teachers (authenticated) can read/write their own classroom and students.
-- - Students (anon) cannot read tables directly.
-- - Student join happens via SECURITY DEFINER RPC (join_student).
-- ============================================

-- Enable RLS
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Teachers table policies
CREATE POLICY "teacher can read own teacher row"
  ON teachers FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "teacher can insert own teacher row"
  ON teachers FOR INSERT
  WITH CHECK (id = auth.uid());

-- Classrooms table policies
CREATE POLICY "teacher can read own classroom"
  ON classrooms FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "teacher can insert own classroom"
  ON classrooms FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "teacher can update own classroom"
  ON classrooms FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Students table policies (teacher read only)
CREATE POLICY "teacher can read students in own classroom"
  ON students FOR SELECT
  USING (
    classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
  );

-- No public (anon) direct select/insert/update/delete on students/classrooms.
-- Student join will be handled via RPC.

-- ============================================
-- RPC: join_student (anon allowed to execute)
-- - Validates classroom code format and slot availability.
-- - Inserts exactly one student slot (1..30) if available.
-- ============================================

CREATE OR REPLACE FUNCTION join_student(
  p_classroom_code TEXT,
  p_student_number INTEGER,
  p_student_name TEXT
)
RETURNS TABLE (
  classroom_id UUID,
  classroom_code TEXT,
  student_number INTEGER,
  student_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_classroom_id UUID;
  v_name TEXT;
BEGIN
  v_code := upper(trim(p_classroom_code));
  v_name := trim(p_student_name);

  IF v_code !~ '^[A-Z]{2}[0-9]{4}$' THEN
    RAISE EXCEPTION 'Invalid classroom code';
  END IF;

  IF p_student_number < 1 OR p_student_number > 30 THEN
    RAISE EXCEPTION 'Invalid student number';
  END IF;

  IF v_name IS NULL OR length(v_name) < 2 OR length(v_name) > 10 THEN
    RAISE EXCEPTION 'Invalid student name';
  END IF;

  SELECT id INTO v_classroom_id
  FROM classrooms
  WHERE code = v_code
  LIMIT 1;

  IF v_classroom_id IS NULL THEN
    RAISE EXCEPTION 'Classroom not found';
  END IF;

  -- Slot check
  IF EXISTS (
    SELECT 1 FROM students
    WHERE classroom_id = v_classroom_id
      AND student_number = p_student_number
  ) THEN
    RAISE EXCEPTION 'Student slot already taken';
  END IF;

  INSERT INTO students (classroom_id, student_number, student_name)
  VALUES (v_classroom_id, p_student_number, v_name);

  RETURN QUERY
  SELECT v_classroom_id, v_code, p_student_number, v_name;
END;
$$;

-- Allow anon and authenticated users to execute the RPC
GRANT EXECUTE ON FUNCTION join_student(TEXT, INTEGER, TEXT) TO anon, authenticated;


