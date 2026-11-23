import { ProductApplicationsEditor } from '@/components/admin/applications/ProductApplicationsEditor'
import { AdminProductKitSection } from '@/components/admin/AdminProductKitSection'
import {
  CategoryCascadeSelects,
  effectiveCategoryId,
  type CategoryCascadeValue,
} from '@/components/admin/CategoryCascadeSelects'
import { OrderSplitTabPanels } from '@/components/admin/orders/OrderSplitTabPanels'
import { Button, buttonClassName } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { productStatusLabel } from '@/lib/adminLabels'
import { formatMoney } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import { adminListCategories } from '@/services/admin/adminCategoryService'
import type { KitPricePreview } from '@/services/admin/adminKitPricingService'
import { adminSyncKitListPrices } from '@/services/admin/adminKitPricingService'
import { adminUpsertProduct } from '@/services/admin/adminProductService'
import type { Category, Product } from '@/types'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

/** Persistência do mini-menu ativo na guia de kits. */
export const KIT_GUIDE_MENU_KEY = 'fal.kits.guideMenu'

export type KitGuideMenuId = 'composicao' | 'identidade' | 'precos' | 'aplicacoes'

const GUIDE_MENUS: { id: KitGuideMenuId; label: string }[] = [
  { id: 'composicao', label: 'Composição' },
  { id: 'identidade', label: 'Identidade' },
  { id: 'precos', label: 'Preços' },
  { id: 'aplicacoes', label: 'Aplicações' },
]

const GUIDE_MENU_IDS = new Set(GUIDE_MENUS.map((m) => m.id))

function normalizeGuideSectionKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function parseKitGuideSectionParam(
  raw: string | null | undefined,
): KitGuideMenuId | null {
  const v = normalizeGuideSectionKey(raw ?? '')
  if (!v) return null
  if (v === 'bom' || v === 'composicao') return 'composicao'
  if (v === 'preco' || v === 'precos') return 'precos'
  if (GUIDE_MENU_IDS.has(v as KitGuideMenuId)) return v as KitGuideMenuId
  return null
}

function readStoredGuideMenu(): KitGuideMenuId {
  try {
    const raw = sessionStorage.getItem(KIT_GUIDE_MENU_KEY)?.trim()
    const parsed = parseKitGuideSectionParam(raw)
    if (parsed) return parsed
  } catch {
    /* ignore */
  }
  return 'composicao'
}

