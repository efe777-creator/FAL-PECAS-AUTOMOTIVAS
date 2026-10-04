import { Loading } from '@/components/common/Loading'
import { formatMoney } from '@/lib/money'
import { formatDateTime } from '@/lib/datetime'
import { ADMIN_ORDER_COUNTER_KEYS, orderStatusAdminLabel } from '@/lib/orderLifecycle'
import { adminListOrders, adminOrderStatusCounts, type AdminOrderListRow } from '@/services/admin/adminOrderService'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
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

export function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState<AdminOrderListRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState(searchParams.get('status') ?? '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function applyFilter(value: string) {
    setFilter(value)
    if (value) setSearchParams({ status: value })
    else setSearchParams({})
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [list, c] = await Promise.all([
          adminListOrders(filter || null),
          adminOrderStatusCounts(),
        ])
        if (!alive) return
        setRows(list)
        setCounts(c)
      } catch (e) {
        if (!alive) return
        setError(e instanceof Error ? e.message : 'Erro ao carregar pedidos')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [filter])

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold text-fal-navy">Pedidos</h1>
        <p className="mt-1 text-sm text-fal-muted">Fila operacional da FAL — recepção e confirmação.</p>
      </header>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
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

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <Loading label="Carregando pedidos…" /> : null}

      {!loading && !error ? (
        <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-fal-line bg-fal-bg text-xs uppercase text-fal-muted">
              <tr>
                <th className="px-3 py-2">Pedido</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Itens</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-fal-muted">
                    Nenhum pedido neste filtro.
                  </td>
                </tr>
              ) : (
                rows.map((o) => (
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
                    <td className="px-3 py-2">{orderStatusAdminLabel[o.status] ?? o.status}</td>
                    <td className="px-3 py-2">{o.itemCount}</td>
                    <td className="px-3 py-2 font-semibold">{formatMoney(o.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
