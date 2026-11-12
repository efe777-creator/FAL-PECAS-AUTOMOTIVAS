import { Button } from '@/components/common/Button'
import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Select } from '@/components/common/Select'
import { useToast } from '@/components/common/Toast'
import { MobileDrawer } from '@/components/navigation/MobileDrawer'
import { ProductCard } from '@/components/product/ProductCard'
import { SavedVehiclesQuickPick } from '@/components/vehicle/SavedVehiclesQuickPick'
import { VehiclePlateSearch } from '@/components/vehicle/VehiclePlateSearch'
import { selectOptionsWithValue } from '@/services/plates/reconcileVehicleFilter'
import { vehicleModelKey, vehicleModelYearKey } from '@/services/vehicles/vehicleOptionKeys'
import { listActiveBrands } from '@/services/brands/brandService'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  catalogScrollSearchKey,
  readCatalogScroll,
  saveCatalogScroll,
} from '@/lib/catalogScroll'
import { SEARCH_CATALOG_HINT, SEARCH_INPUT_PLACEHOLDER } from '@/lib/searchCopy'
import { listAllCategories } from '@/services/categories/categoryService'
import { subscribeCategoriesChanged } from '@/services/categories/categoryEvents'
import { buildCatalogSearchParams } from '@/services/search/buildCatalogSearchParams'
import { interpretNaturalLanguage } from '@/services/search/interpretNaturalLanguage'
import type { SearchIntent } from '@/services/search/interpretSearchQuery'
import { searchCatalog } from '@/services/search/searchService'
import { getVehicleOptions, listVehicleCatalogEntries } from '@/services/vehicles/vehicleService'
import type {
  Category,
  Product,
  ProductBrand,
  ProductSearchSort,
  VehicleFilter,
  VehicleOptionTree,
} from '@/types'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigationType, useSearchParams } from 'react-router-dom'

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
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navType = useNavigationType()
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
  /** Atualização de filtro com grade já na tela — sem trocar por Loading. */
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  /** Painel de veículo aberto por padrão (placa + selects). */
  const [vehicleDetailsOpen, setVehicleDetailsOpen] = useState(true)
  /** Clarificação do interpretador (ex.: versão não cadastrada). */
  const [searchHint, setSearchHint] = useState<string | null>(null)
  const requestId = useRef(0)
  const resultsRef = useRef<HTMLDivElement>(null)
  const scrollRestoredRef = useRef(false)
  const productsRef = useRef<Product[]>([])
  productsRef.current = products

  function pushCatalogError(message: string, kind: 'page' | 'more') {
    if (kind === 'page') setError(message)
    else setLoadMoreError(message)
    toast.push(message, 'error')
  }

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

  /** Identidade de scroll: filtros importam; `page` do “Carregar mais” não. */
  const scrollIdentity = useMemo(
    () => `${location.pathname}${catalogScrollSearchKey(location.search)}`,
    [location.pathname, location.search],
  )

  /** Persiste scroll ao sair / durante o scroll (voltar da PDP). */
  useEffect(() => {
    scrollRestoredRef.current = false
    const path = location.pathname
    const search = location.search
    function persist() {
      saveCatalogScroll(path, search)
    }
    window.addEventListener('scroll', persist, { passive: true })
    return () => {
      persist()
      window.removeEventListener('scroll', persist)
    }
  }, [scrollIdentity, location.pathname, location.search])

  /** Após carregar resultados num POP, restaura Y salvo. */
  useEffect(() => {
    if (loading || scrollRestoredRef.current || navType !== 'POP') return
    const y = readCatalogScroll(location.pathname, location.search)
    if (y == null) return
    scrollRestoredRef.current = true
    requestAnimationFrame(() => {
      window.scrollTo(0, y)
    })
  }, [loading, products.length, navType, scrollIdentity, location.pathname, location.search])

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

  /**
   * Filtro/busca/ordenação: mantém a posição da página (não scrollIntoView).
   * “Carregar mais” (só page) não entra aqui.
   */
  useEffect(() => {
    if (navType === 'POP') return
    const y = window.scrollY
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y)
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando filtros mudam
  }, [searchArgs])

  useEffect(() => {
    const id = ++requestId.current
    const targetPage = urlPage
    const soft = productsRef.current.length > 0
    void (async () => {
      setError(null)
      if (soft) setRefreshing(true)
      else setLoading(true)
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
        if (id === requestId.current) {
          pushCatalogError(
            toUserMessage(e, 'Erro ao carregar o catálogo'),
            'page',
          )
        }
      } finally {
        if (id === requestId.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    })()
    // urlPage lido no momento em que searchArgs muda (filtros resetam page; deep-link na 1ª carga).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadMore não deve refetch
  }, [searchArgs])

  const makerOptions = useMemo(() => {
    const base = (vehicleTree?.makers ?? []).map((m) => ({ value: m, label: m }))
    return selectOptionsWithValue(base, maker || undefined)
  }, [vehicleTree, maker])

  const modelOptions = useMemo(() => {
    if (!vehicleTree || !maker) return selectOptionsWithValue([], model || undefined)
    const base = (vehicleTree.modelsByMaker[maker] ?? []).map((m) => ({ value: m, label: m }))
    return selectOptionsWithValue(base, model || undefined)
  }, [vehicleTree, maker, model])

  const yearOptions = useMemo(() => {
    if (!vehicleTree || !maker || !model) return selectOptionsWithValue([], year || undefined)
    const key = vehicleModelKey(maker, model)
    const base = (vehicleTree.yearsByModel[key] ?? []).map((y) => ({ value: y, label: y }))
    return selectOptionsWithValue(base, year || undefined)
  }, [vehicleTree, maker, model, year])

  const engineOptions = useMemo(() => {
    if (!vehicleTree || !maker || !model) return selectOptionsWithValue([], engine || undefined)
    let base: Array<{ value: string; label: string }> = []
    if (year) {
      const key = vehicleModelYearKey(maker, model, year)
      const byYear = vehicleTree.enginesByModelYear[key] ?? []
      if (byYear.length) base = byYear.map((e) => ({ value: e, label: e }))
    }
    if (!base.length) {
      base = (vehicleTree.enginesByModel[vehicleModelKey(maker, model)] ?? []).map((e) => ({
        value: e,
        label: e,
      }))
    }
    return selectOptionsWithValue(base, engine || undefined)
  }, [vehicleTree, maker, model, year, engine])

  const versionOptions = useMemo(() => {
    if (!vehicleTree || !maker || !model) return selectOptionsWithValue([], version || undefined)
    const base = (vehicleTree.versionsByModel[vehicleModelKey(maker, model)] ?? []).map((v) => ({
      value: v,
      label: v,
    }))
    return selectOptionsWithValue(base, version || undefined)
  }, [vehicleTree, maker, model, version])

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

  function hintFromIntent(intent: SearchIntent): string | null {
    if (!intent.needsClarification) return null
    if (intent.clarification === 'version') {
      return 'Não encontramos essa versão no cadastro deste modelo. Mostrando peças por modelo/ano — refine pelo filtro Versão se precisar.'
    }
    if (intent.clarification === 'year') {
      return 'Informe o ano do veículo para refinar a busca.'
    }
    if (intent.clarification === 'engine') {
      return 'Informe o motor (ex.: 1.0) para refinar a busca.'
    }
    return null
  }

  /** Texto livre → URL canônica (mesmos params do seletor YMM). */
  async function applyInterpretedQuery(raw: string) {
    const catalog = await listVehicleCatalogEntries()
    const intent = await interpretNaturalLanguage(raw, { catalog })
    const { catalogParams } = buildCatalogSearchParams(intent)
    setSearchHint(hintFromIntent(intent))
    patchParams({
      q: catalogParams.q ?? null,
      maker: catalogParams.maker ?? null,
      model: catalogParams.model ?? null,
      year: catalogParams.year ?? null,
      engine: catalogParams.engine ?? null,
      version: catalogParams.version ?? null,
    })
  }

  /** Deep-link `?q=HB20 2015` sem vehicle → reescreve URL canônica. */
  useEffect(() => {
    const raw = q.trim()
    if (!raw) return
    if (maker || model || year || engine || version) return
    let cancelled = false
    void (async () => {
      try {
        const catalog = await listVehicleCatalogEntries()
        if (cancelled) return
        const intent = await interpretNaturalLanguage(raw, { catalog })
        const { catalogParams } = buildCatalogSearchParams(intent)
        const hasVehicle =
          Boolean(catalogParams.maker) ||
          Boolean(catalogParams.model) ||
          Boolean(catalogParams.year) ||
          Boolean(catalogParams.engine) ||
          Boolean(catalogParams.version)
        if (!hasVehicle) return
        if (cancelled) return
        setSearchHint(hintFromIntent(intent))
        patchParams({
          q: catalogParams.q ?? null,
          maker: catalogParams.maker ?? null,
          model: catalogParams.model ?? null,
          year: catalogParams.year ?? null,
          engine: catalogParams.engine ?? null,
          version: catalogParams.version ?? null,
        })
      } catch {
        /* searchCatalog ainda interpreta no fetch */
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só deep-link q-only
  }, [q, maker, model, year, engine, version])

  /** Placa / garagem: grava filtros e atualiza árvore (anos PVC expandidos). */
  async function applyVehicleFilter(filter: VehicleFilter) {
    patchParams({
      maker: filter.maker ?? null,
      model: filter.model ?? null,
      year: filter.year ?? null,
      engine: filter.engine ?? null,
      version: filter.version ?? null,
    })
    try {
      setVehicleTree(await getVehicleOptions())
    } catch {
      /* árvore atual segue; listagem já usa os params */
    }
  }

  async function applySearch(e?: FormEvent) {
    e?.preventDefault()
    const raw = searchDraft.trim()
    if (!raw) {
      patchParams({ q: null })
      return
    }
    try {
      await applyInterpretedQuery(raw)
    } catch {
      patchParams({ q: raw })
    }
  }

  function clearFilters() {
    setSearchDraft('')
    setSearchHint(null)
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
      const keepY = window.scrollY
      patchParams({ page: String(nextPage) }, false)
      requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - keepY) > 1) window.scrollTo(0, keepY)
      })
    } catch (e) {
      pushCatalogError(
        toUserMessage(e, 'Erro ao carregar mais produtos'),
        'more',
      )
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

  const filterChipCount = activeChips.filter((c) => c.key !== 'q').length

  const onlyQueryChip =
    activeChips.length === 1 && activeChips[0]?.key === 'q' ? activeChips[0].label : null

  /** Slug do nó pai (grupo←subgrupo ou categoria←grupo) para empty state de classificação. */
  const parentCategorySlug = useMemo(() => {
    if (!cat.trim()) return null
    if (catPath.subgrupoId && catPath.grupoId) {
      return allCategories.find((c) => c.id === catPath.grupoId)?.slug ?? null
    }
    if (catPath.grupoId && catPath.categoriaId) {
      return allCategories.find((c) => c.id === catPath.categoriaId)?.slug ?? null
    }
    return null
  }, [cat, catPath.subgrupoId, catPath.grupoId, catPath.categoriaId, allCategories])

  const emptyDescription = vehicleFiltersActive && !onlyQueryChip
    ? 'Identificamos o veículo, mas ainda não temos peças compatíveis cadastradas.'
    : onlyQueryChip
      ? `Nada encontrado para “${q}”. Tente o código do fabricante, o código interno, outro nome da peça ou filtre pelo veículo.`
      : cat.trim() && parentCategorySlug
        ? `Nenhum produto nesta classificação (${catPath.label || cat}). Experimente o nível superior ou limpe o filtro de grupo/subgrupo.`
      : activeChips.length > 0
        ? `Nenhum resultado para: ${activeChips.map((c) => c.label).join(' · ')}. Remova filtros, tente o código da peça ou selecione o veículo.`
        : 'Busque por nome, código ou filtre pelo veículo para ver resultados.'

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
      <p className="mb-0 text-sm text-fal-muted sm:text-base">{SEARCH_CATALOG_HINT}</p>

      <form
        onSubmit={applySearch}
        className="mt-4 grid grid-cols-1 gap-3 rounded-fal border border-fal-line bg-white p-3 sm:p-3.5 lg:grid-cols-[1fr_auto]"
      >
        <Input
          label="Busca"
          name="catalog-q"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder={SEARCH_INPUT_PLACEHOLDER}
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

      <div className="mt-3 flex lg:hidden">
        <Button type="button" variant="outline" onClick={() => setFiltersOpen(true)}>
          {filterChipCount > 0 ? `Filtros (${filterChipCount})` : 'Filtros'}
        </Button>
      </div>

      {/* Classificação + veículo: inline no desktop; MobileDrawer no mobile */}
      <div className="mt-3 hidden lg:block">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
          open={vehicleDetailsOpen || vehicleFiltersActive}
          onToggle={(e) => setVehicleDetailsOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer list-none px-3.5 py-2.5 text-sm font-semibold text-fal-navy marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              Filtros por veículo
              {vehicleFiltersActive ? (
                <span className="rounded-full bg-[#fff8db] px-2 py-0.5 text-[11px] font-bold text-fal-navy-dark">
                  ativos
                </span>
              ) : (
                <span className="font-normal text-fal-muted">placa ou manual</span>
              )}
            </span>
          </summary>
          <div className="border-t border-fal-line px-3.5 pt-3">
            <VehiclePlateSearch
              compact
              returnPath={`${location.pathname}${location.search}`}
              onApplyFilters={(filter) => void applyVehicleFilter(filter)}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 border-t border-fal-line px-3.5 pt-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Select
              label="Montadora"
              name="maker"
              placeholder="Todas / opcional"
              value={maker}
              options={makerOptions}
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
                void applyVehicleFilter({
                  maker: v.makerName || undefined,
                  model: v.modelName || undefined,
                  year: v.year != null ? String(v.year) : undefined,
                  engine: v.engine || undefined,
                  version: v.versionName || undefined,
                })
              }
            />
          </div>
        </details>
      </div>

      <MobileDrawer open={filtersOpen} title="Filtros" onClose={() => setFiltersOpen(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <Select
              label="Categoria"
              name="cat-root-m"
              placeholder="Todas"
              value={catPath.categoriaId}
              options={rootCategoryOptions.map((c) => ({ value: c.value, label: c.label }))}
              onChange={(e) => setCategoryFacet('categoria', e.target.value)}
            />
            <Select
              label="Grupo"
              name="cat-grupo-m"
              placeholder={catPath.categoriaId ? 'Todos / opcional' : 'Escolha a categoria'}
              value={catPath.grupoId}
              options={grupoOptions.map((c) => ({ value: c.value, label: c.label }))}
              disabled={!catPath.categoriaId || grupoOptions.length === 0}
              onChange={(e) => setCategoryFacet('grupo', e.target.value)}
            />
            <Select
              label="Subgrupo"
              name="cat-sub-m"
              placeholder={catPath.grupoId ? 'Todos / opcional' : 'Escolha o grupo'}
              value={catPath.subgrupoId}
              options={subgrupoOptions.map((c) => ({ value: c.value, label: c.label }))}
              disabled={!catPath.grupoId || subgrupoOptions.length === 0}
              onChange={(e) => setCategoryFacet('subgrupo', e.target.value)}
            />
            <Select
              label="Fabricante"
              name="brand-m"
              placeholder="Todos / opcional"
              value={brand}
              options={brandOptions}
              onChange={(e) => patchParams({ brand: e.target.value || null })}
            />
            <Select
              label="Ordenar"
              name="sort-m"
              value={sort}
              options={SORT_OPTIONS}
              onChange={(e) =>
                patchParams({
                  sort: e.target.value === 'relevance' ? null : e.target.value || null,
                })
              }
            />
          </div>
          <p className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
            Veículo {vehicleFiltersActive ? '(ativos)' : '(opcional)'}
          </p>
          <VehiclePlateSearch
            compact
            returnPath={`${location.pathname}${location.search}`}
            onApplyFilters={(filter) => {
              void applyVehicleFilter(filter)
              setFiltersOpen(false)
            }}
          />
          <div className="grid grid-cols-1 gap-3">
            <Select
              label="Montadora"
              name="maker-m"
              placeholder="Todas / opcional"
              value={maker}
              options={makerOptions}
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
              name="model-m"
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
              name="year-m"
              placeholder="Todos / opcional"
              value={year}
              options={yearOptions}
              disabled={!model}
              onChange={(e) => patchParams({ year: e.target.value || null })}
            />
            <Select
              label="Motor"
              name="engine-m"
              placeholder="Todos / opcional"
              value={engine}
              options={engineOptions}
              disabled={!model}
              onChange={(e) => patchParams({ engine: e.target.value || null })}
            />
            <Select
              label="Versão"
              name="version-m"
              placeholder="Todas / opcional"
              value={version}
              options={versionOptions}
              disabled={!model}
              onChange={(e) => patchParams({ version: e.target.value || null })}
            />
          </div>
          <SavedVehiclesQuickPick
            onPick={(v) =>
              void applyVehicleFilter({
                maker: v.makerName || undefined,
                model: v.modelName || undefined,
                year: v.year != null ? String(v.year) : undefined,
                engine: v.engine || undefined,
                version: v.versionName || undefined,
              })
            }
          />
          <Button type="button" variant="primary" className="w-full" onClick={() => setFiltersOpen(false)}>
            Ver resultados
          </Button>
          {filterChipCount > 0 ? (
            <Button
              type="button"
              variant="light"
              className="w-full"
              onClick={() => {
                clearFilters()
                setFiltersOpen(false)
              }}
            >
              Limpar filtros
            </Button>
          ) : null}
        </div>
      </MobileDrawer>

      {searchHint ? (
        <div
          className="mt-3 rounded-lg border border-fal-yellow-dark/40 bg-[#fff8e6] px-3 py-2.5 text-sm text-fal-navy"
          role="status"
        >
          {searchHint}
          <button
            type="button"
            className="ml-2 text-xs font-semibold underline-offset-2 hover:underline"
            onClick={() => setSearchHint(null)}
          >
            Fechar
          </button>
        </div>
      ) : null}

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
        <div className="sticky top-0 z-[1] -mx-1 mb-3 border-b border-fal-line bg-[#f4f6f8] px-1 py-2 sm:bg-fal-bg">
          {!loading && !error ? (
            <p className="m-0 text-sm font-semibold text-fal-navy-dark">
              {refreshing ? 'Atualizando… · ' : ''}
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

        {loading && products.length === 0 ? <Loading /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!loading && !error && products.length === 0 ? (
          <EmptyState
            title={
              vehicleFiltersActive
                ? 'Veículo reconhecido — sem peças compatíveis'
                : 'Nenhum produto encontrado'
            }
            description={emptyDescription}
            actionLabel={
              cat.trim() && parentCategorySlug
                ? 'Ver classificação superior'
                : activeChips.length
                  ? 'Limpar filtros'
                  : undefined
            }
            actionTo={
              cat.trim() && parentCategorySlug
                ? `/catalogo?cat=${encodeURIComponent(parentCategorySlug)}`
                : activeChips.length
                  ? '/catalogo'
                  : undefined
            }
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
        {!error && products.length > 0 ? (
          <>
            <div
              className={[
                'grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-[18px] lg:grid-cols-4',
                refreshing ? 'opacity-70 transition-opacity' : '',
              ].join(' ')}
            >
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
