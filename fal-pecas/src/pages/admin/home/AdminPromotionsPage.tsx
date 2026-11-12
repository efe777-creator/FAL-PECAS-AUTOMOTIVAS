import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatMoney } from '@/lib/money'
import { formatDiscountPercentLabel, resolvePromoOffer } from '@/lib/promoPresentation'
import { toUserMessage } from '@/lib/toUserMessage'
import { AdminHomeSectionTabs } from '@/pages/admin/home/AdminHomeSectionTabs'
import { adminListProducts } from '@/services/admin/adminProductService'
import {
  adminActivatePromotion,
  adminDeactivatePromotion,
  adminListInactivePromotionalLists,
  adminListProductPromotions,
  adminListPromotionalLists,
  adminPromotionDisplayStatus,
  type AdminPromotionDisplayStatus,
  type AdminPromotionRow,
} from '@/services/admin/adminProductPromotionService'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const statusLabel: Record<AdminPromotionDisplayStatus, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
  scheduled: 'Agendada',
  expired: 'Expirada',
}

function statusPillClass(st: AdminPromotionDisplayStatus): string {
  switch (st) {
    case 'active':
      return 'bg-emerald-50 text-emerald-900 border-emerald-200'
    case 'scheduled':
      return 'bg-sky-50 text-sky-900 border-sky-200'
    case 'expired':
      return 'bg-amber-50 text-amber-950 border-amber-200'
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

export function AdminPromotionsPage() {
  useDocumentTitle('Promoções · Home da loja')
  const { push } = useToast()
  const [rows, setRows] = useState<AdminPromotionRow[]>([])
  const [lists, setLists] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [inactiveLists, setInactiveLists] = useState<
    Array<{ id: string; name: string; slug: string }>
  >([])
  const [loading, setLoading] = useState(true)
  /** false = inclui histórico (inativas) para filtros de situação. */
  const [includeHistory, setIncludeHistory] = useState(false)
  const [listQ, setListQ] = useState('')
  const [situationFilter, setSituationFilter] = useState<
    'all' | AdminPromotionDisplayStatus
  >('all')
  const [productQ, setProductQ] = useState('')
  const [hits, setHits] = useState<Array<{ id: string; name: string; sku: string }>>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedProductLabel, setSelectedProductLabel] = useState('')
  const [selectedListId, setSelectedListId] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  const canActivate = lists.length > 0 && Boolean(selectedProductId) && Boolean(selectedListId)

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
      const [promo, pl, inactive] = await Promise.all([
        adminListProductPromotions({ onlyActive: !includeHistory }),
        adminListPromotionalLists(),
        adminListInactivePromotionalLists(),
      ])
      setRows(promo)
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
  }, [includeHistory, push])

  useEffect(() => {
    void reload()
  }, [reload])

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
      void adminListProducts({ q: term, limit: 8 })
        .then((found) => {
          if (cancelled) return
          setHits(found.map((p) => ({ id: p.id, name: p.name, sku: p.sku })))
        })
        .catch(() => {
          if (!cancelled) setHits([])
        })
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [productQ, selectedProductId, selectedProductLabel])

  function clearProductSelection() {
    setSelectedProductId('')
    setSelectedProductLabel('')
    setProductQ('')
    setHits([])
  }

  async function onActivate() {
    if (!selectedProductId || !selectedListId) {
      push('Selecione produto e lista promocional', 'error')
      return
    }
    if (!lists.length) {
      push('Ative a Lista Promocional em Preços antes de ativar SKUs', 'error')
      return
    }
    setBusy(true)
    try {
      await adminActivatePromotion({
        productId: selectedProductId,
        priceListId: selectedListId,
        endsAt: endsAt.trim() ? new Date(endsAt).toISOString() : null,
      })
      push('Promoção ativada — preço da loja passa a usar a lista promocional', 'success')
      clearProductSelection()
      setEndsAt('')
      setIncludeHistory(false)
      setSituationFilter('all')
      await reload()
    } catch (e) {
      push(toUserMessage(e, 'Falha ao ativar'), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onDeactivate(id: string) {
    setDeactivatingId(id)
    try {
      await adminDeactivatePromotion(id)
      push('Promoção desativada — loja volta ao preço Base', 'success')
      await reload()
    } catch (e) {
      push(toUserMessage(e), 'error')
    } finally {
      setDeactivatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="m-0 text-2xl font-extrabold text-fal-navy">Home da loja</h1>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Promoções controlam o preço na loja. Destaques são outra aba e não mudam com isto.
        </p>
      </div>

      <AdminHomeSectionTabs active="promotions" />

      {/* 1) Pré-requisito operacional */}
      {inactiveLists.length > 0 || lists.length === 0 ? (
        <div
          className="rounded-fal border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="m-0 font-bold">Antes de ativar produtos</p>
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
            <li>Cadastre o preço promocional do SKU nessa lista.</li>
            <li>Volte aqui e ative o produto — só então a loja baixa o preço.</li>
          </ol>
        </div>
      ) : (
        <p className="m-0 rounded-fal border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-950">
          Lista promocional ativa. Busque o produto e ative para entrar em promoção na loja.
        </p>
      )}

      {/* 2) Ação principal */}
      <section className="rounded-fal border border-fal-line bg-white p-4">
        <h2 className="m-0 text-lg font-bold text-fal-navy">1. Ativar produto</h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Lista cadastrada ≠ promoção ativa. Sem ativação aqui, o item na lista não altera a
          vitrine.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Input
              label="Produto"
              value={productQ}
              onChange={(e) => {
                const v = e.target.value
                setProductQ(v)
                if (selectedProductId && v !== selectedProductLabel) {
                  setSelectedProductId('')
                  setSelectedProductLabel('')
                }
              }}
              placeholder="Digite nome ou SKU (mín. 2 letras)"
              disabled={lists.length === 0}
            />
            {selectedProductId ? (
              <p className="mt-1 mb-0 flex flex-wrap items-center gap-2 text-xs text-emerald-800">
                Selecionado: <strong>{selectedProductLabel}</strong>
                <button
                  type="button"
                  className="font-semibold text-fal-navy underline"
                  onClick={clearProductSelection}
                >
                  Limpar
                </button>
              </p>
            ) : null}
            {hits.length > 0 ? (
              <ul className="mt-1 max-h-44 list-none overflow-auto rounded-[9px] border border-fal-line p-0 text-sm">
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
                        setHits([])
                      }}
                    >
                      <span className="font-mono text-xs text-fal-muted">{h.sku}</span>
                      <span className="mt-0.5 block font-semibold text-fal-ink">{h.name}</span>
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
            {busy ? 'Ativando…' : 'Ativar promoção'}
          </Button>
          <p className="m-0 text-xs text-fal-muted">
            Independente de o produto estar ou não em Destaques.
          </p>
        </div>
      </section>

      {/* 3) Lista / gestão */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-bold text-fal-navy">2. Produtos em promoção</h2>
            <p className="mt-1 mb-0 text-sm text-fal-muted">
              {loading
                ? 'Carregando…'
                : `${filteredRows.length} exibido${filteredRows.length === 1 ? '' : 's'} · ${counts.active} ativa${counts.active === 1 ? '' : 's'}`}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void reload()} disabled={loading}>
            Atualizar
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-fal border border-fal-line bg-white p-3">
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
              { value: 'all', label: 'Todas (carregadas)' },
              { value: 'active', label: `Ativas (${counts.active})` },
              { value: 'scheduled', label: `Agendadas (${counts.scheduled})` },
              { value: 'expired', label: `Expiradas (${counts.expired})` },
              { value: 'inactive', label: `Inativas (${counts.inactive})` },
            ]}
          />
          <label className="flex min-h-[42px] items-center gap-2 pb-1 text-sm">
            <input
              type="checkbox"
              checked={includeHistory}
              onChange={(e) => {
                setIncludeHistory(e.target.checked)
                if (!e.target.checked && (situationFilter === 'inactive' || situationFilter === 'expired')) {
                  setSituationFilter('all')
                }
              }}
            />
            Incluir histórico
          </label>
        </div>

        {!loading && rows.length === 0 ? (
          <p className="rounded-fal border border-dashed border-fal-line bg-fal-bg p-4 text-sm text-fal-muted">
            Nenhuma promoção {includeHistory ? 'no histórico' : 'ativa'}. Ative um produto acima
            {!includeHistory ? ' ou marque “Incluir histórico”' : ''}.
          </p>
        ) : null}
        {!loading && rows.length > 0 && filteredRows.length === 0 ? (
          <p className="rounded-fal border border-dashed border-fal-line bg-fal-bg p-4 text-sm text-fal-muted">
            Nenhum item com esse filtro.
            {!includeHistory && (situationFilter === 'inactive' || situationFilter === 'expired')
              ? ' Marque “Incluir histórico”.'
              : ''}
          </p>
        ) : null}

        <div className="hidden overflow-x-auto rounded-fal border border-fal-line bg-white md:block">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-fal-bg text-fal-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Produto</th>
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
                return (
                  <tr key={r.id} className="border-t border-fal-line/70">
                    <td className="px-3 py-2.5">
                      <Link
                        className="font-semibold text-fal-navy hover:underline"
                        to={`/admin/produtos/${r.productId}`}
                      >
                        {r.name}
                      </Link>
                      <div className="font-mono text-xs text-fal-muted">{r.sku}</div>
                      <div className="text-xs text-fal-muted">{r.priceListName}</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="text-xs text-fal-muted line-through">
                        {r.listPrice != null ? formatMoney(r.listPrice) : '—'}
                      </div>
                      <div className="font-semibold text-emerald-800">
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
                      {r.status === 'active' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={deactivatingId === r.id}
                          onClick={() => void onDeactivate(r.id)}
                        >
                          {deactivatingId === r.id ? '…' : 'Desativar'}
                        </Button>
                      ) : (
                        <span className="text-xs text-fal-muted">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {filteredRows.map((r) => {
            const st = adminPromotionDisplayStatus(r)
            const offer = resolvePromoOffer(r.listPrice, r.promoPrice)
            return (
              <article key={r.id} className="rounded-[14px] border border-fal-line bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="m-0 font-mono text-xs text-fal-muted">{r.sku}</p>
                    <Link
                      className="font-extrabold text-fal-navy"
                      to={`/admin/produtos/${r.productId}`}
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
                  <strong className="text-emerald-800">
                    {r.promoPrice != null ? formatMoney(r.promoPrice) : '—'}
                  </strong>
                  {offer.discountPercent != null
                    ? ` (${formatDiscountPercentLabel(offer.discountPercent)})`
                    : ''}
                </p>
                <p className="mt-1 mb-0 text-xs text-fal-muted">{formatEndsLocal(r.endsAt)}</p>
                {r.status === 'active' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    disabled={deactivatingId === r.id}
                    onClick={() => void onDeactivate(r.id)}
                  >
                    Desativar
                  </Button>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
