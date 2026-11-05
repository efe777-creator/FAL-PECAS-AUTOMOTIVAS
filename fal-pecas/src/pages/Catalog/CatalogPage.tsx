import { Button } from '@/components/common/Button'
import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Select } from '@/components/common/Select'
import { ProductCard } from '@/components/product/ProductCard'
import { SavedVehiclesQuickPick } from '@/components/vehicle/SavedVehiclesQuickPick'
import { listActiveBrands } from '@/services/brands/brandService'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { listAllCategories } from '@/services/categories/categoryService'
import { subscribeCategoriesChanged } from '@/services/categories/categoryEvents'
import { searchCatalog } from '@/services/search/searchService'
import { getVehicleOptions } from '@/services/vehicles/vehicleService'
import type { Category, Product, ProductBrand, ProductSearchSort, VehicleOptionTree } from '@/types'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

/** Resolve Categoria → Grupo → Subgrupo a partir do slug em `?cat=`. */
function categoryPathFromSlug(
  all: Category[],
  slug: string,
): { categoriaId: string; grupoId: string; subgrupoId: string; label: string } {
  const node = all.find((c) => c.slug === slug)
  if (!node) return { categoriaId: '', grupoId: '', subgrupoId: '', label: slug }
  const chain: Category[] = []
  let cur: Category | undefined = node
  const seen = new Set<string>()
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    chain.unshift(cur)
    cur = cur.parentId ? all.find((c) => c.id === cur!.parentId) : undefined
  }
  return {
    categoriaId: chain[0]?.id ?? '',
    grupoId: chain[1]?.id ?? '',
    subgrupoId: chain[2]?.id ?? '',
    label: chain.map((c) => c.name).join(' › '),
  }
}

const PAGE_SIZE = 24

const SORT_OPTIONS: Array<{ value: ProductSearchSort; label: string }> = [
  { value: 'relevance', label: 'Relevância' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'name_asc', label: 'Nome A–Z' },
  { value: 'name_desc', label: 'Nome Z–A' },
]

function parseSort(value: string | null): ProductSearchSort {
  const allowed = SORT_OPTIONS.map((o) => o.value)
  if (value && (allowed as string[]).includes(value)) return value as ProductSearchSort
  return 'relevance'
}

