import { PriceListConfigTab } from '@/components/admin/prices/PriceListConfigTab'
import { PriceListFormacaoTab } from '@/components/admin/prices/PriceListFormacaoTab'
import { PriceListImportsTab } from '@/components/admin/prices/PriceListImportsTab'
import { PriceListProductsTab } from '@/components/admin/prices/PriceListProductsTab'
import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import { datetimeLocalToIso, isoToDatetimeLocal } from '@/lib/datetime'
import {
  PRICE_LIST_LAYERS_HINT,
  PRICE_ORIGIN_VS_METHOD_HINT,
  priceOriginLabel,
} from '@/lib/priceLabels'
import { SKU_FAL_LABEL } from '@/lib/productLabels'
import { formatMoney, parseMoneyBr } from '@/lib/money'
import { PriceImportWizard } from '@/pages/admin/prices/PriceImportWizard'
import {
  PriceItemPricingModal,
  type PricingEditResult,
} from '@/pages/admin/prices/PriceItemPricingModal'
import { adminListActiveOverrideProductIds } from '@/services/admin/adminPriceOverrideService'
import {
  adminAdjustAllPriceListItems,
  adminDeletePriceListItem,
  adminFindProductIdBySku,
  adminGetImportDetail,
  adminGetPriceList,
  adminGetPriceListStats,
  adminListPriceListImports,
  adminListPriceListOperationalItems,
  adminListPriceLists,
  adminMaterializePublishedOntoPriceList,
  adminRecalculatePriceListItems,
  adminSetCalculatedListPrice,
  adminSetPriceListItemPricing,
  withWindowScrollPreserved,
  adminSetPriceListPricingRule,
  adminSaveListExtraCostPercent,
  adminSyncProductsOntoPriceList,
  adminUpsertPriceList,
  adminUpsertPriceListItem,
  buildPriceListItemsCsv,
  filterPriceListItems,
  isVirtualPriceListItemId,
  priceListStatusLabel,
  pricingMethodLabel,
  pricingRuleLabel,
  sortPriceListItems,
  type PriceAdjustMode,
  type PriceList,
  type PriceListImportDetail,
  type PriceListImportSummary,
  type PriceListItem,
  type PriceListItemSortKey,
  type PriceListScope,
  type PriceListStats,
  type PriceListStatus,
  type PriceOrigin,
} from '@/services/admin/adminPriceListService'
import { adminListSuppliers } from '@/services/admin/adminSupplierService'
import type { PricingMethod } from '@/services/pricing/pricingFormulas'
import type { Supplier } from '@/types'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

type Tab = 'produtos' | 'formacao' | 'importacoes' | 'config'

const TAB_VALUES: Tab[] = ['produtos', 'formacao', 'importacoes', 'config']
const DETAIL_FILTERS_KEY = 'fal.priceListDetail.filters'

type StoredDetailFilters = {
  q?: string
  origin?: PriceOrigin | ''
  withoutCost?: boolean
  withoutPrice?: boolean
  onlyCalculated?: boolean
  withOverride?: boolean
  supplierId?: string
  sortKey?: PriceListItemSortKey
  sortAsc?: boolean
}

function parseTab(raw: string | null): Tab {
  if (raw && (TAB_VALUES as string[]).includes(raw)) return raw as Tab
  return 'produtos'
}
type SortState = { key: PriceListItemSortKey; asc: boolean }

function detailFiltersKey(listId: string) {
  return `${DETAIL_FILTERS_KEY}.${listId}`
}

function readDetailFilters(listId: string): StoredDetailFilters {
  try {
    const raw = sessionStorage.getItem(detailFiltersKey(listId))
    if (!raw) return {}
    return JSON.parse(raw) as StoredDetailFilters
  } catch {
    return {}
  }
}

