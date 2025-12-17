'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { landingConfig } from '@/lib/config/landing'
import LandingActions from './LandingActions'
import LandingCarousel from './LandingCarousel'
import styles from './LandingHero.module.css'

type Mode = 'signup' | 'student' | 'teacher'

const TAB_MAP: Record<number, Mode> = {
  0: 'signup',
  1: 'student',
  2: 'teacher',
}

const MODE_TO_TAB: Record<Mode, number> = {
  signup: 0,
  student: 1,
  teacher: 2,
}

export default function LandingHero() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<Mode>('signup')
  const [activeIndex, setActiveIndex] = useState(0)

  const slides = useMemo(() => landingConfig.slides ?? [], [])

  const navFor = useCallback((mode: Mode) => {
    if (mode === 'signup') return '/signup'
    if (mode === 'student') return '/enter'
    return '/login/teacher'
  }, [])

  // Initialize activeTab from URL query param
  useEffect(() => {
    const mode = searchParams.get('mode') as Mode | null
    if (mode && (mode === 'signup' || mode === 'student' || mode === 'teacher')) {
      setActiveTab(mode)
      setActiveIndex(MODE_TO_TAB[mode])
    }
  }, [searchParams])

  const handleTabClick = useCallback(
    (tabIndex: number) => {
      const mode = TAB_MAP[tabIndex]
      if (mode) {
        setActiveTab(mode)
        setActiveIndex(tabIndex)
        // Dots: mode switch only (keep landing UI). Reflect state via query.
        router.replace(`/?mode=${mode}`)
      }
    },
    [navFor, router]
  )

  // Handle carousel auto-play (separate from tab clicks)
  const handleCarouselChange = useCallback((nextIndex: number) => {
    setActiveIndex(nextIndex)
    // Auto-play does not change activeTab or navigate
  }, [])

  const handleAction = useCallback(
    (mode: Mode) => {
      router.push(navFor(mode))
      setActiveTab(mode)
      setActiveIndex(MODE_TO_TAB[mode])
    },
    [navFor, router]
  )

  const cardBg = useMemo(() => {
    if (activeTab === 'signup') return '/assets/landing/ui/1.png'
    if (activeTab === 'student') return '/assets/landing/ui/2.png'
    return '/assets/landing/ui/3.png'
  }, [activeTab])

  return (
    <div className={styles.container}>
      <div
        className={`${styles.card} landingClamp`}
        style={{
          backgroundImage: `url("${cardBg}")`,
        }}
      >
        <LandingCarousel
          slides={slides}
          autoPlayMs={landingConfig.autoPlayMs}
          activeIndex={activeIndex}
          onChange={handleCarouselChange}
        />

        <div className={styles.content}>
          <div className={styles.header}>
            <h1 className={styles.title}>{landingConfig.title}</h1>
            <p className={styles.subtitle}>
              {landingConfig.subtitle.includes('\n')
                ? landingConfig.subtitle.split('\n').map((line, idx, arr) => (
                    <span key={idx}>
                      {line}
                      {idx < arr.length - 1 ? <br /> : null}
                    </span>
                  ))
                : landingConfig.subtitle}
            </p>
          </div>

          <div className={styles.spacer} />

          <div className={styles.footer}>
            <div className={styles.dots} role="tablist" aria-label="랜딩 탭 네비게이션">
              <button
                type="button"
                className={[
                  styles.dotButton,
                  activeTab === 'signup' ? styles.dotButtonActive : '',
                ].join(' ')}
                aria-label="교사 회원가입으로 이동"
                aria-selected={activeTab === 'signup'}
                onClick={() => handleTabClick(0)}
              />
              <button
                type="button"
                className={[
                  styles.dotButton,
                  activeTab === 'student' ? styles.dotButtonActive : '',
                ].join(' ')}
                aria-label="학생 입장으로 이동"
                aria-selected={activeTab === 'student'}
                onClick={() => handleTabClick(1)}
              />
              <button
                type="button"
                className={[
                  styles.dotButton,
                  activeTab === 'teacher' ? styles.dotButtonActive : '',
                ].join(' ')}
                aria-label="교사 로그인으로 이동"
                aria-selected={activeTab === 'teacher'}
                onClick={() => handleTabClick(2)}
              />
            </div>

            <LandingActions onAction={handleAction} />
          </div>
        </div>
      </div>
    </div>
  )
}


