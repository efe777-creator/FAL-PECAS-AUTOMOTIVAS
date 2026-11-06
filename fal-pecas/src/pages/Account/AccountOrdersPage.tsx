import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDate } from '@/lib/datetime'
import { customerOrderListCta, orderStatusLabel } from '@/lib/orderLifecycle'
import { listMyOrders } from '@/services/customers/orderQueryService'
import type { CustomerOrderSummary } from '@/types'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export function AccountOrdersPage() {
  useDocumentTitle('Meus pedidos | FAL Peças Automotivas')
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
        setError(e instanceof Error ? e.message : 'Erro ao carregar pedidos')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <Loading label="Carregando pedidos…" />
  if (error) return <ErrorState message={error} />

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
        <div className="overflow-x-auto rounded-fal border border-fal-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-fal-bg text-fal-muted">
              <tr>
                <th className="px-3 py-2">Pedido</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Itens</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} className="border-t border-fal-line">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link
                      to={`/conta/pedidos/${o.id}`}
                      className="font-semibold text-fal-auth-link underline-offset-2 hover:underline"
                    >
                      {o.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {formatDate(o.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        o.status === 'aguardando_pagamento'
                          ? 'rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900'
                          : o.status === 'aguardando_decisao'
                            ? 'rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-900'
                            : undefined
                      }
                    >
                      {orderStatusLabel[o.status] ?? o.status}
                    </span>
                    {customerOrderListCta(o.status) ? (
                      <span className="mt-1 block text-xs font-semibold text-fal-auth-link">
                        {customerOrderListCta(o.status)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{o.itemCount}</td>
                  <td className="px-3 py-2 font-semibold">
                    {o.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
