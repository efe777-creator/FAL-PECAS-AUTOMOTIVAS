import { useEffect, useRef, useState } from 'react'

/** Mede largura do container com ResizeObserver (React do app — evita hook do RGL). */
export function useElementWidth(initialWidth = 1280) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(initialWidth)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setMounted(true)
    const update = () => {
      const w = Math.round(el.getBoundingClientRect().width)
      if (w > 0) setWidth(w)
    }
    update()
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(update)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { width, containerRef, mounted }
}
