-- ============================================
-- Classroom Access System (Supabase) - Schema
-- Teachers: Supabase Auth users (email/password)
-- Students: no Auth user; join via server API + RPC
-- ============================================

-- 1) Teachers (one-to-one with auth.users)
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Classrooms (one teacher -> one classroom)
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) NOT NULL UNIQUE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT classroom_code_format CHECK (code ~ '^[A-Z]{2}[0-9]{4}$')
);

-- 3) Students (30 slots max per classroom using UNIQUE + CHECK)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_number INTEGER NOT NULL,
  student_name VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT student_number_range CHECK (student_number BETWEEN 1 AND 30),
  CONSTRAINT unique_student_slot UNIQUE (classroom_id, student_number)
);

CREATE INDEX IF NOT EXISTS idx_classrooms_teacher_id ON classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_classroom_id ON students(classroom_id);


