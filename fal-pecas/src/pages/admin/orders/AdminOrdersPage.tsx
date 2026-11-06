import { Button } from '@/components/common/Button'
import { useToast } from '@/components/common/Toast'
import {
  ADMIN_ORDER_GROUPS,
  orderMatchesGroup,
  sumGroupCount,
  type AdminOrderGroupId,
} from '@/lib/adminOrderOps'
import {
  confirmExpireUnpaidIntent,
  formatExpireUnpaidMessage,
  runExpireUnpaidOrders,
} from '@/lib/adminExpireUnpaidFlow'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminListOrders,
  adminOrderStatusCounts,
  ADMIN_LIST_PAGE_SIZE,
  type AdminOrderListRow,
} from '@/services/admin/adminOrderService'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminOrdersListPanel, filterOrdersBySearch } from './AdminOrdersListPanel'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { value: 'pagamento_aprovado', label: 'Pagamento aprovado' },
  { value: 'recebido', label: 'Aguardando início da análise' },
  { value: 'em_analise', label: 'Em análise pela loja' },
  { value: 'aguardando_disponibilidade', label: 'Disponibilidade (legado)' },
  { value: 'aguardando_decisao', label: 'Aguardando resposta do cliente' },
  { value: 'confirmado', label: 'Confirmados' },
  { value: 'em_separacao', label: 'Em separação' },
  { value: 'pronto_para_envio', label: 'Pronto para envio' },
  { value: 'enviado', label: 'Enviados' },
  { value: 'entregue', label: 'Entregues' },
  { value: 'cancelado', label: 'Cancelados' },
]

export function AdminOrdersPage() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState<AdminOrderListRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '')
  const [groupFilter, setGroupFilter] = useState<AdminOrderGroupId | ''>(
    (searchParams.get('grupo') as AdminOrderGroupId | null) ?? '',
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyExpire, setBusyExpire] = useState(false)
  const [search, setSearch] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  function syncParams(nextStatus: string, nextGroup: AdminOrderGroupId | '') {
    const p = new URLSearchParams()
    if (nextStatus) p.set('status', nextStatus)
    else if (nextGroup) p.set('grupo', nextGroup)
    setSearchParams(p)
  }

  function applyStatus(value: string) {
    setStatusFilter(value)
    setGroupFilter('')
    syncParams(value, '')
  }

  function applyGroup(value: AdminOrderGroupId | '') {
    setGroupFilter(value)
    setStatusFilter('')
    syncParams('', value)
  }

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [list, c] = await Promise.all([
        adminListOrders(statusFilter || null),
        adminOrderStatusCounts(),
      ])
      setRows(list)
      setHasMore(list.length >= ADMIN_LIST_PAGE_SIZE)
      setCounts(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const next = await adminListOrders(statusFilter || null, { offset: rows.length })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  useEffect(() => {
    const s = searchParams.get('status') ?? ''
    const g = (searchParams.get('grupo') as AdminOrderGroupId | null) ?? ''
    setStatusFilter(s)
    setGroupFilter(s ? '' : g)
  }, [searchParams])

  const byGroup = useMemo(
    () => rows.filter((o) => orderMatchesGroup(o.status, groupFilter)),
    [rows, groupFilter],
  )

  const visible = useMemo(() => filterOrdersBySearch(byGroup, search), [byGroup, search])

  async function runExpireUnpaid() {
    if (!(await confirmExpireUnpaidIntent())) return
    setBusyExpire(true)
    try {
      const r = await runExpireUnpaidOrders()
      toast.push(formatExpireUnpaidMessage(r), 'success')
      await reload()
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Falha ao expirar pedidos', 'error')
    } finally {
      setBusyExpire(false)
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/admin/pedidos" className="text-sm font-semibold text-fal-navy no-underline">
            ← Central de Pedidos
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold text-fal-navy">Lista avançada</h1>
          <p className="mt-1 text-sm text-fal-muted">
            Filtro fino por grupo e status. Para filas de trabalho, use as áreas da central.
          </p>
        </div>
        <Button
          type="button"
          variant="light"
          disabled={busyExpire || loading}
          onClick={() => void runExpireUnpaid()}
        >
          {busyExpire ? 'Expirando…' : 'Retirar não pagos (48 h)'}
        </Button>
      </header>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyGroup('')}
          className={[
            'rounded-[10px] border px-3 py-2 text-sm font-semibold',
            !groupFilter && !statusFilter
              ? 'border-fal-navy bg-fal-navy text-white'
              : 'border-fal-line bg-white text-fal-navy',
          ].join(' ')}
        >
          Todos
        </button>
        {ADMIN_ORDER_GROUPS.map((g) => {
          const n = sumGroupCount(counts, g)
          const active = groupFilter === g.id && !statusFilter
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => applyGroup(g.id)}
              title={g.description}
              className={[
                'rounded-[10px] border px-3 py-2 text-left text-sm',
                active
                  ? 'border-fal-navy bg-fal-navy text-white'
                  : 'border-fal-line bg-white text-fal-navy',
              ].join(' ')}
            >
              <span className="block text-[11px] opacity-80">{g.title}</span>
              <span className="text-lg font-extrabold tabular-nums">{n}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold text-fal-muted">
          Status
          <select
            className="mt-1 block rounded-[9px] border border-fal-line bg-white px-3 py-2 text-sm font-normal text-fal-navy"
            value={statusFilter}
            onChange={(e) => applyStatus(e.target.value)}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value || 'all'} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!loading && !error && hasMore ? (
        <p className="rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Exibindo até {ADMIN_LIST_PAGE_SIZE} registros por carga ({rows.length} carregados). Há mais
          pedidos — use “Carregar mais” ao final da lista ou filtre por status.
        </p>
      ) : null}

      <AdminOrdersListPanel
        rows={visible}
        loading={loading}
        error={error}
        search={search}
        onSearch={setSearch}
        showItemCount
        emptyTitle="Nenhum pedido neste filtro"
        emptyDescription="Altere o grupo, o status ou a busca."
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
