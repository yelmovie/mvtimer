'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './LoginPage.module.css'

/**
 * 로그인 페이지
 * ID/PW 기반 인증
 */
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '로그인에 실패했습니다.')
        setLoading(false)
        return
      }

      // role 기반 자동 분기
      router.push(data.redirectPath)
    } catch (err) {
      setError('서버 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>나의 하루가 피어나다</h1>
          <p className={styles.subtitle}>일상의 배움이 조용히 뿌리내리고 자라는 곳입니다.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.input}
              placeholder="이메일"
            />
          </div>

          <div className={styles.inputGroup}>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
              placeholder="비밀번호"
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.buttonGroup}>
            <button
              type="submit"
              disabled={loading}
              className={styles.buttonPrimary}
            >
              {loading ? '로그인 중...' : 'SIGN UP'}
            </button>
            <button type="button" className={styles.buttonSecondary}>
              STUDENT
            </button>
            <button type="button" className={styles.buttonSecondary}>
              TEACHER
            </button>
          </div>
        </form>

        <div className={styles.pagination}>
          <span className={styles.dotActive}></span>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
        </div>
      </div>
    </div>
  )
}

