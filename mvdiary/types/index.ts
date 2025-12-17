/**
 * 공통 타입 정의
 */

export type UserRole = 'student' | 'teacher' | 'admin'

export type TodoSource = 'student' | 'teacher'

export type TeacherClassRole = 'homeroom' | 'subject' | 'admin'

export interface Profile {
  user_id: string
  role: UserRole
  display_name: string
  school_id: string
  created_at: string
  updated_at: string
}

export interface Todo {
  id: string
  class_id: string
  owner_user_id?: string
  title: string
  description?: string
  due_date?: string
  source: TodoSource
  created_by: string
  created_at: string
  updated_at: string
  todo_status?: TodoStatus[]
}

export interface TodoStatus {
  todo_id: string
  user_id: string
  is_done: boolean
  done_at?: string
  created_at: string
  updated_at: string
}

export interface Notice {
  id: string
  class_id: string
  title: string
  body: string
  pinned: boolean
  publish_at: string
  created_by: string
  created_at: string
  updated_at: string
  isRead?: boolean
}

export interface Message {
  id: string
  class_id: string
  student_id: string
  teacher_id: string
  body: string
  created_at: string
}

export interface Submission {
  id: string
  todo_id: string
  user_id: string
  file_path: string
  mime: string
  size: number
  created_at: string
}

