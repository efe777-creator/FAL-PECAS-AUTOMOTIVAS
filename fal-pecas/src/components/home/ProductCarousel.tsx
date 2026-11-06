import { ProductCard } from '@/components/product/ProductCard'
import { carouselPageStep } from '@/lib/carouselPageStep'
import type { Product } from '@/types'
import { useEffect, useRef, useState } from 'react'

type Props = {
  products: Product[]
  label: string
}

/**
 * Trilho horizontal com scroll-snap.
 * Larguras em N colunas exatas (2/3/4) para não cortar card ao meio na borda.
 */
export function ProductCarousel({ products, label }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  function updateArrows() {
    const el = scrollerRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft < max - 4)
  }

  useEffect(() => {
    updateArrows()
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => updateArrows()
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateArrows) : null
    ro?.observe(el)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro?.disconnect()
    }
  }, [products])

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current
    if (!el) return
    const item = el.querySelector<HTMLElement>('[data-carousel-item]')
    if (!item) return
    const styles = getComputedStyle(el)
    const gapPx = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0
    const visible = Math.max(1, Math.round(el.clientWidth / (item.offsetWidth + gapPx)))
    const delta = carouselPageStep(item.offsetWidth, gapPx, visible) * dir
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  if (!products.length) return null

  return (
    <div className="relative" aria-roledescription="carrossel" aria-label={label}>
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p) => (
          <div
            key={p.id}
            data-carousel-item
            className="w-[calc((100%-0.625rem)/2)] shrink-0 snap-start snap-always sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
      {canPrev ? (
        <button
          type="button"
          className="absolute top-1/2 left-0 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-fal-line bg-white text-lg font-bold text-fal-navy shadow-sm hover:border-fal-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-navy"
          aria-label={`Anterior — ${label}`}
          onClick={() => scrollByDir(-1)}
        >
          ‹
        </button>
      ) : null}
      {canNext ? (
        <button
          type="button"
          className="absolute top-1/2 right-0 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-fal-line bg-white text-lg font-bold text-fal-navy shadow-sm hover:border-fal-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-navy"
          aria-label={`Próximo — ${label}`}
          onClick={() => scrollByDir(1)}
        >
          ›
        </button>
      ) : null}
    </div>
  )
}
