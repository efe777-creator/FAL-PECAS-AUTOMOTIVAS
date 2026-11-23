import { ProductApplicationsEditor } from '@/components/admin/applications/ProductApplicationsEditor'
import {
  CategoryCascadeSelects,
  effectiveCategoryId,
  type CategoryCascadeValue,
} from '@/components/admin/CategoryCascadeSelects'
import { Button, buttonClassName } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { productStatusLabel } from '@/lib/adminLabels'
import { KITS_OPEN_GUIDE_KEY, setGuideBridge } from '@/lib/adminGuideBridges'
import { formatMoney } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import { adminPrimaryImageUrlMap } from '@/services/admin/adminImageService'
import {
  adminListKitsUsingProduct,
  type AdminKitUsageRow,
} from '@/services/admin/adminProductKitService'
import { adminListProductRelated, type AdminRelatedRow } from '@/services/admin/adminProductRelatedService'
import {
  adminBulkSetProductCategory,
  adminListApplications,
  adminUpsertProduct,
} from '@/services/admin/adminProductService'
import {
  PriceItemPricingModal,
  type PricingEditResult,
} from '@/pages/admin/prices/PriceItemPricingModal'
import {
  adminEnsureProductOnPriceList,
  adminGetProductPricingRows,
  adminSetCalculatedListPrice,
  adminSetPriceListItemPricing,
  isVirtualPriceListItemId,
  PRICE_LIST_BASE_ID,
  priceListStatusLabel,
  type PriceList,
  type PriceListItem,
  type ProductPricingRow,
} from '@/services/admin/adminPriceListService'
import type { Category, Product } from '@/types'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

/** Persistência do mini-menu ativo (G1 — um painel por vez). */
export const PRODUCT_GUIDE_MENU_KEY = 'fal.products.guideMenu'

/** Re-export — hubs/kits e antiregress importam daqui ou de `adminGuideBridges`. */
export { KITS_OPEN_GUIDE_KEY }

export type ProductGuideMenuId =
  | 'identidade'
  | 'categoria'
  | 'precos'
  | 'aplicacoes'
  | 'kits'
  | 'relacionados'

const GUIDE_MENUS: { id: ProductGuideMenuId; label: string }[] = [
  { id: 'identidade', label: 'Identidade' },
  { id: 'categoria', label: 'Categoria' },
  { id: 'precos', label: 'Preços' },
  { id: 'aplicacoes', label: 'Aplicações' },
  { id: 'kits', label: 'Kits' },
  { id: 'relacionados', label: 'Relacionados' },
]

const GUIDE_MENU_IDS = new Set(GUIDE_MENUS.map((m) => m.id))

type Props = {
  focused: Product | null
  bulkPanel: ReactNode | null
  onClose: () => void
  busy?: boolean
  categories?: Category[]
  onLiberar?: (product: Product) => void
  onSetAvailable?: (product: Product, available: boolean) => void
  onArchiveToggle?: (product: Product) => void
  /** Após mutação na guia — recarrega lista/hub. */
  onProductUpdated?: (product: Product) => void
  /** Empilha outro SKU na guia (relacionados). */
  onOpenProductGuide?: (productId: string) => void
}

/** Normaliza acentos para ?section= (ex.: Aplicações → aplicacoes). */
function normalizeGuideSectionKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function parseProductGuideSectionParam(
  raw: string | null | undefined,
): ProductGuideMenuId | null {
  const v = normalizeGuideSectionKey(raw ?? '')
  if (!v) return null
  if (v === 'preco' || v === 'precos') return 'precos'
  if (GUIDE_MENU_IDS.has(v as ProductGuideMenuId)) return v as ProductGuideMenuId
  return null
}

function readStoredGuideMenu(): ProductGuideMenuId {
  try {
    const raw = sessionStorage.getItem(PRODUCT_GUIDE_MENU_KEY)?.trim()
    const parsed = parseProductGuideSectionParam(raw)
    if (parsed) return parsed
  } catch {
    /* ignore */
  }
  return 'identidade'
}

function persistGuideMenu(id: ProductGuideMenuId) {
  try {
    sessionStorage.setItem(PRODUCT_GUIDE_MENU_KEY, id)
  } catch {
    /* ignore */
  }
}

function cascadeFromLeaf(
  categories: Category[],
  leafId: string | undefined,
): CategoryCascadeValue {
  if (!leafId) return { categoriaId: '', grupoId: '', subgrupoId: '' }
  const byId = new Map(categories.map((c) => [c.id, c]))
  const path: string[] = []
  let cur: string | null = leafId
  while (cur) {
    path.unshift(cur)
    cur = byId.get(cur)?.parentId ?? null
  }
  return {
    categoriaId: path[0] ?? '',
    grupoId: path[1] ?? '',
    subgrupoId: path[2] ?? '',
  }
}

