import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { getMyOrderDetail } from '@/services/orders/orderDetailService'
import type { OrderDetail } from '@/types'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const statusLabel: Record<string, string> = {
  pendente: 'Pendente',
  aguardando_pagamento: 'Aguardando pagamento',
  pagamento_aprovado: 'Pagamento aprovado',
  em_separacao: 'Em separação',
  preparando_envio: 'Preparando envio',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

function money(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function AccountOrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    void (async () => {
      setLoading(true)
      try {
        setOrder(await getMyOrderDetail(id))
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar pedido')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) return <Loading label="Carregando pedido…" />
  if (error) return <ErrorState message={error} />
  if (!order) {
    return (
      <EmptyState
        title="Pedido não encontrado"
        description="Verifique o link ou volte à lista de pedidos."
        actionLabel="Meus pedidos"
        actionTo="/conta/pedidos"
      />
    )
  }

  const addr = order.addressSnapshot

  return (
    <div className="space-y-4">
      <div className="rounded-fal border border-fal-line bg-white p-5">
        <p className="m-0 text-sm">
          <Link to="/conta/pedidos" className="font-semibold text-fal-auth-link">
            ← Pedidos
          </Link>
        </p>
        <h2 className="mt-2 text-xl font-extrabold">Pedido {order.id.slice(0, 8)}…</h2>
        <p className="mb-0 text-sm text-fal-muted">
          {new Date(order.createdAt).toLocaleString('pt-BR')} ·{' '}
          <strong>{statusLabel[order.status] ?? order.status}</strong>
        </p>
      </div>

      <div className="rounded-fal border border-fal-line bg-white p-5">
        <h3 className="mt-0 text-base font-extrabold">Itens</h3>
        <ul className="m-0 list-none space-y-2 p-0">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 border-b border-fal-line py-2 text-sm last:border-0">
              <span>
                {i.quantity}× {i.nameSnapshot}
                <span className="block text-xs text-fal-muted">SKU {i.sku}</span>
              </span>
              <span className="font-semibold">{money(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Frete</span>
            <span>{money(order.shippingAmount)}</span>
          </div>
          <div className="flex justify-between text-lg font-black">
            <span>Total</span>
            <span>{money(order.total)}</span>
          </div>
        </div>
      </div>

      {addr ? (
        <div className="rounded-fal border border-fal-line bg-white p-5 text-sm">
          <h3 className="mt-0 text-base font-extrabold">Endereço (snapshot)</h3>
          <p className="m-0">
            {String(addr.recipient ?? '')}
            <br />
            {String(addr.street ?? '')}, {String(addr.number ?? '')}
            {addr.complement ? ` — ${String(addr.complement)}` : ''}
            <br />
            {addr.district ? `${String(addr.district)} · ` : ''}
            {String(addr.city ?? '')}/{String(addr.state ?? '')} · CEP {String(addr.postal_code ?? '')}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-fal border border-fal-line bg-white p-5 text-sm">
          <h3 className="mt-0 text-base font-extrabold">Pagamento</h3>
          {order.payment ? (
            <p className="m-0">
              {order.payment.provider} · {order.payment.status}
              <br />
              {order.payment.amount != null ? money(order.payment.amount) : null}
              {order.payment.externalRef ? (
                <>
                  <br />
                  Ref: {order.payment.externalRef}
                </>
              ) : null}
            </p>
          ) : (
            <p className="m-0 text-fal-muted">Sem registro</p>
          )}
        </div>
        <div className="rounded-fal border border-fal-line bg-white p-5 text-sm">
          <h3 className="mt-0 text-base font-extrabold">Envio</h3>
          {order.shipment ? (
            <p className="m-0">
              {String(order.shipment.metadata?.label ?? order.shipment.provider)} ·{' '}
              {order.shipment.status}
              <br />
              {order.shipment.amount != null ? money(order.shipment.amount) : null}
            </p>
          ) : (
            <p className="m-0 text-fal-muted">Sem registro</p>
          )}
        </div>
      </div>

      <div className="rounded-fal border border-fal-line bg-white p-5">
        <h3 className="mt-0 text-base font-extrabold">Histórico</h3>
        <ol className="m-0 list-none space-y-2 p-0">
          {order.history.map((h) => (
            <li key={h.id} className="border-l-2 border-fal-yellow pl-3 text-sm">
              <strong>{statusLabel[h.status] ?? h.status}</strong>
              <span className="block text-xs text-fal-muted">
                {new Date(h.createdAt).toLocaleString('pt-BR')}
                {h.note ? ` — ${h.note}` : ''}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
