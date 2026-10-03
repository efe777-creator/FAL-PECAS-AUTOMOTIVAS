import { Button } from '@/components/common/Button'
import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Select } from '@/components/common/Select'
import { ProductCard } from '@/components/product/ProductCard'
import { listAllCategories, listCategories } from '@/services/categories/categoryService'
import {
  filterProductIdsByVehicle,
  listPublishedProducts,
  searchProducts,
} from '@/services/products/productService'
import { getVehicleOptions } from '@/services/vehicles/vehicleService'
import type { Category, Product, VehicleOptionTree } from '@/types'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const cat = params.get('cat') ?? ''
  const maker = params.get('maker') ?? ''
  const model = params.get('model') ?? ''
  const year = params.get('year') ?? ''
  const engine = params.get('engine') ?? ''

  const [searchDraft, setSearchDraft] = useState(q)
  const [products, setProducts] = useState<Product[]>([])
  const [rootCategories, setRootCategories] = useState<Category[]>([])
  const [vehicleTree, setVehicleTree] = useState<VehicleOptionTree | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSearchDraft(q)
  }, [q])

  useEffect(() => {
    void (async () => {
      try {
        const [cats, vehicles] = await Promise.all([listCategories(), getVehicleOptions()])
        setRootCategories(cats)
        setVehicleTree(vehicles)
      } catch {
        /* filtros ficam vazios; listagem ainda tenta carregar */
      }
    })()
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        let list: Product[]
        if (q.trim()) {
          list = await searchProducts(q)
        } else {
          list = await listPublishedProducts(60)
        }

        if (cat.trim()) {
          const categories = await listAllCategories()
          const match = categories.find(
            (c) =>
              c.slug === cat ||
              c.name.toLowerCase() === cat.toLowerCase() ||
              c.id === cat,
          )
          if (match) {
            const relatedIds = new Set(
              categories
                .filter((c) => c.id === match.id || c.parentId === match.id)
                .map((c) => c.id),
            )
            list = list.filter((p) => p.categoryId && relatedIds.has(p.categoryId))
          }
        }

        const vehicleIds = await filterProductIdsByVehicle({ maker, model, year, engine })
        if (vehicleIds) {
          const allowed = new Set(vehicleIds)
          list = list.filter((p) => allowed.has(p.id))
        }

        if (active) setProducts(list)
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : 'Erro ao carregar o catálogo')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [q, cat, maker, model, year, engine])

  const modelOptions = useMemo(() => {
    if (!vehicleTree || !maker) return []
    return (vehicleTree.modelsByMaker[maker] ?? []).map((m) => ({ value: m, label: m }))
  }, [vehicleTree, maker])

  const yearOptions = useMemo(() => {
    if (!vehicleTree || !model) return []
    return (vehicleTree.yearsByModel[model] ?? []).map((y) => ({ value: y, label: y }))
  }, [vehicleTree, model])

  const engineOptions = useMemo(() => {
    if (!vehicleTree || !model || !year) return []
    const key = `${model}|${year}`
    return (vehicleTree.enginesByModelYear[key] ?? []).map((e) => ({ value: e, label: e }))
  }, [vehicleTree, model, year])

  function patchParams(next: Record<string, string | null>) {
    const draft = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (!value) draft.delete(key)
      else draft.set(key, value)
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

  const activeChips = [
    q && { key: 'q', label: `Busca: ${q}` },
    cat && {
      key: 'cat',
      label: `Categoria: ${rootCategories.find((c) => c.slug === cat)?.name ?? cat}`,
    },
    maker && { key: 'maker', label: `Montadora: ${maker}` },
    model && { key: 'model', label: `Modelo: ${model}` },
    year && { key: 'year', label: `Ano: ${year}` },
    engine && { key: 'engine', label: `Motor: ${engine}` },
  ].filter(Boolean) as Array<{ key: string; label: string }>

  return (
    <Container className="py-8">
      <p className="mb-2 text-[13px] text-fal-muted">
        <Link to="/" className="hover:underline">
          Início
        </Link>{' '}
        / Catálogo
      </p>
      <h1 className="mt-0 mb-2 text-[28px] font-extrabold sm:text-[34px]">Catálogo</h1>
      <p className="text-fal-muted">
        Busque por texto ou refine por categoria e veículo. Filtros podem ser usados sozinhos ou
        combinados.
      </p>

      <form
        onSubmit={applySearch}
        className="mt-5 grid grid-cols-1 gap-3 rounded-fal border border-fal-line bg-white p-3.5 sm:p-4 lg:grid-cols-[1fr_auto]"
      >
        <Input
          label="Busca"
          name="catalog-q"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Peça, SKU, código ou referência"
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

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          label="Categoria"
          name="cat"
          placeholder="Todas"
          value={cat}
          options={rootCategories.map((c) => ({ value: c.slug, label: c.name }))}
          onChange={(e) => patchParams({ cat: e.target.value || null })}
        />
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
              engine: null,
            })
          }
        />
        <Select
          label="Motor"
          name="engine"
          placeholder="Todos / opcional"
          value={engine}
          options={engineOptions}
          disabled={!year}
          onChange={(e) => patchParams({ engine: e.target.value || null })}
        />
      </div>

      {activeChips.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="rounded-full border border-[#d8dee3] bg-[#f7f9fa] px-2.5 py-1.5 text-xs hover:border-fal-navy"
              onClick={() => {
                if (chip.key === 'maker') {
                  patchParams({ maker: null, model: null, year: null, engine: null })
                } else if (chip.key === 'model') {
                  patchParams({ model: null, year: null, engine: null })
                } else if (chip.key === 'year') {
                  patchParams({ year: null, engine: null })
                } else {
                  patchParams({ [chip.key]: null })
                }
                if (chip.key === 'q') setSearchDraft('')
              }}
            >
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-6">
        {loading ? <Loading /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!loading && !error && products.length === 0 ? (
          <EmptyState
            title="Nenhum produto encontrado"
            description="Ajuste a busca ou os filtros para ver outros resultados."
            actionLabel="Limpar filtros"
            actionTo="/catalogo"
          />
        ) : null}
        {!loading && !error && products.length > 0 ? (
          <>
            <p className="mb-3 text-sm text-fal-muted">
              {products.length} produto{products.length === 1 ? '' : 's'}
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-[18px] lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </Container>
  )
}
