'use client'

import { useMemo, useState } from 'react'
import styles from './styles.module.css'
import { MAX_STUDENTS_PER_CLASS } from '@/lib/constants'

type Student = { studentNumber: number; studentName: string }

export default function TeacherDashboard(props: {
  classroomCode: string | null
  students: Student[]
  showSetupMessage?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const filledCount = props.students.length

  const byNumber = useMemo(() => {
    const map = new Map<number, string>()
    for (const s of props.students) map.set(s.studentNumber, s.studentName)
    return map
  }, [props.students])

  const slots = useMemo(() => {
    return Array.from({ length: MAX_STUDENTS_PER_CLASS }, (_, i) => {
      const n = i + 1
      return { n, name: byNumber.get(n) || '' }
    })
  }, [byNumber])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.classroomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // ignore
    }
  }

  // 반 생성 필요 안내
  if (props.showSetupMessage || !props.classroomCode) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>교사 대시보드</h1>
          <p className={styles.subtitle}>
            반 생성이 필요합니다
          </p>
          <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
            <p style={{ marginBottom: 'var(--spacing-md)' }}>
              교실 정보가 아직 생성되지 않았습니다.
            </p>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              잠시 후 자동으로 생성되거나, 로그아웃 후 다시 로그인해 주세요.
            </p>
          </div>
          <div className={styles.linkRow}>
            <a className={styles.smallLink} href="/" style={{ marginRight: 'auto' }}>
              처음으로
            </a>
            <form
              action="/api/auth/logout"
              method="post"
              onSubmit={async (e) => {
                e.preventDefault()
                await fetch('/api/auth/logout', { method: 'POST' })
                window.location.href = '/login/teacher'
              }}
            >
              <button className={styles.button} type="submit">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>교사 대시보드</h1>
        <p className={styles.subtitle}>
          교실 코드 및 학생 목록 (1–{MAX_STUDENTS_PER_CLASS})
        </p>

        <div className={styles.dashboardGrid}>
          <div className={styles.panel}>
            <div className={styles.codeRow}>
              <div>
                <div>교실 코드</div>
                <div className={styles.mono}>{props.classroomCode}</div>
              </div>
              <button className={styles.button} type="button" onClick={copy}>
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
            <div style={{ marginTop: 'var(--spacing-md)' }}>
              {filledCount} / {MAX_STUDENTS_PER_CLASS}
            </div>
          </div>

          <div className={styles.panel}>
            <div>학생 자리</div>
            <div className={styles.slots}>
              {slots.map((s) => (
                <div key={s.n} className={styles.slot}>
                  <span>{s.n}</span>
                  <span className={s.name ? '' : styles.slotEmpty}>
                    {s.name || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.linkRow}>
          <a className={styles.smallLink} href="/" style={{ marginRight: 'auto' }}>
            처음으로
          </a>
          <form
            action="/api/auth/logout"
            method="post"
            onSubmit={async (e) => {
              e.preventDefault()
              await fetch('/api/auth/logout', { method: 'POST' })
              window.location.href = '/login/teacher'
            }}
          >
            <button className={styles.button} type="submit">
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}


