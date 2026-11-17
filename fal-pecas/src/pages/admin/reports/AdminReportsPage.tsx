import { ReportsSummaryPanel } from '@/components/admin/reports/ReportsSummaryPanel'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
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

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold text-fal-fg">Relatórios</h1>
        <p className="mt-1 text-sm text-fal-muted">
          Totais operacionais da FAL. A série diária (GMV/caixa) também está nos widgets do
          Painel.
        </p>
        <p className="mt-2 text-sm">
          <Link
            to="/admin"
            className="font-semibold text-fal-accent underline-offset-2 hover:underline"
          >
            ← Voltar ao Painel
          </Link>
        </p>
      </header>

      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}

      <ReportsSummaryPanel totals={totals} counts={counts} />

      <p className="mb-0 text-sm text-fal-muted">
        Cancelados (total):{' '}
        <span className="font-semibold text-fal-danger">{totals.ordersCancelled}</span>
      </p>
    </div>
  )
}