function canManagePricing(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

export function AdminPriceListDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const toast = useToast()
  const allowed = canManagePricing(user?.role)

  const [tab, setTab] = useState<Tab>(() => parseTab(searchParams.get('tab')))
  const [wizardOpen, setWizardOpen] = useState(false)
  const [list, setList] = useState<PriceList | null>(null)
  useDocumentTitle(
    list?.name?.trim()
      ? `${list.name.trim().slice(0, 48)} | Admin FAL`
      : 'Lista de preços | Admin FAL',
  )
  const [allLists, setAllLists] = useState<PriceList[]>([])
  const [items, setItems] = useState<PriceListItem[]>([])
  const [stats, setStats] = useState<PriceListStats | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [imports, setImports] = useState<PriceListImportSummary[]>([])
  const [importDetail, setImportDetail] = useState<PriceListImportDetail | null>(null)
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function pushError(msg: string) {
    setError(msg)
    toast.push(msg, 'error')
  }

  function pushOk(msg: string) {
    toast.push(msg, 'success')
  }
  const [pricingItem, setPricingItem] = useState<PriceListItem | null>(null)
  const [rowBusy, setRowBusy] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkPrice, setBulkPrice] = useState('')

  const [adjustMode, setAdjustMode] = useState<PriceAdjustMode>('percent')
  const [adjustDirection, setAdjustDirection] = useState<'up' | 'down'>('up')
  const [adjustValue, setAdjustValue] = useState('')
  const [ruleMethod, setRuleMethod] = useState<PricingMethod>('fixed')
  const [rulePercent, setRulePercent] = useState('0')
  const [ruleExtraCostPercent, setRuleExtraCostPercent] = useState('0')

  const [cfgName, setCfgName] = useState('')
  const [cfgDescription, setCfgDescription] = useState('')
  const [cfgStatus, setCfgStatus] = useState<PriceListStatus>('draft')
  const [cfgScope, setCfgScope] = useState<PriceListScope>('public')
  const [cfgPriority, setCfgPriority] = useState('0')
  const [cfgDefault, setCfgDefault] = useState(false)
  const [cfgValidFrom, setCfgValidFrom] = useState('')
  const [cfgValidUntil, setCfgValidUntil] = useState('')

  const initialFilters = id ? readDetailFilters(id) : {}
  const [filterQ, setFilterQ] = useState(initialFilters.q ?? '')
  const [filterQDebounced, setFilterQDebounced] = useState(initialFilters.q ?? '')
  const [filterOrigin, setFilterOrigin] = useState<PriceOrigin | ''>(initialFilters.origin ?? '')
  const [filterWithoutCost, setFilterWithoutCost] = useState(Boolean(initialFilters.withoutCost))
  const [filterWithoutPrice, setFilterWithoutPrice] = useState(Boolean(initialFilters.withoutPrice))
  const [filterOnlyCalculated, setFilterOnlyCalculated] = useState(
    Boolean(initialFilters.onlyCalculated),
  )
  const [filterWithOverride, setFilterWithOverride] = useState(Boolean(initialFilters.withOverride))
  const [filterSupplierId, setFilterSupplierId] = useState(initialFilters.supplierId ?? '')
  const [sort, setSort] = useState<SortState>({
    key: initialFilters.sortKey ?? 'updatedAt',
    asc: initialFilters.sortAsc ?? false,
  })

  function selectTab(next: Tab) {
    setTab(next)
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'produtos') p.delete('tab')
        else p.set('tab', next)
        return p
      },
      { replace: true },
    )
  }

  function onChangePriceList(nextId: string) {
    if (!nextId || nextId === id) return
    const tabQs = tab === 'produtos' ? '' : `?tab=${tab}`
    navigate(`/admin/precos/${nextId}${tabQs}`)
  }

  function applyStoredFilters(listId: string) {
    const stored = readDetailFilters(listId)
    setFilterQ(stored.q ?? '')
    setFilterQDebounced(stored.q ?? '')
    setFilterOrigin(stored.origin ?? '')
    setFilterWithoutCost(Boolean(stored.withoutCost))
    setFilterWithoutPrice(Boolean(stored.withoutPrice))
    setFilterOnlyCalculated(Boolean(stored.onlyCalculated))
    setFilterWithOverride(Boolean(stored.withOverride))
    setFilterSupplierId(stored.supplierId ?? '')
    setSort({
      key: stored.sortKey ?? 'updatedAt',
      asc: stored.sortAsc ?? false,
    })
  }

  function clearFilters() {
    setFilterQ('')
    setFilterQDebounced('')
    setFilterOrigin('')
    setFilterWithoutCost(false)
    setFilterWithoutPrice(false)
    setFilterOnlyCalculated(false)
    setFilterWithOverride(false)
    setFilterSupplierId('')
  }

  function resetUiForListChange() {
    setList(null)
    setItems([])
    setStats(null)
    if (id) applyStoredFilters(id)
    else clearFilters()
    setSelectedIds(new Set())
    setPricingItem(null)
    setBulkPrice('')
    setSku('')
    setPrice('')
    setAdjustValue('')
    setRuleExtraCostPercent('0')
    setImportDetail(null)
  }

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [l, its, st, sups, imps, lists] = await Promise.all([
        adminGetPriceList(id),
        adminListPriceListOperationalItems(id),
        adminGetPriceListStats(id),
        adminListSuppliers(),
        adminListPriceListImports(id),
        adminListPriceLists(),
      ])
      const overrideIds = await adminListActiveOverrideProductIds(its.map((i) => i.productId))
      setList(l)
      setAllLists(lists)
      setItems(its.map((i) => ({ ...i, hasOverride: overrideIds.has(i.productId) })))
      setStats(st)
      setSuppliers(sups.filter((s) => s.status === 'active'))
      setImports(imps)
      setSelectedIds(new Set())
      if (l) {
        setRuleMethod(l.pricingMethod)
        setRulePercent(String(l.pricingPercent))
        setRuleExtraCostPercent(String(l.listExtraCostPercent ?? 0))
        setCfgName(l.name)
        setCfgDescription(l.description ?? '')
        setCfgStatus(l.status)
        setCfgScope(l.scope)
        setCfgPriority(String(l.priority))
        setCfgDefault(l.isDefault)
        setCfgValidFrom(isoToDatetimeLocal(l.validFrom))
        setCfgValidUntil(isoToDatetimeLocal(l.validUntil))
      }
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao carregar'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    resetUiForListChange()
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    setTab(parseTab(searchParams.get('tab')))
  }, [searchParams])

  useEffect(() => {
    const t = window.setTimeout(() => setFilterQDebounced(filterQ), 200)
    return () => window.clearTimeout(t)
  }, [filterQ])

  useEffect(() => {
    if (!id) return
    sessionStorage.setItem(
      detailFiltersKey(id),
      JSON.stringify({
        q: filterQDebounced,
        origin: filterOrigin,
        withoutCost: filterWithoutCost,
        withoutPrice: filterWithoutPrice,
        onlyCalculated: filterOnlyCalculated,
        withOverride: filterWithOverride,
        supplierId: filterSupplierId,
        sortKey: sort.key,
        sortAsc: sort.asc,
      } satisfies StoredDetailFilters),
    )
  }, [
    id,
    filterQDebounced,
    filterOrigin,
    filterWithoutCost,
    filterWithoutPrice,
    filterOnlyCalculated,
    filterWithOverride,
    filterSupplierId,
    sort.key,
    sort.asc,
  ])

  const visibleItems = useMemo(() => {
    const filtered = filterPriceListItems(items, {
      q: filterQDebounced,
      origin: filterOrigin,
      withoutCost: filterWithoutCost,
      withoutPrice: filterWithoutPrice,
      onlyCalculated: filterOnlyCalculated,
      withOverride: filterWithOverride,
      supplierId: filterSupplierId,
    })
    return sortPriceListItems(filtered, sort.key, sort.asc)
  }, [
    items,
    filterQDebounced,
    filterOrigin,
    filterWithoutCost,
    filterWithoutPrice,
    filterOnlyCalculated,
    filterWithOverride,
    filterSupplierId,
    sort,
  ])

  const singleMatch =
    filterQDebounced.trim() && visibleItems.length === 1 ? visibleItems[0] : null

  const suppliersInList = useMemo(() => {
    const ids = new Set(items.map((i) => i.supplierId).filter(Boolean) as string[])
    return suppliers.filter((s) => ids.has(s.id))
  }, [items, suppliers])

  const selectedItems = useMemo(
    () => visibleItems.filter((i) => selectedIds.has(i.id)),
    [visibleItems, selectedIds],
  )

  const allVisibleSelected =
    visibleItems.length > 0 && visibleItems.every((i) => selectedIds.has(i.id))

  function toggleSort(key: PriceListItemSortKey) {
    setSort((prev) =>
      prev.key === key ? { key, asc: !prev.asc } : { key, asc: key === 'sku' || key === 'description' },
    )
  }

  function sortMark(key: PriceListItemSortKey): string {
    if (sort.key !== key) return ''
    return sort.asc ? ' ↑' : ' ↓'
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(visibleItems.map((i) => i.id)))
  }

  function toggleSelectOne(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  async function onAddItem(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const productId = await adminFindProductIdBySku(sku)
      if (!productId) throw new Error(`${SKU_FAL_LABEL} não encontrado: ${sku}`)
      const priceNum = parseMoneyBr(price)
      if (priceNum == null || priceNum < 0) throw new Error('Preço inválido')
      await adminUpsertPriceListItem({
        priceListId: id,
        productId,
        price: priceNum,
        source: 'manual',
        changedBy: user?.id ?? null,
      })
      setSku('')
      setPrice('')
      await reload()
      pushOk('Item salvo na lista.')
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao salvar item'))
    }
  }

  async function ensureItemOnList(item: PriceListItem): Promise<string> {
    if (!isVirtualPriceListItemId(item.id)) return item.id
    await adminSyncProductsOntoPriceList({
      priceListId: id,
      productIds: [item.productId],
    })
    const fresh = await adminListPriceListOperationalItems(id)
    const row = fresh.find((i) => i.productId === item.productId && !isVirtualPriceListItemId(i.id))
    if (!row) throw new Error('Falha ao incluir item na lista')
    return row.id
  }

  async function reloadQuiet() {
    setError(null)
    try {
      const [l, its, st, sups, imps, lists] = await Promise.all([
        adminGetPriceList(id),
        adminListPriceListOperationalItems(id),
        adminGetPriceListStats(id),
        adminListSuppliers(),
        adminListPriceListImports(id),
        adminListPriceLists(),
      ])
      const overrideIds = await adminListActiveOverrideProductIds(its.map((i) => i.productId))
      setList(l)
      setAllLists(lists)
      setItems(its.map((i) => ({ ...i, hasOverride: overrideIds.has(i.productId) })))
      setStats(st)
      setSuppliers(sups.filter((s) => s.status === 'active'))
      setImports(imps)
      if (l) {
        setRuleMethod(l.pricingMethod)
        setRulePercent(String(l.pricingPercent))
        setRuleExtraCostPercent(String(l.listExtraCostPercent ?? 0))
      }
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao recarregar'))
    }
  }

  async function onSavePricingEdit(result: PricingEditResult) {
    if (!pricingItem) return
    setRowBusy(pricingItem.id)
    setError(null)
    try {
      const itemId = await ensureItemOnList(pricingItem)
      if (result.mode === 'apply_list_rule') {
        await adminSetPriceListItemPricing({
          itemId,
          mode: 'apply_rule',
          extraCost: result.extraCost,
        })
      } else if (result.mode === 'edit_rule_percent') {
        void itemId
        await adminSetCalculatedListPrice({
          priceListId: id,
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
      await withWindowScrollPreserved(() => reloadQuiet())
      pushOk('Precificação atualizada.')
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao salvar precificação'))
    } finally {
      setRowBusy(null)
    }
  }

  async function removeItem(itemId: string) {
    if (isVirtualPriceListItemId(itemId)) {
      pushError('Item ainda não está na lista — nada a remover')
      return
    }
    const { confirmed: okRemove } = await confirmDialog({
      title: 'Remover item?',
      message: 'Remover este item da lista?',
      confirmLabel: 'Remover',
      danger: true,
    })
    if (!okRemove) return
    setRowBusy(itemId)
    try {
      await adminDeletePriceListItem(itemId)
      await withWindowScrollPreserved(() => reloadQuiet())
      pushOk('Item removido da lista.')
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao remover'))
    } finally {
      setRowBusy(null)
    }
  }

  async function onBulkRemove() {
    const real = selectedItems.filter((i) => !isVirtualPriceListItemId(i.id))
    if (!real.length) {
      pushError('Seleção só tem itens ainda fora da lista — nada a remover')
      return
    }
    const { confirmed: okBulkRemove } = await confirmDialog({
      title: 'Remover itens?',
      message: `Remover ${real.length} item(ns) da lista?`,
      confirmLabel: 'Remover',
      danger: true,
    })
    if (!okBulkRemove) return
    setBusy(true)
    try {
      for (const item of real) {
        await adminDeletePriceListItem(item.id)
      }
      await reload()
      pushOk(`${real.length} item(ns) removido(s).`)
    } catch (err) {
      pushError(toUserMessage(err, 'Falha na remoção em massa'))
    } finally {
      setBusy(false)
    }
  }

  async function onBulkApplyRule() {
    if (!selectedItems.length) return
    const { confirmed: okRule } = await confirmDialog({
      title: 'Aplicar regra de formação?',
      message:
        `Incluir (se necessário) e calcular venda pela regra em ${selectedItems.length} item(ns)?\n` +
        `Origem ${priceOriginLabel('calculated')}. Itens ${priceOriginLabel('imported')} ou ${priceOriginLabel('manual')} na seleção passam a ${priceOriginLabel('calculated')}.`,
      confirmLabel: 'Aplicar',
    })
    if (!okRule) return
    setBusy(true)
    try {
      const virtualIds = selectedItems
        .filter((i) => isVirtualPriceListItemId(i.id))
        .map((i) => i.productId)
      if (virtualIds.length) {
        await adminSyncProductsOntoPriceList({ priceListId: id, productIds: virtualIds })
      }
      // Recarrega IDs reais após sync
      const fresh = await adminListPriceListOperationalItems(id)
      const byProduct = new Map(fresh.map((i) => [i.productId, i]))
      for (const sel of selectedItems) {
        const item = byProduct.get(sel.productId)
        if (!item || isVirtualPriceListItemId(item.id)) continue
        await adminSetPriceListItemPricing({
          itemId: item.id,
          mode: 'apply_rule',
          extraCost: item.extraCost,
        })
      }
      await reload()
      pushOk(`Regra aplicada em ${selectedItems.length} item(ns).`)
    } catch (err) {
      pushError(toUserMessage(err, 'Falha no recálculo da seleção'))
    } finally {
      setBusy(false)
    }
  }

  async function onBulkSetPrice() {
    const priceNum = parseMoneyBr(bulkPrice)
    if (priceNum == null || priceNum < 0) {
      pushError('Preço em massa inválido')
      return
    }
    if (!selectedItems.length) return
    {
      const { confirmed: okManual } = await confirmDialog({
        title: 'Definir preço manual?',
        message: `Definir preço ${priceOriginLabel('manual')} ${formatMoney(priceNum)} em ${selectedItems.length} item(ns)?`,
        confirmLabel: 'Definir',
      })
      if (!okManual) return
    }
    setBusy(true)
    try {
      const virtualIds = selectedItems
        .filter((i) => isVirtualPriceListItemId(i.id))
        .map((i) => i.productId)
      if (virtualIds.length) {
        await adminSyncProductsOntoPriceList({ priceListId: id, productIds: virtualIds })
      }
      const fresh = await adminListPriceListOperationalItems(id)
      const byProduct = new Map(fresh.map((i) => [i.productId, i]))
      for (const sel of selectedItems) {
        const item = byProduct.get(sel.productId)
        if (!item || isVirtualPriceListItemId(item.id)) {
          await adminUpsertPriceListItem({
            priceListId: id,
            productId: sel.productId,
            price: priceNum,
            source: 'manual',
            changedBy: user?.id ?? null,
          })
          continue
        }
        await adminSetPriceListItemPricing({ itemId: item.id, mode: 'manual', price: priceNum })
      }
      setBulkPrice('')
      await reload()
      pushOk(`Preço manual definido em ${selectedItems.length} item(ns).`)
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao alterar preços'))
    } finally {
      setBusy(false)
    }
  }

  function onExportSelected() {
    const csv = buildPriceListItemsCsv(selectedItems.length ? selectedItems : visibleItems)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lista-preco-${list?.slug ?? id}-export.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function persistRuleOnly(): Promise<string> {
    const pct = Number(String(rulePercent).replace(',', '.'))
    if (!Number.isFinite(pct) || pct < 0) throw new Error('Percentual inválido')
    if (ruleMethod === 'margin_on_sell' && pct >= 100) {
      throw new Error('Margem sobre venda deve ser menor que 100%')
    }
    const extraPct = Number(String(ruleExtraCostPercent).replace(',', '.'))
    let extraMsg = ''
    if (Number.isFinite(extraPct) && extraPct >= 0) {
      const extra = await adminSaveListExtraCostPercent(id, extraPct)
      if (extra.pendingMigration) {
        extraMsg =
          ' Adicional de custo (%) não gravado neste ambiente. Adicional em R$ inalterado.'
      } else if (extra.saved) {
        extraMsg = ` Adicional de custo: ${extraPct}%.`
      }
    }
    await adminSetPriceListPricingRule({
      priceListId: id,
      pricingMethod: ruleMethod,
      pricingPercent: pct,
      recalculate: false,
    })
    return extraMsg
  }

  /** Salva margem/adicional sem alterar preços de venda. */
  async function onSaveRuleKeepPrices() {
    if (!allowed) return
    setBusy(true)
    setError(null)
    try {
      const extraMsg = await persistRuleOnly()
      const msg = `Regra salva (${pricingMethodLabel(ruleMethod)} ${rulePercent}%). Preços de venda NÃO foram alterados.${extraMsg}`
      pushOk(msg)
      await reload()
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao salvar regra'))
    } finally {
      setBusy(false)
    }
  }

  /**
   * Salva regra, materializa published com custo na lista (calculated/0),
   * e recalcula venda dos CALCULATED.
   */
  async function onApplyMarginToSell() {
    if (!allowed) return
    if (ruleMethod === 'fixed') {
      pushError('Lista em modo fixo — não há formação por margem/markup')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const extraMsg = await persistRuleOnly()
      const sync = await adminMaterializePublishedOntoPriceList({
        priceListId: id,
        onlyWithPrincipalCost: true,
      })
      const dry = await adminRecalculatePriceListItems({ priceListId: id, dryRun: true })
      if (dry.message) {
        const msg = dry.message + extraMsg
        pushOk(msg)
        await reload()
        return
      }
      const { confirmed: okMargin } = await confirmDialog({
        title: 'Aplicar margem?',
        message:
          `Aplicar margem → atualizar preço de venda?\n` +
          `Novos na lista (com custo): ${sync.created}\n` +
          `Atualizar ${priceOriginLabel('calculated')}: ${dry.wouldUpdate}\n` +
          `${priceOriginLabel('manual')}: ${dry.skippedManual} · ${priceOriginLabel('imported')}: ${dry.skippedImported} · Sem custo: ${dry.skippedNoCost}\n` +
          `${priceOriginLabel('imported')} e ${priceOriginLabel('manual')} não mudam o preço de venda.`,
        confirmLabel: 'Aplicar',
      })
      if (!okMargin) {
        const cancelMsg = `Regra salva; aplicação de venda cancelada. Incluídos na lista: ${sync.created}.${extraMsg}`
        pushOk(cancelMsg)
        await reload()
        return
      }
      const applied = await adminRecalculatePriceListItems({ priceListId: id, dryRun: false })
      const applyMsg =
        `Margem aplicada. Venda atualizada: ${applied.updated}. ` +
        `Incluídos na lista: ${sync.created}. ${priceOriginLabel('manual')}: ${applied.skippedManual}; ${priceOriginLabel('imported')}: ${applied.skippedImported}.${extraMsg}`
      pushOk(applyMsg)
      await reload()
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao aplicar margem'))
    } finally {
      setBusy(false)
    }
  }

  async function onApplyGlobalAdjust() {
    const raw =
      adjustMode === 'percent'
        ? Number(String(adjustValue).replace(',', '.'))
        : parseMoneyBr(adjustValue)
    if (raw == null || Number.isNaN(raw) || raw === 0) {
      pushError('Informe um valor de ajuste diferente de zero')
      return
    }
    const signed = adjustDirection === 'down' ? -Math.abs(raw) : Math.abs(raw)
    const { confirmed: okAdjust } = await confirmDialog({
      title: 'Ajuste global de preços?',
      message: `Ajuste global (lista inteira, ${items.length} itens) — não é formação custo+margem. Continuar?`,
      confirmLabel: 'Continuar',
      danger: true,
    })
    if (!okAdjust) return
    setBusy(true)
    try {
      const result = await adminAdjustAllPriceListItems({
        priceListId: id,
        mode: adjustMode,
        value: signed,
        changedBy: user?.id ?? null,
      })
      const adjMsg = `Atualizados: ${result.updated}. Sem mudança: ${result.skipped}.`
      pushOk(adjMsg)
      setAdjustValue('')
      await reload()
    } catch (err) {
      pushError(toUserMessage(err, 'Falha no ajuste global'))
    } finally {
      setBusy(false)
    }
  }

  async function onSaveConfig(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await adminUpsertPriceList({
        id,
        name: cfgName,
        description: cfgDescription,
        status: cfgStatus,
        scope: cfgScope,
        priority: Number(cfgPriority) || 0,
        isDefault: cfgDefault,
        validFrom: datetimeLocalToIso(cfgValidFrom),
        validUntil: datetimeLocalToIso(cfgValidUntil),
        slug: list?.slug,
        pricingMethod: list?.pricingMethod,
        pricingPercent: list?.pricingPercent,
      })
      pushOk('Configuração salva.')
      await reload()
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao salvar configuração'))
    } finally {
      setBusy(false)
    }
  }

  async function openImportDetail(importId: string) {
    try {
      setImportDetail(await adminGetImportDetail(importId))
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao abrir importação'))
    }
  }

  if (loading && !list) return <Loading label="Carregando lista…" />
  if (!list)
    return (
      <div className="space-y-3">
        <p className="text-red-600">Lista não encontrada.</p>
        <Link className="font-semibold text-fal-navy underline" to="/admin/precos">
          ← Voltar às listas de preços
        </Link>
      </div>
    )

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'produtos', label: 'Produtos' },
    { id: 'formacao', label: 'Formação de preço' },
    { id: 'importacoes', label: 'Importações' },
    { id: 'config', label: 'Configuração' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block min-w-[240px] flex-1 text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Lista de preços</span>
              <select
                className="w-full rounded-[9px] border border-fal-line bg-white px-3 py-3 font-semibold text-fal-navy"
                value={id}
                onChange={(e) => onChangePriceList(e.target.value)}
              >
                {allLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({priceListStatusLabel(l.status)})
                  </option>
                ))}
              </select>
            </label>
            <div>
              <h1 className="text-2xl font-extrabold text-fal-navy">{list.name}</h1>
              <p className="text-sm text-fal-muted">
                {priceListStatusLabel(list.status)} · {pricingMethodLabel(list.pricingMethod)}{' '}
                {pricingRuleLabel(list.pricingMethod, list.pricingPercent)} · {list.slug}
              </p>
            </div>
          </div>
          <p className="mt-1 text-xs text-fal-muted">
            {PRICE_LIST_LAYERS_HINT} {PRICE_ORIGIN_VS_METHOD_HINT}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={!allowed} onClick={() => setWizardOpen(true)}>
            Importar custos / preços
          </Button>
          <Button type="button" variant="light" onClick={() => selectTab('formacao')}>
            Ações da lista
          </Button>
          <Button type="button" variant="light" onClick={onExportSelected}>
            Exportar
          </Button>
          <Button type="button" variant="light" onClick={() => selectTab('config')}>
            Configurar
          </Button>
        </div>
      </div>

      {stats ? (
        <div className="grid gap-2 rounded-[14px] border border-fal-line bg-white p-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Calculado" value={stats.calculated} />
          <StatCard label="Importado" value={stats.imported} />
          <StatCard label="Manual" value={stats.manual} />
          <StatCard label="Sem custo" value={stats.withoutCost} warn={stats.withoutCost > 0} />
          <StatCard
            label="Sem preço"
            value={stats.withoutPrice}
            warn={stats.withoutPrice > 0}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-fal-line pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              tab === t.id ? 'bg-fal-navy text-white' : 'bg-fal-bg text-fal-navy'
            }`}
            onClick={() => selectTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {tab === 'produtos' ? (
        <PriceListProductsTab
          list={list}
          items={items}
          visibleItems={visibleItems}
          selectedItems={selectedItems}
          selectedIds={selectedIds}
          singleMatch={singleMatch}
          allVisibleSelected={allVisibleSelected}
          allowed={allowed}
          busy={busy}
          rowBusy={rowBusy}
          sku={sku}
          price={price}
          bulkPrice={bulkPrice}
          filterQ={filterQ}
          filterQDebounced={filterQDebounced}
          filterOrigin={filterOrigin}
          filterWithoutCost={filterWithoutCost}
          filterWithoutPrice={filterWithoutPrice}
          filterOnlyCalculated={filterOnlyCalculated}
          filterWithOverride={filterWithOverride}
          filterSupplierId={filterSupplierId}
          suppliersInList={suppliersInList}
          onSku={setSku}
          onPrice={setPrice}
          onBulkPrice={setBulkPrice}
          onFilterQ={setFilterQ}
          onFilterQDebounced={setFilterQDebounced}
          onFilterOrigin={setFilterOrigin}
          onFilterWithoutCost={setFilterWithoutCost}
          onFilterWithoutPrice={setFilterWithoutPrice}
          onFilterOnlyCalculated={setFilterOnlyCalculated}
          onFilterWithOverride={setFilterWithOverride}
          onFilterSupplierId={setFilterSupplierId}
          onClearFilters={clearFilters}
          onAddItem={(e) => void onAddItem(e)}
          onBulkApplyRule={() => void onBulkApplyRule()}
          onExportSelected={onExportSelected}
          onBulkSetPrice={() => void onBulkSetPrice()}
          onBulkRemove={() => void onBulkRemove()}
          onToggleSort={toggleSort}
          sortMark={sortMark}
          onToggleSelectAllVisible={toggleSelectAllVisible}
          onToggleSelectOne={toggleSelectOne}
          onEditItem={setPricingItem}
          onRemoveItem={(itemId) => void removeItem(itemId)}
        />
      ) : null}

      {tab === 'formacao' ? (
        <PriceListFormacaoTab
          list={list}
          items={items}
          allowed={allowed}
          busy={busy}
          ruleMethod={ruleMethod}
          rulePercent={rulePercent}
          ruleExtraCostPercent={ruleExtraCostPercent}
          adjustMode={adjustMode}
          adjustDirection={adjustDirection}
          adjustValue={adjustValue}
          onRuleMethod={setRuleMethod}
          onRulePercent={setRulePercent}
          onRuleExtraCostPercent={setRuleExtraCostPercent}
          onAdjustMode={setAdjustMode}
          onAdjustDirection={setAdjustDirection}
          onAdjustValue={setAdjustValue}
          onSaveRuleKeepPrices={() => void onSaveRuleKeepPrices()}
          onApplyMarginToSell={() => void onApplyMarginToSell()}
          onApplyGlobalAdjust={() => void onApplyGlobalAdjust()}
        />
      ) : null}

      {tab === 'importacoes' ? (
        <PriceListImportsTab
          allowed={allowed}
          imports={imports}
          importDetail={importDetail}
          onOpenWizard={() => setWizardOpen(true)}
          onOpenDetail={(importId) => void openImportDetail(importId)}
          onCloseDetail={() => setImportDetail(null)}
        />
      ) : null}

      {tab === 'config' ? (
        <PriceListConfigTab
          busy={busy}
          cfgName={cfgName}
          cfgDescription={cfgDescription}
          cfgStatus={cfgStatus}
          cfgScope={cfgScope}
          cfgPriority={cfgPriority}
          cfgDefault={cfgDefault}
          cfgValidFrom={cfgValidFrom}
          cfgValidUntil={cfgValidUntil}
          onCfgName={setCfgName}
          onCfgDescription={setCfgDescription}
          onCfgStatus={setCfgStatus}
          onCfgScope={setCfgScope}
          onCfgPriority={setCfgPriority}
          onCfgDefault={setCfgDefault}
          onCfgValidFrom={setCfgValidFrom}
          onCfgValidUntil={setCfgValidUntil}
          onSubmit={(e) => void onSaveConfig(e)}
        />
      ) : null}

      <PriceItemPricingModal
        open={pricingItem != null}
        item={pricingItem}
        list={list}
        busy={rowBusy != null}
        onClose={() => setPricingItem(null)}
        onSave={onSavePricingEdit}
      />

      <PriceImportWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        initialPriceListId={id}
        createdBy={user?.id ?? null}
        allowed={allowed}
        onApplied={() => {
          setFilterQ('')
          setFilterQDebounced('')
          setFilterOrigin('')
          setFilterWithoutCost(false)
          setFilterWithoutPrice(false)
          setFilterOnlyCalculated(false)
          setFilterWithOverride(false)
          setFilterSupplierId('')
          selectTab('produtos')
          void reload()
        }}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  warn,
}: {
  label: string
  value: number
  warn?: boolean
}) {
  return (
    <div className="rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-fal-muted">{label}</div>
      <div className={`text-xl font-extrabold ${warn ? 'text-amber-800' : 'text-fal-navy'}`}>
        {value}
      </div>
    </div>
  )
}