function parsePage(value: string | null): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const cat = params.get('cat') ?? ''
  const maker = params.get('maker') ?? ''
  const model = params.get('model') ?? ''
  const year = params.get('year') ?? ''
  const engine = params.get('engine') ?? ''
  const version = params.get('version') ?? ''
  const brand = params.get('brand') ?? ''
  const sort = parseSort(params.get('sort'))
  const urlPage = parsePage(params.get('page'))

  const [searchDraft, setSearchDraft] = useState(q)
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadedPage, setLoadedPage] = useState(1)
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<ProductBrand[]>([])
  const [vehicleTree, setVehicleTree] = useState<VehicleOptionTree | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const requestId = useRef(0)
  const resultsRef = useRef<HTMLDivElement>(null)

  const vehicleFiltersActive = Boolean(maker || model || year || engine || version)

  useDocumentTitle(
    q.trim()
      ? `Busca: ${q.trim()} | FAL Peças Automotivas`
      : cat.trim()
        ? `Catálogo · ${cat} | FAL Peças Automotivas`
        : 'Catálogo | FAL Peças Automotivas',
  )

  useEffect(() => {
    setSearchDraft(q)
  }, [q])

  const [catsRev, setCatsRev] = useState(0)
  useEffect(() => subscribeCategoriesChanged(() => setCatsRev((n) => n + 1)), [])

  useEffect(() => {
    void (async () => {
      try {
        const [cats, vehicles, brandList] = await Promise.all([
          listAllCategories(),
          getVehicleOptions(),
          listActiveBrands(),
        ])
        setAllCategories(cats)
        setVehicleTree(vehicles)
        setBrands(brandList)
      } catch {
        /* filtros ficam vazios; listagem ainda tenta carregar */
      }
    })()
  }, [catsRev])

  const searchArgs = useMemo(
    () => ({
      q,
      category: cat,
      brand,
      maker,
      model,
      year,
      engine,
      version,
      sort,
    }),
    [q, cat, brand, maker, model, year, engine, version, sort],
  )

  useEffect(() => {
    const id = ++requestId.current
    const targetPage = urlPage
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const first = await searchCatalog({
          ...searchArgs,
          page: 1,
          pageSize: PAGE_SIZE,
        })
        if (id !== requestId.current) return

        if (targetPage <= 1) {
          setProducts(first.items)
          setTotal(first.total)
          setHasMore(first.hasMore)
          setLoadedPage(1)
          return
        }

        const rest = await Promise.all(
          Array.from({ length: targetPage - 1 }, (_, i) =>
            searchCatalog({
              ...searchArgs,
              page: i + 2,
              pageSize: PAGE_SIZE,
            }),
          ),
        )
        if (id !== requestId.current) return
        const last = rest[rest.length - 1] ?? first
        setProducts([...first.items, ...rest.flatMap((p) => p.items)])
        setTotal(first.total)
        setHasMore(last.hasMore)
        setLoadedPage(targetPage)
      } catch (e) {
        if (id === requestId.current)
          setError(e instanceof Error ? e.message : 'Erro ao carregar o catálogo')
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    })()
    // urlPage lido no momento em que searchArgs muda (filtros resetam page; deep-link na 1ª carga).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadMore não deve refetch
  }, [searchArgs])

  const modelOptions = useMemo(() => {
    if (!vehicleTree || !maker) return []
    return (vehicleTree.modelsByMaker[maker] ?? []).map((m) => ({ value: m, label: m }))
  }, [vehicleTree, maker])

  const yearOptions = useMemo(() => {
    if (!vehicleTree || !model) return []
    return (vehicleTree.yearsByModel[model] ?? []).map((y) => ({ value: y, label: y }))
  }, [vehicleTree, model])

  const engineOptions = useMemo(() => {
    if (!vehicleTree || !model) return []
    if (year) {
      const key = `${model}|${year}`
      const byYear = vehicleTree.enginesByModelYear[key] ?? []
      if (byYear.length) return byYear.map((e) => ({ value: e, label: e }))
    }
    return (vehicleTree.enginesByModel[model] ?? []).map((e) => ({ value: e, label: e }))
  }, [vehicleTree, model, year])

  const versionOptions = useMemo(() => {
    if (!vehicleTree || !model) return []
    return (vehicleTree.versionsByModel[model] ?? []).map((v) => ({ value: v, label: v }))
  }, [vehicleTree, model])

  const brandOptions = useMemo(
    () => brands.map((b) => ({ value: b.name, label: b.name })),
    [brands],
  )

  const catPath = useMemo(
    () => categoryPathFromSlug(allCategories, cat),
    [allCategories, cat],
  )

  const sortCatOpts = (a: Category, b: Category) =>
    (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)

  const rootCategoryOptions = useMemo(
    () =>
      allCategories
        .filter((c) => !c.parentId)
        .slice()
        .sort(sortCatOpts)
        .map((c) => ({ value: c.id, label: c.name, slug: c.slug })),
    [allCategories],
  )

  const grupoOptions = useMemo(() => {
    if (!catPath.categoriaId) return []
    return allCategories
      .filter((c) => c.parentId === catPath.categoriaId)
      .slice()
      .sort(sortCatOpts)
      .map((c) => ({ value: c.id, label: c.name, slug: c.slug }))
  }, [allCategories, catPath.categoriaId])

  const subgrupoOptions = useMemo(() => {
    if (!catPath.grupoId) return []
    return allCategories
      .filter((c) => c.parentId === catPath.grupoId)
      .slice()
      .sort(sortCatOpts)
      .map((c) => ({ value: c.id, label: c.name, slug: c.slug }))
  }, [allCategories, catPath.grupoId])

  function setCategoryFacet(level: 'categoria' | 'grupo' | 'subgrupo', id: string) {
    if (!id) {
      if (level === 'categoria') patchParams({ cat: null })
      else if (level === 'grupo') {
        const root = allCategories.find((c) => c.id === catPath.categoriaId)
        patchParams({ cat: root?.slug ?? null })
      } else {
        const grupo = allCategories.find((c) => c.id === catPath.grupoId)
        patchParams({ cat: grupo?.slug ?? null })
      }
      return
    }
    const node = allCategories.find((c) => c.id === id)
    patchParams({ cat: node?.slug ?? null })
  }

  function patchParams(next: Record<string, string | null>, resetPage = true) {
    const draft = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (!value) draft.delete(key)
      else draft.set(key, value)
    }
    if (resetPage && !('page' in next)) {
      draft.delete('page')
    }
    setParams(draft, { replace: true })
  }

  function applySearch(e?: FormEvent) {
    e?.preventDefault()
    patchParams({ q: searchDraft.trim() || null })
  }

  function clearFilters() {
    setSearchDraft('')
    setParams({}, { replace: true })
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return
    const nextPage = loadedPage + 1
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const result = await searchCatalog({
        ...searchArgs,
        page: nextPage,
        pageSize: PAGE_SIZE,
      })
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        return [...prev, ...result.items.filter((p) => !seen.has(p.id))]
      })
      setTotal(result.total)
      setHasMore(result.hasMore)
      setLoadedPage(nextPage)
      patchParams({ page: String(nextPage) }, false)
    } catch (e) {
      setLoadMoreError(e instanceof Error ? e.message : 'Erro ao carregar mais produtos')
    } finally {
      setLoadingMore(false)
    }
  }

  const activeChips = [
    q && { key: 'q', label: `Busca: ${q}` },
    cat && {
      key: 'cat',
      label: `Classificação: ${catPath.label || cat}`,
    },
    maker && { key: 'maker', label: `Montadora: ${maker}` },
    model && { key: 'model', label: `Modelo: ${model}` },
    year && { key: 'year', label: `Ano: ${year}` },
    engine && { key: 'engine', label: `Motor: ${engine}` },
    version && { key: 'version', label: `Versão: ${version}` },
    brand && { key: 'brand', label: `Fabricante: ${brand}` },
    sort !== 'relevance' && {
      key: 'sort',
      label: `Ordenar: ${SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort}`,
    },
  ].filter(Boolean) as Array<{ key: string; label: string }>

  const emptyDescription =
    activeChips.length > 0
      ? `Nenhum resultado para: ${activeChips.map((c) => c.label).join(' · ')}. Remova filtros ou limpe a busca.`
      : 'Ajuste a busca ou os filtros para ver outros resultados.'

  function removeChip(key: string) {
    if (key === 'maker') {
      patchParams({ maker: null, model: null, year: null, engine: null, version: null })
    } else if (key === 'model') {
      patchParams({ model: null, year: null, engine: null, version: null })
    } else if (key === 'year') {
      patchParams({ year: null })
    } else if (key === 'sort') {
      patchParams({ sort: null })
    } else {
      patchParams({ [key]: null })
    }
    if (key === 'q') setSearchDraft('')
  }

  return (
    <Container className="py-6 sm:py-8">
      <p className="mb-2 text-[13px] text-fal-muted">
        <Link to="/" className="hover:underline">
          Início
        </Link>{' '}
        / Catálogo
      </p>
      <h1 className="mt-0 mb-1 text-[28px] font-extrabold sm:text-[34px]">Catálogo</h1>
      <p className="mb-0 text-sm text-fal-muted sm:text-base">
        Encontre peças por nome, código, categoria ou veículo.
      </p>

      <form
        onSubmit={applySearch}
        className="mt-4 grid grid-cols-1 gap-3 rounded-fal border border-fal-line bg-white p-3 sm:p-3.5 lg:grid-cols-[1fr_auto]"
      >
        <Input
          label="Busca"
          name="catalog-q"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Peça, código ou referência"
        />
        <div className="flex items-end gap-2">
          <Button type="submit" variant="primary">
            Buscar
          </Button>
          {activeChips.length ? (
            <Button type="button" variant="light" onClick={clearFilters}>
              Limpar
            </Button>
          ) : null}
        </div>
      </form>

      {/* Classificação Categoria → Grupo → Subgrupo + fabricante/ordem */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Select
          label="Categoria"
          name="cat-root"
          placeholder="Todas"
          value={catPath.categoriaId}
          options={rootCategoryOptions.map((c) => ({ value: c.value, label: c.label }))}
          onChange={(e) => setCategoryFacet('categoria', e.target.value)}
        />
        <Select
          label="Grupo"
          name="cat-grupo"
          placeholder={catPath.categoriaId ? 'Todos / opcional' : 'Escolha a categoria'}
          value={catPath.grupoId}
          options={grupoOptions.map((c) => ({ value: c.value, label: c.label }))}
          disabled={!catPath.categoriaId || grupoOptions.length === 0}
          onChange={(e) => setCategoryFacet('grupo', e.target.value)}
        />
        <Select
          label="Subgrupo"
          name="cat-sub"
          placeholder={catPath.grupoId ? 'Todos / opcional' : 'Escolha o grupo'}
          value={catPath.subgrupoId}
          options={subgrupoOptions.map((c) => ({ value: c.value, label: c.label }))}
          disabled={!catPath.grupoId || subgrupoOptions.length === 0}
          onChange={(e) => setCategoryFacet('subgrupo', e.target.value)}
        />
        <Select
          label="Fabricante"
          name="brand"
          placeholder="Todos / opcional"
          value={brand}
          options={brandOptions}
          onChange={(e) => patchParams({ brand: e.target.value || null })}
        />
        <Select
          label="Ordenar"
          name="sort"
          value={sort}
          options={SORT_OPTIONS}
          onChange={(e) =>
            patchParams({
              sort: e.target.value === 'relevance' ? null : e.target.value || null,
            })
          }
        />
      </div>

      <details
        className="mt-3 rounded-fal border border-fal-line bg-white open:pb-3"
        open={vehicleFiltersActive || undefined}
      >
        <summary className="cursor-pointer list-none px-3.5 py-2.5 text-sm font-semibold text-fal-navy marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            Filtros por veículo
            {vehicleFiltersActive ? (
              <span className="rounded-full bg-[#fff8db] px-2 py-0.5 text-[11px] font-bold text-fal-navy-dark">
                ativos
              </span>
            ) : (
              <span className="font-normal text-fal-muted">opcional</span>
            )}
          </span>
        </summary>
        <div className="grid grid-cols-1 gap-3 border-t border-fal-line px-3.5 pt-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Select
            label="Montadora"
            name="maker"
            placeholder="Todas / opcional"
            value={maker}
            options={(vehicleTree?.makers ?? []).map((m) => ({ value: m, label: m }))}
            onChange={(e) =>
              patchParams({
                maker: e.target.value || null,
                model: null,
                year: null,
                engine: null,
                version: null,
              })
            }
          />
          <Select
            label="Modelo"
            name="model"
            placeholder="Todos / opcional"
            value={model}
            options={modelOptions}
            disabled={!maker}
            onChange={(e) =>
              patchParams({
                model: e.target.value || null,
                year: null,
                engine: null,
                version: null,
              })
            }
          />
          <Select
            label="Ano"
            name="year"
            placeholder="Todos / opcional"
            value={year}
            options={yearOptions}
            disabled={!model}
            onChange={(e) =>
              patchParams({
                year: e.target.value || null,
              })
            }
          />
          <Select
            label="Motor"
            name="engine"
            placeholder="Todos / opcional"
            value={engine}
            options={engineOptions}
            disabled={!model}
            onChange={(e) => patchParams({ engine: e.target.value || null })}
          />
          <Select
            label="Versão"
            name="version"
            placeholder="Todas / opcional"
            value={version}
            options={versionOptions}
            disabled={!model}
            onChange={(e) => patchParams({ version: e.target.value || null })}
          />
        </div>
        <div className="mt-3 border-t border-dashed border-[#d8dee3] px-3.5 pt-2.5">
          <SavedVehiclesQuickPick
            onPick={(v) =>
              patchParams({
                maker: v.makerName || null,
                model: v.modelName || null,
                year: v.year != null ? String(v.year) : null,
                engine: v.engine || null,
                version: v.versionName || null,
              })
            }
          />
        </div>
      </details>

      {activeChips.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="rounded-full border border-[#d8dee3] bg-[#f7f9fa] px-2.5 py-1.5 text-xs hover:border-fal-navy"
              onClick={() => removeChip(chip.key)}
            >
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}

      <div id="catalog-results" ref={resultsRef} className="mt-4 scroll-mt-20">
        <div className="sticky top-0 z-[1] -mx-1 mb-3 border-b border-fal-line bg-[#f4f6f8]/px-1 py-2 sm:bg-fal-bg">
          {!loading && !error ? (
            <p className="m-0 text-sm font-semibold text-fal-navy-dark">
              {products.length === 0
                ? 'Nenhum produto neste filtro'
                : `${total} produto${total === 1 ? '' : 's'}${
                    products.length < total ? ` · mostrando ${products.length}` : ''
                  }`}
            </p>
          ) : (
            <p className="m-0 text-sm text-fal-muted">{loading ? 'Carregando resultados…' : ' '}</p>
          )}
        </div>

        {loading ? <Loading /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!loading && !error && products.length === 0 ? (
          <EmptyState
            title="Nenhum produto encontrado"
            description={emptyDescription}
            actionLabel={activeChips.length ? 'Limpar filtros' : undefined}
            actionTo={activeChips.length ? '/catalogo' : undefined}
          >
            {activeChips.length ? (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {activeChips.map((chip) => (
                  <button
                    key={`empty-${chip.key}`}
                    type="button"
                    className="rounded-full border border-[#d8dee3] bg-[#f7f9fa] px-2.5 py-1.5 text-xs hover:border-fal-navy"
                    onClick={() => removeChip(chip.key)}
                  >
                    Remover: {chip.label} ×
                  </button>
                ))}
              </div>
            ) : null}
          </EmptyState>
        ) : null}
        {!loading && !error && products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-[18px] lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {hasMore ? (
              <div className="mt-6 flex flex-col items-center gap-2">
                {loadMoreError ? (
                  <p className="m-0 text-sm text-fal-danger">{loadMoreError}</p>
                ) : null}
                <Button
                  type="button"
                  variant="light"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Carregando…' : loadMoreError ? 'Tentar novamente' : 'Carregar mais'}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </Container>
  )
}
