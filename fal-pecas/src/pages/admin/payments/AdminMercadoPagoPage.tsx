import { Button } from '@/components/common/Button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  classifyMpPublicKey,
  mpEnvLabel,
  mpWebhookUrlHint,
} from '@/lib/mpAdminStatus'
import { paymentEngine } from '@/services/payments/engine'
import { isMercadoPagoCheckoutEnabled } from '@/services/payments/paymentService'
import type { PaymentDisplaySettings } from '@/lib/paymentDisplay'
import { adminGetPaymentDisplaySettings } from '@/services/store/paymentDisplayService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export function AdminMercadoPagoPage() {
  useDocumentTitle('Mercado Pago | Pagamentos | Admin FAL')
  const pk = classifyMpPublicKey()
  const webhook = mpWebhookUrlHint()
  const mpOn = isMercadoPagoCheckoutEnabled()
  const caps = paymentEngine.getAdapter('mercadopago')?.capabilities()
  const [display, setDisplay] = useState<PaymentDisplaySettings | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void adminGetPaymentDisplaySettings()
      .then((row) => {
        if (!cancelled) setDisplay(row)
      })
      .catch(() => {
        if (!cancelled) setLoadErr('Não foi possível carregar condições de parcelas.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function copyWebhook() {
    if (!webhook) return
    await navigator.clipboard.writeText(webhook)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/pagamentos/metodos"
          className="text-sm font-semibold text-fal-navy no-underline"
        >
          ← Métodos de pagamento
        </Link>
        <h1 className="mt-2 text-[28px] font-extrabold text-fal-navy">Mercado Pago</h1>
        <p className="m-0 text-sm text-fal-muted">
          Controle do adaptador sob o motor FAL. Credenciais sensíveis ficam só no backend (Edge
          secrets) — aqui apenas status e opções operacionais.
        </p>
      </div>

      <section className="rounded-[14px] border border-fal-line bg-white p-5 space-y-3">
        <h2 className="m-0 text-base font-extrabold text-fal-navy">Ambiente e status</h2>
        <dl className="m-0 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-fal-muted">Checkout MP</dt>
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
        <div className="rounded-[10px] border border-fal-line bg-fal-bg/40 p-3 text-xs text-fal-navy space-y-1">
          <p className="m-0 font-semibold">Pareamento obrigatório</p>
          <p className="m-0">
            Front <code className="text-[11px]">VITE_MP_PUBLIC_KEY</code> e Edge{' '}
            <code className="text-[11px]">MP_ACCESS_TOKEN</code> devem ser do mesmo app e
            ambiente (TEST com TEST, prod com prod).
          </p>
          <p className="m-0">
            App live FAL: <code className="text-[11px]">6371863177010206</code> · sandbox MCP:{' '}
            <code className="text-[11px]">8320396999442614</code> (não misturar).
          </p>
          <p className="m-0 text-fal-muted">
            No painel MP: cadastre domínios da loja + localhost, e ative tópicos de webhook
            (payment). URL já apontada no app live.
          </p>
        </div>
        <p className="mb-0 text-xs text-fal-muted">
          Troca test ↔ produção e tokens: nas variáveis Netlify + secrets Supabase — não pela UI.
        </p>
      </section>

      <section className="rounded-[14px] border border-fal-line bg-white p-5 space-y-3">
        <h2 className="m-0 text-base font-extrabold text-fal-navy">Métodos no adaptador</h2>
        <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-fal-navy">
          {(caps?.methods ?? []).map((m) => (
            <li key={m}>
              <strong>{m}</strong>
              {mpOn ? ' — disponível no checkout' : ' — checkout MP desligado'}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[14px] border border-fal-line bg-white p-5 space-y-3">
        <h2 className="m-0 text-base font-extrabold text-fal-navy">Opções cartão (vitrine)</h2>
        <p className="m-0 text-sm text-fal-muted">
          Fonte única: <code className="text-xs">store_payment_display</code> (Home da loja). Não
          duplicamos regras aqui.
        </p>
        {loadErr ? <p className="m-0 text-sm text-red-700">{loadErr}</p> : null}
        {display ? (
          <ul className="m-0 list-none space-y-1 p-0 text-sm text-fal-navy">
            <li>Cartão comercial: {display.cardEnabled ? 'ligado' : 'desligado'}</li>
            <li>Pix comercial: {display.pixEnabled ? 'ligado' : 'desligado'}</li>
            <li>Parcelamento: {display.installmentsEnabled ? 'ligado' : 'só 1x'}</li>
            <li>Exibição vitrine: {display.enabled ? 'ligada' : 'desligada'}</li>
            <li>Máx. parcelas: {display.maxInstallments}</li>
            <li>Sem juros até: {display.interestFreeMax}x</li>
            <li>Com juros: {display.allowInterestInstallments ? 'permitido' : 'não'}</li>
            <li>Parcela mínima: R$ {Number(display.minInstallmentAmount).toFixed(2)}</li>
          </ul>
        ) : !loadErr ? (
          <p className="m-0 text-sm text-fal-muted">Carregando…</p>
        ) : null}
        <Link to="/admin/home" className="text-sm font-semibold text-fal-navy">
          Editar na Home da loja →
        </Link>
      </section>

      <section className="rounded-[14px] border border-fal-line bg-white p-5 space-y-3">
        <h2 className="m-0 text-base font-extrabold text-fal-navy">Webhook</h2>
        <p className="m-0 break-all font-mono text-xs text-fal-navy">{webhook ?? 'Configure VITE_SUPABASE_URL'}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={!webhook} onClick={() => void copyWebhook()}>
            Copiar URL
          </Button>
          <Link
            to="/admin/pagamentos/webhooks"
            className="inline-flex items-center text-sm font-semibold text-fal-navy"
          >
            Webhooks e eventos →
          </Link>
        </div>
        <p className="mb-0 text-xs text-fal-muted">
          Secret HMAC = <code className="text-[11px]">MP_WEBHOOK_SECRET</code> no Edge. Validação
          nunca confia só no frontend.
        </p>
      </section>

      <section className="rounded-[14px] border border-fal-line bg-white p-5 space-y-2">
        <h2 className="m-0 text-base font-extrabold text-fal-navy">Manutenção</h2>
        <p className="m-0 text-sm text-fal-muted">
          Para pausar cobranças MP sem derrubar o menu: defina{' '}
          <code className="text-xs">VITE_PAYMENT_PROVIDER=simulated</code> (ou remova mercadopago) no
          build e redeploy. Toggle de manutenção no banco = próxima fatia (PG12).
        </p>
      </section>
    </div>
  )
}
