import { ProductImageLightbox } from '@/components/product/ProductImageLightbox'
import { ProductImagePlaceholder } from '@/components/product/ProductImagePlaceholder'
import { useEffect, useState } from 'react'

type Props = {
  images: string[]
  alt: string
}

/**
 * Galeria PDP — clique na principal abre lightbox com zoom.
 */
export function ProductGallery({ images, alt }: Props) {
  const urls = images.filter(Boolean)
  const [active, setActive] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    setActive(0)
  }, [urls.join('|')])

  const safeIndex = urls.length ? Math.min(active, urls.length - 1) : 0
  const mainSrc = urls[safeIndex]

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
      {urls.length > 1 ? (
        <div
          className="flex shrink-0 gap-2 overflow-x-auto sm:max-h-[480px] sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden"
          role="listbox"
          aria-label="Miniaturas do produto"
        >
          {urls.map((url, i) => {
            const selected = i === safeIndex
            return (
              <button
                key={`${url}-${i}`}
                type="button"
                role="option"
                aria-selected={selected}
                aria-label={`Imagem ${i + 1} de ${urls.length}`}
                onClick={() => setActive(i)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-[10px] border-2 bg-fal-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fal-navy ${
                  selected ? 'border-fal-navy' : 'border-fal-line hover:border-fal-navy/50'
                }`}
              >
                <img src={url} alt="" className="h-full w-full object-contain" loading="lazy" />
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="grid min-h-[300px] min-w-0 flex-1 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#e8ecef] to-[#d7dde1] lg:min-h-[480px]">
        {mainSrc ? (
          <button
            type="button"
            className="group relative grid h-full w-full place-items-center p-2"
            onClick={() => setLightboxOpen(true)}
            aria-label={`Ampliar imagem de ${alt}`}
          >
            <img
              src={mainSrc}
              alt={alt}
              className="max-h-[300px] w-full object-contain transition group-hover:scale-[1.02] lg:max-h-[480px]"
              loading="eager"
            />
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-fal-navy/80 px-2 py-1 text-xs font-bold text-white opacity-90">
              Ampliar
            </span>
          </button>
        ) : (
          <ProductImagePlaceholder />
        )}
      </div>

      <ProductImageLightbox
        images={urls}
        alt={alt}
        startIndex={safeIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  )
}
