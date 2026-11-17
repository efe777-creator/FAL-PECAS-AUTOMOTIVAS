import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatMoney } from '@/lib/money'
import { orderStatusAdminLabel } from '@/lib/orderLifecycle'
import { toUserMessage } from '@/lib/toUserMessage'
import { adminReportsBundle, staffCanViewReportsF8 } from '@/services/admin/adminReportsService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type Tone = 'neutral' | 'warning' | 'success' | 'info' | 'danger'

export function AdminReportsPage() {
  useDocumentTitle('Relatórios | Admin FAL')
  const toast = useToast()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [totals, setTotals] = useState({
    ordersTotal: 0,
    ordersOpen: 0,
    ordersDelivered: 0,
    ordersCancelled: 0,
    revenueDelivered: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const ok = await staffCanViewReportsF8()
        setAllowed(ok)
        if (!ok) return
        const bundle = await adminReportsBundle()
        setCounts(bundle.counts)
        setTotals(bundle.totals)
        setError(null)
      } catch (e) {
        const message = toUserMessage(e, 'Erro ao carregar relatórios')
        setError(message)
        toast.push(message, 'error')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [])

  if (loading) return <Loading label="Carregando relatórios…" />
  if (allowed === false) {
    return (
      <p className="text-sm text-fal-danger">
        Sem permissão para ver relatórios. Peça acesso a um administrador ou gerente.
      </p>
    )
  }

  const statusKeys = Object.keys(counts).sort()

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold text-fal-fg">Relatórios</h1>
        <p className="mt-1 text-sm text-fal-muted">
          Totais operacionais da FAL. Sem gráfico de tendência enquanto não houver série temporal
          confiável — o Painel mostra o que precisa de ação agora.
        </p>
        <p className="mt-2 text-sm">
          <Link to="/admin" className="font-semibold text-fal-accent underline-offset-2 hover:underline">
            ← Voltar ao Painel
          </Link>
        </p>
      </header>

      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Pedidos" value={String(totals.ordersTotal)} tone="neutral" />
        <Stat title="Em aberto" value={String(totals.ordersOpen)} tone="warning" />
        <Stat title="Entregues" value={String(totals.ordersDelivered)} tone="success" />
        <Stat title="Receita entregue" value={formatMoney(totals.revenueDelivered)} tone="info" />
      </section>

      <section className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
        <h2 className="mt-0 text-sm font-bold uppercase text-fal-muted">Pedidos por status</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {statusKeys.map((k) => (
            <Link
              key={k}
              to={`/admin/pedidos/lista?status=${k}`}
              className="rounded-[12px] border border-fal-line bg-fal-bg px-3 py-2 hover:border-fal-accent"
            >
              <div className="text-xs text-fal-muted">{orderStatusAdminLabel[k] ?? k}</div>
              <div className="text-xl font-extrabold text-fal-fg">{counts[k] ?? 0}</div>
            </Link>
          ))}
        </div>
        <p className="mb-0 mt-3 text-sm text-fal-muted">
          Cancelados (total):{' '}
          <span className="font-semibold text-fal-danger">{totals.ordersCancelled}</span>
        </p>
      </section>
    </div>
  )
}

function Stat({ title, value, tone = 'neutral' }: { title: string; value: string; tone?: Tone }) {
  const toneCls: Record<Tone, string> = {
    neutral: 'border-fal-line',
    warning: 'border-fal-warning/40 bg-fal-warning/10',
    success: 'border-fal-success/40 bg-fal-success/10',
    info: 'border-fal-accent/40 bg-fal-accent/10',
    danger: 'border-fal-danger/40 bg-fal-danger/10',
  }
  return (
    <div className={`rounded-[12px] border bg-fal-surface px-3 py-3 ${toneCls[tone]}`}>
      <div className="text-xs font-bold uppercase text-fal-muted">{title}</div>
      <div className="text-xl font-extrabold text-fal-fg">{value}</div>
    </div>
  )
}
