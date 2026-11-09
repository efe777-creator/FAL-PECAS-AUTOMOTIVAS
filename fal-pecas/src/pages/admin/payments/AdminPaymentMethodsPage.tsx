import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { paymentEngine } from '@/services/payments/engine'
import { isMercadoPagoCheckoutEnabled } from '@/services/payments/paymentService'
import { Link } from 'react-router-dom'

const CATALOG = [
  { code: 'pix', label: 'Pix', priority: 'Prioridade inicial' },
  { code: 'credit_card', label: 'Cartão de crédito', priority: 'Prioridade inicial' },
  { code: 'debit_card', label: 'Cartão de débito', priority: 'Conforme suporte do provedor' },
  { code: 'boleto', label: 'Boleto', priority: 'Conforme viabilidade — não ativo' },
] as const

export function AdminPaymentMethodsPage() {
  useDocumentTitle('Métodos | Pagamentos | Admin FAL')
  const mpOn = isMercadoPagoCheckoutEnabled()
  const caps = paymentEngine.getAdapter('mercadopago')?.capabilities()
  const supported = new Set(caps?.methods ?? [])

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/pagamentos" className="text-sm font-semibold text-fal-navy no-underline">
          ← Pagamentos
        </Link>
        <h1 className="mt-2 text-[28px] font-extrabold text-fal-navy">Métodos de pagamento</h1>
        <p className="m-0 text-sm text-fal-muted">
          Controle por método na FAL. Validação final no backend — esconder no front não basta.
        </p>
      </div>

      <div className="rounded-[14px] border border-fal-line bg-white p-4">
        <Link
          to="/admin/pagamentos/metodos/mercado-pago"
          className="flex items-center justify-between gap-3 no-underline"
        >
          <div>
            <h2 className="m-0 text-lg font-extrabold text-fal-navy">Mercado Pago</h2>
            <p className="mb-0 mt-1 text-sm text-fal-muted">
              API, ambiente, opções Pix/cartão e status da integração.
            </p>
          </div>
          <span className="shrink-0 text-sm font-bold text-fal-navy">Abrir →</span>
        </Link>
      </div>

      <ul className="m-0 list-none space-y-3 p-0">
        {CATALOG.map((m) => {
          const adapterOk = (supported as Set<string>).has(m.code)
          const active = mpOn && adapterOk && m.code !== 'boleto'
          return (
            <li key={m.code} className="rounded-[14px] border border-fal-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="m-0 text-lg font-extrabold text-fal-navy">{m.label}</h2>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    active ? 'bg-emerald-100 text-emerald-900' : 'bg-fal-line/60 text-fal-muted'
                  }`}
                >
                  {active ? 'Ativo (adaptador MP)' : 'Desativado / indisponível'}
                </span>
              </div>
              <p className="mb-0 mt-2 text-sm text-fal-muted">
                {m.priority}
                {adapterOk ? ' · Provedor: Mercado Pago' : ' · Provedor: não configurado'}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
