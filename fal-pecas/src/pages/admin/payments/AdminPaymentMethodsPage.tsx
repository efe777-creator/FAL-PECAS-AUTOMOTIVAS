import { Button } from '@/components/common/Button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePaymentDisplay } from '@/hooks/usePaymentDisplay'
import { usePaymentRoutingConfig } from '@/hooks/usePaymentRoutingConfig'
import { falMaxInstallmentsForCheckout } from '@/lib/paymentDisplay'
import { formatMoney } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import { resolveEffectivePaymentAvailability } from '@/services/payments/effectivePaymentAvailability'
import { paymentEngine } from '@/services/payments/engine'
import { isMercadoPagoCheckoutEnabled } from '@/services/payments/paymentService'
import {
  savePaymentRoutingConfig,
  type PaymentRoutingConfig,
} from '@/services/payments/paymentRoutingService'
import type { RoutedPaymentProviderId } from '@/services/payments/routing/paymentRouter'
import { Link } from 'react-router-dom'
import { useEffect, useState, type FormEvent } from 'react'

const CATALOG = [
  { code: 'pix' as const, label: 'Pix', priority: 'Prioridade inicial' },
  { code: 'credit_card' as const, label: 'Cartão de crédito', priority: 'Prioridade inicial' },
  { code: 'debit_card' as const, label: 'Cartão de débito', priority: 'Conforme suporte do provedor' },
  { code: 'boleto' as const, label: 'Boleto', priority: 'Conforme viabilidade — não ativo' },
] as const

const PROVIDER_OPTIONS: { value: RoutedPaymentProviderId; label: string }[] = [
  { value: 'mercadopago', label: 'Mercado Pago' },
  { value: 'asaas', label: 'Asaas' },
]

