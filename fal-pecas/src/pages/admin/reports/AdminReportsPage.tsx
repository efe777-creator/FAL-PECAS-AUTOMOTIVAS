import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatMoney } from '@/lib/money'
import { orderStatusAdminLabel } from '@/lib/orderLifecycle'
import { adminReportsBundle, staffCanViewReportsF8 } from '@/services/admin/adminReportsService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

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
        const message = e instanceof Error ? e.message : 'Erro ao carregar relatórios'
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
      <p className="text-sm text-red-600">
        Sem permissão para ver relatórios. Peça acesso a um administrador ou gerente.
      </p>
    )
  }

  const statusKeys = Object.keys(counts).sort()

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold text-fal-navy">Relatórios</h1>
        <p className="mt-1 text-sm text-fal-muted">Indicadores operacionais mínimos da FAL.</p>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Pedidos" value={String(totals.ordersTotal)} />
        <Stat title="Em aberto" value={String(totals.ordersOpen)} />
        <Stat title="Entregues" value={String(totals.ordersDelivered)} />
        <Stat title="Receita entregue" value={formatMoney(totals.revenueDelivered)} />
      </section>

      <section className="rounded-[14px] border border-fal-line bg-white p-4">
        <h2 className="mt-0 text-sm font-bold uppercase text-fal-muted">Pedidos por status</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {statusKeys.map((k) => (
            <Link
              key={k}
              to={`/admin/pedidos/lista?status=${k}`}
              className="rounded-[12px] border border-fal-line px-3 py-2 hover:border-fal-navy"
            >
              <div className="text-xs text-fal-muted">{orderStatusAdminLabel[k] ?? k}</div>
              <div className="text-xl font-extrabold text-fal-navy">{counts[k] ?? 0}</div>
            </Link>
          ))}
        </div>
        <p className="mb-0 mt-3 text-sm text-fal-muted">Cancelados (total): {totals.ordersCancelled}</p>
      </section>
    </div>
  )
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-fal-line bg-white px-3 py-3">
      <div className="text-xs font-bold uppercase text-fal-muted">{title}</div>
      <div className="text-xl font-extrabold text-fal-navy">{value}</div>
    </div>
  )
}
