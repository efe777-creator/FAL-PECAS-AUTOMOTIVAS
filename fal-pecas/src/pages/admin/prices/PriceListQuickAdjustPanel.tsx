import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { formatMoney, parseMoneyBr } from '@/lib/money'
import { PRICE_LIST_LAYERS_HINT, priceOriginLabel } from '@/lib/priceLabels'
import {
  PriceItemPricingModal,
  type PricingEditResult,
} from '@/pages/admin/prices/PriceItemPricingModal'
import {
  adminFindProductIdBySku,
  adminListPriceListOperationalItems,
  adminSetCalculatedListPrice,
  adminSetPriceListItemPricing,
  adminSyncProductsOntoPriceList,
  adminUpsertPriceListItem,
  filterPriceListItems,
  isVirtualPriceListItemId,
  priceListStatusLabel,
  withWindowScrollPreserved,
  type PriceListItem,
  type PriceListOverviewRow,
  type PriceOrigin,
} from '@/services/admin/adminPriceListService'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

const QUICK_RESULT_LIMIT = 50
const STORAGE_KEY = 'fal.priceListQuickAdjust.listId'
const FILTERS_KEY = 'fal.priceListQuickAdjust.filters'

type StoredFilters = {
  q?: string
  origin?: PriceOrigin | ''
  withoutPrice?: boolean
}

type Props = {
  lists: PriceListOverviewRow[]
  allowed: boolean
  changedBy?: string | null
  onItemsChanged?: () => void
  onListIdChange?: (listId: string) => void
  /** Filtro controlado pelo KPI da página */
  forceWithoutPrice?: boolean
  onRequestImport?: () => void
}

