import { Button } from '@/components/common/Button'
import { useToast } from '@/components/common/Toast'
import {
  getAdminOrderArea,
  orderMatchesArea,
  type AdminOrderAreaId,
} from '@/lib/adminOrderOps'
import {
  confirmExpireUnpaidIntent,
  formatExpireUnpaidMessage,
  runExpireUnpaidOrders,
} from '@/lib/adminExpireUnpaidFlow'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  ADMIN_LIST_PAGE_SIZE,
  adminListOrders,
  type AdminOrderListRow,
} from '@/services/admin/adminOrderService'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AdminOrdersListPanel, filterOrdersBySearch } from './AdminOrdersListPanel'

const EXPEDICAO_TABS = [
  { id: 'pronto', label: 'Prontos para envio', statuses: ['pronto_para_envio', 'preparando_envio'] },
  { id: 'transito', label: 'Em trânsito', statuses: ['enviado'] },
  { id: 'entregues', label: 'Entregues ao cliente', statuses: ['entregue'] },
] as const

function areaIdFromPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? ''
}

export function AdminOrdersAreaPage() {
  const toast = useToast()
  const location = useLocation()
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
  const [expTab, setExpTab] = useState<(typeof EXPEDICAO_TABS)[number]['id']>('pronto')

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const list = await adminListOrders(null, { offset: 0, limit: ADMIN_LIST_PAGE_SIZE })
      setRows(list)
      setHasMore(list.length >= ADMIN_LIST_PAGE_SIZE)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
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
      setError(toUserMessage(e, 'Erro ao carregar mais pedidos'))
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [areaId])

  const filtered = useMemo(() => {
    if (!area) return []
    let base = rows.filter((o) => orderMatchesArea(o.status, area.id as AdminOrderAreaId))
    if (area.id === 'expedicao') {
      const tab = EXPEDICAO_TABS.find((t) => t.id === expTab) ?? EXPEDICAO_TABS[0]
      base = base.filter((o) => (tab.statuses as readonly string[]).includes(o.status))
    }
    return filterOrdersBySearch(base, search)
  }, [rows, area, search, expTab])

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
        <p className="mt-1 text-xs font-semibold text-fal-navy">Próxima ação típica: {area.primaryCta}</p>
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
                toast.push(e instanceof Error ? e.message : 'Falha ao expirar', 'error')
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
          {EXPEDICAO_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setExpTab(t.id)}
              className={[
                'rounded-[10px] border px-3 py-2 text-sm font-semibold',
                expTab === t.id
                  ? 'border-fal-navy bg-fal-navy text-white'
                  : 'border-fal-line bg-white text-fal-navy',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {!loading && !error && hasMore ? (
        <p className="rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Exibindo até {ADMIN_LIST_PAGE_SIZE} pedidos por carga ({rows.length} carregados). A fila
          filtra o que já veio do servidor — use “Carregar mais pedidos” se faltar volume.
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
          area.id === 'expedicao' && expTab === 'pronto'
            ? 'Quando a separação for concluída, os pedidos aparecem aqui para etiqueta e postagem.'
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
