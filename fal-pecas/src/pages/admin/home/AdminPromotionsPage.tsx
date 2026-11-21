import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatMoney, formatMoneyInput, parseMoneyBr } from '@/lib/money'
import { formatDiscountPercentLabel, resolvePromoOffer } from '@/lib/promoPresentation'
import { toUserMessage } from '@/lib/toUserMessage'
import { AdminHomeSectionTabs } from '@/pages/admin/home/AdminHomeSectionTabs'
import {
  AdminPromotionsScopeTabs,
  type PromotionsScope,
} from '@/pages/admin/home/AdminPromotionsScopeTabs'
import { adminListProducts } from '@/services/admin/adminProductService'
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
  const [situationFilter, setSituationFilter] = useState<
    'all' | AdminPromotionDisplayStatus
  >('all')
  const [productQ, setProductQ] = useState('')
  const [hits, setHits] = useState<
    Array<{
      id: string
      name: string
      sku: string
      productKind: 'item' | 'kit'
      price: number | null
    }>
  >([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedProductLabel, setSelectedProductLabel] = useState('')
  const [selectedListId, setSelectedListId] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [promoPriceDraft, setPromoPriceDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [rowBusyKey, setRowBusyKey] = useState<string | null>(null)

  const canActivate = lists.length > 0 && Boolean(selectedProductId) && Boolean(selectedListId)

  const [scopeTabCounts, setScopeTabCounts] = useState({ items: 0, kits: 0 })

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

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      // Cada aba só materializa o próprio tipo (itens ≠ kits).
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
      setSelectedListId((prev) => {
        if (prev && pl.some((l) => l.id === prev)) return prev
        return pl[0]?.id ?? ''
      })
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
    setSelectedProductId('')
    setSelectedProductLabel('')
    setProductQ('')
    setHits([])
    setListQ('')
    setSituationFilter('all')
  }, [scope])

  useEffect(() => {
    if (selectedProductId && productQ === selectedProductLabel) {
      setHits([])
      return
    }
    const term = productQ.trim()
    if (term.length < 2) {
      setHits([])
      return
    }
    let cancelled = false
    const t = window.setTimeout(() => {
      void adminListProducts({
        q: term,
        limit: 8,
        productKind: isKits ? 'kit' : 'item',
      })
        .then((found) => {
          if (cancelled) return
          setHits(
            found.map((p) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              productKind: p.productKind === 'kit' ? 'kit' : 'item',
              price: typeof p.price === 'number' && Number.isFinite(p.price) ? p.price : null,
            })),
          )
        })
        .catch(() => {
          if (!cancelled) setHits([])
        })
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [productQ, selectedProductId, selectedProductLabel, isKits])

  function clearProductSelection() {
    setSelectedProductId('')
    setSelectedProductLabel('')
    setProductQ('')
    setHits([])
    setPromoPriceDraft('')
  }

  async function onActivate() {
    if (!selectedProductId || !selectedListId) {
      push(isKits ? 'Selecione kit e lista promocional' : 'Selecione produto e lista promocional', 'error')
      return
    }
    if (!lists.length) {
      push('Ative a Lista Promocional em Preços antes de ativar SKUs', 'error')
      return
    }
    const parsedPromo = parseMoneyBr(promoPriceDraft)
    const alreadyOnList = rows.some(
      (r) => r.productId === selectedProductId && r.priceListId === selectedListId,
    )
    if (!alreadyOnList && (parsedPromo == null || parsedPromo < 0)) {
      push(
        isKits
          ? 'Informe o preço promocional do kit para incluí-lo na lista.'
          : 'Informe o preço promocional para incluir o item na lista.',
        'error',
      )
      return
    }
    setBusy(true)
    try {
      await adminActivatePromotion({
        productId: selectedProductId,
        priceListId: selectedListId,
        endsAt: endsAt.trim() ? new Date(endsAt).toISOString() : null,
        promoPrice: parsedPromo,
      })
      push(
        alreadyOnList
          ? 'Promoção ativada — preço da loja passa a usar a lista promocional'
          : 'SKU incluído na lista e promoção ativada',
        'success',
      )
      clearProductSelection()
      setEndsAt('')
      setSituationFilter('all')
      await reload()
    } catch (e) {
      push(toUserMessage(e, 'Falha ao ativar'), 'error')
    } finally {
      setBusy(false)
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="m-0 text-2xl font-extrabold text-fal-fg">Home da loja</h1>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          {isKits
            ? 'Promo do SKU do kit — não herda desconto dos itens. Cadastro do kit fica em Catálogo › Kits.'
            : 'Promoções controlam o preço na loja. Destaques são outra aba e não mudam com isto.'}
        </p>
      </div>

      <AdminHomeSectionTabs active="promotions" />
      <AdminPromotionsScopeTabs
        active={scope}
        itemsCount={scopeTabCounts.items}
        kitsCount={scopeTabCounts.kits}
      />

      {/* 1) Pré-requisito operacional */}
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
            <li>
              Cadastre o preço promocional do {isKits ? 'kit' : 'SKU'} nessa lista.
            </li>
            <li>
              Volte aqui e ative o {isKits ? 'kit' : 'produto'} — só então a loja baixa o preço.
            </li>
          </ol>
        </div>
      ) : (
        <p className="m-0 rounded-fal border border-fal-success/30 bg-fal-success/10 px-4 py-2 text-sm text-fal-fg">
          Lista promocional ativa. Busque o {isKits ? 'kit cadastrado' : 'produto'}, informe o preço
          promo se ainda não estiver na lista e ative.
        </p>
      )}

      {/* 2) Ação principal */}
      <section className="rounded-fal border border-fal-line bg-fal-surface p-4">
        <h2 className="m-0 text-lg font-bold text-fal-fg">
          {isKits ? '1. Incluir / ativar kit' : '1. Incluir / ativar produto'}
        </h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          {isKits
            ? 'Kit cadastrado em Catálogo › Kits pode entrar na Lista Promocional com preço próprio (não herda desconto dos itens).'
            : 'Inclui o SKU na Lista Promocional (se ainda não estiver) e ativa o gate na loja.'}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="sm:col-span-2">
            <Input
              label={isKits ? 'Kit' : 'Produto'}
              value={productQ}
              onChange={(e) => {
                const v = e.target.value
                setProductQ(v)
                if (selectedProductId && v !== selectedProductLabel) {
                  setSelectedProductId('')
                  setSelectedProductLabel('')
                }
              }}
              placeholder={
                isKits
                  ? 'Digite nome ou SKU do kit (mín. 2 letras)'
                  : 'Digite nome ou SKU (mín. 2 letras)'
              }
              disabled={lists.length === 0}
            />
            {selectedProductId ? (
              <p className="mt-1 mb-0 flex flex-wrap items-center gap-2 text-xs text-fal-success">
                Selecionado: <strong>{selectedProductLabel}</strong>
                <button
                  type="button"
                  className="font-semibold text-fal-fg underline"
                  onClick={clearProductSelection}
                >
                  Limpar
                </button>
              </p>
            ) : null}
            {hits.length > 0 ? (
              <ul className="mt-1 max-h-44 list-none overflow-auto rounded-[9px] border border-fal-line bg-fal-surface p-0 text-sm">
                {hits.map((h) => (
                  <li key={h.id} className="border-b border-fal-line/60 last:border-0">
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left hover:bg-fal-bg"
                      onClick={() => {
                        const label = `${h.sku} — ${h.name}`
                        setSelectedProductId(h.id)
                        setSelectedProductLabel(label)
                        setProductQ(label)
                        const existing = rows.find(
                          (r) => r.productId === h.id && r.priceListId === selectedListId,
                        )
                        const hint = existing?.promoPrice ?? h.price
                        setPromoPriceDraft(
                          hint != null ? formatMoneyInput(hint) : '',
                        )
                        setHits([])
                      }}
                    >
                      <span className="font-mono text-xs text-fal-muted">
                        {h.sku}
                        {h.productKind === 'kit' ? ' · Kit' : ''}
                      </span>
                      <span className="mt-0.5 block font-semibold text-fal-fg">{h.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <Select
            label="Lista"
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            options={
              lists.length
                ? lists.map((l) => ({ value: l.id, label: l.name }))
                : [{ value: '', label: 'Nenhuma lista ativa' }]
            }
            disabled={lists.length === 0}
          />

          <Input
            label="Preço promocional"
            value={promoPriceDraft}
            onChange={(e) => setPromoPriceDraft(e.target.value)}
            placeholder="0,00"
            hint={isKits ? 'Obrigatório se o kit ainda não está na lista' : 'Obrigatório se o SKU ainda não está na lista'}
            disabled={lists.length === 0}
          />

          <Input
            label="Término (opcional)"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            disabled={lists.length === 0}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="primary"
            disabled={busy || !canActivate}
            onClick={() => void onActivate()}
          >
            {busy ? 'Ativando…' : 'Incluir e ativar'}
          </Button>
          <p className="m-0 text-xs text-fal-muted">
            {isKits
              ? 'Kits cadastrados entram na mesma Lista Promocional dos itens.'
              : 'Independente de o produto estar ou não em Destaques.'}
          </p>
        </div>
      </section>

      {/* 3) Lista / gestão */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-bold text-fal-fg">
              {isKits ? '2. Kits na lista promocional' : '2. Itens na lista promocional'}
            </h2>
            <p className="mt-1 mb-0 text-sm text-fal-muted">
              {loading
                ? 'Carregando…'
                : `${filteredRows.length} exibido${filteredRows.length === 1 ? '' : 's'} de ${rows.length} · ${counts.active} ativa${counts.active === 1 ? '' : 's'}`}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void reload()} disabled={loading}>
            Atualizar
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-fal border border-fal-line bg-fal-surface p-3">
          <div className="min-w-[12rem] flex-1">
            <Input
              label="Buscar na lista"
              value={listQ}
              onChange={(e) => setListQ(e.target.value)}
              placeholder="Nome, SKU ou lista"
            />
          </div>
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

        {!loading && rows.length === 0 ? (
          <p className="rounded-fal border border-dashed border-fal-line bg-fal-bg p-4 text-sm text-fal-muted">
            Nenhum {isKits ? 'kit' : 'item'} na lista promocional. Use a busca acima, informe o preço
            promo e clique em Incluir e ativar.
          </p>
        ) : null}
        {!loading && rows.length > 0 && filteredRows.length === 0 ? (
          <p className="rounded-fal border border-dashed border-fal-line bg-fal-bg p-4 text-sm text-fal-muted">
            Nenhum {isKits ? 'kit' : 'item'} com esse filtro.
          </p>
        ) : null}

        <div className="hidden max-h-[min(28rem,55vh)] overflow-auto rounded-fal border border-fal-line bg-fal-surface md:block">
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
                const rowBusy = rowBusyKey === key
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
                    <td className="px-3 py-2.5 text-xs text-fal-muted">
                      {formatEndsLocal(r.endsAt)}
                    </td>
                    <td className="px-3 py-2.5">
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
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          disabled={rowBusy || lists.length === 0}
                          onClick={() => void onActivateRow(r)}
                        >
                          {rowBusy ? '…' : 'Ativar'}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="max-h-[min(28rem,55vh)] space-y-3 overflow-y-auto pr-1 md:hidden">
          {filteredRows.map((r) => {
            const st = adminPromotionDisplayStatus(r)
            const offer = resolvePromoOffer(r.listPrice, r.promoPrice)
            const key = adminPromotionRowKey(r)
            const rowBusy = rowBusyKey === key
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
                {st === 'active' || st === 'scheduled' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    disabled={rowBusy || !r.id}
                    onClick={() => void onDeactivate(r)}
                  >
                    {rowBusy ? '…' : 'Desativar'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    className="mt-2"
                    disabled={rowBusy || lists.length === 0}
                    onClick={() => void onActivateRow(r)}
                  >
                    {rowBusy ? '…' : 'Ativar'}
                  </Button>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
