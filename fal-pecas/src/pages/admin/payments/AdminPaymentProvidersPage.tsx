import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { paymentEngine } from '@/services/payments/engine'
import { resolvePaymentProviderKey } from '@/services/payments/paymentService'
import { Link } from 'react-router-dom'

const FUTURE = [
  { id: 'pagbank', label: 'PagBank', note: 'Possível integração futura — não contratada.' },
  { id: 'pagarme', label: 'Pagar.me', note: 'Possível integração futura — não contratada.' },
] as const

export function AdminPaymentProvidersPage() {
  useDocumentTitle('Provedores | Pagamentos | Admin FAL')
  const primary = paymentEngine.primaryProviderId()
  const envKey = resolvePaymentProviderKey()
  const adapters = paymentEngine.listAdapters()

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/pagamentos" className="text-sm font-semibold text-fal-fg no-underline">
          ← Pagamentos
        </Link>
        <h1 className="mt-2 text-[28px] font-extrabold text-fal-fg">Provedores e integrações</h1>
        <p className="m-0 text-sm text-fal-muted">
          Integração do ambiente: <strong>{primary}</strong> (
          <code className="text-xs">VITE_PAYMENT_PROVIDER={envKey}</code>). Quem recebe cada
          cobrança é o roteamento em{' '}
          <Link to="/admin/pagamentos/metodos" className="font-semibold text-fal-fg">
            Métodos
          </Link>
          .
        </p>
      </div>

      <ul className="m-0 list-none space-y-3 p-0">
        {adapters.map((a) => {
          const caps = a.capabilities()
          const inEngine = a.id === 'mercadopago' || a.id === 'asaas'
          return (
            <li
              key={a.id}
              className="rounded-[14px] border border-fal-line bg-fal-surface p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="m-0 text-lg font-extrabold text-fal-fg">{a.label}</h2>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    inEngine ? 'bg-fal-yellow text-fal-navy-dark' : 'bg-fal-line/60 text-fal-muted'
                  }`}
                >
                  {inEngine ? 'Ativo no motor' : 'Registrado'}
                </span>
              </div>
              <p className="mb-0 mt-2 text-sm text-fal-muted">
                Métodos: {caps.methods.join(', ')} · Webhook:{' '}
                {caps.supportsWebhook ? 'sim' : 'não'} · Parcelas:{' '}
                {caps.supportsInstallments ? 'sim' : 'não'}
              </p>
              {a.id === 'mercadopago' ? (
                <p className="mb-0 mt-3">
                  <Link
                    to="/admin/pagamentos/metodos/mercado-pago"
                    className="text-sm font-semibold text-fal-fg"
                  >
                    Abrir controle Mercado Pago →
                  </Link>
                </p>
              ) : null}
              {a.id === 'asaas' ? (
                <p className="mb-0 mt-2 text-xs text-fal-muted">
                  Limite Pix e provedores: editar em Roteamento e saúde. Secrets:{' '}
                  <code className="text-xs">ASAAS_API_KEY</code> no Edge.
                </p>
              ) : null}
            </li>
          )
        })}
        {FUTURE.map((f) => (
          <li key={f.id} className="rounded-[14px] border border-dashed border-fal-line bg-fal-bg/40 p-5">
            <h2 className="m-0 text-lg font-extrabold text-fal-muted">{f.label}</h2>
            <p className="mb-0 mt-2 text-sm text-fal-muted">{f.note}</p>
            <p className="mb-0 mt-1 text-xs font-semibold text-fal-muted">Futuro</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
