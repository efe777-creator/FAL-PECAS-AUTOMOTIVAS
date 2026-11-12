import { Button } from '@/components/common/Button'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { ADMIN_LOGISTICS_QUEUES } from '@/lib/adminLogisticsQueues'
import {
  ADMIN_ORDER_AREAS,
  ADMIN_ORDER_VIEWS,
  adminNextActionLabel,
  attentionSortKey,
  isAttentionOrder,
  sumAreaCount,
} from '@/lib/adminOrderOps'
import { listStatusLabel } from './AdminOrdersListPanel'
import {
  confirmExpireUnpaidIntent,
  formatExpireUnpaidMessage,
  runExpireUnpaidOrders,
} from '@/lib/adminExpireUnpaidFlow'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import { rememberOrdersReturnPath } from '@/lib/adminOrdersNav'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import {
  ADMIN_LIST_PAGE_SIZE,
  adminCentralIndicators,
  adminListOrders,
  adminLogisticsQueueCounts,
  adminOrderStatusCounts,
  type AdminCentralIndicators,
  type AdminOrderListRow,
} from '@/services/admin/adminOrderService'
import type { LogisticsQueueCounts } from '@/lib/adminLogisticsQueues'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

export function AdminOrdersHubPage() {
  useDocumentTitle('Pedidos | Admin FAL')
  const toast = useToast()
  const [attentionRows, setAttentionRows] = useState<AdminOrderListRow[]>([])
  const [recent, setRecent] = useState<AdminOrderListRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [logisticsCounts, setLogisticsCounts] = useState<LogisticsQueueCounts | null>(null)
  const [indicators, setIndicators] = useState<AdminCentralIndicators | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyExpire, setBusyExpire] = useState(false)

  /** Status elegíveis à fila de atenção (CP-CEN-040 / CP-CEN-013). */
  const ATTENTION_STATUSES = [
    'pagamento_aprovado',
    'recebido',
    'em_analise',
    'aguardando_disponibilidade',
    'aguardando_decisao',
    'confirmado',
    'em_separacao',
    'pronto_para_envio',
  ] as const

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [attentionList, recentList, c, ind, lq] = await Promise.all([
        adminListOrders(null, { statuses: ATTENTION_STATUSES, limit: ADMIN_LIST_PAGE_SIZE }),
        adminListOrders(null, { limit: 6 }),
        adminOrderStatusCounts(),
        adminCentralIndicators().catch(() => null),
        adminLogisticsQueueCounts().catch(() => null),
      ])
      setAttentionRows(attentionList)
      setRecent(recentList)
      setCounts(c)
      setIndicators(ind)
      setLogisticsCounts(lq)
    } catch (e) {
      setError(toUserMessage(e, 'Erro ao carregar pedidos'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const attention = useMemo(() => {
    return attentionRows
      .filter((o) => isAttentionOrder(o.status, o.customerDecision))
      .sort(
        (a, b) =>
          attentionSortKey(a.status, a.customerDecision) -
          attentionSortKey(b.status, b.customerDecision),
      )
      .slice(0, 8)
  }, [attentionRows])

  async function runExpireUnpaid() {
    if (!(await confirmExpireUnpaidIntent())) return
    setBusyExpire(true)
    try {
      const r = await runExpireUnpaidOrders()
      toast.push(formatExpireUnpaidMessage(r), 'success')
      await reload()
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao expirar pedidos'), 'error')
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
            Fluxo comercial primeiro (pagamento → análise → separação); depois a expedição
            logística conforme a modalidade contratada. Prazos dos meios ficam em Logística
            (config).
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

      {loading ? <Loading label="Carregando central…" /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <>
          {indicators ? (
            <section className="space-y-3" aria-label="Indicadores da Central">
              <div>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-fal-muted">
                  Operação
                </h2>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-[12px] border border-fal-line bg-white px-3 py-2">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                      Pedidos criados
                    </p>
                    <p className="m-0 mt-1 text-xl font-extrabold tabular-nums text-fal-navy">
                      {indicators.operational.ordersCreated}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-fal-line bg-white px-3 py-2">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                      Aguardando decisão
                    </p>
                    <p className="m-0 mt-1 text-xl font-extrabold tabular-nums text-fal-navy">
                      {indicators.operational.awaitingDecision}
                    </p>
                  </div>
                  <Link
                    to="/admin/pedidos/visao/solicitacoes-cancelamento"
                    className="rounded-[12px] border border-fal-line bg-white px-3 py-2 no-underline"
                  >
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                      Cancel. pendente
                    </p>
                    <p className="m-0 mt-1 text-xl font-extrabold tabular-nums text-fal-navy">
                      {indicators.operational.cancellationPending}
                    </p>
                  </Link>
                  <div className="rounded-[12px] border border-fal-line bg-white px-3 py-2">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                      Cancelados
                    </p>
                    <p className="m-0 mt-1 text-xl font-extrabold tabular-nums text-fal-navy">
                      {indicators.operational.cancelled}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-fal-muted">
                  Financeiro (recebido líquido = capturado − devolvido)
                </h2>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <div className="rounded-[12px] border border-fal-line bg-white px-3 py-2">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                      Capturado
                    </p>
                    <p className="m-0 mt-1 text-base font-extrabold tabular-nums text-fal-navy">
                      {formatMoney(indicators.financial.captured)}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-fal-line bg-white px-3 py-2">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                      Devolvido
                    </p>
                    <p className="m-0 mt-1 text-base font-extrabold tabular-nums text-fal-navy">
                      {formatMoney(indicators.financial.refunded)}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-fal-navy/40 bg-white px-3 py-2">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                      Recebido líquido
                    </p>
                    <p className="m-0 mt-1 text-base font-extrabold tabular-nums text-fal-navy">
                      {formatMoney(indicators.financial.netReceived)}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-fal-line bg-white px-3 py-2">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                      Bruto vendido
                    </p>
                    <p className="m-0 mt-1 text-base font-extrabold tabular-nums text-fal-navy">
                      {formatMoney(indicators.financial.grossSold)}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-fal-line bg-white px-3 py-2">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                      Valor cancelados
                    </p>
                    <p className="m-0 mt-1 text-base font-extrabold tabular-nums text-fal-navy">
                      {formatMoney(indicators.financial.cancelledAmount)}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-fal-line bg-white px-3 py-2">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
                      Pag. pendente
                    </p>
                    <p className="m-0 mt-1 text-base font-extrabold tabular-nums text-fal-navy">
                      {formatMoney(indicators.financial.pendingPayment)}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

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
              Expedição logística
            </h2>
            <p className="mb-3 text-xs text-fal-muted">
              Filas após embalagem. Melhor Envio e frete próprio separados — mock não entra nas
              filas reais.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {ADMIN_LOGISTICS_QUEUES.map((q) => {
                const n = logisticsCounts?.[q.id] ?? null
                return (
                  <Link
                    key={q.id}
                    to={q.path}
                    className="rounded-[14px] border border-fal-line bg-white p-4 no-underline transition hover:border-fal-navy"
                  >
                    <p className="text-sm font-bold text-fal-navy">{q.title}</p>
                    <p className="mt-2 text-3xl font-extrabold tabular-nums text-fal-navy">
                      {n == null ? '—' : n}
                    </p>
                    <p className="mt-2 text-xs text-fal-muted">{q.description}</p>
                    <p className="mt-3 text-xs font-semibold text-fal-navy">{q.primaryCta} →</p>
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
              <Link
                to="/admin/avisos"
                className="rounded-[10px] border border-fal-yellow-dark/50 bg-fal-yellow/20 px-3 py-2 text-sm font-extrabold text-fal-navy no-underline hover:border-fal-navy"
              >
                Notificações
              </Link>
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
                      <div className="min-w-0">
                        <Link
                          to={`/admin/pedidos/${o.id}`}
                          onClick={() => rememberOrdersReturnPath('/admin/pedidos')}
                          className="font-semibold text-fal-navy"
                        >
                          {o.id.slice(0, 8)}… · {o.customerName ?? 'Cliente'}
                        </Link>
                        <p className="mb-0 mt-0.5 text-xs font-extrabold text-fal-navy">
                          Faça agora:{' '}
                          {o.logisticsNextActionLabel ??
                            adminNextActionLabel(o.status, o.customerDecision)}
                        </p>
                        <p className="mb-0 mt-0.5 text-xs text-fal-muted">
                          {listStatusLabel(o)}
                          {o.shippingChoiceLabel ? ` · ${o.shippingChoiceLabel}` : ''}
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
                    <div className="min-w-0">
                      <Link
                        to={`/admin/pedidos/${o.id}`}
                        onClick={() => rememberOrdersReturnPath('/admin/pedidos')}
                        className="font-semibold text-fal-navy"
                      >
                        {o.id.slice(0, 8)}… · {o.customerName ?? 'Cliente'}
                      </Link>
                      <p className="mb-0 mt-0.5 text-xs text-fal-muted">
                        {formatDateTime(o.createdAt)} · {listStatusLabel(o)}
                        {o.shippingChoiceLabel ? ` · ${o.shippingChoiceLabel}` : ''}
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
