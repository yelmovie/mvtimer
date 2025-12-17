'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './styles.module.css'
import { CLASSROOM_CODE_REGEX, MAX_STUDENT_NO, MIN_STUDENT_NO } from '@/lib/constants'
import { ROUTES } from '@/lib/routing'

export default function StudentEnterPage() {
  const router = useRouter()
  const [classroomCode, setClassroomCode] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [studentName, setStudentName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const normalizedCode = useMemo(() => classroomCode.trim().toUpperCase(), [classroomCode])

  const valid = useMemo(() => {
    const n = Number(studentNumber)
    return (
      CLASSROOM_CODE_REGEX.test(normalizedCode) &&
      Number.isInteger(n) &&
      n >= MIN_STUDENT_NO &&
      n <= MAX_STUDENT_NO &&
      studentName.trim().length >= 2 &&
      studentName.trim().length <= 10
    )
  }, [normalizedCode, studentName, studentNumber])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/student/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomCode: normalizedCode,
          studentNumber,
          studentName,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '입장에 실패했습니다.')
        setLoading(false)
        return
      }
      // 서버에서 반환한 redirectPath 사용 (One Source of Truth)
      router.push(data.redirectPath || ROUTES.STUDENT_DASHBOARD)
    } catch {
      setError('서버 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>학생 입장</h1>
        <p className={styles.subtitle}>교실 코드 + 번호(1~30) + 이름으로 입장합니다.</p>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.fieldRow}>
            <input
              className={styles.input}
              value={classroomCode}
              onChange={(e) => setClassroomCode(e.target.value)}
              placeholder="교실 코드 (AA1234)"
              required
            />
          </div>
          <div className={styles.fieldRow}>
            <input
              className={styles.input}
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value.replace(/[^\d]/g, ''))}
              placeholder={`학생 번호 (${MIN_STUDENT_NO}-${MAX_STUDENT_NO})`}
              required
              inputMode="numeric"
            />
          </div>
          <div className={styles.fieldRow}>
            <input
              className={styles.input}
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="이름 (2-10자)"
              required
            />
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <button className={styles.button} type="submit" disabled={!valid || loading}>
            {loading ? '입장 중...' : '입장하기'}
          </button>
        </form>
      </div>
    </div>
  )
}


