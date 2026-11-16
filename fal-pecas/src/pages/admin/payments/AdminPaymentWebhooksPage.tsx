import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { mpWebhookUrlHint } from '@/lib/mpAdminStatus'
import { Link } from 'react-router-dom'

export function AdminPaymentWebhooksPage() {
  useDocumentTitle('Webhooks | Pagamentos | Admin FAL')
  const url = mpWebhookUrlHint()

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/pagamentos" className="text-sm font-semibold text-fal-navy no-underline">
          ← Pagamentos
        </Link>
        <h1 className="mt-2 text-[28px] font-extrabold text-fal-navy">Webhooks</h1>
        <p className="m-0 text-sm text-fal-muted">
          URLs ativas para cadastro nos painéis dos provedores. Reprocessamento de{' '}
          <code className="text-xs">payment_events</code> fica para uma onda futura.
        </p>
      </div>
      <section className="rounded-[14px] border border-fal-line bg-white p-5 space-y-2">
        <h2 className="m-0 text-base font-extrabold text-fal-navy">URL Mercado Pago</h2>
        <p className="m-0 break-all font-mono text-xs">{url ?? 'VITE_SUPABASE_URL ausente'}</p>
        <p className="mb-0 text-sm text-fal-muted">
          Edge: <code className="text-xs">mercado-pago-webhook</code> · secret{' '}
          <code className="text-xs">MP_WEBHOOK_SECRET</code> · idempotência por provider_event_id.
        </p>
      </section>
      <section className="rounded-[14px] border border-fal-line bg-white p-5 space-y-2">
        <h2 className="m-0 text-base font-extrabold text-fal-navy">URL Asaas</h2>
        <p className="m-0 break-all font-mono text-xs">
          {url
            ? url.replace(/mercado-pago-webhook$/, 'asaas-webhook')
            : 'VITE_SUPABASE_URL ausente'}
        </p>
        <p className="mb-0 text-sm text-fal-muted">
          Edge: <code className="text-xs">asaas-webhook</code> · header{' '}
          <code className="text-xs">asaas-access-token</code> ={' '}
          <code className="text-xs">ASAAS_WEBHOOK_TOKEN</code>.
        </p>
      </section>
    </div>
  )
}
