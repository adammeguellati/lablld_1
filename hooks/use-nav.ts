'use client'

import { useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export function useNav() {
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const to = useCallback((url: string) => {
    const el = ref.current
    if (el) el.classList.add('anim-exit-fwd')
    setTimeout(() => router.push(url), el ? 230 : 0)
  }, [router])

  const back = useCallback(() => {
    const el = ref.current
    if (el) el.classList.add('anim-exit-back')
    setTimeout(() => router.back(), el ? 230 : 0)
  }, [router])

  return { ref, to, back }
}
