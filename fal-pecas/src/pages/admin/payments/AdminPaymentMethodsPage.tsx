import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePaymentDisplay } from '@/hooks/usePaymentDisplay'
import { usePaymentRoutingConfig } from '@/hooks/usePaymentRoutingConfig'
import { falMaxInstallmentsForCheckout } from '@/lib/paymentDisplay'
import { formatMoney } from '@/lib/money'
import { resolveEffectivePaymentAvailability } from '@/services/payments/effectivePaymentAvailability'
import { paymentEngine } from '@/services/payments/engine'
import { isMercadoPagoCheckoutEnabled } from '@/services/payments/paymentService'
import { Link } from 'react-router-dom'

const CATALOG = [
  { code: 'pix' as const, label: 'Pix', priority: 'Prioridade inicial' },
  { code: 'credit_card' as const, label: 'Cartão de crédito', priority: 'Prioridade inicial' },
  { code: 'debit_card' as const, label: 'Cartão de débito', priority: 'Conforme suporte do provedor' },
  { code: 'boleto' as const, label: 'Boleto', priority: 'Conforme viabilidade — não ativo' },
] as const

const PROVIDER_LABEL: Record<string, string> = {
  mercadopago: 'Mercado Pago',
  asaas: 'Asaas',
}

export function AdminPaymentMethodsPage() {
  useDocumentTitle('Métodos | Pagamentos | Admin FAL')
  const mpOn = isMercadoPagoCheckoutEnabled()
  const settings = usePaymentDisplay()
  const routing = usePaymentRoutingConfig()
  const avail = resolveEffectivePaymentAvailability(settings, routing)
  const caps = paymentEngine.getAdapter('mercadopago')?.capabilities()
  const supported = new Set(caps?.methods ?? [])
  const demoMaxInstallments = settings ? falMaxInstallmentsForCheckout(600, settings) : 1
  const pixLimitBrl = routing.pixMpMaxAmountCents / 100

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/pagamentos" className="text-sm font-semibold text-fal-navy no-underline">
          ← Pagamentos
        </Link>
        <h1 className="mt-2 text-[28px] font-extrabold text-fal-navy">Métodos de pagamento</h1>
        <p className="m-0 text-sm text-fal-muted">
          Leitura efetiva = integração técnica + Home da loja (comercial) +{' '}
          <code className="text-xs">payment_routing_config</code> (roteamento).
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[14px] border border-fal-line bg-white p-4 text-sm">
          <p className="m-0 font-semibold text-fal-navy">Roteamento FAL PAY</p>
          <ul className="mb-0 mt-2 list-disc space-y-1 pl-5 text-fal-muted">
            <li>
              Pix até {formatMoney(pixLimitBrl)} →{' '}
              {PROVIDER_LABEL[routing.pixBelowLimitProvider] ?? routing.pixBelowLimitProvider}
            </li>
            <li>
              Pix acima → {PROVIDER_LABEL[routing.pixAboveLimitProvider] ?? routing.pixAboveLimitProvider}
            </li>
            <li>
              Cartão → {PROVIDER_LABEL[routing.cardProvider] ?? routing.cardProvider}
            </li>
            <li>Asaas: {routing.asaasEnabled ? 'ativo' : 'inativo'}</li>
            <li>Mercado Pago: {routing.mercadopagoEnabled ? 'ativo' : 'inativo'}</li>
          </ul>
          {avail.cardBlockedReason ? (
            <p className="mb-0 mt-2 text-amber-800">{avail.cardBlockedReason}</p>
          ) : null}
        </div>
        <div className="rounded-[14px] border border-fal-line bg-white p-4 text-sm">
          <p className="m-0 font-semibold text-fal-navy">Parcelas (checkout real)</p>
          <ul className="mb-0 mt-2 list-disc space-y-1 pl-5 text-fal-muted">
            <li>Parcelamento: {settings?.installmentsEnabled ? 'ligado' : 'só 1x'}</li>
            <li>Máx. parcelas: {settings?.maxInstallments ?? '—'}</li>
            <li>Parcela mínima: {formatMoney(settings?.minInstallmentAmount ?? 0)}</li>
            <li>Sem juros até: {settings?.interestFreeMax ?? 0}x</li>
            <li>
              Juros comerciais: {settings?.allowInterestInstallments !== false ? 'permitidos' : 'bloqueados'}
            </li>
            <li>
              Ex. pedido R$ 600 → até <strong>{demoMaxInstallments}x</strong> (política + Edge MP)
            </li>
          </ul>
          <Link to="/admin/home" className="mt-2 inline-block font-semibold text-fal-navy">
            Editar na Home da loja →
          </Link>
        </div>
      </div>

      <div className="rounded-[14px] border border-dashed border-fal-line bg-fal-bg/40 p-4 text-sm">
        <p className="m-0 font-semibold text-fal-navy">Disponibilidade efetiva agora</p>
        <p className="mb-0 mt-1 text-fal-muted">
          Integração: {mpOn ? 'ligada' : 'desligada'} · Pix: {avail.pix ? 'visível' : 'oculto'} ·
          Crédito: {avail.credit ? 'visível' : 'oculto'} · Débito:{' '}
          {avail.debit ? 'visível' : 'oculto'}
        </p>
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
              ? 'Integração + comercial + roteamento OK'
              : !mpOn
                ? 'Integração MP off'
                : !adapterOk
                  ? 'Adaptador sem Pix'
                  : 'Desativado na Home ou roteamento'
          } else if (m.code === 'credit_card') {
            active = avail.credit && adapterOk
            detail = active
              ? 'MP + política de parcelas + roteamento cartão=MP'
              : avail.cardBlockedReason
                ? avail.cardBlockedReason
                : !mpOn
                  ? 'Integração MP off'
                  : settings?.creditEnabled === false
                    ? 'Crédito desativado na Home da loja'
                    : 'Indisponível (adaptador ou roteamento)'
          } else if (m.code === 'debit_card') {
            active = avail.debit && adapterOk
            detail = active
              ? 'Débito à vista via MP'
              : avail.cardBlockedReason
                ? avail.cardBlockedReason
                : !mpOn
                  ? 'Integração MP off'
                  : settings?.debitEnabled === false
                    ? 'Débito desativado na Home da loja'
                    : 'Indisponível'
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