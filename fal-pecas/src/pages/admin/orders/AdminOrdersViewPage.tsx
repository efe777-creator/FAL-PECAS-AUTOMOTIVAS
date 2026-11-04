import {
  getAdminOrderView,
  orderMatchesProblemsView,
} from '@/lib/adminOrderOps'
import { adminListOrders, type AdminOrderListRow } from '@/services/admin/adminOrderService'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AdminOrdersListPanel, filterOrdersBySearch } from './AdminOrdersListPanel'

export function AdminOrdersViewPage() {
  const { viewId = '' } = useParams()
  const view = getAdminOrderView(viewId)
  const [rows, setRows] = useState<AdminOrderListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        setRows(await adminListOrders(null))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar')
      } finally {
        setLoading(false)
      }
    })()
  }, [viewId])

  const filtered = useMemo(() => {
    if (!view) return []
    if (view.placeholder) return []
    let base = rows
    if (view.id === 'problemas') {
      base = rows.filter((o) =>
        orderMatchesProblemsView({
          status: o.status,
          customerDecision: o.customerDecision,
          paymentStatus: o.paymentStatus,
        }),
      )
    } else if (view.statuses) {
      const set = new Set(view.statuses)
      base = rows.filter((o) => set.has(o.status))
    }
    return filterOrdersBySearch(base, search)
  }, [rows, view, search])

  if (!view) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-fal-muted">Visão não encontrada.</p>
        <Link to="/admin/pedidos" className="font-semibold text-fal-navy underline">
          Voltar à central
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Link to="/admin/pedidos" className="text-sm font-semibold text-fal-navy no-underline">
          ← Central de Pedidos
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-fal-navy">{view.title}</h1>
        <p className="mt-1 text-sm text-fal-muted">{view.description}</p>
      </div>

      {view.placeholder ? (
        <div className="rounded-[14px] border border-fal-line bg-white p-5 text-sm text-fal-muted">
          Esta visão fica pronta quando a Onda 2 (solicitação de cancelamento pós-pago) existir no
          banco. Nenhum status artificial foi criado.
        </div>
      ) : (
        <AdminOrdersListPanel
          rows={filtered}
          loading={loading}
          error={error}
          search={search}
          onSearch={setSearch}
        />
      )}
    </div>
  )
}
