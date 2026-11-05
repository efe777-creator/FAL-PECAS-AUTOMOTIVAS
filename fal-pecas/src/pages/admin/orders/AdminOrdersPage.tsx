import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  ADMIN_ORDER_GROUPS,
  adminActorBadgeLabel,
  adminActorKind,
  adminNextActionLabel,
  orderMatchesGroup,
  orderStatusOperatorLabel,
  sumGroupCount,
  type AdminOrderGroupId,
} from '@/lib/adminOrderOps'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import {
  adminExpireUnpaidOrders,
  adminListOrders,
  adminOrderStatusCounts,
  ADMIN_LIST_PAGE_SIZE,
  type AdminOrderListRow,
} from '@/services/admin/adminOrderService'
import { toUserMessage } from '@/lib/toUserMessage'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { value: 'pagamento_aprovado', label: 'Pagamento aprovado' },
  { value: 'recebido', label: 'Aguardando início da análise' },
  { value: 'em_analise', label: 'Em análise pela loja' },
  { value: 'aguardando_disponibilidade', label: 'Disponibilidade (legado)' },
  { value: 'aguardando_decisao', label: 'Aguardando resposta do cliente' },
  { value: 'confirmado', label: 'Confirmados' },
  { value: 'em_separacao', label: 'Em separação' },
  { value: 'pronto_para_envio', label: 'Pronto para envio' },
  { value: 'enviado', label: 'Enviados' },
  { value: 'entregue', label: 'Entregues' },
  { value: 'cancelado', label: 'Cancelados' },
]

function matchesOrderSearch(o: AdminOrderListRow, raw: string): boolean {
  const q = raw.trim().toLowerCase()
  if (!q) return true
  return (
    o.id.toLowerCase().includes(q) ||
    (o.customerName?.toLowerCase().includes(q) ?? false) ||
    (o.paymentStatus?.toLowerCase().includes(q) ?? false)
  )
}

function paymentBadge(o: AdminOrderListRow) {
  if (!o.paymentStatus) return '—'
  const expired =
    o.paymentExpiresAt != null && new Date(o.paymentExpiresAt).getTime() < Date.now()
  return expired && o.paymentStatus === 'pending' ? 'pending (expirado)' : o.paymentStatus
}

function actorClass(kind: ReturnType<typeof adminActorKind>): string {
  switch (kind) {
    case 'team':
      return 'bg-amber-100 text-amber-950'
    case 'customer':
      return 'bg-sky-100 text-sky-950'
    case 'wait_payment':
      return 'bg-fal-bg text-fal-muted'
    case 'done':
      return 'bg-green-100 text-green-900'
  }
}

