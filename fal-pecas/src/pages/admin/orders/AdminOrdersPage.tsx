import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { formatMoney } from '@/lib/money'
import { formatDateTime } from '@/lib/datetime'
import { ADMIN_ORDER_COUNTER_KEYS, orderStatusAdminLabel } from '@/lib/orderLifecycle'
import {
  adminExpireUnpaidOrders,
  adminListOrders,
  adminOrderStatusCounts,
  type AdminOrderListRow,
} from '@/services/admin/adminOrderService'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { value: 'pagamento_aprovado', label: 'Pagamento aprovado' },
  { value: 'recebido', label: 'Recebidos' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'aguardando_disponibilidade', label: 'Aguardando disponibilidade' },
  { value: 'aguardando_decisao', label: 'Aguardando decisão' },
  { value: 'confirmado', label: 'Confirmados' },
  { value: 'em_separacao', label: 'Em separação' },
  { value: 'pronto_para_envio', label: 'Pronto para envio' },
  { value: 'enviado', label: 'Enviados' },
  { value: 'entregue', label: 'Entregues' },
  { value: 'cancelado', label: 'Cancelados' },
]

function paymentBadge(o: AdminOrderListRow) {
  if (!o.paymentStatus) return '—'
  const expired =
    o.paymentExpiresAt != null && new Date(o.paymentExpiresAt).getTime() < Date.now()
  const label = expired && o.paymentStatus === 'pending' ? 'pending (expirado)' : o.paymentStatus
  return label
}

export function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState<AdminOrderListRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState(searchParams.get('status') ?? '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyExpire, setBusyExpire] = useState(false)

  function applyFilter(value: string) {
    setFilter(value)
    if (value) setSearchParams({ status: value })
    else setSearchParams({})
  }

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [list, c] = await Promise.all([
        adminListOrders(filter || null),
        adminOrderStatusCounts(),
      ])
      setRows(list)
      setCounts(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function runExpireUnpaid() {
    const ok = window.confirm(
      'Cancelar pedidos em “Aguardando pagamento” com mais de 48 h sem pagamento aprovado?\n\n' +
        'A reserva de estoque será liberada. Expiração do QR Pix é independente (cliente pode gerar novo QR dentro das 48 h).',
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
          <h1 className="text-2xl font-extrabold text-fal-navy">Pedidos</h1>
          <p className="mt-1 text-sm text-fal-muted">
            Fluxo: pagamento → recepção/análise → confirmação → separação → envio → entrega.
          </p>
        </div>
        <Button
          type="button"
          variant="light"
          disabled={busyExpire || loading}
          onClick={() => void runExpireUnpaid()}
        >
          {busyExpire ? 'Expirando…' : 'Expirar não pagos (48 h)'}
        </Button>
      </header>
      {message ? <p className="text-sm font-semibold text-fal-navy">{message}</p> : null}

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {ADMIN_ORDER_COUNTER_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => applyFilter(k)}
            className={[
              'rounded-[12px] border px-3 py-2 text-left',
              filter === k ? 'border-fal-navy bg-fal-navy text-white' : 'border-fal-line bg-white',
            ].join(' ')}
          >
            <div className="text-xs opacity-80">{orderStatusAdminLabel[k] ?? k}</div>
            <div className="text-xl font-extrabold">{counts[k] ?? 0}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold text-fal-muted">Filtro</label>
        <select
          className="rounded-[9px] border border-fal-line bg-white px-3 py-2 text-sm"
          value={filter}
          onChange={(e) => applyFilter(e.target.value)}
        >
          {FILTERS.map((f) => (
            <option key={f.value || 'all'} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? <Loading label="Carregando pedidos…" /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="Nenhum pedido neste filtro"
          description="Altere o filtro de status ou aguarde novos pedidos da loja."
        />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-fal-line bg-fal-bg text-xs uppercase text-fal-muted">
              <tr>
                <th className="px-3 py-2">Pedido</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Pagamento</th>
                <th className="px-3 py-2">Expira</th>
                <th className="px-3 py-2">Itens</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-fal-line last:border-0 hover:bg-fal-bg/60">
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
                      className={
                        o.status === 'aguardando_pagamento'
                          ? 'rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900'
                          : undefined
                      }
                    >
                      {orderStatusAdminLabel[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{paymentBadge(o)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-fal-muted">
                    {o.paymentExpiresAt
                      ? new Date(o.paymentExpiresAt).toLocaleString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-3 py-2">{o.itemCount}</td>
                  <td className="px-3 py-2 font-semibold">{formatMoney(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
