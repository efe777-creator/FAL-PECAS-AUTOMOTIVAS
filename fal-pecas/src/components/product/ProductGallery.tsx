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
 * Galeria PDP — 4:3 contain; thumbs verticais no desktop, horizontais abaixo no mobile.
 * Clique na principal abre lightbox (hover zoom fino na Marcha 2).
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

  const thumbs =
    urls.length > 1 ? (
      <div
        className="order-2 flex shrink-0 gap-2 overflow-x-auto lg:order-1 lg:max-h-full lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden"
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
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-fal border-2 bg-fal-surface-2 p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fal-navy ${
                selected ? 'border-fal-navy' : 'border-fal-line hover:border-fal-navy/50'
              }`}
            >
              <img src={url} alt="" className={productMediaImgClass} loading="lazy" />
            </button>
          )
        })}
      </div>
    ) : null

  return (
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start">
      {thumbs}
      <ProductMediaFrame variant="gallery" className="order-1 min-w-0 flex-1 lg:order-2">
        {mainSrc ? (
          <button
            type="button"
            className="group relative flex h-full w-full items-center justify-center"
            onClick={() => setLightboxOpen(true)}
            aria-label={`Ampliar imagem de ${alt}`}
          >
            <img
              src={mainSrc}
              alt={alt}
              className={`${productMediaImgClassGallery} max-h-full transition group-hover:scale-[1.08]`}
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
