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
        <Link to="/admin/pagamentos" className="text-sm font-semibold text-fal-navy no-underline">
          ← Pagamentos
        </Link>
        <h1 className="mt-2 text-[28px] font-extrabold text-fal-navy">Provedores e integrações</h1>
        <p className="m-0 text-sm text-fal-muted">
          Provedor principal no ambiente: <strong>{primary}</strong> (
          <code className="text-xs">VITE_PAYMENT_PROVIDER={envKey}</code>).
        </p>
      </div>

      <ul className="m-0 list-none space-y-3 p-0">
        {adapters.map((a) => {
          const caps = a.capabilities()
          const active = a.id === primary
          return (
            <li
              key={a.id}
              className="rounded-[14px] border border-fal-line bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="m-0 text-lg font-extrabold text-fal-navy">{a.label}</h2>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    active ? 'bg-fal-yellow text-fal-navy-dark' : 'bg-fal-line/60 text-fal-muted'
                  }`}
                >
                  {active ? 'Atual' : 'Registrado'}
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
                    className="text-sm font-semibold text-fal-navy"
                  >
                    Abrir controle Mercado Pago →
                  </Link>
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
