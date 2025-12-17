'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './TeacherDashboard.module.css'

interface Class {
  class_id: string
  role: string
  classes: {
    id: string
    name: string
    school_year: number
    schools: {
      id: string
      name: string
    }
  }
}

interface Student {
  id: string
  displayName: string
  completionRate: number
  totalTodos: number
  completedTodos: number
}

/**
 * 교사 대시보드 컴포넌트
 * 학급 선택, 학생 현황 모니터링, ToDo 할당 등
 */
export default function TeacherDashboard({
  displayName,
}: {
  displayName: string
}) {
  const router = useRouter()
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClasses()
  }, [])

  useEffect(() => {
    if (selectedClassId) {
      loadStudents()
      // 마지막 선택 학급 기억
      localStorage.setItem('lastSelectedClassId', selectedClassId)
    }
  }, [selectedClassId])

  // 마지막 선택 학급 복원
  useEffect(() => {
    if (classes.length > 0) {
      const lastClassId = localStorage.getItem('lastSelectedClassId')
      if (lastClassId && classes.some((c) => c.class_id === lastClassId)) {
        setSelectedClassId(lastClassId)
      } else {
        setSelectedClassId(classes[0].class_id)
      }
    }
  }, [classes])

  const loadClasses = async () => {
    try {
      const response = await fetch('/api/teacher/classes')
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      }
    } catch (error) {
      console.error('Failed to load classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async () => {
    if (!selectedClassId) return

    try {
      const response = await fetch(`/api/teacher/students?classId=${selectedClassId}`)
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error('Failed to load students:', error)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  if (loading) {
    return <div className={styles.loading}>로딩 중...</div>
  }

  return (
    <div className={styles.container}>
      {/* 사이드바 */}
      <aside className={styles.sidebar}>
        <div className={styles.profileSection}>
          <div className={styles.time}>07:00 am</div>
          <div className={styles.profileImage}>
            <img src="/placeholder-avatar.png" alt="프로필" />
            <button className={styles.cameraButton} aria-label="프로필 변경">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>
          <div className={styles.greeting}>
            <h2>Good Morning!</h2>
            <p className={styles.teacherName}>{displayName} 선생님</p>
            <p className={styles.subtitle}>Ready to learn today</p>
          </div>
        </div>

        <nav className={styles.nav}>
          <button className={`${styles.navItem} ${styles.navItemActive}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            대시보드
          </button>
          <button className={styles.navItem}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            시간표, 수업자료
          </button>
          <button className={styles.navItem}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
            주간학습안내
          </button>
          <button className={styles.navItem}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            교무수첩
          </button>
          <button className={styles.navItem}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            알림장, 공지사항
          </button>
          <button className={styles.navItem}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
            학생 할 일 목록
          </button>
          <button className={styles.navItem}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            시간표
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.footerButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
            </svg>
            마이페이지
          </button>
          <button className={styles.footerButton} onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>대시보드</h1>
          <div className={styles.headerRight}>
            <button className={styles.messageButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              학생쪽지
            </button>
            <button className={styles.iconButton} aria-label="알림">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <span className={styles.date}>2026년 4월 20일 (월)</span>
          </div>
        </header>

        {/* 학급 선택 */}
        {classes.length > 0 && (
          <div className={styles.classSelector}>
            <label htmlFor="class-select">담당 학급:</label>
            <select
              id="class-select"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className={styles.select}
            >
              {classes.map((c) => (
                <option key={c.class_id} value={c.class_id}>
                  {c.classes.name} ({c.classes.school_year}학년)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 학생 현황 모니터링 */}
        {selectedClassId && (
          <section className={styles.studentsSection}>
            <h2>학생 현황</h2>
            <div className={styles.studentsGrid}>
              {students.map((student) => (
                <div
                  key={student.id}
                  className={`${styles.studentCard} ${
                    student.completionRate < 50 ? styles.studentCardWarning : ''
                  }`}
                >
                  <h3>{student.displayName}</h3>
                  <div className={styles.progressInfo}>
                    <span className={styles.progressLabel}>달성률</span>
                    <span className={styles.progressValue}>
                      {student.completionRate}%
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${student.completionRate}%`,
                        backgroundColor:
                          student.completionRate >= 80
                            ? 'var(--color-success)'
                            : student.completionRate >= 50
                            ? 'var(--color-warning)'
                            : 'var(--color-error)',
                      }}
                    />
                  </div>
                  <div className={styles.todoStats}>
                    <span>
                      완료: {student.completedTodos} / 전체: {student.totalTodos}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

