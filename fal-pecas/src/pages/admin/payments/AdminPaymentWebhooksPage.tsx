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
        <h1 className="mt-2 text-[28px] font-extrabold text-fal-navy">Webhooks e eventos</h1>
        <p className="m-0 text-sm text-fal-muted">
          Eventos ficam em <code className="text-xs">payment_events</code>. Reprocessamento seguro e
          painel de falhas entram na PG13 — nesta onda só a referência operacional.
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
    </div>
  )
}
