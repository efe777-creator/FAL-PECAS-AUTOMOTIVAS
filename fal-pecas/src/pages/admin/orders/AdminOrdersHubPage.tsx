import { Button } from '@/components/common/Button'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import {
  ADMIN_ORDER_AREAS,
  ADMIN_ORDER_VIEWS,
  adminNextActionLabel,
  attentionSortKey,
  isAttentionOrder,
  orderStatusOperatorLabel,
  sumAreaCount,
} from '@/lib/adminOrderOps'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import {
  adminExpireUnpaidOrders,
  adminListOrders,
  adminOrderStatusCounts,
  type AdminOrderListRow,
} from '@/services/admin/adminOrderService'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

export function AdminOrdersHubPage() {
  const [rows, setRows] = useState<AdminOrderListRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyExpire, setBusyExpire] = useState(false)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [list, c] = await Promise.all([adminListOrders(null), adminOrderStatusCounts()])
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
  }, [])

  const attention = useMemo(() => {
    return rows
      .filter((o) => isAttentionOrder(o.status, o.customerDecision))
      .sort(
        (a, b) =>
          attentionSortKey(a.status, a.customerDecision) -
          attentionSortKey(b.status, b.customerDecision),
      )
      .slice(0, 8)
  }, [rows])

  const recent = useMemo(() => rows.slice(0, 6), [rows])

  async function runExpireUnpaid() {
    const ok = window.confirm(
      'Retirar da fila (cancelar) pedidos com mais de 48 h sem pagamento aprovado?\n\n' +
        'Histórico permanece como cancelado. Reserva liberada. Expiração do Pix (5 min) é independente.',
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
          : `${r.expired} pedido(s) expirado(s).`,
      )
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao expirar pedidos')
    } finally {
      setBusyExpire(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fal-navy">Central de Pedidos</h1>
          <p className="mt-1 max-w-2xl text-sm text-fal-muted">
            Pagamento → análise → separação → expedição e entrega. Cada área mostra a situação, o
            que fazer e a próxima ação.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="light" disabled={busyExpire || loading} onClick={() => void runExpireUnpaid()}>
            {busyExpire ? 'Expirando…' : 'Retirar não pagos (48 h)'}
          </Button>
          <Link
            to="/admin/pedidos/lista"
            className="inline-flex items-center rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm font-semibold text-fal-navy"
          >
            Lista avançada
          </Link>
        </div>
      </header>

      {message ? <p className="text-sm font-semibold text-fal-navy">{message}</p> : null}
      {loading ? <Loading label="Carregando central…" /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <>
          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-fal-muted">
              Áreas de trabalho
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {ADMIN_ORDER_AREAS.map((area) => {
                const n = sumAreaCount(counts, area)
                return (
                  <Link
                    key={area.id}
                    to={area.path}
                    className="rounded-[14px] border border-fal-line bg-white p-4 no-underline transition hover:border-fal-navy"
                  >
                    <p className="text-sm font-bold text-fal-navy">{area.title}</p>
                    <p className="mt-2 text-3xl font-extrabold tabular-nums text-fal-navy">{n}</p>
                    <p className="mt-2 text-xs text-fal-muted">{area.description}</p>
                    <p className="mt-3 text-xs font-semibold text-fal-navy">{area.primaryCta} →</p>
                  </Link>
                )
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-fal-muted">
              Atalhos
            </h2>
            <div className="flex flex-wrap gap-2">
              {ADMIN_ORDER_VIEWS.map((v) => (
                <Link
                  key={v.id}
                  to={v.path}
                  title={v.description}
                  className="rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm font-semibold text-fal-navy no-underline hover:border-fal-navy"
                >
                  {v.title}
                  {v.placeholder ? (
                    <span className="ml-1 text-[10px] font-normal text-fal-muted">(em breve)</span>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[14px] border border-fal-line bg-white p-4">
              <h2 className="mt-0 text-base font-extrabold text-fal-navy">Exigem atenção</h2>
              {attention.length === 0 ? (
                <p className="text-sm text-fal-muted">Nenhuma pendência operacional agora.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {attention.map((o) => (
                    <li key={o.id} className="flex items-start justify-between gap-2 text-sm">
                      <div>
                        <Link to={`/admin/pedidos/${o.id}`} className="font-semibold text-fal-navy">
                          {o.id.slice(0, 8)}… · {o.customerName ?? 'Cliente'}
                        </Link>
                        <p className="text-xs text-fal-muted">
                          {orderStatusOperatorLabel[o.status] ?? o.status} —{' '}
                          {adminNextActionLabel(o.status, o.customerDecision)}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold">{formatMoney(o.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-[14px] border border-fal-line bg-white p-4">
              <h2 className="mt-0 text-base font-extrabold text-fal-navy">Mais recentes</h2>
              <ul className="mt-2 space-y-2">
                {recent.map((o) => (
                  <li key={o.id} className="flex items-start justify-between gap-2 text-sm">
                    <div>
                      <Link to={`/admin/pedidos/${o.id}`} className="font-semibold text-fal-navy">
                        {o.id.slice(0, 8)}… · {o.customerName ?? 'Cliente'}
                      </Link>
                      <p className="text-xs text-fal-muted">
                        {formatDateTime(o.createdAt)} ·{' '}
                        {orderStatusOperatorLabel[o.status] ?? o.status}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold">{formatMoney(o.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
