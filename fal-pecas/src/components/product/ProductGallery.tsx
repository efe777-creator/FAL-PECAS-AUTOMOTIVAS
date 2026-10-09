import { useEffect, useState } from 'react'
import { ProductImagePlaceholder } from '@/components/product/ProductImagePlaceholder'

type Props = {
  images: string[]
  alt: string
}

/**
 * Galeria PDP (MARCHA PDP-B).
 * N=0: placeholder · N=1: só principal (sem chrome de thumbs) · N>1: thumbs + troca.
 */
export function ProductGallery({ images, alt }: Props) {
  const urls = images.filter(Boolean)
  const [active, setActive] = useState(0)

  useEffect(() => {
    setActive(0)
  }, [urls.join('|')])

  const safeIndex = urls.length ? Math.min(active, urls.length - 1) : 0
  const mainSrc = urls[safeIndex]

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
      {urls.length > 1 ? (
        <div
          className="flex shrink-0 gap-2 overflow-x-auto sm:max-h-[420px] sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden"
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

      <div className="grid min-h-[280px] min-w-0 flex-1 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#e8ecef] to-[#d7dde1] lg:min-h-[420px]">
        {mainSrc ? (
          <img
            src={mainSrc}
            alt={alt}
            className="max-h-[280px] w-full object-contain lg:max-h-[420px]"
            loading="eager"
          />
        ) : (
          <ProductImagePlaceholder />
        )}
      </div>
    </div>
  )
}