function persistGuideMenu(id: KitGuideMenuId) {
  try {
    sessionStorage.setItem(KIT_GUIDE_MENU_KEY, id)
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

export type KitWorkSurfaceProps = {
  openKitIds: string[]
  kitsById: Record<string, Product>
  previews: Record<string, KitPricePreview | undefined>
  onCloseTab: (kitId: string) => void
  onCloseAll: () => void
  quickCreateOpen: boolean
  onQuickCreateOpenChange: (open: boolean) => void
  onKitCreated: (kit: Product) => void
  onKitUpdated?: () => void
  releasingId?: string | null
  onLiberar?: (kit: Product) => void
  onArchiveToggle?: (kit: Product) => void
}

export function KitWorkSurface({
  openKitIds,
  kitsById,
  previews,
  onCloseTab,
  onCloseAll,
  quickCreateOpen,
  onQuickCreateOpenChange,
  onKitCreated,
  onKitUpdated,
  releasingId,
  onLiberar,
  onArchiveToggle,
}: KitWorkSurfaceProps) {
  const toast = useToast()
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [createCommercialRef, setCreateCommercialRef] = useState('')
  const [createName, setCreateName] = useState('')
  const [catCategoriaId, setCatCategoriaId] = useState('')
  const [catGrupoId, setCatGrupoId] = useState('')
  const [catSubgrupoId, setCatSubgrupoId] = useState('')
  const [creating, setCreating] = useState(false)

  const categoryId = catSubgrupoId || catGrupoId || catCategoriaId || ''

  useEffect(() => {
    void adminListCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  async function saveQuickDraft() {
    setCreating(true)
    try {
      if (!createName.trim()) throw new Error('Informe o nome do kit.')
      if (!createCommercialRef.trim()) throw new Error('Informe o código referência.')
      if (!categoryId) throw new Error('Informe a classificação (categoria).')

      const saved = await adminUpsertProduct({
        name: createName.trim(),
        commercialRef: createCommercialRef.trim(),
        status: 'draft',
        productKind: 'kit',
        kitPriceMode: 'auto',
        categoryId,
        price: 0,
        promoPrice: null,
        isAvailable: false,
        syncBasePromoLists: true,
      })

      await adminSyncKitListPrices({
        kitProductId: saved.id,
        kitPriceMode: 'auto',
        changedBy: user?.id ?? null,
      })

      toast.push('Kit rascunho criado — monte a composição abaixo.', 'success')
      setCreateCommercialRef('')
      setCreateName('')
      setCatCategoriaId('')
      setCatGrupoId('')
      setCatSubgrupoId('')
      onQuickCreateOpenChange(false)
      onKitCreated(saved)
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao criar kit'), 'error')
    } finally {
      setCreating(false)
    }
  }

  const stackMeta = openKitIds.map((id) => {
    const k = kitsById[id]
    return {
      id,
      label: k?.name?.trim() || k?.commercialRef || k?.sku || id.slice(0, 8),
      statusLabel: k
        ? `${productStatusLabel(k.status)} · ${k.kitPriceMode === 'manual' ? 'Manual' : 'Auto'}`
        : undefined,
    }
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3" data-kit-ops-density="compact">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line pb-2">
        <p className="m-0 text-xs font-semibold text-fal-muted">
          {quickCreateOpen ? 'Criar kit rápido' : 'Aberto na guia · kit'}
        </p>
        <button
          type="button"
          className="text-xs font-semibold text-fal-muted underline"
          onClick={onCloseAll}
        >
          Fechar guia
        </button>
      </div>

      {quickCreateOpen ? (
        <section className="space-y-3 rounded-[12px] border border-fal-line bg-fal-bg/40 p-3">
          <h2 className="m-0 text-sm font-extrabold text-fal-fg">Novo kit (mínimo)</h2>
          <p className="m-0 text-xs text-fal-muted">
            Código, nome e categoria — ao salvar o rascunho você já pode linkar itens na mesma guia.
          </p>
          <Input
            label="Código referência"
            value={createCommercialRef}
            onChange={(e) => setCreateCommercialRef(e.target.value)}
            required
          />
          <Input
            label="Nome do kit"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            required
          />
          <fieldset className="text-sm">
            <legend className="mb-1 block text-xs font-extrabold text-fal-muted">Classificação</legend>
            <CategoryCascadeSelects
              categories={categories}
              includeArchived
              value={{
                categoriaId: catCategoriaId,
                grupoId: catGrupoId,
                subgrupoId: catSubgrupoId,
              }}
              onChange={(next) => {
                setCatCategoriaId(next.categoriaId)
                setCatGrupoId(next.grupoId)
                setCatSubgrupoId(next.subgrupoId)
              }}
            />
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={creating} onClick={() => void saveQuickDraft()}>
              {creating ? 'Criando…' : 'Salvar rascunho e montar composição'}
            </Button>
          </div>
        </section>
      ) : null}

      {openKitIds.length > 0 ? (
        <OrderSplitTabPanels
          orderIds={openKitIds}
          meta={stackMeta}
          onCloseTab={onCloseTab}
          render={(kitId) => {
            const kit = kitsById[kitId]
            if (!kit) {
              return <p className="m-0 text-sm text-fal-muted">Carregando kit…</p>
            }
            return (
              <KitGuidePanel
                kit={kit}
                preview={previews[kitId]}
                categories={categories}
                releasingId={releasingId}
                onLiberar={onLiberar}
                onArchiveToggle={onArchiveToggle}
                onKitUpdated={onKitUpdated}
              />
            )
          }}
        />
      ) : !quickCreateOpen ? (
        <p className="m-0 text-sm text-fal-muted">
          Abra um kit na lista ou use <strong>Novo na guia</strong> para criar um rascunho e montar o
          BOM aqui.
        </p>
      ) : null}
    </div>
  )
}

type KitGuidePanelProps = {
  kit: Product
  preview?: KitPricePreview
  categories: Category[]
  releasingId?: string | null
  onLiberar?: (kit: Product) => void
  onArchiveToggle?: (kit: Product) => void
  onKitUpdated?: () => void
}

function KitGuidePanel({
  kit,
  preview,
  categories,
  releasingId,
  onLiberar,
  onArchiveToggle,
  onKitUpdated,
}: KitGuidePanelProps) {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionFromUrl = parseKitGuideSectionParam(searchParams.get('section'))
  const [activeMenu, setActiveMenu] = useState<KitGuideMenuId>(
    () => sectionFromUrl ?? readStoredGuideMenu(),
  )
  const [commercialRef, setCommercialRef] = useState(kit.commercialRef ?? kit.sku)
  const [name, setName] = useState(kit.name)
  const [cascade, setCascade] = useState<CategoryCascadeValue>(() =>
    cascadeFromLeaf(categories, kit.categoryId),
  )
  const [kitPriceMode, setKitPriceMode] = useState<'auto' | 'manual'>(
    kit.kitPriceMode === 'manual' ? 'manual' : 'auto',
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCommercialRef(kit.commercialRef ?? kit.sku)
    setName(kit.name)
    setCascade(cascadeFromLeaf(categories, kit.categoryId))
    setKitPriceMode(kit.kitPriceMode === 'manual' ? 'manual' : 'auto')
  }, [kit, categories])

  useEffect(() => {
    if (sectionFromUrl && sectionFromUrl !== activeMenu) {
      setActiveMenu(sectionFromUrl)
      persistGuideMenu(sectionFromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à URL
  }, [sectionFromUrl])

  function selectMenu(id: KitGuideMenuId) {
    setActiveMenu(id)
    persistGuideMenu(id)
    const next = new URLSearchParams(searchParams)
    next.set('section', id)
    setSearchParams(next, { replace: true })
  }

  async function saveIdentity() {
    setSaving(true)
    try {
      const catId = effectiveCategoryId(cascade)
      if (!name.trim()) throw new Error('Informe o nome do kit.')
      if (!commercialRef.trim()) throw new Error('Informe o código referência.')
      if (!catId) throw new Error('Informe a classificação.')
      await adminUpsertProduct({
        id: kit.id,
        name: name.trim(),
        commercialRef: commercialRef.trim(),
        sku: kit.sku,
        categoryId: catId,
        brandId: kit.brandId ?? null,
        supplierId: kit.supplierId ?? null,
        productKind: 'kit',
        kitPriceMode,
        price: kit.price,
        promoPrice: kit.promoPrice ?? null,
        status: kit.status,
        isAvailable: kit.available,
        syncBasePromoLists: false,
      })
      toast.push('Identidade do kit salva na guia.', 'success')
      onKitUpdated?.()
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao salvar identidade'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const menuHint =
    activeMenu === 'composicao'
      ? 'BOM · qty · reordenar'
      : activeMenu === 'identidade'
        ? 'Código, nome e categoria'
        : activeMenu === 'precos'
          ? kitPriceMode === 'manual'
            ? 'Preço manual'
            : 'Soma automática'
          : 'PVC do kit'

  return (
    <div className="space-y-3" data-kit-guide-menus>
      <header className="space-y-1 rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2">
        <p className="m-0 font-mono text-xs text-fal-muted">{kit.commercialRef ?? kit.sku}</p>
        <p className="m-0 text-sm font-extrabold text-fal-fg">{kit.name}</p>
        <p className="m-0 text-xs text-fal-muted">
          {productStatusLabel(kit.status)}
          {' · '}
          {kit.available ? 'Disponível' : 'Indisponível'}
          {kit.kitCompatReviewRequired ? ' · Revisar PVC' : ''}
        </p>
        {preview ? (
          <p className="m-0 text-sm font-semibold tabular-nums text-fal-fg">
            Preço sugerido: {formatMoney(preview.effectiveHint)}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            to={`/admin/kits/${kit.id}`}
            className={buttonClassName({ variant: 'primary', size: 'sm' })}
          >
            Abrir cadastro
          </Link>
          <Link
            to="/admin/produtos/importar-kits"
            className={buttonClassName({ variant: 'light', size: 'sm' })}
          >
            Importar BOM
          </Link>
          {onLiberar ? (
            <Button
              type="button"
              variant="light"
              size="sm"
              disabled={releasingId === kit.id || kit.available}
              onClick={() => onLiberar(kit)}
            >
              {releasingId === kit.id ? 'Liberando…' : 'Liberar'}
            </Button>
          ) : null}
          {onArchiveToggle ? (
            <Button type="button" variant="light" size="sm" onClick={() => onArchiveToggle(kit)}>
              {kit.status === 'archived' ? 'Desarquivar' : 'Arquivar'}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="space-y-2">
        <nav className="flex flex-wrap gap-1.5" aria-label="Mini-menus da guia do kit">
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
          {activeMenu === 'composicao' ? (
            <AdminProductKitSection
              kitProductId={kit.id}
              kitPriceMode={kitPriceMode}
              surfacePart="bom"
              compact
              onMutated={onKitUpdated}
            />
          ) : null}

          {activeMenu === 'identidade' ? (
            <div className="space-y-3">
              <Input
                label="Código referência"
                value={commercialRef}
                onChange={(e) => setCommercialRef(e.target.value)}
              />
              <Input label="Nome do kit" value={name} onChange={(e) => setName(e.target.value)} />
              <fieldset className="text-sm">
                <legend className="mb-1 block text-xs font-extrabold text-fal-muted">
                  Classificação
                </legend>
                <CategoryCascadeSelects
                  categories={categories}
                  includeArchived
                  idPrefix={`kit-guia-${kit.id}`}
                  value={cascade}
                  onChange={setCascade}
                />
              </fieldset>
              <Button type="button" size="sm" disabled={saving} onClick={() => void saveIdentity()}>
                {saving ? 'Salvando…' : 'Salvar identidade'}
              </Button>
            </div>
          ) : null}

          {activeMenu === 'precos' ? (
            <AdminProductKitSection
              kitProductId={kit.id}
              kitPriceMode={kitPriceMode}
              surfacePart="pricing"
              compact
              onMutated={onKitUpdated}
              onPriceModeChange={setKitPriceMode}
            />
          ) : null}

          {activeMenu === 'aplicacoes' ? (
            <ProductApplicationsEditor
              productId={kit.id}
              variant="embedded"
              onMutated={onKitUpdated}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
