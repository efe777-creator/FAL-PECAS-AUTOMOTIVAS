import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { classifyMpPublicKey, mpEnvLabel } from '@/lib/mpAdminStatus'
import { paymentEngine } from '@/services/payments/engine'
import { isMercadoPagoCheckoutEnabled } from '@/services/payments/paymentService'
import { Link } from 'react-router-dom'

export function AdminMercadoPagoPage() {
  useDocumentTitle('Mercado Pago | Pagamentos | Admin FAL')
  const pk = classifyMpPublicKey()
  const mpOn = isMercadoPagoCheckoutEnabled()
  const caps = paymentEngine.getAdapter('mercadopago')?.capabilities()

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/pagamentos"
          className="text-sm font-semibold text-fal-navy no-underline"
        >
          ← Pagamentos
        </Link>
        <h1 className="mt-2 text-[28px] font-extrabold text-fal-navy">Mercado Pago</h1>
        <p className="m-0 text-sm text-fal-muted">
          Status técnico do adaptador no motor FAL PAY (híbrido com Asaas). Condições comerciais
          (Pix %, parcelas) editam-se só na{' '}
          <Link to="/admin/home?tab=payment" className="font-semibold text-fal-navy">
            Home → Pagamentos
          </Link>
          .
        </p>
      </div>

      <section className="rounded-[14px] border border-fal-line bg-white p-5 space-y-3">
        <h2 className="m-0 text-base font-extrabold text-fal-navy">Ambiente e status</h2>
        <dl className="m-0 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-fal-muted">Motor FAL PAY</dt>
            <dd className="m-0 font-semibold text-fal-navy">
              {mpOn ? 'Ligado (VITE_PAYMENT_PROVIDER=mercadopago)' : 'Desligado'}
            </dd>
          </div>
          <div>
            <dt className="text-fal-muted">Ambiente (Public Key)</dt>
            <dd className="m-0 font-semibold text-fal-navy">{mpEnvLabel(pk.kind)}</dd>
          </div>
          <div>
            <dt className="text-fal-muted">Public Key (build / Vite)</dt>
            <dd className="m-0 font-semibold text-fal-navy">
              {pk.configured ? `Configurada ${pk.suffix ?? ''}` : 'Ausente'}
            </dd>
          </div>
          <div>
            <dt className="text-fal-muted">Access Token / Webhook secret</dt>
            <dd className="m-0 font-semibold text-fal-navy">
              Só no Edge (não exibidos). Confira secrets no Supabase.
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[14px] border border-fal-line bg-white p-5 space-y-3">
        <h2 className="m-0 text-base font-extrabold text-fal-navy">Métodos no adaptador</h2>
        <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-fal-navy">
          {(caps?.methods ?? []).map((m) => (
            <li key={m}>
              <strong>{m}</strong>
              {mpOn ? ' — disponível no roteamento' : ' — motor desligado'}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[14px] border border-fal-line bg-white p-5 space-y-2">
        <h2 className="m-0 text-base font-extrabold text-fal-navy">Webhooks</h2>
        <p className="m-0 text-sm text-fal-muted">
          URLs MP e Asaas ficam centralizadas na página de Webhooks (sem duplicar aqui).
        </p>
        <Link
          to="/admin/pagamentos/webhooks"
          className="text-sm font-semibold text-fal-navy"
        >
          Abrir Webhooks →
        </Link>
      </section>

      <section className="rounded-[14px] border border-fal-line bg-white p-5 space-y-2">
        <h2 className="m-0 text-base font-extrabold text-fal-navy">Manutenção</h2>
        <p className="m-0 text-sm text-fal-muted">
          Para pausar o motor: defina{' '}
          <code className="text-xs">VITE_PAYMENT_PROVIDER=simulated</code> no build e redeploy.
          Roteamento fino: Pagamentos → Roteamento e saúde.
        </p>
      </section>
    </div>
  )
}
