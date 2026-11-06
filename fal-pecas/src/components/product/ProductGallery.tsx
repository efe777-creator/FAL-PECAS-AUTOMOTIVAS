import { ProductImageLightbox } from '@/components/product/ProductImageLightbox'
import { ProductImagePlaceholder } from '@/components/product/ProductImagePlaceholder'
import {
  ProductMediaFrame,
  productMediaImgClass,
  productMediaImgClassGallery,
} from '@/components/product/ProductMediaFrame'
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
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-[10px] border-2 bg-[#f8f9fa] p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fal-navy ${
                  selected ? 'border-fal-navy' : 'border-fal-line hover:border-fal-navy/50'
                }`}
              >
                <img
                  src={url}
                  alt=""
                  className={productMediaImgClass}
                  loading="lazy"
                />
              </button>
            )
          })}
        </div>
      ) : null}

      <ProductMediaFrame variant="gallery" className="min-w-0 flex-1">
        {mainSrc ? (
          <button
            type="button"
            className="group relative flex h-full min-h-[300px] w-full items-center justify-center lg:min-h-[480px]"
            onClick={() => setLightboxOpen(true)}
            aria-label={`Ampliar imagem de ${alt}`}
          >
            <img
              src={mainSrc}
              alt={alt}
              className={`${productMediaImgClassGallery} max-h-[276px] transition group-hover:scale-[1.08] lg:max-h-[440px]`}
              loading="eager"
            />
          </button>
        ) : (
          <ProductImagePlaceholder />
        )}
      </ProductMediaFrame>

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
