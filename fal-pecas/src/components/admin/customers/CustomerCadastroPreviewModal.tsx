import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Modal } from '@/components/common/Modal'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import { formatPhoneMask } from '@/lib/phone'
import { orderStatusAdminLabel } from '@/lib/orderLifecycle'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminGetCustomer,
  adminListCustomers,
  ADMIN_CUSTOMERS_PAGE_SIZE,
  staffCanViewCustomersF8,
  type AdminCustomerDetail,
  type AdminCustomerListRow,
} from '@/services/admin/adminCustomerService'
import { useCallback, useEffect, useMemo, useState } from 'react'
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

type Props = {
  open: boolean
  onClose: () => void
}

export function CustomerCadastroPreviewModal({ open, onClose }: Props) {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [rows, setRows] = useState<AdminCustomerListRow[]>([])
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const ok = await staffCanViewCustomersF8()
      setAllowed(ok)
      if (!ok) return
      const list = await adminListCustomers()
      setRows(list)
      setHasMore(list.length >= ADMIN_CUSTOMERS_PAGE_SIZE)
    } catch (e) {
      setError(toUserMessage(e, 'Erro ao carregar clientes'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setDetail(null)
    setSelectedId(null)
    setError(null)
    void loadList()
  }, [open, loadList])

  const filtered = useMemo(
    () => rows.filter((r) => matchesQuery(r, query.trim())),
    [rows, query],
  )

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
      setError(toUserMessage(e, 'Erro ao carregar mais clientes'))
    } finally {
      setLoadingMore(false)
    }
  }

  async function openCustomer(id: string) {
    setError(null)
    setSelectedId(id)
    setDetailLoading(true)
    try {
      const d = await adminGetCustomer(id)
      if (!d) {
        setDetail(null)
        setError('Cliente não encontrado.')
        return
      }
      setDetail(d)
    } catch (e) {
      setDetail(null)
      setError(toUserMessage(e, 'Erro ao abrir cliente'))
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <Modal open={open} title="Cadastro de cliente" onClose={onClose}>
      <div className="space-y-3">
        {loading ? <Loading label="Carregando clientes…" /> : null}

        {!loading && allowed === false ? (
          <p className="m-0 text-sm text-red-600">
            Sem permissão para consultar clientes. Peça acesso a um administrador ou gerente.
          </p>
        ) : null}

        {!loading && allowed ? (
          <>
            <Input
              label="Buscar cliente"
              name="customer-preview-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome, CPF/CNPJ, usuário ou telefone"
            />

            {error ? <p className="m-0 text-sm text-red-600">{error}</p> : null}

            <div className="max-h-48 overflow-y-auto rounded-[12px] border border-fal-line">
              {rows.length === 0 ? (
                <div className="p-3">
                  <EmptyState
                    title="Nenhum cliente cadastrado"
                    description="Cadastros aparecem após registro na loja."
                  />
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-3">
                  <EmptyState title="Nenhum resultado" description="Ajuste a busca." />
                </div>
              ) : (
                <ul className="m-0 list-none divide-y divide-fal-line p-0">
                  {filtered.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className={[
                          'flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition hover:bg-fal-bg/60',
                          selectedId === r.id ? 'bg-[#fff8db]' : 'bg-transparent',
                        ].join(' ')}
                        onClick={() => void openCustomer(r.id)}
                      >
                        <span className="font-extrabold text-fal-fg">{r.name ?? 'Cliente'}</span>
                        <span className="text-xs text-fal-muted">
                          {r.document ?? 'sem documento'}
                          {r.phone ? ` · ${formatPhoneMask(r.phone)}` : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {hasMore ? (
              <button
                type="button"
                className="text-sm font-semibold text-fal-accent underline"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? 'Carregando…' : 'Carregar mais clientes'}
              </button>
            ) : null}

            <div className="rounded-[12px] border border-fal-line bg-fal-bg/40 p-3">
              {detailLoading ? <Loading label="Carregando cadastro…" /> : null}
              {!detailLoading && !detail ? (
                <p className="m-0 text-sm text-fal-muted">
                  Selecione um cliente para ver o preview do cadastro.
                </p>
              ) : null}
              {!detailLoading && detail ? (
                <div className="space-y-2 text-sm">
                  <h3 className="m-0 text-base font-extrabold text-fal-fg">
                    {detail.name ?? 'Cliente'}
                  </h3>
                  <p className="m-0 text-fal-muted">
                    {detail.username ?? '—'} · {detail.document ?? 'sem documento'} · tel{' '}
                    {detail.phone ? formatPhoneMask(detail.phone) : '—'}
                  </p>
                  <p className="m-0 text-xs text-fal-muted">
                    Desde {formatDateTime(detail.createdAt)} · {detail.addressCount} endereço
                    {detail.addressCount === 1 ? '' : 's'}
                  </p>
                  <div>
                    <p className="mb-1 mt-2 text-xs font-bold uppercase text-fal-muted">
                      Pedidos recentes
                    </p>
                    <ul className="m-0 list-none space-y-1 p-0">
                      {detail.recentOrders.length === 0 ? (
                        <li className="text-fal-muted">Nenhum pedido.</li>
                      ) : (
                        detail.recentOrders.map((o) => (
                          <li key={o.id}>
                            <Link
                              to={`/admin/pedidos/${o.id}`}
                              className="font-semibold text-fal-fg underline-offset-2 hover:underline"
                              onClick={onClose}
                            >
                              {o.id.slice(0, 8)}…
                            </Link>{' '}
                            · {orderStatusAdminLabel[o.status] ?? o.status} ·{' '}
                            {formatMoney(o.total)}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <p className="mb-0 mt-2 text-xs">
                    <Link
                      to="/admin/clientes"
                      className="font-semibold text-fal-accent"
                      onClick={onClose}
                    >
                      Abrir página de Clientes
                    </Link>
                  </p>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  )
}
