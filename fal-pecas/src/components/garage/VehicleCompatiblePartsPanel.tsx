import { Button } from '@/components/common/Button'
import { ButtonLink } from '@/components/common/ButtonLink'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { CompatibilityAppsBlock } from '@/components/product/CompatibilityAppsBlock'
import { CompatibilityStateBadge } from '@/components/product/CompatibilityStateBadge'
import { ProductImagePlaceholder } from '@/components/product/ProductImagePlaceholder'
import {
  ProductMediaFrame,
  productMediaImgClassCard,
} from '@/components/product/ProductMediaFrame'
import { vehicleCatalogHref } from '@/components/garage/garageVehicleUi'
import { useCart } from '@/contexts/CartContext'
import { useGarage } from '@/contexts/GarageContext'
import {
  filterConfirmedCompatibleProducts,
  mergeUniqueProductsById,
} from '@/lib/garageConfirmedParts'
import { toCommercialTitleCase } from '@/lib/entityNormalize'
import {
  ADICIONAR_AO_CARRINHO_LABEL,
  formatReferenciaFromProduct,
  formatStorePriceLabel,
} from '@/lib/productLabels'
import { productHref } from '@/lib/productHref'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  vehicleFilterToCompatInput,
  type CompatibilityVerdict,
} from '@/services/compatibility/compatibilityEngine'
import { loadPvcEvidenceByProductIds } from '@/services/compatibility/loadPvcEvidence'
import { vehicleToActiveFilter } from '@/services/garage/activeGarageStorage'
import { displayPrice } from '@/services/pricing/priceResolutionService'
import { searchCatalog } from '@/services/search/searchService'
import type { CustomerSavedVehicle, Product } from '@/types'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const PAGE_SIZE = 48
/** Evita truncar confirmed só na 1ª página do searchCatalog. */
const MAX_PAGES = 5

const CONFIRMED_VERDICT: CompatibilityVerdict = {
  state: 'confirmed',
  label: 'Compatibilidade confirmada',
  evidences: [{ code: 'pvc_confirmed', detail: 'Confirmada via PVC para o veículo em foco' }],
}

type Props = {
  vehicle: CustomerSavedVehicle
}

