import { ButtonLink } from '@/components/common/ButtonLink'
import { Loading } from '@/components/common/Loading'
import { Container } from '@/components/layout/Container'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatMoney } from '@/lib/money'
import { orderStatusLabel } from '@/lib/orderLifecycle'
import { paymentStatusLabel } from '@/lib/paymentLabels'
import { getMyOrderDetail } from '@/services/orders/orderDetailService'
import type { OrderDetail } from '@/types'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

function addressLine(snap: Record<string, unknown> | null | undefined): string | null {
  if (!snap) return null
  const street = String(snap.street ?? snap.logradouro ?? '').trim()
  const number = String(snap.number ?? snap.numero ?? '').trim()
  const city = String(snap.city ?? snap.cidade ?? '').trim()
  const state = String(snap.state ?? snap.uf ?? '').trim()
  if (!street && !city) return null
  const line = [street && number ? `${street}, ${number}` : street || number, city && state ? `${city}/${state}` : city || state]
    .filter(Boolean)
    .join(' — ')
  return line || null
}

export function OrderConfirmationPage() {
  useDocumentTitle('Pedido recebido | FAL Peças Automotivas')
  const { id } = useParams<{ id: string }>()
  const short = id ? id.slice(0, 8) : '—'
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(Boolean(id))

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void getMyOrderDetail(id)
      .then((row) => {
        if (!cancelled) setOrder(row)
      })
      .catch(() => {
        if (!cancelled) setOrder(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const addr = addressLine(order?.addressSnapshot ?? null)

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-lg rounded-fal border border-fal-line bg-white p-8 text-center">
        <p className="m-0 text-4xl" aria-hidden>
          ✓
        </p>
        <h1 className="mt-3 text-[28px] font-black text-fal-navy">Pedido recebido</h1>
        <p className="text-fal-muted">
          Obrigado! Seu pedido <strong>#{short}</strong> foi registrado. Acompanhe o status e o
          pagamento na área da conta.
        </p>

        {loading ? <Loading label="Carregando resumo…" /> : null}

        {!loading && order ? (
          <div className="mt-5 space-y-3 text-left text-sm text-fal-ink">
            <p className="m-0">
              <span className="text-fal-muted">Status:</span>{' '}
              <strong>{orderStatusLabel[order.status] ?? order.status}</strong>
              {order.payment?.status ? (
                <>
                  {' '}
                  · Pagamento: <strong>{paymentStatusLabel(order.payment.status)}</strong>
                </>
              ) : null}
            </p>
            {addr ? (
              <p className="m-0">
                <span className="text-fal-muted">Entrega:</span> {addr}
              </p>
            ) : null}
            <ul className="m-0 list-none space-y-1 border-t border-fal-line p-0 pt-3">
              {order.items.map((it) => (
                <li key={it.id} className="flex justify-between gap-3">
                  <span>
                    {it.quantity}× {it.nameSnapshot}
                  </span>
                  <span className="shrink-0 font-semibold">
                    {formatMoney(it.unitPrice * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-fal-line pt-3 text-base font-black">
              <span>Total</span>
              <span>{formatMoney(order.total)}</span>
            </div>
          </div>
        ) : null}

        <ul className="mx-auto mt-4 max-w-sm list-disc space-y-1 pl-5 text-left text-sm text-fal-ink">
          <li>Confira o pagamento (Pix ou cartão), se ainda estiver pendente.</li>
          <li>Acompanhe a separação e o envio em Meus pedidos.</li>
          <li>Guarde o número do pedido para atendimento.</li>
        </ul>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {id ? (
            <ButtonLink to={`/conta/pedidos/${id}`} variant="primary">
              Acompanhar pedido
            </ButtonLink>
          ) : null}
          <ButtonLink to="/catalogo" variant="light">
            Continuar comprando
          </ButtonLink>
        </div>
      </div>
    </Container>
  )
}
