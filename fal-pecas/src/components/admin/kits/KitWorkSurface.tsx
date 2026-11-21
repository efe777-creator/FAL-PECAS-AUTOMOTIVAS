import { AdminProductKitSection } from '@/components/admin/AdminProductKitSection'
import { CategoryCascadeSelects } from '@/components/admin/CategoryCascadeSelects'
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
import { Link } from 'react-router-dom'

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
          {quickCreateOpen ? 'Criar kit rápido' : 'Composição / BOM na guia'}
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
          <MotionRow creating={creating} onSave={() => void saveQuickDraft()} />
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
            const prev = previews[kitId]
            return (
              <div className="space-y-3">
                <header className="space-y-1 rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2">
                  <p className="m-0 font-mono text-xs text-fal-muted">
                    {kit.commercialRef ?? kit.sku}
                  </p>
                  <p className="m-0 text-sm font-extrabold text-fal-fg">{kit.name}</p>
                  <p className="m-0 text-xs text-fal-muted">
                    {productStatusLabel(kit.status)}
                    {' · '}
                    {kit.available ? 'Disponível' : 'Indisponível'}
                    {kit.kitCompatReviewRequired ? ' · Revisar PVC' : ''}
                  </p>
                  {prev ? (
                    <p className="m-0 text-sm font-semibold tabular-nums text-fal-fg">
                      Preço sugerido: {formatMoney(prev.effectiveHint)}
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
                      <Button
                        type="button"
                        variant="light"
                        size="sm"
                        onClick={() => onArchiveToggle(kit)}
                      >
                        {kit.status === 'archived' ? 'Desarquivar' : 'Arquivar'}
                      </Button>
                    ) : null}
                  </div>
                </header>
                <AdminProductKitSection
                  kitProductId={kit.id}
                  kitPriceMode={kit.kitPriceMode === 'manual' ? 'manual' : 'auto'}
                  surfacePart="bom"
                  compact
                />
                {onKitUpdated ? (
                  <p className="m-0 text-[10px] text-fal-muted">
                    Alterações na composição sincronizam listas automaticamente (H5).
                  </p>
                ) : null}
              </div>
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

function MotionRow({ creating, onSave }: { creating: boolean; onSave: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={creating} onClick={onSave}>
        {creating ? 'Criando…' : 'Salvar rascunho e montar composição'}
      </Button>
    </div>
  )
}