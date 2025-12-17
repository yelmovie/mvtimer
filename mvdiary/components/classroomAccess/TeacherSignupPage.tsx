'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './styles.module.css'
import { TEACHER_INVITE_CODE } from '@/lib/constants'
import { PRIVACY_POLICY_TEXT, TERMS_OF_SERVICE_TEXT } from '@/lib/config/legalTexts'

export default function TeacherSignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [openModal, setOpenModal] = useState<null | 'terms' | 'privacy'>(null)
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (openModal == null) {
      lastTriggerRef.current?.focus()
    }
  }, [openModal])

  const termsText = TERMS_OF_SERVICE_TEXT
  const privacyText = PRIVACY_POLICY_TEXT

  const valid = useMemo(() => {
    if (!email.trim()) return false
    if (!password) return false
    if (password !== confirmPassword) return false
    if (inviteCode.trim() !== TEACHER_INVITE_CODE) return false
    if (!acceptTerms || !acceptPrivacy) return false
    return true
  }, [acceptPrivacy, acceptTerms, confirmPassword, email, inviteCode, password])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)
    try {
      const res = await fetch('/api/teacher/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          confirmPassword,
          inviteCode,
          acceptTerms,
          acceptPrivacy,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || data.error || '회원가입에 실패했습니다.')
        setLoading(false)
        return
      }
      const ok = data?.ok === true || data?.success === true || res.status === 200
      if (ok) {
        setSuccessMessage('회원가입이 완료되었습니다.')
      }
      setLoading(false)
      const redirectPath = data?.redirectPath || '/login/teacher'
      window.setTimeout(() => {
        router.push(redirectPath)
      }, 1200)
    } catch {
      setError('서버 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className="landingClamp">
          {/* keep container width rule via globals; do not change layout */}
        </div>
        <h1 className={styles.title}>교사 회원가입</h1>
        <p className={styles.subtitle}>
          이메일과 비밀번호로 교사 계정을 만듭니다. (초대코드 필요)
          <br />
          ※ 본 서비스는 현재 베타 서비스로 제공되고 있습니다.
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
          <div className={styles.fieldRow}>
            <input
              className={styles.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호 확인"
              required
            />
          </div>
          <div className={styles.fieldRow}>
            <input
              className={styles.input}
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="초대코드"
              required
            />
          </div>

          <div className={styles.row}>
            <input
              className={styles.checkbox}
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              required
            />
            <button
              type="button"
              className={styles.consentLink}
              aria-haspopup="dialog"
              onClick={(e) => {
                lastTriggerRef.current = e.currentTarget
                setOpenModal('terms')
              }}
            >
              [필수] 이용약관 동의
            </button>
          </div>
          <div className={styles.row}>
            <input
              className={styles.checkbox}
              type="checkbox"
              checked={acceptPrivacy}
              onChange={(e) => setAcceptPrivacy(e.target.checked)}
              required
            />
            <button
              type="button"
              className={styles.consentLink}
              aria-haspopup="dialog"
              onClick={(e) => {
                lastTriggerRef.current = e.currentTarget
                setOpenModal('privacy')
              }}
            >
              [필수] 개인정보 처리방침 동의
            </button>
          </div>

          {successMessage ? (
            <div role="status" aria-live="polite">
              {successMessage}
            </div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : null}

          <button
            className={styles.button}
            type="submit"
            disabled={loading || Boolean(successMessage)}
          >
            {loading ? '생성 중...' : '계정 만들기'}
          </button>

          <div className={styles.linkRow}>
            <a className={styles.smallLink} href="/login/teacher">
              교사 로그인
            </a>
          </div>
        </form>
      </div>

      {openModal ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                {openModal === 'terms' ? '이용약관' : '개인정보 처리방침'}
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setOpenModal(null)}
              >
                닫기
              </button>
            </div>
            <div className={styles.modalBody}>
              {openModal === 'terms' ? termsText : privacyText}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}


