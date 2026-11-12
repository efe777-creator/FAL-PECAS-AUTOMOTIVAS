import { Button } from '@/components/common/Button'
import { useToast } from '@/components/common/Toast'
import {
  ADMIN_LOGISTICS_QUEUES,
  getAdminLogisticsQueue,
  type AdminLogisticsQueueId,
} from '@/lib/adminLogisticsQueues'
import { getAdminOrderArea } from '@/lib/adminOrderOps'
import {
  confirmExpireUnpaidIntent,
  formatExpireUnpaidMessage,
  runExpireUnpaidOrders,
} from '@/lib/adminExpireUnpaidFlow'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  ADMIN_LIST_PAGE_SIZE,
  adminListLogisticsQueue,
  adminListOrders,
  type AdminOrderListRow,
} from '@/services/admin/adminOrderService'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { AdminOrdersListPanel, filterOrdersBySearch } from './AdminOrdersListPanel'

const EXPEDICAO_FILAS: readonly AdminLogisticsQueueId[] = [
  'volumes',
  'etiquetas-me',
  'entregas-proprias',
  'transito',
  'entregues',
]

function areaIdFromPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? ''
}

function parseFila(raw: string | null): AdminLogisticsQueueId {
  if (raw && EXPEDICAO_FILAS.includes(raw as AdminLogisticsQueueId)) {
    return raw as AdminLogisticsQueueId
  }
  return 'volumes'
}

export function AdminOrdersAreaPage() {
  const toast = useToast()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const areaId = areaIdFromPath(location.pathname)
  const area = getAdminOrderArea(areaId)
  useDocumentTitle(area ? `${area.title} | Admin FAL` : 'Pedidos | Admin FAL')
  const [rows, setRows] = useState<AdminOrderListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [busyExpire, setBusyExpire] = useState(false)
  const expFila = parseFila(searchParams.get('fila'))

  const serverStatuses = useMemo(() => {
    if (!area) return [] as readonly string[]
    if (area.id === 'expedicao') return [] as readonly string[]
    return area.statuses
  }, [area])

  async function reload() {
    if (!area) {
      setRows([])
      setHasMore(false)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (area.id === 'expedicao') {
        const list = await adminListLogisticsQueue(expFila, {
          offset: 0,
          limit: ADMIN_LIST_PAGE_SIZE,
        })
        setRows(list)
        setHasMore(list.length >= ADMIN_LIST_PAGE_SIZE)
      } else {
        const list = await adminListOrders(null, {
          offset: 0,
          limit: ADMIN_LIST_PAGE_SIZE,
          statuses: serverStatuses,
        })
        setRows(list)
        setHasMore(list.length >= ADMIN_LIST_PAGE_SIZE)
      }
    } catch (e) {
      setError(toUserMessage(e, 'Erro ao carregar'))
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    setError(null)
    try {
      if (area?.id === 'expedicao') {
        const next = await adminListLogisticsQueue(expFila, {
          offset: rows.length,
          limit: ADMIN_LIST_PAGE_SIZE,
        })
        setRows((prev) => {
          const seen = new Set(prev.map((r) => r.id))
          return [...prev, ...next.filter((r) => !seen.has(r.id))]
        })
        setHasMore(next.length >= ADMIN_LIST_PAGE_SIZE)
      } else {
        const next = await adminListOrders(null, {
          offset: rows.length,
          limit: ADMIN_LIST_PAGE_SIZE,
          statuses: serverStatuses,
        })
        setRows((prev) => {
          const seen = new Set(prev.map((r) => r.id))
          return [...prev, ...next.filter((r) => !seen.has(r.id))]
        })
        setHasMore(next.length >= ADMIN_LIST_PAGE_SIZE)
      }
    } catch (e) {
      setError(toUserMessage(e, 'Erro ao carregar mais pedidos'))
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId, expFila, serverStatuses])

  const filtered = useMemo(() => filterOrdersBySearch(rows, search), [rows, search])
  const filaMeta = getAdminLogisticsQueue(expFila)

  if (!area) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-fal-muted">Área não encontrada.</p>
        <Link to="/admin/pedidos" className="font-semibold text-fal-navy underline">
          Voltar à central
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="mt-0 text-2xl font-extrabold text-fal-navy">{area.title}</h1>
        <p className="mt-1 text-sm text-fal-muted">{area.description}</p>
        {area.id === 'expedicao' && filaMeta ? (
          <p className="mt-1 text-xs font-semibold text-fal-navy">
            Fila: {filaMeta.title} — {filaMeta.primaryCta}
          </p>
        ) : (
          <p className="mt-1 text-xs font-semibold text-fal-navy">
            Próxima ação típica: {area.primaryCta}
          </p>
        )}
      </div>

      {area.id === 'aguardando-pagamento' ? (
        <Button
          type="button"
          variant="light"
          disabled={busyExpire || loading}
          onClick={() => {
            void (async () => {
              if (!(await confirmExpireUnpaidIntent({ detailed: false }))) return
              setBusyExpire(true)
              try {
                const r = await runExpireUnpaidOrders()
                toast.push(formatExpireUnpaidMessage(r), 'success')
                await reload()
              } catch (e) {
                toast.push(toUserMessage(e, 'Falha ao expirar'), 'error')
              } finally {
                setBusyExpire(false)
              }
            })()
          }}
        >
          {busyExpire ? 'Expirando…' : 'Retirar não pagos (48 h)'}
        </Button>
      ) : null}

      {area.id === 'expedicao' ? (
        <div className="flex flex-wrap gap-2">
          {EXPEDICAO_FILAS.map((id) => {
            const q = ADMIN_LOGISTICS_QUEUES.find((x) => x.id === id)
            if (!q) return null
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSearchParams({ fila: id })}
                className={[
                  'rounded-[10px] border px-3 py-2 text-sm font-semibold',
                  expFila === id
                    ? 'border-fal-navy bg-fal-navy text-white'
                    : 'border-fal-line bg-white text-fal-navy',
                ].join(' ')}
              >
                {q.title}
              </button>
            )
          })}
          <Link
            to="/admin/pedidos/visao/revisao-logistica"
            className="rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm font-semibold text-fal-navy no-underline"
          >
            Revisão e ocorrências
          </Link>
        </div>
      ) : null}

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
        showWaitingTime={area.id === 'aguardando-pagamento'}
        showItemPreview={area.id === 'separacao'}
        emptyDescription={
          area.id === 'expedicao' && expFila === 'volumes'
            ? 'Pedidos Melhor Envio ou frete próprio sem packing completo aparecem aqui.'
            : area.id === 'expedicao' && expFila === 'etiquetas-me'
              ? 'Só pedidos ME embalados, pagos e sem etiqueta comprada.'
              : area.id === 'expedicao' && expFila === 'entregas-proprias'
                ? 'Só provider own (nunca mock), embalados e pagos.'
                : undefined
        }
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
    </div>
  )
}
