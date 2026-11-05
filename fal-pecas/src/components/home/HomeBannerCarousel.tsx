import type { HomeBanner } from '@/data/homeBanners'
import {
  clampCarouselIndex,
  nextCarouselIndex,
  prevCarouselIndex,
} from '@/lib/carouselIndex'
import { listHomeBanners } from '@/services/home/homeContentService'
import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'

const TONE_CLASS: Record<HomeBanner['tone'], string> = {
  navy: 'from-fal-navy-dark to-[#3d4650]',
  steel: 'from-[#4a5562] to-[#2f3740]',
  sand: 'from-[#5c5346] to-[#3f3a32]',
}

const AUTOPLAY_MS = 6500

export function HomeBannerCarousel() {
  const [slides, setSlides] = useState<HomeBanner[]>([])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const labelId = useId()

  useEffect(() => {
    let active = true
    void listHomeBanners().then((rows) => {
      if (active) setSlides(rows)
    })
    return () => {
      active = false
    }
  }, [])

  const current = slides[clampCarouselIndex(index, slides.length)]

  useEffect(() => {
    setIndex(0)
  }, [slides.length])

  useEffect(() => {
    if (slides.length < 2 || paused) return
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = window.setInterval(() => {
      setIndex((i) => nextCarouselIndex(i, slides.length))
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [paused, slides.length])

  if (!current) return null

  return (
    <section
      className="border-b border-fal-line bg-fal-bg"
      aria-roledescription="carrossel"
      aria-labelledby={labelId}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false)
      }}
    >
      <h2 id={labelId} className="sr-only">
        Destaques da loja
      </h2>
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${TONE_CLASS[current.tone]} text-white`}
      >
        {current.imageSrc ? (
          <img
            src={current.imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
        <div
          className={`absolute inset-0 ${
            current.imageSrc
              ? 'bg-gradient-to-r from-black/75 via-black/45 to-black/20'
              : ''
          }`}
          aria-hidden
        />
        <div className="relative mx-auto flex min-h-[200px] max-w-6xl items-center px-4 py-8 sm:min-h-[240px] sm:px-6 sm:py-10 md:min-h-[280px] lg:px-8">
          <div className="min-w-0 max-w-xl flex-1">
            <p className="text-xs font-extrabold tracking-[0.08em] text-fal-yellow uppercase">
              Campanha
            </p>
            <p className="mt-2 text-[22px] font-black leading-tight sm:text-[30px]">
              {current.title}
            </p>
            <p className="mt-2 text-sm text-[#e3e7eb] sm:text-base">{current.subtitle}</p>
            <Link
              to={current.to}
              className="mt-4 inline-flex min-h-11 items-center rounded-fal bg-fal-yellow px-4 text-sm font-extrabold text-fal-navy no-underline hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {current.ctaLabel}
            </Link>
          </div>
        </div>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute top-1/2 left-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/25 text-lg text-white hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-yellow sm:left-4"
              aria-label="Banner anterior"
              onClick={() => setIndex((i) => prevCarouselIndex(i, slides.length))}
            >
              ‹
            </button>
            <button
              type="button"
              className="absolute top-1/2 right-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/25 text-lg text-white hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-yellow sm:right-4"
              aria-label="Próximo banner"
              onClick={() => setIndex((i) => nextCarouselIndex(i, slides.length))}
            >
              ›
            </button>
            <div
              className="absolute bottom-3 left-0 right-0 flex justify-center gap-2"
              role="tablist"
              aria-label="Slides"
            >
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Ir para slide ${i + 1}`}
                  className={`h-2.5 w-2.5 rounded-full border border-white/50 ${
                    i === index ? 'bg-fal-yellow' : 'bg-white/30 hover:bg-white/60'
                  }`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
