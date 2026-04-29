'use client'

import { useEffect, useRef, useState } from 'react'

interface ScoreDisplayProps {
  score: number | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animate?: boolean
}

const SIZE_CLASSES = {
  sm: 'text-lg',
  md: 'text-3xl',
  lg: 'text-5xl',
  xl: 'text-7xl',
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export function ScoreDisplay({ score, size = 'md', animate = true }: ScoreDisplayProps) {
  const [display, setDisplay] = useState<number | null>(null)
  const [scrambling, setScrambling] = useState(false)
  const [pulsing, setPulsing] = useState(false)
  const frameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
  const scrambleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (score === null) { setDisplay(null); return }
    if (!animate) { setDisplay(score); return }

    // Scramble phase — random digits for first 300ms
    setScrambling(true)
    scrambleRef.current = setInterval(() => {
      setDisplay(Math.random() * 99)
    }, 50)

    const DURATION = 800
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const t = Math.min(elapsed / DURATION, 1)
      const eased = easeOut(t)
      setDisplay(eased * score!)

      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(score)
        setScrambling(false)
        // Start subtle pulse every 3s
        pulseRef.current = setInterval(() => {
          setPulsing(true)
          setTimeout(() => setPulsing(false), 1500)
        }, 3000)
      }
    }

    // Clear scramble and start count-up after 300ms
    setTimeout(() => {
      if (scrambleRef.current) clearInterval(scrambleRef.current)
      setScrambling(false)
      frameRef.current = requestAnimationFrame(tick)
    }, 300)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      if (scrambleRef.current) clearInterval(scrambleRef.current)
      if (pulseRef.current) clearInterval(pulseRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score])

  const sizeClass = SIZE_CLASSES[size]

  if (display === null) {
    return (
      <span className={`font-mono font-bold text-accent-untested ${sizeClass}`}>
        UNTESTED
      </span>
    )
  }

  const formatted = size === 'sm'
    ? Math.round(display).toString()
    : display.toFixed(1)

  return (
    <span
      className={`font-mono font-bold text-accent-verified ${sizeClass} tabular-nums transition-transform duration-700 inline-block ${pulsing ? 'scale-[1.02]' : 'scale-100'}`}
    >
      {scrambling ? Math.floor(Math.random() * 100).toString().padStart(2, '0') : formatted}
      {size !== 'sm' && (
        <span className={`text-text-muted font-normal ${size === 'xl' ? 'text-3xl' : size === 'lg' ? 'text-xl' : 'text-base'} ml-1`}>
          / 100
        </span>
      )}
    </span>
  )
}
