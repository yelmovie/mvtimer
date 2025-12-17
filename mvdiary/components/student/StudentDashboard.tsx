'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './StudentDashboard.module.css'
import StudentMonthlyCalendar from './StudentMonthlyCalendar'

interface Todo {
  id: string
  title: string
  description?: string
  due_date?: string
  source: 'student' | 'teacher'
  owner_user_id?: string
  todo_status?: Array<{ is_done: boolean; done_at?: string }>
}

interface Notice {
  id: string
  title: string
  body: string
  pinned: boolean
  publish_at: string
  isRead: boolean
}

/**
 * 학생 대시보드 컴포넌트
 * ToDo List, 공지사항, 시간표 등 표시
 */
export default function StudentDashboard({
  displayName,
  userId,
}: {
  displayName: string
  userId: string
}) {
  const router = useRouter()
  const [todos, setTodos] = useState<Todo[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [completionRate, setCompletionRate] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'calendar' | 'notices' | 'weekly'>('all')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // ToDo 목록 조회
      const todosRes = await fetch('/api/student/todos')
      if (todosRes.ok) {
        const todosData = await todosRes.json()
        setTodos(todosData.todos || [])
        setCompletionRate(todosData.completionRate || 0)
      }

      // 공지사항 조회
      const noticesRes = await fetch('/api/student/notices')
      if (noticesRes.ok) {
        const noticesData = await noticesRes.json()
        setNotices(noticesData.notices || [])
      }
    } catch (error) {
      console.error('대시보드 데이터를 불러오지 못했습니다:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTodoToggle = async (todoId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/student/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDone: !currentStatus }),
      })

      if (response.ok) {
        loadDashboardData()
      }
    } catch (error) {
      console.error('Failed to update todo:', error)
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
        <div className={styles.time}>08:00</div>
        <nav className={styles.nav}>
          <button className={styles.navButton} aria-label="홈">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
          <button className={styles.navButton} aria-label="폴더">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button className={styles.navButton} aria-label="모니터">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
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
          <h1 className={styles.welcome}>{displayName} 학생 환영해요</h1>
          <div className={styles.headerActions}>
            <button className={styles.iconButton} aria-label="알림">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <button className={styles.messageButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              선생님쪽지
            </button>
          </div>
        </header>

        {/* 탭 네비게이션 */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            전체
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'calendar' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            달력
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'notices' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('notices')}
          >
            알림장
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'weekly' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('weekly')}
          >
            주간학습안내
          </button>
        </div>

        {/* 콘텐츠 영역 */}
        <div className={styles.content}>
          {activeTab === 'all' && (
            <>
              {/* ToDo 요약 카드 */}
              <div className={styles.summaryCards}>
                <div className={styles.summaryCard}>
                  <h3>나의 일기</h3>
                  <p>오늘의 기록을 간단히 확인해요.</p>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${completionRate}%`, backgroundColor: 'var(--color-error)' }}
                    />
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <h3>To do list 확인하기</h3>
                  <p>오늘의 할 일을 확인하고 완료해요.</p>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${completionRate}%`, backgroundColor: 'var(--color-success)' }}
                    />
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <h3>선생님께 쪽지보내기</h3>
                  <p>선생님께 질문이나 소식을 전해요.</p>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${completionRate}%`, backgroundColor: 'var(--color-secondary)' }}
                    />
                  </div>
                </div>
              </div>

              {/* ToDo List */}
              <section className={styles.todoSection}>
                <div className={styles.sectionHeader}>
                  <h2>TO do list (우선순위3)</h2>
                  <button className={styles.addButton} aria-label="추가">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
                <div className={styles.todoList}>
                  {todos.map((todo) => (
                    <div key={todo.id} className={styles.todoItem}>
                      <input
                        type="checkbox"
                        checked={todo.todo_status?.[0]?.is_done || false}
                        onChange={() =>
                          handleTodoToggle(todo.id, todo.todo_status?.[0]?.is_done || false)
                        }
                        className={styles.todoCheckbox}
                      />
                      <div className={styles.todoContent}>
                        <h4>{todo.title}</h4>
                        {todo.due_date && (
                          <span className={styles.todoDueDate}>
                            {new Date(todo.due_date).toLocaleDateString('ko-KR')} 까지
                          </span>
                        )}
                      </div>
                      <button className={styles.todoMenu} aria-label="메뉴">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* 선생님 공지사항 */}
              <section className={styles.noticeSection}>
                <h2>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  선생님 공지사항
                </h2>
                {notices.length > 0 && (
                  <div className={styles.noticeContent}>
                    <h3>{notices[0].title}</h3>
                    <p>{notices[0].body}</p>
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'calendar' && (
            <StudentMonthlyCalendar userId={userId} />
          )}

          {activeTab === 'notices' && (
            <div className={styles.noticesPlaceholder}>알림장 뷰</div>
          )}

          {activeTab === 'weekly' && (
            <div className={styles.weeklyPlaceholder}>주간학습안내 뷰</div>
          )}
        </div>
      </main>

      {/* 오른쪽 사이드바 (캘린더 및 시간표) */}
      <aside className={styles.rightSidebar}>
        <div className={styles.profileSection}>
          <div className={styles.profileImage}>
            <img src="/placeholder-avatar.png" alt="프로필" />
            <button className={styles.cameraButton} aria-label="프로필 변경">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.calendarWidget}>
          <div className={styles.calendarHeader}>
            <button aria-label="이전 달">‹</button>
            <h3>8월 2024</h3>
            <button aria-label="다음 달">›</button>
          </div>
          <div className={styles.calendarWeek}>
            <div className={styles.calendarDay}>
              <span>15</span>
              <span>Tue</span>
            </div>
            <div className={styles.calendarDay}>
              <span>16</span>
              <span>Wed</span>
            </div>
            <div className={styles.calendarDay}>
              <span>17</span>
              <span>Thu</span>
            </div>
            <div className={`${styles.calendarDay} ${styles.calendarDayActive}`}>
              <span>18</span>
              <span>Fri</span>
            </div>
            <div className={styles.calendarDay}>
              <span>19</span>
              <span>Sat</span>
            </div>
            <div className={styles.calendarDay}>
              <span>20</span>
              <span>Sun</span>
            </div>
          </div>
        </div>

        <div className={styles.schedule}>
          <h3>오늘 시간표</h3>
          <ul className={styles.scheduleList}>
            <li>
              <input type="radio" />
              <span>9:00 AM - 09:40 AM</span>
              <span className={styles.subjectTag}>① 국어</span>
            </li>
            <li>
              <input type="radio" />
              <span>9:50 AM - 10:30 AM</span>
              <span className={styles.subjectTag}>② 창체</span>
            </li>
            <li>
              <input type="radio" />
              <span>10:50 AM - 11:30 AM</span>
              <span className={styles.subjectTag}>③ 다문화</span>
            </li>
            <li>
              <input type="radio" />
              <span>11:40 AM - 12:20 PM</span>
              <span className={styles.subjectTag}>④ 동아리</span>
            </li>
            <li>
              <input type="radio" />
              <span>12:30 PM - 13:10 PM</span>
              <span className={styles.subjectTag}>점심시간</span>
            </li>
            <li>
              <input type="radio" />
              <span>13:10 PM - 14:00 PM</span>
              <span className={styles.subjectTag}>⑤ 동아리</span>
            </li>
            <li>
              <input type="radio" />
              <span>14:00 PM - 14:40 PM</span>
              <span className={styles.subjectTag}>⑥ 수학</span>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  )
}

