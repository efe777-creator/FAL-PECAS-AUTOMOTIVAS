import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { PromotionWorkSurface } from '@/components/admin/promotions/PromotionWorkSurface'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatMoney } from '@/lib/money'
import { formatDiscountPercentLabel, resolvePromoOffer } from '@/lib/promoPresentation'
import { toUserMessage } from '@/lib/toUserMessage'
import { AdminHomeSectionTabs } from '@/pages/admin/home/AdminHomeSectionTabs'
import {
  AdminPromotionsScopeTabs,
  type PromotionsScope,
} from '@/pages/admin/home/AdminPromotionsScopeTabs'
import {
  adminActivatePromotion,
  adminDeactivatePromotion,
  adminListInactivePromotionalLists,
  adminListProductPromotions,
  adminListPromotionalLists,
  adminPromotionDisplayStatus,
  adminPromotionRowKey,
  type AdminPromotionDisplayStatus,
  type AdminPromotionRow,
} from '@/services/admin/adminProductPromotionService'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const FILTERS_KEY = 'fal.promotions.filtersExpanded'

const statusLabel: Record<AdminPromotionDisplayStatus, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
  scheduled: 'Agendada',
  expired: 'Expirada',
}

function statusPillClass(st: AdminPromotionDisplayStatus): string {
  switch (st) {
    case 'active':
      return 'bg-fal-success/15 text-fal-fg border-fal-success/40'
    case 'scheduled':
      return 'bg-fal-accent/15 text-fal-fg border-fal-accent/40'
    case 'expired':
      return 'bg-fal-warning/15 text-fal-fg border-fal-warning/40'
    default:
      return 'bg-fal-bg text-fal-muted border-fal-line'
  }
}

