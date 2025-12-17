'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './styles.module.css'
import { ROUTES } from '@/lib/routing'

export default function TeacherLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null)
  const [retryUsed, setRetryUsed] = useState(false)

  const doLogin = async () => {
    setError('')
    setLastErrorCode(null)
    setLoading(true)
    try {
      const res = await fetch('/api/teacher/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      // 서버는 로그인 성공이어도(ok:false) 200을 반환할 수 있음(profile 저장 실패 등)
      if (data?.ok !== true) {
        setLastErrorCode(data?.code || null)
        setError(data?.message || '로그인에 실패했습니다.')
        setLoading(false)
        return
      }

      setLoading(false)
      setRetryUsed(false)
      // 서버에서 반환한 redirectPath 사용 (One Source of Truth)
      router.push(data.redirectPath || ROUTES.TEACHER_DASHBOARD)
    } catch {
      setError('서버 오류가 발생했습니다.')
      setLastErrorCode(null)
      setLoading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await doLogin()
  }


  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>교사 로그인</h1>
        <p className={styles.subtitle}>이메일과 비밀번호로 로그인합니다.</p>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.fieldRow}>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              required
            />
          </div>
          <div className={styles.fieldRow}>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
            />
          </div>

          {error ? (
            <>
              <div className={styles.error}>{error}</div>
              {lastErrorCode === 'profile_save_failed' && !retryUsed ? (
                <button
                  type="button"
                  className={styles.button}
                  onClick={async () => {
                    setRetryUsed(true)
                    await doLogin()
                  }}
                  disabled={loading}
                >
                  다시 시도
                </button>
              ) : null}
            </>
          ) : null}

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>

          <div className={styles.linkRow}>
            <a className={styles.consentLink} href="/teacher/reset-password">
              비밀번호를 잊으셨나요?
            </a>
            <a className={styles.smallLink} href="/signup">
              교사 회원가입
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}


