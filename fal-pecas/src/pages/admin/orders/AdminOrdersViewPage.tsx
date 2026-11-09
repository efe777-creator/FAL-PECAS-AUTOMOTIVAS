import { Button } from '@/components/common/Button'
import { useToast } from '@/components/common/Toast'
import {
  getAdminOrderView,
  orderMatchesProblemsView,
} from '@/lib/adminOrderOps'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  ADMIN_LIST_PAGE_SIZE,
  adminListOrders,
  type AdminOrderListRow,
} from '@/services/admin/adminOrderService'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AdminOrdersListPanel, filterOrdersBySearch } from './AdminOrdersListPanel'

export function AdminOrdersViewPage() {
  const { viewId = '' } = useParams()
  const view = getAdminOrderView(viewId)
  useDocumentTitle(view ? `${view.title} | Admin FAL` : 'Pedidos | Admin FAL')
  const toast = useToast()
  const [rows, setRows] = useState<AdminOrderListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  function pushError(message: string) {
    setError(message)
    toast.push(message, 'error')
  }

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const list = await adminListOrders(null, { offset: 0, limit: ADMIN_LIST_PAGE_SIZE })
      setRows(list)
      setHasMore(list.length >= ADMIN_LIST_PAGE_SIZE)
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao carregar'))
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    setError(null)
    try {
      const next = await adminListOrders(null, {
        offset: rows.length,
        limit: ADMIN_LIST_PAGE_SIZE,
      })
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id))
        return [...prev, ...next.filter((r) => !seen.has(r.id))]
      })
      setHasMore(next.length >= ADMIN_LIST_PAGE_SIZE)
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao carregar mais pedidos'))
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [viewId])

  const filtered = useMemo(() => {
    if (!view) return []
    if (view.placeholder) return []
    let base = rows
    if (view.id === 'solicitacoes-cancelamento') {
      base = rows.filter((o) => o.cancellationRequest === 'pending')
    } else if (view.id === 'problemas') {
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
        <h1 className="mt-0 text-2xl font-extrabold text-fal-navy">{view.title}</h1>
        <p className="mt-1 text-sm text-fal-muted">{view.description}</p>
      </div>

      {view.placeholder ? (
        <div className="rounded-[14px] border border-fal-line bg-white p-5 text-sm text-fal-muted">
          Esta visão ainda não está disponível neste ambiente. Nenhum status artificial foi criado.
        </div>
      ) : (
        <>
          {!loading && !error && hasMore ? (
            <p className="rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Exibindo até {ADMIN_LIST_PAGE_SIZE} pedidos por carga ({rows.length} carregados). A
              visão filtra o que já veio do servidor — use “Carregar mais pedidos” se faltar volume.
            </p>
          ) : null}
          <AdminOrdersListPanel
            rows={filtered}
            loading={loading}
            error={error}
            search={search}
            onSearch={setSearch}
          />
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
        </>
      )}
    </div>
  )
}
