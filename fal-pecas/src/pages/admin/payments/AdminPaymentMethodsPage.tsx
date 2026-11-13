import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePaymentDisplay } from '@/hooks/usePaymentDisplay'
import { resolveEffectivePaymentAvailability } from '@/services/payments/effectivePaymentAvailability'
import { paymentEngine } from '@/services/payments/engine'
import { isMercadoPagoCheckoutEnabled } from '@/services/payments/paymentService'
import { Link } from 'react-router-dom'

const CATALOG = [
  { code: 'pix' as const, label: 'Pix', priority: 'Prioridade inicial' },
  { code: 'credit_card' as const, label: 'Cartão de crédito', priority: 'Prioridade inicial' },
  { code: 'debit_card' as const, label: 'Cartão de débito', priority: 'Conforme suporte do provedor' },
  { code: 'boleto' as const, label: 'Boleto', priority: 'Conforme viabilidade — não ativo' },
]

export function AdminPaymentMethodsPage() {
  useDocumentTitle('Métodos | Pagamentos | Admin FAL')
  const mpOn = isMercadoPagoCheckoutEnabled()
  const settings = usePaymentDisplay()
  const avail = resolveEffectivePaymentAvailability(settings)
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
          Leitura efetiva = integração técnica AND disponibilidade comercial (Home da loja).
          Alterar meios/parcelas: Home da loja → Pagamentos.
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

      <div className="rounded-[14px] border border-dashed border-fal-line bg-fal-bg/40 p-4 text-sm">
        <p className="m-0 font-semibold text-fal-navy">Disponibilidade efetiva agora</p>
        <p className="mb-0 mt-1 text-fal-muted">
          Integração: {mpOn ? 'ligada' : 'desligada'} · Pix loja:{' '}
          {avail.pix ? 'visível' : 'oculto'} · Cartão loja: {avail.card ? 'visível' : 'oculto'}
        </p>
        <Link to="/admin/home" className="mt-2 inline-block font-semibold text-fal-navy">
          Configurar na Home da loja →
        </Link>
      </div>

      <ul className="m-0 list-none space-y-3 p-0">
        {CATALOG.map((m) => {
          const adapterOk = supported.has(m.code)
          let active = false
          let detail = 'Desativado / indisponível'
          if (m.code === 'boleto') {
            active = false
            detail = 'Não ativo neste ciclo'
          } else if (m.code === 'pix') {
            active = avail.pix
            detail = active
              ? 'Integração + comercial ON'
              : !mpOn
                ? 'Integração MP off'
                : !adapterOk
                  ? 'Adaptador sem Pix'
                  : 'Desativado na Home da loja'
          } else if (m.code === 'credit_card' || m.code === 'debit_card') {
            active = avail.card && adapterOk
            detail = active
              ? 'Integração + comercial ON'
              : !mpOn
                ? 'Integração MP off'
                : settings?.cardEnabled === false
                  ? 'Desativado na Home da loja'
                  : 'Indisponível no adaptador ou comercial'
          }
          return (
            <li key={m.code} className="rounded-[14px] border border-fal-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="m-0 text-lg font-extrabold text-fal-navy">{m.label}</h2>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    active ? 'bg-emerald-100 text-emerald-900' : 'bg-fal-line/60 text-fal-muted'
                  }`}
                >
                  {active ? 'Ativo para o cliente' : 'Não disponível ao cliente'}
                </span>
              </div>
              <p className="mb-0 mt-2 text-sm text-fal-muted">
                {m.priority} · {detail}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
