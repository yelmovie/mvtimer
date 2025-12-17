'use client'

import styles from './LandingActions.module.css'

type Action = 'signup' | 'student' | 'teacher'

type Props = {
  onAction: (action: Action) => void
}

export default function LandingActions({ onAction }: Props) {
  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.button}
        onClick={() => onAction('signup')}
      >
        회원가입
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => onAction('student')}
      >
        학생
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => onAction('teacher')}
      >
        교사
      </button>
    </div>
  )
}


