import { useProductSearch } from '@/hooks/useCatalog'
import { productHref } from '@/lib/productHref'
import { formatMoney } from '@/lib/money'
import { SEARCH_INPUT_PLACEHOLDER } from '@/lib/searchCopy'
import { displayPrice } from '@/services/pricing/priceResolutionService'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const { data, loading } = useProductSearch(query)
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const suggestions = data.slice(0, 6)
  const qTrim = query.trim()
  const showPanel = open && Boolean(qTrim)
  /** Sugestões + rodapé “Ver todos” quando há resultados (ou só o link vazio). */
  const optionCount = suggestions.length ? suggestions.length + 1 : qTrim && !loading ? 1 : 0

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    setActiveIndex(-1)
  }, [query, loading, data])

  function goCatalog() {
    setOpen(false)
    navigate(`/catalogo?q=${encodeURIComponent(qTrim)}`)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        const p = suggestions[activeIndex]!
        setOpen(false)
        navigate(productHref(p))
        return
      }
      goCatalog()
      return
    }
    if (!showPanel || !optionCount) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((i) => (i + 1) % optionCount)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((i) => (i <= 0 ? optionCount - 1 : i - 1))
    }
  }

  const activeOptionId =
    activeIndex >= 0 && activeIndex < suggestions.length
      ? `${listId}-opt-${activeIndex}`
      : activeIndex === suggestions.length || (suggestions.length === 0 && activeIndex === 0)
        ? `${listId}-all`
        : undefined

  return (
    <div className="relative w-full" ref={wrapRef}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={SEARCH_INPUT_PLACEHOLDER}
        className="min-h-11 w-full rounded-xl border border-fal-line bg-[#fafbfc] py-2.5 pr-10 pl-3 text-sm outline-none focus:border-fal-yellow-dark focus:shadow-[0_0_0_3px_rgba(242,200,75,0.2)] sm:min-h-[46px] sm:py-[13px] sm:pr-11 sm:pl-4 lg:py-[15px] lg:pl-[18px]"
        aria-label="Busca de produtos"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-lg text-fal-muted sm:right-4 sm:text-xl">
        ⌕
      </span>

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Sugestões de busca"
          className="absolute top-[calc(100%+6px)] z-[120] w-full overflow-hidden rounded-xl border border-fal-line bg-white shadow-fal"
        >
          {loading ? (
            <div className="px-4 py-3 text-sm text-fal-muted">Buscando…</div>
          ) : suggestions.length ? (
            <>
              {suggestions.map((p, idx) => {
                const price = displayPrice(p)
                const active = idx === activeIndex
                return (
                  <Link
                    key={p.id}
                    id={`${listId}-opt-${idx}`}
                    role="option"
                    aria-selected={active}
                    to={productHref(p)}
                    className={`flex items-center gap-3 border-b border-fal-line px-3 py-2.5 text-sm no-underline ${
                      active ? 'bg-[#f0f4f8]' : 'hover:bg-[#f8f9fa]'
                    }`}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f8f9fa] p-1">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt=""
                          className="max-h-full max-w-full object-contain object-center"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs text-fal-muted">—</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-fal-navy">{p.name}</strong>
                      <span className="mt-0.5 block truncate text-xs text-fal-muted">
                        {[p.brand, p.commercialRef || p.sku].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-extrabold text-fal-navy">
                      {formatMoney(price)}
                    </span>
                  </Link>
                )
              })}
              <Link
                id={`${listId}-all`}
                role="option"
                aria-selected={activeIndex === suggestions.length}
                to={`/catalogo?q=${encodeURIComponent(qTrim)}`}
                className={`block px-4 py-3 text-sm font-bold text-fal-navy no-underline ${
                  activeIndex === suggestions.length ? 'bg-[#f0f4f8]' : 'hover:bg-[#f8f9fa]'
                }`}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setActiveIndex(suggestions.length)}
              >
                Ver todos os resultados para “{qTrim}”
              </Link>
            </>
          ) : (
            <Link
              id={`${listId}-all`}
              role="option"
              aria-selected={activeIndex === 0}
              to={`/catalogo?q=${encodeURIComponent(qTrim)}`}
              className={`block px-4 py-3 text-sm no-underline ${
                activeIndex === 0 ? 'bg-[#f0f4f8]' : 'hover:bg-[#f8f9fa]'
              }`}
              onClick={() => setOpen(false)}
              onMouseEnter={() => setActiveIndex(0)}
            >
              Ver resultados para “{qTrim}” no catálogo
            </Link>
          )}
        </div>
      ) : null}
    </div>
  )
}
