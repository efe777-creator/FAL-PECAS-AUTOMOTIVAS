import { Button } from '@/components/common/Button'
import { ButtonLink } from '@/components/common/ButtonLink'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDate } from '@/lib/datetime'
import { customerOrderListCta, orderStatusLabel } from '@/lib/orderLifecycle'
import { listMyOrders } from '@/services/customers/orderQueryService'
import type { CustomerOrderSummary } from '@/types'
import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function statusBadgeClass(status: string): string | undefined {
  if (status === 'aguardando_pagamento') {
    return 'rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900'
  }
  if (status === 'aguardando_decisao') {
    return 'rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-900'
  }
  return undefined
}

export function AccountOrdersPage() {
  useDocumentTitle('Meus pedidos | FAL Peças Automotivas')
  const toast = useToast()
  const navigate = useNavigate()
  const [items, setItems] = useState<CustomerOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        setItems(await listMyOrders())
        setError(null)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Erro ao carregar pedidos'
        setError(message)
        toast.push(message, 'error')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [])

  if (loading) return <Loading label="Carregando pedidos…" />
  if (error) return <ErrorState message={error} />

  function openOrder(id: string) {
    navigate(`/conta/pedidos/${id}`)
  }

  function onCtaClick(e: MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    navigate(`/conta/pedidos/${id}`)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-fal border border-fal-line bg-white p-5">
        <h2 className="mt-0 text-xl font-extrabold">Meus pedidos</h2>
        <p className="text-sm text-fal-muted">
          Acompanhe o status, continue o pagamento pendente ou responda quando a loja pedir
          autorização.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Você ainda não possui pedidos."
          description="Quando houver compras, elas aparecerão aqui."
          actionLabel="Ver catálogo"
          actionTo="/catalogo"
        />
      ) : (
        <>
          {/* Mobile: cards clicáveis */}
          <ul className="m-0 list-none space-y-3 p-0 md:hidden">
            {items.map((o) => {
              const cta = customerOrderListCta(o.status)
              return (
                <li key={o.id}>
                  <article
                    role="link"
                    tabIndex={0}
                    className="cursor-pointer rounded-fal border border-fal-line bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-navy"
                    onClick={() => openOrder(o.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openOrder(o.id)
                      }
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="m-0 font-mono text-xs font-semibold text-fal-navy">
                          Pedido {o.id.slice(0, 8)}…
                        </p>
                        <p className="mt-1 mb-0 text-sm text-fal-muted">{formatDate(o.createdAt)}</p>
                      </div>
                      <span className={statusBadgeClass(o.status)}>
                        {orderStatusLabel[o.status] ?? o.status}
                      </span>
                    </div>
                    <p className="mt-3 mb-0 text-sm">
                      {o.itemCount} item{o.itemCount === 1 ? '' : 's'} ·{' '}
                      <span className="font-semibold">
                        {o.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </p>
                    {cta ? (
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="primary"
                          className="w-full"
                          onClick={(e) => onCtaClick(e, o.id)}
                        >
                          {cta.replace(/\s*→\s*$/, '')}
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-3 mb-0 text-sm font-semibold text-fal-auth-link">Ver detalhes</p>
                    )}
                  </article>
                </li>
              )
            })}
          </ul>

          {/* Desktop: tabela */}
          <div className="hidden overflow-x-auto rounded-fal border border-fal-line bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-fal-bg text-fal-muted">
                <tr>
                  <th className="px-3 py-2">Pedido</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Itens</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => {
                  const cta = customerOrderListCta(o.status)
                  return (
                    <tr key={o.id} className="border-t border-fal-line">
                      <td className="px-3 py-2 font-mono text-xs">
                        <Link
                          to={`/conta/pedidos/${o.id}`}
                          className="font-semibold text-fal-auth-link underline-offset-2 hover:underline"
                        >
                          {o.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="px-3 py-2">{formatDate(o.createdAt)}</td>
                      <td className="px-3 py-2">
                        <span className={statusBadgeClass(o.status)}>
                          {orderStatusLabel[o.status] ?? o.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">{o.itemCount}</td>
                      <td className="px-3 py-2 font-semibold">
                        {o.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-3 py-2">
                        {cta ? (
                          <ButtonLink to={`/conta/pedidos/${o.id}`} variant="primary">
                            {cta.replace(/\s*→\s*$/, '')}
                          </ButtonLink>
                        ) : (
                          <Link
                            to={`/conta/pedidos/${o.id}`}
                            className="text-sm font-semibold text-fal-auth-link underline-offset-2 hover:underline"
                          >
                            Abrir
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