function readStoredFilters(): StoredFilters {
  try {
    const raw = sessionStorage.getItem(FILTERS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as StoredFilters
  } catch {
    return {}
  }
}

export function PriceListQuickAdjustPanel({
  lists,
  allowed,
  changedBy,
  onItemsChanged,
  onListIdChange,
  forceWithoutPrice,
  onRequestImport,
}: Props) {
  const stored = readStoredFilters()
  const [listId, setListId] = useState('')
  const [items, setItems] = useState<PriceListItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [filterQ, setFilterQ] = useState(stored.q ?? '')
  const [filterQDebounced, setFilterQDebounced] = useState(stored.q ?? '')
  const [filterOrigin, setFilterOrigin] = useState<PriceOrigin | ''>(stored.origin ?? '')
  const [filterWithoutPrice, setFilterWithoutPrice] = useState(Boolean(stored.withoutPrice))
  const [addOpen, setAddOpen] = useState(false)

  const [addSku, setAddSku] = useState('')
  const [addPrice, setAddPrice] = useState('')
  const [addBusy, setAddBusy] = useState(false)

  const [pricingItem, setPricingItem] = useState<PriceListItem | null>(null)
  const [rowBusy, setRowBusy] = useState<string | null>(null)

  const addFormRef = useRef<HTMLFormElement>(null)
  const addSkuInputRef = useRef<HTMLInputElement>(null)
  const loadGenRef = useRef(0)

  const selectedList = lists.find((l) => l.id === listId) ?? null

  useEffect(() => {
    if (forceWithoutPrice != null) setFilterWithoutPrice(Boolean(forceWithoutPrice))
  }, [forceWithoutPrice])

  useEffect(() => {
    sessionStorage.setItem(
      FILTERS_KEY,
      JSON.stringify({
        q: filterQDebounced,
        origin: filterOrigin,
        withoutPrice: filterWithoutPrice,
      } satisfies StoredFilters),
    )
  }, [filterQDebounced, filterOrigin, filterWithoutPrice])

  useEffect(() => {
    if (!lists.length) {
      setListId('')
      return
    }
    const storedList = sessionStorage.getItem(STORAGE_KEY)
    const fromStored = storedList && lists.some((l) => l.id === storedList) ? storedList : null
    const active = lists.find((l) => l.status === 'active')
    setListId((prev) => {
      if (prev && lists.some((l) => l.id === prev)) return prev
      return fromStored ?? active?.id ?? lists[0]!.id
    })
  }, [lists])

  useEffect(() => {
    onListIdChange?.(listId)
  }, [listId, onListIdChange])

  useEffect(() => {
    const t = window.setTimeout(() => setFilterQDebounced(filterQ), 200)
    return () => window.clearTimeout(t)
  }, [filterQ])

  useEffect(() => {
    if (!listId) {
      setItems([])
      setLoadingItems(false)
      return
    }

    const gen = ++loadGenRef.current
    setItems([])
    setPricingItem(null)
    setError(null)
    setInfo(null)
    setLoadingItems(true)
    sessionStorage.setItem(STORAGE_KEY, listId)

    let cancelled = false
    void (async () => {
      try {
        const rows = await adminListPriceListOperationalItems(listId)
        if (cancelled || gen !== loadGenRef.current) return
        setItems(rows)
        setAddOpen(rows.filter((r) => !isVirtualPriceListItemId(r.id)).length === 0)
      } catch (e) {
        if (cancelled || gen !== loadGenRef.current) return
        setItems([])
        setError(e instanceof Error ? e.message : 'Falha ao carregar itens da lista')
      } finally {
        if (!cancelled && gen === loadGenRef.current) setLoadingItems(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [listId])

  const filteredItems = useMemo(() => {
    if (loadingItems) return []
    return filterPriceListItems(items, {
      q: filterQDebounced,
      origin: filterOrigin,
      withoutPrice: filterWithoutPrice,
    })
  }, [items, filterQDebounced, filterOrigin, filterWithoutPrice, loadingItems])

  const visibleItems = useMemo(
    () => filteredItems.slice(0, QUICK_RESULT_LIMIT),
    [filteredItems],
  )

  const singleMatch =
    filterQDebounced.trim() && filteredItems.length === 1 ? filteredItems[0] : null

  const hasRestrictiveFilters = Boolean(
    filterQDebounced.trim() || filterOrigin || filterWithoutPrice,
  )

  function focusAddSku() {
    window.requestAnimationFrame(() => {
      addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const el = addSkuInputRef.current
      if (!el) return
      el.focus()
      el.select()
    })
  }

  function openAddForm() {
    setAddOpen(true)
    setError(null)
    setInfo(null)
    window.setTimeout(focusAddSku, addOpen ? 0 : 50)
  }

  async function reloadItems(opts?: { keepAddOpen?: boolean }) {
    if (!listId) return
    const gen = ++loadGenRef.current
    setError(null)
    try {
      const rows = await adminListPriceListOperationalItems(listId)
      if (gen !== loadGenRef.current) return
      setItems(rows)
      if (opts?.keepAddOpen) {
        setAddOpen(true)
      } else if (rows.length === 0) {
        setAddOpen(true)
      }
      onItemsChanged?.()
    } catch (e) {
      if (gen !== loadGenRef.current) return
      setError(e instanceof Error ? e.message : 'Falha ao recarregar itens')
    }
  }

  function clearFilters() {
    setFilterQ('')
    setFilterQDebounced('')
    setFilterOrigin('')
    setFilterWithoutPrice(false)
  }

  async function ensureItemOnList(item: PriceListItem): Promise<string> {
    if (!isVirtualPriceListItemId(item.id)) return item.id
    await adminSyncProductsOntoPriceList({
      priceListId: listId,
      productIds: [item.productId],
    })
    const rows = await adminListPriceListOperationalItems(listId)
    const row = rows.find((i) => i.productId === item.productId && !isVirtualPriceListItemId(i.id))
    if (!row) throw new Error('Falha ao incluir item na lista')
    return row.id
  }

  async function onSavePricingEdit(result: PricingEditResult) {
    if (!pricingItem || !selectedList) return
    setRowBusy(pricingItem.id)
    setError(null)
    setInfo(null)
    try {
      const itemId = await ensureItemOnList(pricingItem)
      if (result.mode === 'apply_list_rule') {
        await adminSetPriceListItemPricing({
          itemId,
          mode: 'apply_rule',
          extraCost: result.extraCost,
        })
      } else if (result.mode === 'edit_rule_percent') {
        await adminSetCalculatedListPrice({
          priceListId: listId,
          productId: pricingItem.productId,
          price: result.price,
          extraCost: result.extraCost,
        })
      } else {
        await adminSetPriceListItemPricing({
          itemId,
          mode: 'manual',
          price: result.price,
          extraCost: result.extraCost,
        })
      }
      setPricingItem(null)
      setInfo(`Precificação atualizada na lista ${selectedList.name}.`)
      await withWindowScrollPreserved(() => reloadItems({ keepAddOpen: addOpen }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar precificação')
    } finally {
      setRowBusy(null)
    }
  }

  async function onAddItem(e: FormEvent) {
    e.preventDefault()
    if (!listId || !allowed) return
    setError(null)
    setInfo(null)

    const sku = addSku.trim()
    if (!sku) {
      setError('Informe o código (SKU)')
      focusAddSku()
      return
    }
    const priceNum = parseMoneyBr(addPrice)
    if (priceNum == null || priceNum < 0) {
      setError('Preço inválido ou negativo')
      return
    }

    const existing = items.find((i) => (i.sku ?? '').toLowerCase() === sku.toLowerCase())
    if (existing) {
      setError('Este código já está na lista. Use Editar na linha.')
      setPricingItem(existing)
      setFilterQ(sku)
      setFilterQDebounced(sku)
      setAddOpen(false)
      return
    }

    setAddBusy(true)
    try {
      const productId = await adminFindProductIdBySku(sku)
      if (!productId) {
        setError(`Código não encontrado no cadastro: ${sku}`)
        focusAddSku()
        return
      }
      await adminUpsertPriceListItem({
        priceListId: listId,
        productId,
        price: priceNum,
        source: 'manual',
        changedBy: changedBy ?? null,
      })
      setAddSku('')
      setAddPrice('')
      setInfo(`Item ${sku} adicionado à lista ${selectedList?.name ?? ''} com origem Manual.`)
      await withWindowScrollPreserved(() => reloadItems({ keepAddOpen: true }))
      focusAddSku()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao adicionar item')
    } finally {
      setAddBusy(false)
    }
  }

  if (!lists.length) {
    return (
      <div className="rounded-[14px] border border-fal-line bg-white p-4 text-sm text-fal-muted">
        Cadastre uma lista para consultar e ajustar preços.
      </div>
    )
  }

  const loadedCount = items.length
  const filteredCount = filteredItems.length
  const showingCount = visibleItems.length
  const fromIdx = showingCount === 0 ? 0 : 1
  const toIdx = showingCount

  return (
    <div className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">Consulta e ajuste de preços</h2>
        <p className="mt-1 text-sm text-fal-muted">
          Escolha a lista, filtre e edite custo adicional, margem/markup ou preço direto na linha.{' '}
          {PRICE_LIST_LAYERS_HINT}
        </p>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-xs font-extrabold text-fal-muted">Lista</span>
        <select
          className="w-full rounded-[9px] border border-fal-line px-3 py-3 font-semibold text-fal-navy"
          value={listId}
          onChange={(e) => setListId(e.target.value)}
        >
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({priceListStatusLabel(l.status)})
            </option>
          ))}
        </select>
      </label>

      <form
        className="flex flex-wrap items-start gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setFilterQDebounced(filterQ.trim())
        }}
      >
        <div className="min-w-[200px] flex-1">
          <Input
            label="Pesquisar produto"
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
            placeholder="Código, descrição ou código do fabricante…"
            hint="Vazio = todos os itens da lista (até o limite carregado). Filtros são lembrados nesta sessão."
          />
        </div>
        <Button type="submit" className="mt-[22px] shrink-0">
          Buscar
        </Button>
      </form>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[160px] text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">Origem</span>
          <select
            className="w-full rounded-[9px] border border-fal-line px-3 py-3"
            value={filterOrigin}
            onChange={(e) => setFilterOrigin(e.target.value as PriceOrigin | '')}
          >
            <option value="">Todas</option>
            <option value="calculated">Calculado</option>
            <option value="imported">Importado</option>
            <option value="manual">Manual</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2 pb-3 text-sm">
          <input
            type="checkbox"
            checked={filterWithoutPrice}
            onChange={(e) => setFilterWithoutPrice(e.target.checked)}
          />
          Sem preço
        </label>
        {hasRestrictiveFilters ? (
          <button
            type="button"
            className="pb-3 text-sm font-semibold text-fal-navy underline"
            onClick={clearFilters}
          >
            Limpar filtros
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? <p className="text-sm text-green-700">{info}</p> : null}

      {singleMatch && selectedList ? (
        <div className="rounded-[10px] border border-fal-yellow-dark/40 bg-fal-yellow/20 px-3 py-2 text-sm">
          Match único · Preço na lista <strong>{selectedList.name}</strong>:{' '}
          <strong>{formatMoney(singleMatch.price)}</strong>
          {singleMatch.sku ? <span className="text-fal-muted"> · {singleMatch.sku}</span> : null}
          <span className="text-fal-muted"> · {priceOriginLabel(singleMatch.priceOrigin)}</span>
        </div>
      ) : null}

      {loadingItems ? <Loading label="Carregando itens da lista…" /> : null}

      {!loadingItems ? (
        <div className="overflow-x-auto rounded-[10px] border border-fal-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-fal-bg text-fal-muted">
              <tr>
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Código</th>
                <th className="hidden px-3 py-2 md:table-cell">Custo + adic.</th>
                <th className="px-3 py-2">Preço</th>
                <th className="hidden px-3 py-2 sm:table-cell">Origem</th>
                <th className="px-3 py-2">Ação</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-fal-muted">
                    {items.length === 0 ? (
                      <div className="space-y-2">
                        <p>Nenhum item nesta lista.</p>
                        <div className="flex flex-wrap justify-center gap-3">
                          <button
                            type="button"
                            className="font-semibold text-fal-navy underline"
                            onClick={openAddForm}
                          >
                            Adicionar código
                          </button>
                          {onRequestImport ? (
                            <button
                              type="button"
                              className="font-semibold text-fal-navy underline"
                              onClick={onRequestImport}
                            >
                              Importar planilha
                            </button>
                          ) : null}
                          {listId ? (
                            <Link
                              className="font-semibold text-fal-navy underline"
                              to={`/admin/precos/${listId}?tab=produtos`}
                            >
                              Abrir lista completa
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p>Nenhum resultado com os filtros atuais.</p>
                        <button
                          type="button"
                          className="font-semibold text-fal-navy underline"
                          onClick={clearFilters}
                        >
                          Limpar filtros
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                visibleItems.map((item) => {
                  const busyRow = rowBusy === item.id
                  const costLabel =
                    item.costTotal != null
                      ? `${formatMoney(item.costTotal)}${
                          item.extraCost > 0 ? ` (+${formatMoney(item.extraCost)})` : ''
                        }`
                      : '—'
                  return (
                    <tr
                      key={item.id}
                      className={`border-t border-fal-line ${
                        pricingItem?.id === item.id || singleMatch?.id === item.id
                          ? 'bg-fal-yellow/20'
                          : ''
                      }`}
                    >
                      <td className="px-3 py-2">{item.productName ?? '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{item.sku ?? '—'}</td>
                      <td className="hidden px-3 py-2 text-xs md:table-cell">{costLabel}</td>
                      <td className="px-3 py-2 font-semibold">{formatMoney(item.price)}</td>
                      <td className="hidden px-3 py-2 text-xs sm:table-cell">
                        {priceOriginLabel(item.priceOrigin)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="font-semibold text-fal-navy underline disabled:opacity-50"
                          disabled={!allowed || busyRow}
                          onClick={() => setPricingItem(item)}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-fal-line px-3 py-2 text-xs text-fal-muted">
            <span>
              {filteredCount === 0
                ? `Nenhum item · ${loadedCount} carregados`
                : filteredCount > QUICK_RESULT_LIMIT
                  ? `Exibindo ${fromIdx}–${toIdx} de ${filteredCount} itens carregados`
                  : `Exibindo ${fromIdx}–${toIdx} de ${filteredCount} itens carregados`}
              {loadedCount >= 500 ? ' · limite de 500 no painel' : ''}
            </span>
            {listId ? (
              <Link
                className="font-semibold text-fal-navy underline"
                to={`/admin/precos/${listId}?tab=produtos`}
              >
                Abrir lista completa
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {!addOpen ? (
        <button
          type="button"
          className="text-sm font-semibold text-fal-navy underline"
          onClick={openAddForm}
        >
          + Adicionar código
        </button>
      ) : (
        <form
          ref={addFormRef}
          onSubmit={(e) => void onAddItem(e)}
          className="grid gap-3 rounded-[10px] border border-fal-yellow-dark bg-fal-yellow/10 p-3 ring-2 ring-fal-yellow/40 md:grid-cols-4"
        >
          <Input
            ref={addSkuInputRef}
            label="Código (SKU)"
            value={addSku}
            onChange={(e) => setAddSku(e.target.value)}
            disabled={!allowed || addBusy || loadingItems}
            hint="Produto precisa existir no cadastro."
          />
          <Input
            label="Preço de venda"
            inputMode="decimal"
            value={addPrice}
            onChange={(e) => setAddPrice(e.target.value)}
            disabled={!allowed || addBusy || loadingItems}
          />
          <div className="flex items-end gap-2 md:col-span-2">
            <Button type="submit" disabled={!allowed || addBusy || loadingItems || !listId}>
              Adicionar à lista
            </Button>
            <Button
              type="button"
              variant="light"
              onClick={() => {
                setAddOpen(false)
                setAddSku('')
                setAddPrice('')
              }}
            >
              Fechar
            </Button>
          </div>
        </form>
      )}

      <PriceItemPricingModal
        open={pricingItem != null}
        item={pricingItem}
        list={selectedList}
        busy={rowBusy != null}
        onClose={() => setPricingItem(null)}
        onSave={onSavePricingEdit}
      />
    </div>
  )
}
