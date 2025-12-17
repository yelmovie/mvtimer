'use client'

import { useMemo, useState } from 'react'
import styles from './styles.module.css'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function TeacherResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canSubmit = useMemo(() => {
    if (loading) return false
    return Boolean(email.trim())
  }, [email, loading])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const trimmed = email.trim()
    if (!trimmed) {
      setError('이메일을 입력해 주세요.')
      return
    }
    if (!isValidEmail(trimmed)) {
      setError('이메일 형식을 확인해 주세요.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/teacher/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json()
      if (!res.ok || data?.ok !== true) {
        setError(
          data?.message ||
            '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        )
        setLoading(false)
        return
      }
      setSuccess(
        data?.message || '비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해 주세요.'
      )
      setLoading(false)
    } catch {
      setError('요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>비밀번호 재설정</h1>
        <p className={styles.subtitle}>
          가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
        </p>

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

          {success ? (
            <div role="status" aria-live="polite">
              {success}
            </div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : null}

          <button className={styles.button} type="submit" disabled={!canSubmit}>
            {loading ? '전송 중...' : '재설정 링크 보내기'}
          </button>

          <div className={styles.linkRow}>
            <a className={styles.smallLink} href="/login/teacher" style={{ marginRight: 'auto' }}>
              교사 로그인으로
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}


