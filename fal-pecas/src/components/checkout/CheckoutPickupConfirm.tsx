import { Button } from '@/components/common/Button'
import {
  formatStoreOriginAddress,
  STORE_PICKUP_HOURS_LABEL,
  STORE_PICKUP_NOTIFY_NOTICE,
} from '@/services/shipping/storePickupOption'
import { storeWhatsAppPhone, whatsAppHref } from '@/lib/whatsapp'
import type { StoreShippingOrigin } from '@/types'

type Props = {
  origin: StoreShippingOrigin | null | undefined
  onSwitchToHome?: () => void
  viewOnly?: boolean
}

function buildPickupArrangeMessage(): string {
  return [
    'Olá! Quero combinar a retirada na loja FAL.',
    '',
    'Aguardo orientação sobre horário e a liberação do pedido.',
  ].join('\n')
}

/** Etapa Entrega no checkout quando a modalidade é retirada (sem cotar frete). */
export function CheckoutPickupConfirm({ origin, onSwitchToHome, viewOnly }: Props) {
  const phone = storeWhatsAppPhone()
  const waHref = phone ? whatsAppHref(phone, buildPickupArrangeMessage()) : null

  return (
    <div className="space-y-4">
      <h2 className="mt-0 text-lg font-extrabold">2. Retirada na loja</h2>
      <p className="m-0 text-sm text-fal-muted">
        Confira o local e o horário. Depois do pagamento, aguarde a liberação para retirar.
      </p>

      <div className="rounded-fal border border-fal-line bg-fal-bg px-3 py-3 text-sm text-fal-ink">
        <p className="m-0 font-bold text-fal-navy">Endereço</p>
        {origin ? (
          <p className="mb-0 mt-1">{formatStoreOriginAddress(origin)}</p>
        ) : (
          <p className="mb-0 mt-1 text-fal-muted">Carregando endereço da loja…</p>
        )}

        <p className="mb-0 mt-3 font-bold text-fal-navy">Horário</p>
        <p className="mb-0 mt-1">{STORE_PICKUP_HOURS_LABEL}</p>
      </div>

      <div
        className="rounded-fal border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950"
        role="status"
      >
        <p className="m-0 font-semibold">Aguarde a mensagem de liberação</p>
        <p className="mb-0 mt-1 text-xs">{STORE_PICKUP_NOTIFY_NOTICE}</p>
      </div>

      {waHref && !viewOnly ? (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center rounded-[10px] border border-fal-line bg-white px-[19px] py-[13px] text-sm font-extrabold text-fal-navy hover:border-fal-navy"
        >
          Combinar no WhatsApp
        </a>
      ) : (
        <Button type="button" variant="light" disabled title="Em breve">
          Combinar no WhatsApp (em breve)
        </Button>
      )}

      {onSwitchToHome && !viewOnly ? (
        <button
          type="button"
          className="text-sm font-semibold text-fal-navy underline"
          onClick={onSwitchToHome}
        >
          Prefiro receber em casa
        </button>
      ) : null}
    </div>
  )
}
