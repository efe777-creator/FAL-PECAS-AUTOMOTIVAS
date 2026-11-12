import { OrderOpsWizardNav } from '@/components/admin/orders/OrderOpsWizardNav'
import { Link } from 'react-router-dom'
import type { AdminOrderDetail } from '@/services/admin/adminOrderService'

type Props = {
  order: AdminOrderDetail
  returnPath: string
  statusLabel: string
  modalityLabel: string
  /** Ex.: "Correios PAC · 4–8 dias úteis" — escolha congelada do checkout. */
  freightChoiceLabel?: string | null
  actorLabel: string
  nextStep: { title: string; body: string } | null
  separationProgress?: string | null
}

/** Cabeçalho operacional: identidade + próximo passo + atalho do fluxo. */
export function AdminOrderCommandBar({
  order,
  returnPath,
  statusLabel,
  modalityLabel,
  freightChoiceLabel,
  actorLabel,
  nextStep,
  separationProgress,
}: Props) {
  const opsReady = [
    'confirmado',
    'em_separacao',
    'pronto_para_envio',
    'preparando_envio',
    'enviado',
    'entregue',
  ].includes(order.status)

  const jumpHref =
    order.status === 'confirmado' || order.status === 'em_separacao'
      ? '#ops-conferencia'
      : order.status === 'pronto_para_envio' ||
          order.status === 'preparando_envio' ||
          order.status === 'enviado'
        ? '#ops-expedicao'
        : null

  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0">
            <Link
              to={returnPath}
              className="text-sm font-semibold text-fal-auth-link no-underline"
            >
              ← Voltar à fila
            </Link>
          </p>
          <h1 className="mb-0 mt-2 text-2xl font-extrabold tracking-tight text-fal-navy">
            Pedido {order.id.slice(0, 8)}…
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-[8px] bg-fal-navy px-2.5 py-1 text-xs font-extrabold text-white">
              {statusLabel}
            </span>
            {modalityLabel ? (
              <span className="rounded-[8px] border border-fal-line bg-white px-2.5 py-1 text-xs font-bold text-fal-navy">
                {modalityLabel}
              </span>
            ) : null}
            {freightChoiceLabel ? (
              <span
                className="rounded-[8px] border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-bold text-green-950"
                title="Frete e prazo comprados pelo cliente no checkout"
              >
                {freightChoiceLabel}
              </span>
            ) : null}
            <span className="rounded-[8px] bg-fal-bg px-2.5 py-1 text-xs font-bold text-fal-navy">
              {actorLabel}
            </span>
          </div>
        </div>
      </div>

      {nextStep ? (
        <section className="rounded-[14px] border-2 border-fal-yellow-dark/50 bg-fal-yellow/20 px-4 py-3 shadow-sm">
          <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-navy/70">
            Faça agora
          </p>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="m-0 text-lg font-extrabold text-fal-navy">{nextStep.title}</h2>
              <p className="mb-0 mt-1 text-sm text-fal-navy/80">{nextStep.body}</p>
              {separationProgress ? (
                <p className="mb-0 mt-2 text-sm font-bold text-fal-navy">{separationProgress}</p>
              ) : null}
            </div>
            {jumpHref ? (
              <a
                href={jumpHref}
                className="inline-flex shrink-0 items-center rounded-[10px] border border-fal-navy bg-fal-navy px-3 py-2 text-sm font-bold text-white no-underline"
              >
                Ir à ação ↓
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      {opsReady ? (
        <div className="rounded-[14px] border border-fal-line/80 bg-white/80">
          <OrderOpsWizardNav order={order} compact />
        </div>
      ) : null}
    </header>
  )
}