export function AdminPaymentMethodsPage() {
  useDocumentTitle('Métodos | Pagamentos | Admin FAL')
  const mpOn = isMercadoPagoCheckoutEnabled()
  const settings = usePaymentDisplay()
  const routing = usePaymentRoutingConfig()
  const [draft, setDraft] = useState<PaymentRoutingConfig>(routing)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  useEffect(() => {
    setDraft(routing)
  }, [routing])

  const avail = resolveEffectivePaymentAvailability(settings, draft)
  const mpSupported = new Set(
    paymentEngine.getAdapter('mercadopago')?.capabilities().methods ?? [],
  )
  const asaasSupported = new Set(paymentEngine.getAdapter('asaas')?.capabilities().methods ?? [])
  const demoMaxInstallments = settings ? falMaxInstallmentsForCheckout(600, settings) : 1
  const pixLimitBrl = draft.pixMpMaxAmountCents / 100

  async function saveRouting(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    setSaveErr(null)
    try {
      const saved = await savePaymentRoutingConfig(draft)
      setDraft(saved)
      setSaveMsg('Roteamento salvo. O checkout passa a usar estas regras.')
    } catch (err) {
      setSaveErr(toUserMessage(err, 'Não foi possível salvar o roteamento.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/pagamentos" className="text-sm font-semibold text-fal-fg no-underline">
          ← Pagamentos
        </Link>
        <h1 className="mt-2 text-[28px] font-extrabold text-fal-fg">Roteamento e saúde</h1>
        <p className="m-0 text-sm text-fal-muted">
          Edite só o roteamento FAL PAY aqui. Condições (% Pix, parcelas, ligar meios na loja)
          ficam na{' '}
          <Link to="/admin/home?tab=payment" className="font-semibold text-fal-fg">
            Home → Pagamentos
          </Link>
          . Diagnóstico abaixo explica o que o cliente vê.
        </p>
      </div>

      <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
        <Link
          to="/admin/pagamentos/metodos/mercado-pago"
          className="flex items-center justify-between gap-3 no-underline"
        >
          <div>
            <h2 className="m-0 text-lg font-extrabold text-fal-fg">Status Mercado Pago</h2>
            <p className="mb-0 mt-1 text-sm text-fal-muted">
              Public Key, ambiente e capacidade do adaptador (somente leitura).
            </p>
          </div>
          <span className="shrink-0 text-sm font-bold text-fal-fg">Abrir →</span>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <form
          onSubmit={(e) => void saveRouting(e)}
          className="rounded-[14px] border border-fal-line bg-fal-surface p-4 text-sm"
        >
          <p className="m-0 font-semibold text-fal-fg">Roteamento FAL PAY</p>
          <p className="mb-3 mt-1 text-xs text-fal-muted">
            Controle real da loja (`payment_routing_config`). Vale no checkout e nas Edges.
          </p>
          <label className="mb-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.mercadopagoEnabled}
              onChange={(e) => setDraft((d) => ({ ...d, mercadopagoEnabled: e.target.checked }))}
            />
            Mercado Pago ativo
          </label>
          <label className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.asaasEnabled}
              onChange={(e) => setDraft((d) => ({ ...d, asaasEnabled: e.target.checked }))}
            />
            Asaas ativo
          </label>
          <label className="mb-2 block">
            Limite Pix Mercado Pago (R$)
            <input
              type="number"
              min={1}
              step={0.01}
              className="mt-1 w-full rounded-md border border-fal-line px-2 py-1"
              value={(draft.pixMpMaxAmountCents / 100).toFixed(2)}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  pixMpMaxAmountCents: Math.max(
                    1,
                    Math.round(Number(e.target.value || 0) * 100),
                  ),
                }))
              }
            />
          </label>
          <label className="mb-2 block">
            Pix até {formatMoney(pixLimitBrl)}
            <select
              className="mt-1 w-full rounded-md border border-fal-line px-2 py-1"
              value={draft.pixBelowLimitProvider}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  pixBelowLimitProvider: e.target.value as RoutedPaymentProviderId,
                }))
              }
            >
              {PROVIDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mb-2 block">
            Pix acima do limite
            <select
              className="mt-1 w-full rounded-md border border-fal-line px-2 py-1"
              value={draft.pixAboveLimitProvider}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  pixAboveLimitProvider: e.target.value as RoutedPaymentProviderId,
                }))
              }
            >
              {PROVIDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mb-3 block">
            Cartão (crédito e débito)
            <input
              className="mt-1 w-full rounded-md border border-fal-line bg-fal-bg px-2 py-1"
              value="Asaas (fixo)"
              disabled
              readOnly
            />
          </label>
          <p className="mb-3 mt-0 text-xs text-fal-muted">
            Crédito e débito passam sempre pelo Asaas (página segura / invoiceUrl). Não há fallback
            Mercado Pago para cartão.
          </p>
          {avail.cardBlockedReason ? (
            <p className="mb-3 mt-0 text-amber-800">{avail.cardBlockedReason}</p>
          ) : null}
          {saveErr ? <p className="mb-2 mt-0 text-sm text-red-700">{saveErr}</p> : null}
          {saveMsg ? <p className="mb-2 mt-0 text-sm text-emerald-800">{saveMsg}</p> : null}
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar roteamento'}
          </Button>
        </form>
        <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4 text-sm">
          <p className="m-0 font-semibold text-fal-fg">Condições na Home (leitura)</p>
          <ul className="mb-0 mt-2 list-disc space-y-1 pl-5 text-fal-muted">
            <li>Pix %: {settings?.pixAdjustPercent ?? 0}</li>
            <li>Crédito %: {settings?.creditAdjustPercent ?? 0}</li>
            <li>Débito %: {settings?.debitAdjustPercent ?? 0}</li>
            <li>Parcelamento: {settings?.installmentsEnabled ? 'ligado' : 'só 1x'}</li>
            <li>Máx. parcelas: {settings?.maxInstallments ?? '—'}</li>
            <li>
              Ex. R$ 600 → até <strong>{demoMaxInstallments}x</strong> no crédito
            </li>
          </ul>
          <Link
            to="/admin/home?tab=payment&meio=credit"
            className="mt-2 inline-block font-semibold text-fal-fg"
          >
            Editar condições na Home →
          </Link>
        </div>
      </div>

      <div className="rounded-[14px] border border-dashed border-fal-line bg-fal-bg/40 p-4 text-sm">
        <p className="m-0 font-semibold text-fal-fg">Por que o cliente vê / não vê</p>
        <p className="mb-0 mt-1 text-fal-muted">
          Motor: {mpOn ? 'ligado' : 'desligado'} · Pix: {avail.pix ? 'visível' : 'oculto'} ·
          Crédito: {avail.credit ? 'visível' : 'oculto'} · Débito:{' '}
          {avail.debit ? 'visível' : 'oculto'}
          {avail.cardBlockedReason ? ` · ${avail.cardBlockedReason}` : ''}
        </p>
      </div>

      <ul className="m-0 list-none space-y-3 p-0">
        {CATALOG.map((m) => {
          const adapterOk =
            m.code === 'pix'
              ? mpSupported.has(m.code) || asaasSupported.has(m.code)
              : asaasSupported.has(m.code)
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
              ? 'Asaas + política de parcelas + roteamento fixo'
              : avail.cardBlockedReason
                ? avail.cardBlockedReason
                : !draft.asaasEnabled
                  ? 'Asaas desativado no roteamento'
                  : settings?.creditEnabled === false
                    ? 'Crédito desativado na Home da loja'
                    : 'Indisponível (adaptador ou roteamento)'
          } else if (m.code === 'debit_card') {
            active = avail.debit && adapterOk
            detail = active
              ? 'Débito à vista via Asaas'
              : avail.cardBlockedReason
                ? avail.cardBlockedReason
                : !draft.asaasEnabled
                  ? 'Asaas desativado no roteamento'
                  : settings?.debitEnabled === false
                    ? 'Débito desativado na Home da loja'
                    : 'Indisponível'
          }
          return (
            <li key={m.code} className="rounded-[14px] border border-fal-line bg-fal-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="m-0 text-lg font-extrabold text-fal-fg">{m.label}</h2>
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