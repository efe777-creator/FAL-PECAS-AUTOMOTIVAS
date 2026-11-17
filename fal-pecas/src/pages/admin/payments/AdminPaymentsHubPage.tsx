import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { isMercadoPagoCheckoutEnabled } from '@/services/payments/paymentService'
import { usePaymentRoutingConfig } from '@/hooks/usePaymentRoutingConfig'
import { Link } from 'react-router-dom'

function StatusChip({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={`rounded-md px-2 py-1 text-xs font-bold ${
        on ? 'bg-emerald-100 text-emerald-900' : 'bg-fal-line/60 text-fal-muted'
      }`}
    >
      {label}: {on ? 'ligado' : 'off'}
    </span>
  )
}

export function AdminPaymentsHubPage() {
  useDocumentTitle('Pagamentos | Admin FAL')
  const motorOn = isMercadoPagoCheckoutEnabled()
  const routing = usePaymentRoutingConfig()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mt-0 text-[28px] font-extrabold text-fal-fg">Pagamentos</h1>
        <p className="m-0 text-sm text-fal-muted">
          Integração FAL PAY (Mercado Pago + Asaas). Condições comerciais da loja ficam na{' '}
          <Link to="/admin/home?tab=payment" className="font-semibold text-fal-fg">
            Home → Pagamentos
          </Link>
          . Reembolso e fila: Central de Pedidos.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusChip label="Motor" on={motorOn} />
          <StatusChip label="Mercado Pago" on={routing.mercadopagoEnabled} />
          <StatusChip label="Asaas" on={routing.asaasEnabled} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/admin/pagamentos/metodos"
          className="block rounded-[14px] border border-fal-line bg-fal-surface p-5 no-underline transition hover:border-fal-navy/40"
        >
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">Roteamento e saúde</h2>
          <p className="mb-0 mt-2 text-sm text-fal-muted">
            Quem processa Pix/cartão, limites e diagnóstico do que o cliente vê.
          </p>
        </Link>
        <Link
          to="/admin/pagamentos/webhooks"
          className="block rounded-[14px] border border-fal-line bg-fal-surface p-5 no-underline transition hover:border-fal-navy/40"
        >
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">Webhooks</h2>
          <p className="mb-0 mt-2 text-sm text-fal-muted">
            URLs ativas para colar nos painéis Mercado Pago e Asaas.
          </p>
        </Link>
        <Link
          to="/admin/home?tab=payment"
          className="block rounded-[14px] border border-fal-line bg-fal-surface p-5 no-underline transition hover:border-fal-navy/40"
        >
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">Condições na loja</h2>
          <p className="mb-0 mt-2 text-sm text-fal-muted">
            Pix, débito, crédito e % sobre a lista — edição comercial (não é API).
          </p>
        </Link>
        <Link
          to="/admin/pagamentos/provedores"
          className="block rounded-[14px] border border-fal-line bg-fal-surface p-5 no-underline transition hover:border-fal-navy/40"
        >
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">Provedores</h2>
          <p className="mb-0 mt-2 text-sm text-fal-muted">
            Capacidades do motor e status de ambiente (somente leitura).
          </p>
        </Link>
      </div>

      <div className="rounded-[14px] border border-dashed border-fal-line bg-fal-bg/40 p-4">
        <p className="m-0 text-sm font-bold text-fal-fg">Operação</p>
        <p className="mb-2 mt-1 text-sm text-fal-muted">
          Cobranças, fila e reembolso não se configuram aqui.
        </p>
        <Link
          to="/admin/pedidos/aguardando-pagamento"
          className="text-sm font-semibold text-fal-fg"
        >
          Pedidos aguardando pagamento →
        </Link>
      </div>

      <p className="m-0 text-sm">
        <Link to="/admin/pagamentos/metodos/mercado-pago" className="font-semibold text-fal-fg">
          Status Mercado Pago (PK / ambiente) →
        </Link>
      </p>
    </div>
  )
}