function formatEndsLocal(iso: string | null): string {
  if (!iso) return 'Sem término'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function scopeFromPath(pathname: string): PromotionsScope {
  return pathname.includes('/promocoes/kits') ? 'kits' : 'items'
}

function readFiltersExpanded(): boolean {
  try {
    return sessionStorage.getItem(FILTERS_KEY) === '1'
  } catch {
    return false
  }
}

export function AdminPromotionsPage() {
  const location = useLocation()
  const scope = scopeFromPath(location.pathname)
  const isKits = scope === 'kits'
  useDocumentTitle(
    isKits ? 'Home da loja › Promoções › Kits' : 'Home da loja › Promoções',
  )
  const { push } = useToast()
  const [rows, setRows] = useState<AdminPromotionRow[]>([])
  const [lists, setLists] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [inactiveLists, setInactiveLists] = useState<
    Array<{ id: string; name: string; slug: string }>
  >([])
  const [loading, setLoading] = useState(true)
  const [listQ, setListQ] = useState('')
  const [situationFilter, setSituationFilter] = useState<'all' | AdminPromotionDisplayStatus>(
    'all',
  )
  const [filtersExpanded, setFiltersExpanded] = useState(readFiltersExpanded)
  const [rowBusyKey, setRowBusyKey] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideSeed, setGuideSeed] = useState<AdminPromotionRow | null>(null)
  const [scopeTabCounts, setScopeTabCounts] = useState({ items: 0, kits: 0 })

  function setFiltersExpandedPersist(next: boolean) {
    setFiltersExpanded(next)
    try {
      sessionStorage.setItem(FILTERS_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  const filteredRows = useMemo(() => {
    const q = listQ.trim().toLowerCase()
    return rows.filter((r) => {
      const st = adminPromotionDisplayStatus(r)
      if (situationFilter !== 'all' && st !== situationFilter) return false
      if (!q) return true
      return (
        r.name.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.priceListName.toLowerCase().includes(q)
      )
    })
  }, [rows, listQ, situationFilter])

  const counts = useMemo(() => {
    const c = { active: 0, scheduled: 0, expired: 0, inactive: 0 }
    for (const r of rows) {
      c[adminPromotionDisplayStatus(r)] += 1
    }
    return c
  }, [rows])

  const filterChips = useMemo(() => {
    const chips: string[] = []
    if (situationFilter !== 'all') chips.push(`Situação: ${statusLabel[situationFilter]}`)
    return chips
  }, [situationFilter])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [promo, other, pl, inactive] = await Promise.all([
        adminListProductPromotions({ productKind: isKits ? 'kit' : 'item' }),
        adminListProductPromotions({ productKind: isKits ? 'item' : 'kit' }),
        adminListPromotionalLists(),
        adminListInactivePromotionalLists(),
      ])
      setRows(promo)
      setScopeTabCounts(
        isKits
          ? { items: other.length, kits: promo.length }
          : { items: promo.length, kits: other.length },
      )
      setLists(pl)
      setInactiveLists(inactive)
    } catch (e) {
      push(toUserMessage(e, 'Erro ao carregar promoções'), 'error')
    } finally {
      setLoading(false)
    }
  }, [push, isKits])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    setListQ('')
    setSituationFilter('all')
    setGuideOpen(false)
    setGuideSeed(null)
  }, [scope])

  function openCreateGuide() {
    setGuideSeed(null)
    setGuideOpen(true)
  }

  function openRowGuide(row: AdminPromotionRow) {
    setGuideSeed(row)
    setGuideOpen(true)
  }

  function closeGuide() {
    setGuideOpen(false)
    setGuideSeed(null)
  }

  async function onActivateRow(row: AdminPromotionRow) {
    const key = adminPromotionRowKey(row)
    setRowBusyKey(key)
    try {
      await adminActivatePromotion({
        productId: row.productId,
        priceListId: row.priceListId,
      })
      push('Promoção ativada — loja passa a usar a lista promocional', 'success')
      await reload()
    } catch (e) {
      push(toUserMessage(e, 'Falha ao ativar'), 'error')
    } finally {
      setRowBusyKey(null)
    }
  }

  async function onDeactivate(row: AdminPromotionRow) {
    if (!row.id) return
    const key = adminPromotionRowKey(row)
    setRowBusyKey(key)
    try {
      await adminDeactivatePromotion(row.id)
      push('Promoção desativada — loja volta ao preço Base', 'success')
      await reload()
    } catch (e) {
      push(toUserMessage(e), 'error')
    } finally {
      setRowBusyKey(null)
    }
  }

  function rowActions(r: AdminPromotionRow) {
    const st = adminPromotionDisplayStatus(r)
    const key = adminPromotionRowKey(r)
    const rowBusy = rowBusyKey === key
    const onGuide = guideOpen && guideSeed?.productId === r.productId
    return (
      <div className="flex flex-wrap gap-2">
        {st === 'active' || st === 'scheduled' ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={rowBusy || !r.id}
            onClick={() => void onDeactivate(r)}
          >
            {rowBusy ? '…' : 'Desativar'}
          </Button>
        ) : (
          <>
            <button
              type="button"
              className="inline-flex min-h-9 items-center rounded-[10px] bg-fal-yellow px-2.5 text-xs font-bold text-fal-navy-dark"
              onClick={() => openRowGuide(r)}
            >
              {onGuide ? 'Na guia' : 'Abrir guia'}
            </button>
            <Button
              type="button"
              size="sm"
              variant="light"
              disabled={rowBusy || lists.length === 0}
              onClick={() => void onActivateRow(r)}
              title="Ativa sem alterar término/preço"
            >
              {rowBusy ? '…' : 'Ativar rápido'}
            </Button>
          </>
        )}
      </div>
    )
  }

  const primary = (
    <div className="admin-promotions-hub space-y-4">
      <div>
        <h1 className="m-0 text-2xl font-extrabold text-fal-fg">Promoções</h1>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          {isKits
            ? 'Promo do SKU do kit — não herda desconto dos itens. Incluir/ativar na guia.'
            : 'Controlam o preço na loja. Incluir/ativar na guia; Destaques são outra aba.'}
        </p>
      </div>

      <AdminHomeSectionTabs active="promotions" />
      <AdminPromotionsScopeTabs
        active={scope}
        itemsCount={scopeTabCounts.items}
        kitsCount={scopeTabCounts.kits}
      />

      {inactiveLists.length > 0 || lists.length === 0 ? (
        <div
          className="rounded-fal border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="m-0 font-bold">
            {isKits ? 'Antes de ativar kits' : 'Antes de ativar produtos'}
          </p>
          <ol className="mb-0 mt-2 list-decimal space-y-1 pl-5">
            <li>
              Em{' '}
              <Link to="/admin/precos" className="font-semibold underline">
                Preços
              </Link>
              , deixe a <strong>Lista Promocional</strong> com status <strong>active</strong>
              {inactiveLists.length
                ? ` (hoje: ${inactiveLists.map((l) => l.name).join(', ')} inactive)`
                : ''}
              .
            </li>
            <li>Abra a guia para incluir o {isKits ? 'kit' : 'SKU'} com preço promo.</li>
          </ol>
        </div>
      ) : (
        <p className="m-0 rounded-fal border border-fal-success/30 bg-fal-success/10 px-4 py-2 text-sm text-fal-fg">
          Lista promocional ativa. Use <strong>Incluir na guia</strong> para cadastrar / ativar.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" onClick={openCreateGuide} disabled={lists.length === 0}>
          Incluir na guia
        </Button>
        <Button type="button" variant="outline" onClick={() => void reload()} disabled={loading}>
          Atualizar
        </Button>
      </div>

      <form
        className="admin-promotions-filters space-y-2 rounded-[14px] border border-fal-line bg-fal-surface p-3"
        data-filters-expanded={filtersExpanded ? 'true' : 'false'}
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <Input
              label="Buscar na lista"
              value={listQ}
              onChange={(e) => setListQ(e.target.value)}
              placeholder="Nome, SKU ou lista"
            />
          </div>
          <Button
            type="button"
            variant="light"
            aria-expanded={filtersExpanded}
            onClick={() => setFiltersExpandedPersist(!filtersExpanded)}
          >
            {filtersExpanded
              ? 'Recolher filtros'
              : filterChips.length > 0
                ? `Filtros (${filterChips.length})`
                : 'Mais filtros'}
          </Button>
        </div>

        {!filtersExpanded && filterChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-fal-muted">
              Ativos
            </span>
            {filterChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-fal-line bg-fal-bg px-2 py-0.5 text-xs font-semibold text-fal-fg"
              >
                {chip}
              </span>
            ))}
            <button
              type="button"
              className="text-xs font-semibold text-fal-muted underline"
              onClick={() => setFiltersExpandedPersist(true)}
            >
              Editar
            </button>
          </div>
        ) : null}

        {filtersExpanded ? (
          <div className="border-t border-fal-line pt-2">
            <Select
              label="Situação"
              value={situationFilter}
              onChange={(e) =>
                setSituationFilter(e.target.value as 'all' | AdminPromotionDisplayStatus)
              }
              options={[
                { value: 'all', label: `Todas (${rows.length})` },
                { value: 'active', label: `Ativas (${counts.active})` },
                { value: 'scheduled', label: `Agendadas (${counts.scheduled})` },
                { value: 'expired', label: `Expiradas (${counts.expired})` },
                { value: 'inactive', label: `Inativas (${counts.inactive})` },
              ]}
            />
          </div>
        ) : null}
      </form>

      <p className="m-0 text-sm text-fal-muted">
        {loading
          ? 'Carregando…'
          : `${filteredRows.length} exibido${filteredRows.length === 1 ? '' : 's'} de ${rows.length} · ${counts.active} ativa${counts.active === 1 ? '' : 's'}`}
      </p>

      {!loading && rows.length === 0 ? (
        <p className="rounded-fal border border-dashed border-fal-line bg-fal-bg p-4 text-sm text-fal-muted">
          Nenhum {isKits ? 'kit' : 'item'} na lista promocional. Use <strong>Incluir na guia</strong>.
        </p>
      ) : null}
      {!loading && rows.length > 0 && filteredRows.length === 0 ? (
        <p className="rounded-fal border border-dashed border-fal-line bg-fal-bg p-4 text-sm text-fal-muted">
          Nenhum {isKits ? 'kit' : 'item'} com esse filtro.
        </p>
      ) : null}

      <div className="admin-promotions-list-desktop fal-admin-scroll hidden max-h-[min(60dvh,640px)] overflow-auto rounded-fal border border-fal-line bg-fal-surface md:block">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-[1] bg-fal-bg text-fal-muted shadow-[0_1px_0_var(--fal-line)]">
            <tr>
              <th className="px-3 py-2 font-semibold">{isKits ? 'Kit' : 'Produto'}</th>
              <th className="px-3 py-2 font-semibold">Preços</th>
              <th className="px-3 py-2 font-semibold">%</th>
              <th className="px-3 py-2 font-semibold">Situação</th>
              <th className="px-3 py-2 font-semibold">Término</th>
              <th className="px-3 py-2 font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => {
              const st = adminPromotionDisplayStatus(r)
              const offer = resolvePromoOffer(r.listPrice, r.promoPrice)
              const key = adminPromotionRowKey(r)
              return (
                <tr key={key} className="border-t border-fal-line/70">
                  <td className="px-3 py-2.5">
                    <Link
                      className="font-semibold text-fal-fg hover:underline"
                      to={
                        r.productKind === 'kit'
                          ? `/admin/kits/${r.productId}`
                          : `/admin/produtos/${r.productId}`
                      }
                    >
                      {r.name}
                    </Link>
                    <div className="font-mono text-xs text-fal-muted">
                      {r.sku}
                      {r.productKind === 'kit' ? ' · Kit' : ''}
                    </div>
                    <div className="text-xs text-fal-muted">{r.priceListName}</div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="text-xs text-fal-muted line-through">
                      {r.listPrice != null ? formatMoney(r.listPrice) : '—'}
                    </div>
                    <div className="font-semibold text-fal-success">
                      {r.promoPrice != null ? formatMoney(r.promoPrice) : '—'}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {offer.discountPercent != null
                      ? formatDiscountPercentLabel(offer.discountPercent)
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${statusPillClass(st)}`}
                    >
                      {statusLabel[st]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-fal-muted">{formatEndsLocal(r.endsAt)}</td>
                  <td className="px-3 py-2.5">{rowActions(r)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="admin-promotions-list-mobile fal-admin-scroll max-h-[min(60dvh,640px)] space-y-3 overflow-y-auto pr-1 md:hidden">
        {filteredRows.map((r) => {
          const st = adminPromotionDisplayStatus(r)
          const offer = resolvePromoOffer(r.listPrice, r.promoPrice)
          const key = adminPromotionRowKey(r)
          return (
            <article key={key} className="rounded-[14px] border border-fal-line bg-fal-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="m-0 font-mono text-xs text-fal-muted">{r.sku}</p>
                  <Link
                    className="font-extrabold text-fal-fg"
                    to={
                      r.productKind === 'kit'
                        ? `/admin/kits/${r.productId}`
                        : `/admin/produtos/${r.productId}`
                    }
                  >
                    {r.name}
                  </Link>
                  <p className="mb-0 mt-1 text-xs text-fal-muted">{r.priceListName}</p>
                </div>
                <span
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold ${statusPillClass(st)}`}
                >
                  {statusLabel[st]}
                </span>
              </div>
              <p className="mt-2 mb-0 text-sm">
                <span className="text-fal-muted line-through">
                  {r.listPrice != null ? formatMoney(r.listPrice) : '—'}
                </span>
                {' → '}
                <strong className="text-fal-success">
                  {r.promoPrice != null ? formatMoney(r.promoPrice) : '—'}
                </strong>
                {offer.discountPercent != null
                  ? ` (${formatDiscountPercentLabel(offer.discountPercent)})`
                  : ''}
              </p>
              <p className="mt-1 mb-0 text-xs text-fal-muted">{formatEndsLocal(r.endsAt)}</p>
              <div className="mt-2">{rowActions(r)}</div>
            </article>
          )
        })}
      </div>
    </div>
  )

  return (
    <AdaptiveWorkspace
      moduleKey="promotions"
      primary={primary}
      contextualOpen={guideOpen}
      onContextualOpenChange={(open) => {
        if (!open) closeGuide()
      }}
      contextualTitle={
        guideSeed
          ? `Reativar · ${guideSeed.sku}`
          : isKits
            ? 'Incluir kit'
            : 'Incluir produto'
      }
      contextual={
        guideOpen ? (
          <PromotionWorkSurface
            isKits={isKits}
            lists={lists}
            rows={rows}
            seed={guideSeed}
            onClose={closeGuide}
            onMutated={() => void reload()}
          />
        ) : null
      }
    />
  )
}
