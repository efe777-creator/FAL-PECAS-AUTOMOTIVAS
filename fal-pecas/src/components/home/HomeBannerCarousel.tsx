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
  navy: 'from-[#1a2330] via-fal-navy-dark to-[#3d4650]',
  steel: 'from-[#3a424c] via-[#4a5562] to-[#2f3740]',
  sand: 'from-[#4a4338] via-[#5c5346] to-[#3f3a32]',
}

const AUTOPLAY_MS = 6500

/**
 * Hero de campanhas — full-bleed, um slide por vez.
 * Sem carimbo “Campanha”; tipografia e CTA no plano esquerdo.
 */
export function HomeBannerCarousel() {
  const [slides, setSlides] = useState<HomeBanner[]>([])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [ready, setReady] = useState(false)
  const labelId = useId()

  useEffect(() => {
    let active = true
    void listHomeBanners()
      .then((rows) => {
        if (active) setSlides(rows)
      })
      .finally(() => {
        if (active) setReady(true)
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

  if (!ready) {
    return (
      <section
        className="relative min-h-[220px] animate-pulse bg-gradient-to-br from-fal-navy-dark to-[#3d4650] sm:min-h-[280px] md:min-h-[320px]"
        aria-busy="true"
        aria-label="Carregando campanhas"
      />
    )
  }

  if (!current) return null

  return (
    <section
      className="relative"
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
        Campanhas
      </h2>
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${TONE_CLASS[current.tone]} text-white`}
      >
        {current.imageSrc || current.imageSrcMobile ? (
          <picture key={current.id}>
            {current.imageSrcMobile ? (
              <source media="(max-width: 639px)" srcSet={current.imageSrcMobile} />
            ) : null}
            <img
              src={current.imageSrc || current.imageSrcMobile}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
              loading="eager"
            />
          </picture>
        ) : null}
        <div
          className={`absolute inset-0 ${
            current.imageSrc || current.imageSrcMobile
              ? 'bg-gradient-to-r from-black/80 via-black/50 to-black/15'
              : ''
          }`}
          aria-hidden
        />
        <div className="relative mx-auto flex min-h-[220px] max-w-6xl items-end px-4 py-10 sm:min-h-[280px] sm:items-center sm:px-6 sm:py-12 md:min-h-[320px] lg:px-8">
          <div key={`copy-${current.id}`} className="min-w-0 max-w-lg">
            <p className="m-0 text-[26px] font-black leading-[1.15] tracking-tight sm:text-[34px] md:text-[40px]">
              {current.title}
            </p>
            {current.subtitle?.trim() ? (
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/85 sm:text-base">
                {current.subtitle}
              </p>
            ) : null}
            <Link
              to={current.to}
              className="mt-5 inline-flex min-h-11 items-center rounded-fal bg-fal-yellow px-5 text-sm font-extrabold text-fal-navy no-underline shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {current.ctaLabel}
            </Link>
          </div>
        </div>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute top-1/2 left-3 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/35 text-xl text-white backdrop-blur-sm transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-yellow sm:left-5"
              aria-label="Banner anterior"
              onClick={() => setIndex((i) => prevCarouselIndex(i, slides.length))}
            >
              ‹
            </button>
            <button
              type="button"
              className="absolute top-1/2 right-3 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/35 text-xl text-white backdrop-blur-sm transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-yellow sm:right-5"
              aria-label="Próximo banner"
              onClick={() => setIndex((i) => nextCarouselIndex(i, slides.length))}
            >
              ›
            </button>
            <div
              className="absolute bottom-4 left-0 right-0 flex justify-center gap-2"
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
                  className={`h-1.5 rounded-full transition-all ${
                    i === index
                      ? 'w-7 bg-fal-yellow'
                      : 'w-1.5 bg-white/40 hover:bg-white/70'
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