export function VehicleCompatiblePartsPanel({ vehicle }: Props) {
  const garage = useGarage()
  const { addItem } = useCart()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileDetail, setMobileDetail] = useState(false)

  const filter = useMemo(() => vehicleToActiveFilter(vehicle), [vehicle])
  const compatInput = useMemo(() => vehicleFilterToCompatInput(filter), [filter])
  const vehicleReady = Boolean(compatInput?.maker?.trim() && compatInput?.model?.trim())
  const catalogEscapeHref = vehicleCatalogHref(vehicle)

  useEffect(() => {
    garage.setActiveVehicle(vehicle)
    // setActiveVehicle é estável o suficiente; evitar loop com objeto garage.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage ao veículo
  }, [vehicle.id])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!vehicleReady || !compatInput) {
        setProducts([])
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        let confirmed: Product[] = []
        for (let page = 1; page <= MAX_PAGES; page += 1) {
          const result = await searchCatalog({
            maker: filter.maker,
            model: filter.model,
            year: filter.year,
            engine: filter.engine,
            version: filter.version,
            page,
            pageSize: PAGE_SIZE,
            sort: 'relevance',
          })
          if (!result.items.length) break
          const pvc = await loadPvcEvidenceByProductIds(result.items.map((p) => p.id))
          const pageConfirmed = filterConfirmedCompatibleProducts(
            result.items,
            compatInput,
            pvc,
          )
          confirmed = mergeUniqueProductsById(confirmed, pageConfirmed)
          if (!result.hasMore) break
        }
        if (cancelled) return
        setProducts(confirmed)
        setSelectedId((prev) => {
          if (prev && confirmed.some((p) => p.id === prev)) return prev
          return confirmed[0]?.id ?? null
        })
      } catch (err) {
        if (!cancelled) {
          setError(toUserMessage(err, 'Não foi possível carregar as peças compatíveis.'))
          setProducts([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [compatInput, filter, vehicleReady])

  const selected = products.find((p) => p.id === selectedId) ?? null

  function onAdd(product: Product) {
    try {
      addItem(product, 1)
      toast.push('Adicionado ao carrinho.', 'success')
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao adicionar'), 'error')
    }
  }

  if (!vehicleReady) {
    return (
      <EmptyState
        title="Selecione ou complete o veículo"
        description="Informe montadora e modelo para listar peças com compatibilidade confirmada."
      />
    )
  }

  if (loading) return <Loading label="Carregando peças compatíveis…" />

  if (error) {
    return <ErrorState title="Peças indisponíveis" description={error} />
  }

  if (!products.length) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Nenhuma peça confirmada"
          description="Não encontramos peças com compatibilidade confirmada para este veículo."
        />
        <div className="flex justify-center">
          <ButtonLink to={catalogEscapeHref} variant="light" size="sm">
            Catálogo completo
          </ButtonLink>
        </div>
      </div>
    )
  }

  function selectProduct(id: string) {
    setSelectedId(id)
    setMobileDetail(true)
  }

  const list = (
    <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
      {products.map((product) => {
        const active = product.id === selectedId
        const title = toCommercialTitleCase(product.name)
        const price = displayPrice(product)
        const ref = formatReferenciaFromProduct(product)
        return (
          <li key={product.id}>
            <button
              type="button"
              onClick={() => selectProduct(product.id)}
              className={[
                'flex w-full gap-3 rounded-fal border p-3 text-left transition-colors',
                active
                  ? 'border-fal-navy bg-fal-navy/5 ring-1 ring-fal-navy/30'
                  : 'border-fal-line bg-fal-surface hover:border-fal-navy/40',
              ].join(' ')}
            >
              <span className="block h-20 w-20 shrink-0 overflow-hidden rounded-[10px] bg-fal-bg">
                <ProductMediaFrame variant="thumb" className="h-20 w-20">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt=""
                      className={productMediaImgClassCard}
                      loading="lazy"
                    />
                  ) : (
                    <ProductImagePlaceholder className="scale-50" />
                  )}
                </ProductMediaFrame>
              </span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block truncate text-sm font-extrabold text-fal-fg">{title}</span>
                {ref ? (
                  <span className="block truncate text-xs font-semibold text-fal-muted">{ref}</span>
                ) : null}
                <CompatibilityStateBadge verdict={CONFIRMED_VERDICT} />
                {price != null ? (
                  <span className="block text-sm font-extrabold text-fal-fg">
                    {formatStorePriceLabel(price)}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )

  const detail = selected ? (
    <aside className="rounded-fal border border-fal-line bg-fal-surface p-4 lg:sticky lg:top-4">
      <div className="mb-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileDetail(false)}
          className="text-sm font-semibold text-fal-auth-link hover:underline"
        >
          ← Lista
        </button>
      </div>
      <div className="mx-auto mb-4 max-w-[280px]">
        <ProductMediaFrame variant="gallery">
          {selected.imageUrl ? (
            <img
              src={selected.imageUrl}
              alt={toCommercialTitleCase(selected.name)}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <ProductImagePlaceholder />
          )}
        </ProductMediaFrame>
      </div>
      <h3 className="m-0 text-lg font-extrabold text-fal-fg">
        {toCommercialTitleCase(selected.name)}
      </h3>
      {formatReferenciaFromProduct(selected) ? (
        <p className="mb-0 mt-1 text-sm font-semibold text-fal-muted">
          {formatReferenciaFromProduct(selected)}
        </p>
      ) : null}
      <div className="mt-2">
        <CompatibilityStateBadge verdict={CONFIRMED_VERDICT} />
      </div>
      {selected.description || selected.shortDescription ? (
        <p className="mt-3 text-sm leading-relaxed text-fal-fg/90">
          {selected.description || selected.shortDescription}
        </p>
      ) : null}
      <div className="mt-4">
        <CompatibilityAppsBlock
          groups={selected.compatibilityGroups}
          summary={selected.compatibilitySummary}
          variant="pdp"
        />
      </div>
      {displayPrice(selected) != null ? (
        <p className="mt-4 text-xl font-extrabold text-fal-fg">
          {formatStorePriceLabel(displayPrice(selected)!)}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2">
        <Button
          type="button"
          size="sm"
          disabled={selected.available === false}
          onClick={() => onAdd(selected)}
        >
          {ADICIONAR_AO_CARRINHO_LABEL}
        </Button>
        <ButtonLink to={productHref(selected)} variant="light" size="sm">
          Ver peça
        </ButtonLink>
      </div>
    </aside>
  ) : null

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="m-0 text-lg font-extrabold text-fal-fg">Peças</h2>
        <p className="m-0 text-sm text-fal-muted">
          Compatibilidade confirmada. Toque para ver detalhes.
        </p>
      </header>

      <div className="lg:grid lg:grid-cols-[1fr_minmax(320px,400px)] lg:items-start lg:gap-4">
        <div className={mobileDetail ? 'hidden lg:block' : 'block'}>{list}</div>
        <div className={mobileDetail ? 'block' : 'hidden lg:block'}>{detail}</div>
      </div>

      <footer className="border-t border-fal-line pt-3">
        <Link
          to={catalogEscapeHref}
          className="text-sm font-semibold text-fal-auth-link hover:underline"
        >
          Catálogo completo
        </Link>
      </footer>
    </div>
  )
}
