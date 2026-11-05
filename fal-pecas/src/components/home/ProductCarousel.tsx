import { ProductCard } from '@/components/product/ProductCard'
import type { Product } from '@/types'
import { useEffect, useRef, useState } from 'react'

type Props = {
  products: Product[]
  label: string
}

/** Trilho horizontal com scroll-snap (item 08). */
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
    const delta = Math.max(el.clientWidth * 0.85, 240) * dir
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
            className="w-[min(48%,11.5rem)] shrink-0 snap-start sm:w-[min(32%,14rem)] lg:w-[min(24%,16rem)]"
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