export function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState<AdminOrderListRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '')
  const [groupFilter, setGroupFilter] = useState<AdminOrderGroupId | ''>(
    (searchParams.get('grupo') as AdminOrderGroupId | null) ?? '',
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyExpire, setBusyExpire] = useState(false)
  const [search, setSearch] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  function syncParams(nextStatus: string, nextGroup: AdminOrderGroupId | '') {
    const p = new URLSearchParams()
    if (nextStatus) p.set('status', nextStatus)
    else if (nextGroup) p.set('grupo', nextGroup)
    setSearchParams(p)
  }

  function applyStatus(value: string) {
    setStatusFilter(value)
    setGroupFilter('')
    syncParams(value, '')
  }

  function applyGroup(value: AdminOrderGroupId | '') {
    setGroupFilter(value)
    setStatusFilter('')
    syncParams('', value)
  }

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      // Com grupo: carrega todos e filtra client-side; com status: filtra no servidor
      const [list, c] = await Promise.all([
        adminListOrders(statusFilter || null),
        adminOrderStatusCounts(),
      ])
      setRows(list)
      setHasMore(list.length >= ADMIN_LIST_PAGE_SIZE)
      setCounts(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const next = await adminListOrders(statusFilter || null, { offset: rows.length })
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id))
        return [...prev, ...next.filter((r) => !seen.has(r.id))]
      })
      setHasMore(next.length >= ADMIN_LIST_PAGE_SIZE)
    } catch (e) {
      setError(toUserMessage(e, 'Erro ao carregar mais pedidos'))
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  useEffect(() => {
    const s = searchParams.get('status') ?? ''
    const g = (searchParams.get('grupo') as AdminOrderGroupId | null) ?? ''
    setStatusFilter(s)
    setGroupFilter(s ? '' : g)
  }, [searchParams])

  const visible = useMemo(() => {
    return rows
      .filter((o) => orderMatchesGroup(o.status, groupFilter))
      .filter((o) => matchesOrderSearch(o, search))
  }, [rows, groupFilter, search])

  async function runExpireUnpaid() {
    const ok = window.confirm(
      'Retirar da fila (cancelar) pedidos com mais de 48 h sem pagamento aprovado?\n\n' +
        'Histórico permanece. Reserva liberada. Pix (5 min) é independente — não cancela o pedido.',
    )
    if (!ok) return
    setBusyExpire(true)
    setMessage(null)
    setError(null)
    try {
      const r = await adminExpireUnpaidOrders({ limit: 50, maxAgeHours: 48 })
      setMessage(
        r.expired === 0
          ? 'Nenhum pedido elegível a expirar (TTL 48 h).'
          : `${r.expired} pedido(s) expirado(s) e reserva liberada.`,
      )
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao expirar pedidos')
    } finally {
      setBusyExpire(false)
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/admin/pedidos" className="text-sm font-semibold text-fal-navy no-underline">
            ← Central de Pedidos
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold text-fal-navy">Lista avançada</h1>
          <p className="mt-1 text-sm text-fal-muted">
            Filtro fino por grupo e status. Para filas de trabalho, use as áreas da central.
          </p>
        </div>
        <Button
          type="button"
          variant="light"
          disabled={busyExpire || loading}
          onClick={() => void runExpireUnpaid()}
        >
          {busyExpire ? 'Expirando…' : 'Retirar não pagos (48 h)'}
        </Button>
      </header>
      {message ? <p className="text-sm font-semibold text-fal-navy">{message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyGroup('')}
          className={[
            'rounded-[10px] border px-3 py-2 text-sm font-semibold',
            !groupFilter && !statusFilter
              ? 'border-fal-navy bg-fal-navy text-white'
              : 'border-fal-line bg-white text-fal-navy',
          ].join(' ')}
        >
          Todos
        </button>
        {ADMIN_ORDER_GROUPS.map((g) => {
          const n = sumGroupCount(counts, g)
          const active = groupFilter === g.id && !statusFilter
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => applyGroup(g.id)}
              title={g.description}
              className={[
                'rounded-[10px] border px-3 py-2 text-left text-sm',
                active
                  ? 'border-fal-navy bg-fal-navy text-white'
                  : 'border-fal-line bg-white text-fal-navy',
              ].join(' ')}
            >
              <span className="block text-[11px] opacity-80">{g.title}</span>
              <span className="text-lg font-extrabold tabular-nums">{n}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold text-fal-muted">
          Status
          <select
            className="mt-1 block rounded-[9px] border border-fal-line bg-white px-3 py-2 text-sm font-normal text-fal-navy"
            value={statusFilter}
            onChange={(e) => applyStatus(e.target.value)}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value || 'all'} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <div className="min-w-[200px] flex-1">
          <Input
            label="Busca (id / cliente / pagamento)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ex.: a1b2c3d4 ou nome"
          />
        </div>
      </div>

      {loading ? <Loading label="Carregando pedidos…" /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error && hasMore ? (
        <p className="rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Exibindo até {ADMIN_LIST_PAGE_SIZE} registros por carga ({rows.length} carregados). Há mais
          pedidos — use “Carregar mais” ao final da lista ou filtre por status.
        </p>
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <EmptyState
          title="Nenhum pedido neste filtro"
          description="Altere o grupo, o status ou a busca."
        />
      ) : null}

      {!loading && !error && visible.length > 0 ? (
        <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-fal-line bg-fal-bg text-xs uppercase text-fal-muted">
              <tr>
                <th className="px-3 py-2">Pedido</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Situação</th>
                <th className="px-3 py-2">Próxima ação</th>
                <th className="px-3 py-2">Pagamento</th>
                <th className="px-3 py-2">Itens</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => {
                const kind = adminActorKind(o.status, o.customerDecision)
                return (
                  <tr
                    key={o.id}
                    className="border-b border-fal-line last:border-0 hover:bg-fal-bg/60"
                  >
                    <td className="px-3 py-2">
                      <Link
                        to={`/admin/pedidos/${o.id}`}
                        className="font-semibold text-fal-navy underline-offset-2 hover:underline"
                      >
                        {o.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-3 py-2">{o.customerName ?? '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${actorClass(kind)}`}
                      >
                        {adminActorBadgeLabel(kind)}
                      </span>
                      <span className="mt-1 block text-xs">
                        {orderStatusOperatorLabel[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-semibold text-fal-navy">
                      {adminNextActionLabel(o.status, o.customerDecision)}
                    </td>
                    <td className="px-3 py-2 text-xs">{paymentBadge(o)}</td>
                    <td className="px-3 py-2">{o.itemCount}</td>
                    <td className="px-3 py-2 font-semibold">{formatMoney(o.total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && !error && hasMore ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? 'Carregando…' : 'Carregar mais pedidos'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
