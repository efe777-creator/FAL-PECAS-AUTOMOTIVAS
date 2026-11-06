import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { toUserMessage } from '@/lib/toUserMessage'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import { formatPhoneMask } from '@/lib/phone'
import { orderStatusAdminLabel } from '@/lib/orderLifecycle'
import {
  adminGetCustomer,
  adminListCustomers,
  ADMIN_CUSTOMERS_PAGE_SIZE,
  staffCanViewCustomersF8,
  type AdminCustomerDetail,
  type AdminCustomerListRow,
} from '@/services/admin/adminCustomerService'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

function matchesQuery(row: AdminCustomerListRow, q: string): boolean {
  if (!q) return true
  const hay = [row.name, row.username, row.document, row.phone]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
  return q
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t))
}

export function AdminCustomersPage() {
  useDocumentTitle('Clientes | Admin FAL')
  const toast = useToast()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [rows, setRows] = useState<AdminCustomerListRow[]>([])
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  function pushError(message: string) {
    setError(message)
    toast.push(message, 'error')
  }

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const ok = await staffCanViewCustomersF8()
        setAllowed(ok)
        if (!ok) return
        const list = await adminListCustomers()
        setRows(list)
        setHasMore(list.length >= ADMIN_CUSTOMERS_PAGE_SIZE)
      } catch (e) {
        pushError(e instanceof Error ? e.message : 'Erro ao carregar clientes')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [])

  const filtered = useMemo(() => rows.filter((r) => matchesQuery(r, query.trim())), [rows, query])

  async function loadMore() {
    setLoadingMore(true)
    setError(null)
    try {
      const next = await adminListCustomers({ offset: rows.length })
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id))
        return [...prev, ...next.filter((r) => !seen.has(r.id))]
      })
      setHasMore(next.length >= ADMIN_CUSTOMERS_PAGE_SIZE)
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao carregar mais clientes'))
    } finally {
      setLoadingMore(false)
    }
  }

  async function open(id: string) {
    setError(null)
    setSelectedId(id)
    setDetailLoading(true)
    try {
      const d = await adminGetCustomer(id)
      if (!d) {
        setDetail(null)
        pushError('Cliente não encontrado.')
        return
      }
      setDetail(d)
    } catch (e) {
      setDetail(null)
      pushError(e instanceof Error ? e.message : 'Erro ao abrir cliente')
    } finally {
      setDetailLoading(false)
    }
  }

  if (loading) return <Loading label="Carregando clientes…" />
  if (allowed === false) {
    return (
      <p className="text-sm text-red-600">
        Sem permissão para consultar clientes. Peça acesso a um administrador ou gerente.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold text-fal-navy">Clientes</h1>
        <p className="mt-1 text-sm text-fal-muted">
          Consulta de cadastros e pedidos recentes — {rows.length} cadastro
          {rows.length === 1 ? '' : 's'} carregado{rows.length === 1 ? '' : 's'}.
        </p>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {hasMore ? (
        <p className="rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Exibindo até {ADMIN_CUSTOMERS_PAGE_SIZE} registros por carga. A busca vale só para os{' '}
          {rows.length} já carregados — use “Carregar mais clientes” para ampliar.
        </p>
      ) : null}

      <div className="max-w-md">
        <Input
          label="Buscar"
          name="customer-q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome, usuário, documento ou telefone"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
          {rows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Nenhum cliente cadastrado"
                description="Cadastros aparecem após registro na loja."
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Nenhum resultado"
                description="Ajuste a busca ou limpe o filtro."
              />
            </div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-fal-line bg-fal-bg text-xs uppercase text-fal-muted">
                <tr>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Usuário</th>
                  <th className="px-3 py-2">Telefone</th>
                  <th className="px-3 py-2">Documento</th>
                  <th className="px-3 py-2">Desde</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className={[
                      'cursor-pointer border-b border-fal-line last:border-0 hover:bg-fal-bg/60',
                      selectedId === r.id ? 'bg-[#fff8db]' : '',
                    ].join(' ')}
                    onClick={() => void open(r.id)}
                  >
                    <td className="px-3 py-2 font-semibold text-fal-navy">{r.name ?? '—'}</td>
                    <td className="px-3 py-2">{r.username ?? '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.phone ? formatPhoneMask(r.phone) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.document ?? '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {hasMore ? (
            <div className="flex justify-center border-t border-fal-line p-3">
              <Button
                type="button"
                variant="outline"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? 'Carregando…' : 'Carregar mais clientes'}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="rounded-[14px] border border-fal-line bg-white p-4">
          {detailLoading ? <Loading label="Carregando detalhe…" /> : null}
          {!detailLoading && !detail ? (
            <p className="text-sm text-fal-muted">Selecione um cliente.</p>
          ) : null}
          {!detailLoading && detail ? (
            <div className="space-y-3 text-sm">
              <h2 className="m-0 text-lg font-extrabold text-fal-navy">{detail.name ?? 'Cliente'}</h2>
              <p className="m-0 text-fal-muted">
                {detail.username ?? '—'} · {detail.document ?? 'sem documento'} · tel{' '}
                {detail.phone ? formatPhoneMask(detail.phone) : '—'}
              </p>
              <p className="m-0 text-xs text-fal-muted">
                Desde {formatDateTime(detail.createdAt)} · {detail.addressCount} endereço
                {detail.addressCount === 1 ? '' : 's'}
              </p>
              <div>
                <h3 className="text-xs font-bold uppercase text-fal-muted">Pedidos recentes</h3>
                <ul className="mt-2 space-y-1">
                  {detail.recentOrders.length === 0 ? (
                    <li className="text-fal-muted">Nenhum pedido.</li>
                  ) : (
                    detail.recentOrders.map((o) => (
                      <li key={o.id}>
                        <Link
                          to={`/admin/pedidos/${o.id}`}
                          className="font-semibold text-fal-navy underline-offset-2 hover:underline"
                        >
                          {o.id.slice(0, 8)}…
                        </Link>{' '}
                        · {orderStatusAdminLabel[o.status] ?? o.status} · {formatMoney(o.total)}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
