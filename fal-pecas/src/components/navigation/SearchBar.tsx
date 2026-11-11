import { useProductSearch } from '@/hooks/useCatalog'
import { productHref } from '@/lib/productHref'
import { formatMoney } from '@/lib/money'
import { normalizeEntityMatchKey } from '@/lib/entityNormalize'
import { SEARCH_INPUT_PLACEHOLDER } from '@/lib/searchCopy'
import { displayPrice } from '@/services/pricing/priceResolutionService'
import { buildCatalogSearchParams } from '@/services/search/buildCatalogSearchParams'
import { interpretNaturalLanguage } from '@/services/search/interpretNaturalLanguage'
import type { VehicleCatalogEntry } from '@/services/search/interpretSearchQuery'
import { listVehicleCatalogEntries } from '@/services/vehicles/vehicleService'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [vehicleCatalog, setVehicleCatalog] = useState<VehicleCatalogEntry[]>([])
  const { data, loading, error } = useProductSearch(query)
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const suggestions = data.slice(0, 6)
  const qTrim = query.trim()
  const showPanel = open && Boolean(qTrim)

  const vehicleHits = useMemo(() => {
    if (qTrim.length < 2 || !vehicleCatalog.length) return []
    const key = normalizeEntityMatchKey(qTrim)
    const scored = vehicleCatalog
      .map((v) => {
        const mk = normalizeEntityMatchKey(v.maker)
        const md = normalizeEntityMatchKey(v.model)
        const hay = `${mk} ${md}`
        let score = 0
        if (md === key || hay === key) score = 100
        else if (md.startsWith(key) || hay.startsWith(key)) score = 80
        else if (md.includes(key) || mk.includes(key) || hay.includes(key)) score = 40
        return { ...v, score }
      })
      .filter((v) => v.score > 0)
      .sort((a, b) => b.score - a.score || a.model.localeCompare(b.model, 'pt-BR'))
    return scored.slice(0, 3)
  }, [qTrim, vehicleCatalog])

  const vehicleCount = error ? 0 : vehicleHits.length
  const productCount = error || loading ? 0 : suggestions.length
  const footerSlot = !error && !loading && qTrim ? 1 : 0
  const optionCount = vehicleCount + productCount + footerSlot

  useEffect(() => {
    let cancelled = false
    void listVehicleCatalogEntries()
      .then((entries) => {
        if (!cancelled) setVehicleCatalog(entries)
      })
      .catch(() => {
        if (!cancelled) setVehicleCatalog([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    setActiveIndex(-1)
  }, [query, loading, data, vehicleHits.length])

  async function goCatalog() {
    setOpen(false)
    const intent = await interpretNaturalLanguage(qTrim, { catalog: vehicleCatalog })
    const { searchParams } = buildCatalogSearchParams(intent)
    const qs = searchParams.toString()
    navigate(qs ? `/catalogo?${qs}` : '/catalogo')
  }

  function goVehicle(v: VehicleCatalogEntry) {
    setOpen(false)
    const sp = new URLSearchParams()
    sp.set('maker', v.maker)
    sp.set('model', v.model)
    sp.set('vehicle', '1')
    navigate(`/catalogo?${sp.toString()}`)
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
      if (activeIndex >= 0 && activeIndex < vehicleCount) {
        goVehicle(vehicleHits[activeIndex]!)
        return
      }
      const productIdx = activeIndex - vehicleCount
      if (productIdx >= 0 && productIdx < productCount) {
        const p = suggestions[productIdx]!
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

  const footerIndex = vehicleCount + productCount
  const activeOptionId =
    activeIndex >= 0 && activeIndex < vehicleCount
      ? `${listId}-veh-${activeIndex}`
      : activeIndex >= vehicleCount && activeIndex < vehicleCount + productCount
        ? `${listId}-opt-${activeIndex - vehicleCount}`
        : activeIndex === footerIndex
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
        aria-label="Busca de produtos e veículos"
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
          className="absolute top-[calc(100%+6px)] z-[120] max-h-[min(70vh,420px)] w-full overflow-y-auto overflow-x-hidden rounded-xl border border-fal-line bg-white shadow-fal"
        >
          {loading ? (
            <div className="px-4 py-3 text-sm text-fal-muted">Buscando…</div>
          ) : error ? (
            <div className="px-4 py-3 text-sm text-fal-danger" role="alert">
              {error}
              <div className="mt-2">
                <button
                  type="button"
                  className="font-semibold text-fal-navy underline-offset-2 hover:underline"
                  onClick={goCatalog}
                >
                  Tentar no catálogo
                </button>
              </div>
            </div>
          ) : (
            <>
              {vehicleHits.length ? (
                <div className="border-b border-fal-line">
                  <div className="px-3 pt-2.5 pb-1 text-[11px] font-bold tracking-wide text-fal-muted uppercase">
                    Veículos
                  </div>
                  {vehicleHits.map((v, idx) => {
                    const active = idx === activeIndex
                    return (
                      <button
                        key={`${v.maker}-${v.model}`}
                        type="button"
                        id={`${listId}-veh-${idx}`}
                        role="option"
                        aria-selected={active}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm ${
                          active ? 'bg-[#f0f4f8]' : 'hover:bg-[#f8f9fa]'
                        }`}
                        onClick={() => goVehicle(v)}
                        onMouseEnter={() => setActiveIndex(idx)}
                      >
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-fal-navy">
                            {v.maker} {v.model}
                          </strong>
                          <span className="mt-0.5 block text-xs text-fal-muted">
                            Selecionar veículo no catálogo
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {suggestions.length ? (
                <div>
                  <div className="px-3 pt-2.5 pb-1 text-[11px] font-bold tracking-wide text-fal-muted uppercase">
                    Peças
                  </div>
                  {suggestions.map((p, idx) => {
                    const price = displayPrice(p)
                    const flatIdx = vehicleCount + idx
                    const active = flatIdx === activeIndex
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
                        onMouseEnter={() => setActiveIndex(flatIdx)}
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
                </div>
              ) : null}

              <button
                type="button"
                id={`${listId}-all`}
                role="option"
                aria-selected={activeIndex === footerIndex}
                className={`block w-full px-4 py-3 text-left text-sm font-bold text-fal-navy ${
                  activeIndex === footerIndex ? 'bg-[#f0f4f8]' : 'hover:bg-[#f8f9fa]'
                }`}
                onClick={goCatalog}
                onMouseEnter={() => setActiveIndex(footerIndex)}
              >
                {suggestions.length || vehicleHits.length
                  ? `Ver todos os resultados para “${qTrim}”`
                  : `Buscar “${qTrim}” no catálogo`}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
