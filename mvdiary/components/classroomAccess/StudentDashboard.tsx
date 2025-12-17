'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './styles.module.css'

export default function StudentDashboard(props: {
  classroomCode: string
  studentNumber: number
  studentName: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const leave = async () => {
    setLoading(true)
    await fetch('/api/student/leave', { method: 'POST' })
    router.push('/enter')
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>학생 화면</h1>
        <p className={styles.subtitle}>입장 정보</p>

        <div className={styles.panel}>
          <div className={styles.row}>
            <strong>교실 코드:</strong> <span className={styles.mono}>{props.classroomCode}</span>
          </div>
          <div className={styles.row}>
            <strong>번호:</strong> <span>{props.studentNumber}</span>
          </div>
          <div className={styles.row}>
            <strong>이름:</strong> <span>{props.studentName}</span>
          </div>
        </div>

        <div className={styles.linkRow}>
          <button className={styles.button} type="button" onClick={leave} disabled={loading}>
            {loading ? '나가는 중...' : '교실 나가기'}
          </button>
        </div>
      </div>
    </div>
  )
}


