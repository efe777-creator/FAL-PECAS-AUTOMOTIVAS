import { CustomerWorkSurface } from '@/components/admin/customers/CustomerWorkSurface'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDateTime } from '@/lib/datetime'
import { formatPhoneMask } from '@/lib/phone'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminListAssignedPriceLists,
  adminListCustomers,
  ADMIN_CUSTOMERS_PAGE_SIZE,
  staffCanViewCustomersF8,
  type AdminAssignedPriceListOption,
  type AdminCustomerListRow,
} from '@/services/admin/adminCustomerService'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [assignedLists, setAssignedLists] = useState<AdminAssignedPriceListOption[]>([])

  const pushError = useCallback(
    (message: string) => {
      setError(message)
      toast.push(message, 'error')
    },
    [toast],
  )

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const ok = await staffCanViewCustomersF8()
        setAllowed(ok)
        if (!ok) return
        const [list, assigned] = await Promise.all([
          adminListCustomers(),
          adminListAssignedPriceLists(),
        ])
        setRows(list)
        setAssignedLists(assigned)
        setHasMore(list.length >= ADMIN_CUSTOMERS_PAGE_SIZE)
      } catch (e) {
        pushError(toUserMessage(e, 'Erro ao carregar clientes'))
      } finally {
        setLoading(false)
      }
    })()
  }, [pushError])

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

  function openGuide(id: string) {
    setError(null)
    setSelectedId(id)
    setGuideOpen(true)
  }

  function closeGuide() {
    setGuideOpen(false)
  }

  if (loading) return <Loading label="Carregando clientes…" />
  if (allowed === false) {
    return (
      <p className="text-sm text-red-600">
        Sem permissão para consultar clientes. Peça acesso a um administrador ou gerente.
      </p>
    )
  }

  const selectedRow = selectedId ? rows.find((r) => r.id === selectedId) : null

  const primary = (
    <div className="admin-customers-hub space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold text-fal-fg">Clientes</h1>
        <p className="mt-1 text-sm text-fal-muted">
          Consulta de cadastros e pedidos recentes na guia — {rows.length} cadastro
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

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum cliente cadastrado"
          description="Cadastros aparecem após registro na loja."
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nenhum resultado" description="Ajuste a busca ou limpe o filtro." />
      ) : (
        <>
          <div className="admin-customers-list-mobile fal-admin-scroll max-h-[min(60dvh,640px)] space-y-2 overflow-y-auto md:hidden">
            {filtered.map((r) => {
              const onGuide = guideOpen && selectedId === r.id
              return (
                <article
                  key={r.id}
                  className={`rounded-[14px] border border-fal-line bg-fal-surface p-3 ${
                    onGuide ? 'bg-fal-yellow/15' : ''
                  }`}
                >
                  <p className="m-0 text-sm font-extrabold text-fal-fg">{r.name ?? '—'}</p>
                  <p className="mb-0 mt-0.5 text-xs text-fal-muted">
                    {r.username ?? '—'} · {r.phone ? formatPhoneMask(r.phone) : '—'}
                  </p>
                  <p className="mb-0 mt-0.5 font-mono text-[11px] text-fal-muted">
                    {r.document ?? '—'} · {formatDateTime(r.createdAt)}
                  </p>
                  <button
                    type="button"
                    className="mt-2 inline-flex min-h-11 items-center rounded-[10px] bg-fal-yellow px-3 text-sm font-bold text-fal-navy-dark"
                    onClick={() => openGuide(r.id)}
                  >
                    {onGuide ? 'Na guia' : 'Abrir guia'}
                  </button>
                </article>
              )
            })}
            {hasMore ? (
              <div className="flex justify-center p-2">
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

          <div className="admin-customers-list-desktop fal-admin-scroll hidden max-h-[min(60dvh,640px)] overflow-auto rounded-[14px] border border-fal-line bg-fal-surface md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-[1] border-b border-fal-line bg-fal-bg text-xs uppercase text-fal-muted">
                <tr>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Usuário</th>
                  <th className="px-3 py-2">Telefone</th>
                  <th className="px-3 py-2">Documento</th>
                  <th className="px-3 py-2">Desde</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const onGuide = guideOpen && selectedId === r.id
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-fal-line last:border-0 ${
                        onGuide ? 'bg-fal-yellow/15' : ''
                      }`}
                    >
                      <td className="px-3 py-2 font-semibold text-fal-fg">{r.name ?? '—'}</td>
                      <td className="px-3 py-2">{r.username ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.phone ? formatPhoneMask(r.phone) : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{r.document ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="inline-flex min-h-9 items-center rounded-[10px] bg-fal-yellow px-2.5 text-xs font-bold text-fal-navy-dark"
                          onClick={() => openGuide(r.id)}
                        >
                          {onGuide ? 'Na guia' : 'Abrir guia'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
        </>
      )}
    </div>
  )

  return (
    <AdaptiveWorkspace
      moduleKey="customers"
      primary={primary}
      contextualOpen={guideOpen && Boolean(selectedId)}
      onContextualOpenChange={(open) => {
        if (!open) closeGuide()
      }}
      contextualTitle={selectedRow?.name ?? selectedRow?.username ?? 'Cliente'}
      contextual={
        guideOpen && selectedId ? (
          <CustomerWorkSurface
            customerId={selectedId}
            assignedLists={assignedLists}
            onClose={closeGuide}
            onError={pushError}
          />
        ) : null
      }
    />
  )
}
