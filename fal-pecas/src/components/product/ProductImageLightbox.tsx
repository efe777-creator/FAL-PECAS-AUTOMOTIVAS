import { useEffect, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  images: string[]
  alt: string
  startIndex?: number
  open: boolean
  onClose: () => void
}

/**
 * Lightbox com zoom (wheel / botões) e navegação entre imagens.
 * Sem dependência externa.
 */
export function ProductImageLightbox({
  images,
  alt,
  startIndex = 0,
  open,
  onClose,
}: Props) {
  const urls = images.filter(Boolean)
  const [index, setIndex] = useState(startIndex)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (open) {
      setIndex(Math.min(Math.max(0, startIndex), Math.max(0, urls.length - 1)))
      setZoom(1)
    }
  }, [open, startIndex, urls.length])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && urls.length > 1) {
        setIndex((i) => (i + 1) % urls.length)
        setZoom(1)
      }
      if (e.key === 'ArrowLeft' && urls.length > 1) {
        setIndex((i) => (i - 1 + urls.length) % urls.length)
        setZoom(1)
      }
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(4, z + 0.25))
      if (e.key === '-') setZoom((z) => Math.max(1, z - 0.25))
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, urls.length])

  if (!open || !urls.length) return null

  const src = urls[Math.min(index, urls.length - 1)]!

  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ampliar imagem: ${alt}`}
      className="fixed inset-0 z-[100] flex flex-col bg-black/85 p-3 sm:p-6"
      onClick={onBackdrop}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 text-white">
        <p className="m-0 truncate text-sm font-semibold">
          {alt}
          {urls.length > 1 ? ` · ${index + 1}/${urls.length}` : ''}
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-white/40 px-2 py-1 text-sm font-bold hover:bg-white/10"
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
            aria-label="Diminuir zoom"
          >
            −
          </button>
          <span className="min-w-[3rem] text-center text-xs">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="rounded-md border border-white/40 px-2 py-1 text-sm font-bold hover:bg-white/10"
            onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            aria-label="Aumentar zoom"
          >
            +
          </button>
          <button
            type="button"
            className="rounded-md border border-white/40 px-3 py-1 text-sm font-bold hover:bg-white/10"
            onClick={onClose}
            aria-label="Fechar"
          >
            Fechar
          </button>
        </div>
      </div>

      <div
        className="relative mt-3 flex min-h-0 flex-1 items-center justify-center overflow-auto"
        onClick={onBackdrop}
        onWheel={(e) => {
          e.preventDefault()
          const delta = e.deltaY > 0 ? -0.15 : 0.15
          setZoom((z) => Math.min(4, Math.max(1, z + delta)))
        }}
      >
        {urls.length > 1 ? (
          <button
            type="button"
            className="absolute left-1 z-[1] rounded-full border border-white/50 bg-black/40 px-3 py-2 text-lg text-white hover:bg-black/70 sm:left-4"
            aria-label="Imagem anterior"
            onClick={(e) => {
              e.stopPropagation()
              setIndex((i) => (i - 1 + urls.length) % urls.length)
              setZoom(1)
            }}
          >
            ‹
          </button>
        ) : null}
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain transition-transform duration-150"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />
        {urls.length > 1 ? (
          <button
            type="button"
            className="absolute right-1 z-[1] rounded-full border border-white/50 bg-black/40 px-3 py-2 text-lg text-white hover:bg-black/70 sm:right-4"
            aria-label="Próxima imagem"
            onClick={(e) => {
              e.stopPropagation()
              setIndex((i) => (i + 1) % urls.length)
              setZoom(1)
            }}
          >
            ›
          </button>
        ) : null}
      </div>
      <p className="m-0 mt-2 text-center text-xs text-white/70">
        Scroll ou +/- para zoom · Esc fecha
        {urls.length > 1 ? ' · setas navegam' : ''}
      </p>
    </div>,
    document.body,
  )
}
