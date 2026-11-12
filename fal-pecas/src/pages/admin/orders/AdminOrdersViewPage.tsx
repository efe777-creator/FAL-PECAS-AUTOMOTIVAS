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
  adminListLogisticsQueue,
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
  const isRevisaoLogistica = viewId === 'revisao-logistica'

  function pushError(message: string) {
    setError(message)
    toast.push(message, 'error')
  }

  const listOpts = useMemo(() => {
    if (!view || view.placeholder) return null
    if (view.id === 'revisao-logistica') return null
    if (view.id === 'solicitacoes-cancelamento') {
      return { cancellationRequest: 'pending' as const }
    }
    if (view.id === 'problemas') {
      return { problems: true as const }
    }
    if (view.statuses && view.statuses.length > 0) {
      return { statuses: view.statuses }
    }
    return {}
  }, [view])

  async function reload() {
    if (!view || view.placeholder) {
      setRows([])
      setHasMore(false)
      setLoading(false)
      return
    }
    if (!isRevisaoLogistica && listOpts == null) {
      setRows([])
      setHasMore(false)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = isRevisaoLogistica
        ? await adminListLogisticsQueue('revisao', {
            offset: 0,
            limit: ADMIN_LIST_PAGE_SIZE,
          })
        : await adminListOrders(null, {
            offset: 0,
            limit: ADMIN_LIST_PAGE_SIZE,
            ...listOpts!,
          })
      setRows(list)
      setHasMore(list.length >= ADMIN_LIST_PAGE_SIZE)
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao carregar'))
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    if (!isRevisaoLogistica && listOpts == null) return
    setLoadingMore(true)
    setError(null)
    try {
      const next = isRevisaoLogistica
        ? await adminListLogisticsQueue('revisao', {
            offset: rows.length,
            limit: ADMIN_LIST_PAGE_SIZE,
          })
        : await adminListOrders(null, {
            offset: rows.length,
            limit: ADMIN_LIST_PAGE_SIZE,
            ...listOpts!,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId, listOpts])

  const filtered = useMemo(() => {
    if (!view || view.placeholder) return []
    let base = rows
    if (view.id === 'problemas') {
      base = rows.filter((o) =>
        orderMatchesProblemsView({
          status: o.status,
          customerDecision: o.customerDecision,
          paymentStatus: o.paymentStatus,
        }),
      )
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
            <p className="rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm text-fal-muted">
              Fila server-side · {rows.length} carregados · use “Carregar mais” para a próxima página.
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
