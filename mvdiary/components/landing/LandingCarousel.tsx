'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './LandingCarousel.module.css'

type Props = {
  slides: readonly string[]
  autoPlayMs: number
  activeIndex: number
  onChange: (nextIndex: number) => void
}

export default function LandingCarousel({
  slides,
  autoPlayMs,
  activeIndex,
  onChange,
}: Props) {
  const safeSlides = useMemo(() => slides.filter(Boolean), [slides])
  const [available, setAvailable] = useState<Record<number, boolean>>({})
  const intervalRef = useRef<number | null>(null)

  const hasAnyWorkingSlide = safeSlides.some((_, idx) => available[idx] === true)

  useEffect(() => {
    let cancelled = false

    // Avoid noisy 404 console errors by probing slide URLs first.
    // Missing slides will simply fall back to the gradient background.
    setAvailable({})

    const check = async (src: string, idx: number) => {
      try {
        const res = await fetch(src, { method: 'GET', cache: 'no-store' })
        if (cancelled) return
        setAvailable((prev) => ({ ...prev, [idx]: res.ok }))
      } catch {
        if (cancelled) return
        setAvailable((prev) => ({ ...prev, [idx]: false }))
      }
    }

    safeSlides.forEach((src, idx) => {
      void check(src, idx)
    })

    return () => {
      cancelled = true
    }
  }, [safeSlides])

  useEffect(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (safeSlides.length <= 1) return
    if (!Number.isFinite(autoPlayMs) || autoPlayMs < 1000) return

    intervalRef.current = window.setInterval(() => {
      onChange((activeIndex + 1) % safeSlides.length)
    }, autoPlayMs)

    return () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [activeIndex, autoPlayMs, onChange, safeSlides.length])

  return (
    <div className={styles.root} aria-hidden="true">
      <div className={styles.fallback} />

      {hasAnyWorkingSlide &&
        safeSlides.map((src, idx) => (
          available[idx] === true ? (
          <img
            key={src}
            className={[
              styles.slide,
              idx === activeIndex ? styles.slideActive : '',
            ].join(' ')}
            src={src}
            alt=""
            draggable={false}
            loading={idx === activeIndex ? 'eager' : 'lazy'}
            onError={() => setAvailable((prev) => ({ ...prev, [idx]: false }))}
          />
          ) : null
        ))}

      <div className={styles.veil} />
    </div>
  )
}