/**
 * Superfície contextual do hub Produtos (padrão Adaptive Central).
 * G1: mini-menus (um painel ativo) — identidade, categoria, preços, apps, kits, relacionados.
 */
export function ProductWorkSurface({
  focused,
  bulkPanel,
  onClose,
  busy = false,
  categories = [],
  onLiberar,
  onSetAvailable,
  onArchiveToggle,
  onProductUpdated,
  onOpenProductGuide,
}: Props) {
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionFromUrl = parseProductGuideSectionParam(searchParams.get('section'))
  const [activeMenu, setActiveMenu] = useState<ProductGuideMenuId>(
    () => sectionFromUrl ?? readStoredGuideMenu(),
  )
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [commercialRef, setCommercialRef] = useState('')
  const [cascade, setCascade] = useState<CategoryCascadeValue>({
    categoriaId: '',
    grupoId: '',
    subgrupoId: '',
  })
  const [apps, setApps] = useState<Record<string, unknown>[]>([])
  const [kitRows, setKitRows] = useState<AdminKitUsageRow[]>([])
  const [related, setRelated] = useState<AdminRelatedRow[]>([])
  const [pricingRows, setPricingRows] = useState<ProductPricingRow[]>([])
  const [pricingItem, setPricingItem] = useState<PriceListItem | null>(null)
  const [pricingList, setPricingList] = useState<PriceList | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [loadingPricing, setLoadingPricing] = useState(false)

  const editTo =
    focused?.productKind === 'kit'
      ? `/admin/kits/${focused.id}`
      : focused
        ? `/admin/produtos/${focused.id}`
        : null

  const isKit = focused?.productKind === 'kit'

  const reloadPricing = useCallback(async (product: Product) => {
    setLoadingPricing(true)
    try {
      const rows = await adminGetProductPricingRows(product.id, {
        sku: product.commercialRef || product.sku,
        name: product.name,
      })
      setPricingRows(rows)
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao carregar preços das listas'), 'error')
      setPricingRows([])
    } finally {
      setLoadingPricing(false)
    }
    // toast estável o bastante no provider
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!focused) {
      setImageUrl(null)
      setApps([])
      setKitRows([])
      setRelated([])
      setPricingRows([])
      setPricingItem(null)
      setPricingList(null)
      return
    }
    setName(focused.name)
    setCommercialRef(focused.commercialRef ?? focused.sku)
    setCascade(cascadeFromLeaf(categories, focused.categoryId))
    void reloadPricing(focused)

    let cancelled = false
    setLoadingExtra(true)
    void (async () => {
      try {
        const [urls, appRows, kits, rel] = await Promise.all([
          adminPrimaryImageUrlMap([focused.id]),
          adminListApplications(focused.id).catch(() => []),
          isKit
            ? Promise.resolve([] as AdminKitUsageRow[])
            : adminListKitsUsingProduct(focused.id).catch(() => []),
          adminListProductRelated(focused.id).catch(() => []),
        ])
        if (cancelled) return
        setImageUrl(urls.get(focused.id) ?? null)
        setApps(appRows as Record<string, unknown>[])
        setKitRows(kits)
        setRelated(rel)
      } finally {
        if (!cancelled) setLoadingExtra(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [focused, categories, isKit, reloadPricing])

  useEffect(() => {
    if (sectionFromUrl && sectionFromUrl !== activeMenu) {
      setActiveMenu(sectionFromUrl)
      persistGuideMenu(sectionFromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à URL
  }, [sectionFromUrl])

  function selectMenu(id: ProductGuideMenuId) {
    setActiveMenu(id)
    persistGuideMenu(id)
    const next = new URLSearchParams(searchParams)
    next.set('section', id)
    setSearchParams(next, { replace: true })
  }

  async function saveIdentity() {
    if (!focused || isKit) return
    setSaving(true)
    try {
      const saved = await adminUpsertProduct({
        id: focused.id,
        name: name.trim(),
        commercialRef: commercialRef.trim(),
        sku: focused.sku,
        categoryId: focused.categoryId ?? null,
        brandId: focused.brandId ?? null,
        supplierId: focused.supplierId ?? null,
        productKind: 'item',
        price: focused.price,
        promoPrice: focused.promoPrice ?? null,
        status: focused.status,
        isAvailable: focused.available,
        shortDescription: focused.shortDescription,
        description: focused.description,
        posicao: focused.posicao,
        lado: focused.lado,
        weightKg: focused.weightKg,
        heightCm: focused.heightCm,
        widthCm: focused.widthCm,
        lengthCm: focused.lengthCm,
        syncBasePromoLists: false,
      })
      toast.push('Identidade salva na guia.', 'success')
      onProductUpdated?.(saved)
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao salvar identidade'), 'error')
    } finally {
      setSaving(false)
    }
  }

  function openPricingEdit(row: ProductPricingRow) {
    setPricingList(row.list)
    setPricingItem(row.item)
  }

  async function onSavePricingEdit(result: PricingEditResult) {
    if (!focused || !pricingItem || !pricingList || isKit) return
    setSaving(true)
    try {
      const itemId = await adminEnsureProductOnPriceList({
        priceListId: pricingList.id,
        productId: focused.id,
        itemId: pricingItem.id,
      })
      if (result.mode === 'apply_list_rule') {
        await adminSetPriceListItemPricing({
          itemId,
          mode: 'apply_rule',
          extraCost: result.extraCost,
        })
      } else if (result.mode === 'edit_rule_percent') {
        await adminSetCalculatedListPrice({
          priceListId: pricingList.id,
          productId: focused.id,
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

      const rows = await adminGetProductPricingRows(focused.id, {
        sku: focused.commercialRef || focused.sku,
        name: focused.name,
      })
      setPricingRows(rows)

      const baseRow = rows.find((r) => r.list.id === PRICE_LIST_BASE_ID)
      const basePrice =
        baseRow && !isVirtualPriceListItemId(baseRow.item.id)
          ? baseRow.item.price
          : focused.price

      if (pricingList.id === PRICE_LIST_BASE_ID || basePrice !== focused.price) {
        const saved = await adminUpsertProduct({
          id: focused.id,
          name: focused.name,
          commercialRef: focused.commercialRef ?? focused.sku,
          sku: focused.sku,
          categoryId: focused.categoryId ?? null,
          brandId: focused.brandId ?? null,
          supplierId: focused.supplierId ?? null,
          productKind: 'item',
          price: basePrice,
          promoPrice: focused.promoPrice ?? null,
          status: focused.status,
          isAvailable: focused.available,
          syncBasePromoLists: false,
        })
        onProductUpdated?.(saved)
      } else {
        onProductUpdated?.(focused)
      }

      setPricingItem(null)
      setPricingList(null)
      toast.push(`Precificação atualizada · ${pricingList.name}.`, 'success')
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao salvar precificação'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveCategory() {
    if (!focused || isKit) return
    const catId = effectiveCategoryId(cascade)
    if (!catId) {
      toast.push('Informe a classificação.', 'error')
      return
    }
    setSaving(true)
    try {
      await adminBulkSetProductCategory([focused.id], catId)
      const saved = await adminUpsertProduct({
        id: focused.id,
        name: focused.name,
        commercialRef: focused.commercialRef ?? focused.sku,
        sku: focused.sku,
        categoryId: catId,
        brandId: focused.brandId ?? null,
        supplierId: focused.supplierId ?? null,
        productKind: 'item',
        price: focused.price,
        promoPrice: focused.promoPrice ?? null,
        status: focused.status,
        isAvailable: focused.available,
        syncBasePromoLists: false,
      })
      // upsert garante search_document / incomplete após mudança de folha
      toast.push('Categoria salva na guia.', 'success')
      onProductUpdated?.(saved)
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao salvar categoria'), 'error')
    } finally {
      setSaving(false)
    }
  }

  function openKitInHub(kitId: string) {
    setGuideBridge(KITS_OPEN_GUIDE_KEY, kitId)
    navigate('/admin/kits')
  }

  async function reloadAppsCount() {
    if (!focused) return
    try {
      const appRows = await adminListApplications(focused.id)
      setApps(appRows as Record<string, unknown>[])
    } catch {
      /* hint opcional */
    }
  }

  const categoryHint = useMemo(() => {
    const id = focused?.categoryId
    if (!id) return 'Sem categoria'
    return categories.find((c) => c.id === id)?.name ?? 'Categoria definida'
  }, [focused?.categoryId, categories])

  const menuHint =
    activeMenu === 'categoria'
      ? categoryHint
      : activeMenu === 'aplicacoes'
        ? loadingExtra
          ? '…'
          : `${apps.length} vínculo(s)`
        : activeMenu === 'kits'
          ? loadingExtra
            ? '…'
            : `${kitRows.length} kit(s)`
          : activeMenu === 'relacionados'
            ? loadingExtra
              ? '…'
              : `${related.length} item(ns)`
            : activeMenu === 'precos'
              ? loadingPricing
                ? '…'
                : `${pricingRows.length} lista(s)`
              : 'Nome e código referência'

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3" data-product-ops-density="compact">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line pb-2">
        <p className="m-0 text-xs font-semibold text-fal-muted">
          {bulkPanel ? 'Ações na guia · lote' : 'Aberto na guia · ver e editar'}
        </p>
        <button
          type="button"
          className="text-xs font-semibold text-fal-muted underline"
          onClick={onClose}
        >
          Fechar guia
        </button>
      </div>

      {focused && !bulkPanel ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto fal-admin-scroll">
          <section className="flex gap-3 rounded-[12px] border border-fal-line bg-fal-bg/40 p-3">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-fal-line bg-fal-surface">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="px-1 text-center text-[10px] text-fal-muted">sem foto</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 font-mono text-xs text-fal-muted">
                {focused.commercialRef || focused.sku}
              </p>
              <h2 className="mt-0.5 mb-0 text-base font-extrabold text-fal-fg">{focused.name}</h2>
              <p className="mt-1 text-sm text-fal-muted">
                {productStatusLabel(focused.status)}
                {' · '}
                {focused.available ? 'Disponível' : 'Indisponível'}
                {isKit ? ' · Kit' : ''}
                {focused.isIncomplete ? ' · INCOMPLETO' : ''}
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-fal-fg">
                {formatMoney(focused.price)}
                <span className="ml-2 text-xs font-normal text-fal-muted">espelho / Base</span>
              </p>
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            {editTo ? (
              <Link to={editTo} className={buttonClassName({ variant: 'primary', size: 'sm' })}>
                Abrir cadastro
              </Link>
            ) : null}
            <Link
              to="/admin/precos"
              className={buttonClassName({ variant: 'light', size: 'sm' })}
            >
              Listas de preço
            </Link>
            {onLiberar ? (
              <Button
                type="button"
                variant="light"
                size="sm"
                disabled={busy || focused.available || saving}
                onClick={() => onLiberar(focused)}
              >
                Liberar na loja
              </Button>
            ) : null}
            {onSetAvailable ? (
              <Button
                type="button"
                variant="light"
                size="sm"
                disabled={busy || saving}
                onClick={() => onSetAvailable(focused, !focused.available)}
              >
                {focused.available ? 'Marcar indisponível' : 'Marcar disponível'}
              </Button>
            ) : null}
            {onArchiveToggle ? (
              <Button
                type="button"
                variant="light"
                size="sm"
                disabled={busy || saving}
                onClick={() => onArchiveToggle(focused)}
              >
                {focused.status === 'archived' ? 'Publicar' : 'Arquivar'}
              </Button>
            ) : null}
          </div>

          {isKit ? (
            <p className="m-0 rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm text-fal-muted">
              Este registro é kit. Edição de composição e preço do kit fica no{' '}
              <Link to={`/admin/kits/${focused.id}`} className="font-semibold underline">
                hub Kits
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-2" data-product-guide-menus>
              <nav
                className="flex flex-wrap gap-1.5"
                aria-label="Mini-menus da guia do produto"
              >
                {GUIDE_MENUS.map((m) => {
                  const current = activeMenu === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-current={current ? 'page' : undefined}
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold transition-colors ${
                        current
                          ? 'border-fal-navy bg-fal-navy text-white dark:border-fal-yellow dark:bg-fal-yellow dark:text-fal-navy-dark'
                          : 'border-fal-line bg-fal-surface text-fal-fg hover:border-fal-navy/40'
                      }`}
                      onClick={() => selectMenu(m.id)}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </nav>
              <p className="m-0 text-[11px] text-fal-muted">{menuHint}</p>

              <div className="space-y-2 rounded-[10px] border border-fal-line bg-fal-surface p-3">
                {activeMenu === 'identidade' ? (
                  <>
                    <Input
                      label="Código referência"
                      value={commercialRef}
                      onChange={(e) => setCommercialRef(e.target.value)}
                    />
                    <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => void saveIdentity()}
                    >
                      {saving ? 'Salvando…' : 'Salvar identidade'}
                    </Button>
                  </>
                ) : null}

                {activeMenu === 'categoria' ? (
                  <>
                    <CategoryCascadeSelects
                      categories={categories}
                      value={cascade}
                      onChange={setCascade}
                      idPrefix="guia-cat"
                      includeArchived
                      emptyLabel="—"
                      className="grid gap-2"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => void saveCategory()}
                    >
                      {saving ? 'Salvando…' : 'Salvar categoria'}
                    </Button>
                  </>
                ) : null}

                {activeMenu === 'precos' ? (
                  <>
                    <p className="m-0 text-xs text-fal-muted">
                      Custo adicional, margem/regra e preço por lista — sem sair da guia.
                      Custo base do fornecedor é só leitura.
                    </p>
                    {loadingPricing ? (
                      <p className="m-0 text-sm text-fal-muted">Carregando listas…</p>
                    ) : pricingRows.length === 0 ? (
                      <p className="m-0 text-sm text-fal-muted">Nenhuma lista cadastrada.</p>
                    ) : (
                      <ul className="m-0 list-none space-y-1.5 p-0">
                        {pricingRows.map((row) => {
                          const { list, item } = row
                          const onList = !isVirtualPriceListItemId(item.id)
                          const margin =
                            item.effectiveMarginPct != null
                              ? `${item.effectiveMarginPct.toFixed(1)}%`
                              : '—'
                          return (
                            <li
                              key={list.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-fal-line px-2 py-1.5 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="m-0 font-semibold text-fal-fg">
                                  {list.name}
                                  {list.id === PRICE_LIST_BASE_ID ? ' · Base' : ''}
                                  {list.isDefault ? ' · padrão' : ''}
                                </p>
                                <p className="mb-0 mt-0.5 text-[11px] text-fal-muted">
                                  {priceListStatusLabel(list.status)}
                                  {' · '}
                                  custo{' '}
                                  {item.costTotal != null ? formatMoney(item.costTotal) : '—'}
                                  {' · '}
                                  margem {margin}
                                  {' · '}
                                  {onList ? formatMoney(item.price) : 'fora da lista'}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="shrink-0 font-semibold text-fal-fg underline"
                                disabled={saving}
                                onClick={() => openPricingEdit(row)}
                              >
                                Editar
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    <Link
                      to="/admin/precos"
                      className={buttonClassName({ variant: 'light', size: 'sm' })}
                    >
                      Abrir hub de listas
                    </Link>
                  </>
                ) : null}

                {activeMenu === 'aplicacoes' ? (
                  <ProductApplicationsEditor
                    productId={focused.id}
                    variant="embedded"
                    onMutated={() => void reloadAppsCount()}
                  />
                ) : null}

                {activeMenu === 'kits' ? (
                  <>
                    {kitRows.length === 0 ? (
                      <p className="m-0 text-sm text-fal-muted">Não entra em nenhum kit.</p>
                    ) : (
                      <ul className="m-0 list-none space-y-2 p-0">
                        {kitRows.map((row) => (
                          <li
                            key={row.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-fal-line px-2 py-2 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="m-0 font-semibold text-fal-fg">
                                {row.kitCommercialRef || row.kitSku}
                              </p>
                              <p className="m-0 truncate text-xs text-fal-muted">{row.kitName}</p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                onClick={() => openKitInHub(row.kitProductId)}
                              >
                                Abrir guia Kits
                              </Button>
                              <Link
                                to={`/admin/kits/${row.kitProductId}`}
                                className={buttonClassName({ variant: 'light', size: 'sm' })}
                              >
                                Cadastro
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : null}

                {activeMenu === 'relacionados' ? (
                  <>
                    {related.length === 0 ? (
                      <p className="m-0 text-sm text-fal-muted">Sem produtos relacionados.</p>
                    ) : (
                      <ul className="m-0 list-none space-y-2 p-0">
                        {related.map((r) => (
                          <li
                            key={r.relatedProductId}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-fal-line px-2 py-2 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="m-0 font-semibold text-fal-fg">
                                {r.commercialRef || r.sku}
                              </p>
                              <p className="m-0 truncate text-xs text-fal-muted">{r.name}</p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {onOpenProductGuide ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="primary"
                                  onClick={() => onOpenProductGuide(r.relatedProductId)}
                                >
                                  + Guia
                                </Button>
                              ) : null}
                              <Link
                                to={`/admin/produtos/${r.relatedProductId}`}
                                className={buttonClassName({ variant: 'light', size: 'sm' })}
                              >
                                Cadastro
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {bulkPanel}

      {!focused && !bulkPanel ? (
        <p className="m-0 text-sm text-fal-muted">
          Selecione produtos na lista ou abra uma guia para ver foto, editar e empilhar (+ Guia).
        </p>
      ) : null}

      <PriceItemPricingModal
        open={Boolean(pricingItem && pricingList)}
        item={pricingItem}
        list={pricingList}
        busy={saving}
        onClose={() => {
          setPricingItem(null)
          setPricingList(null)
        }}
        onSave={onSavePricingEdit}
      />
    </div>
  )
}
