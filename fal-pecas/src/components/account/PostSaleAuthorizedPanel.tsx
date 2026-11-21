import { Button } from '@/components/common/Button'
import { formatDateTime } from '@/lib/datetime'
import {
  meReverseCodeValid,
  POST_SALE_RETURN_MODE_LABEL,
  type MeReversePayload,
  type PostSaleReturnMode,
} from '@/lib/postSaleStages'
import { buildOrderWhatsAppMessage, storeWhatsAppPhone, whatsAppHref } from '@/lib/whatsapp'

type Props = {
  orderId: string
  orderNumber: string
  occurrenceId: string
  returnMode: PostSaleReturnMode
  meReverse: MeReversePayload | null
  storeAddress?: string | null
  busy: boolean
  onGenerateCode: () => Promise<void>
}

export function PostSaleAuthorizedPanel({
  orderId,
  orderNumber,
  occurrenceId,
  returnMode,
  meReverse,
  storeAddress,
  busy,
  onGenerateCode,
}: Props) {
  const waPhone = storeWhatsAppPhone()
  const hasCode = meReverseCodeValid(meReverse)
  const waMsg = buildOrderWhatsAppMessage({
    orderNumber,
    statusLabel: `Pós-venda · caso ${occurrenceId.slice(0, 8)} · ${POST_SALE_RETURN_MODE_LABEL[returnMode]}`,
  })

  return (
    <div className="rounded-fal border border-fal-accent/40 bg-fal-accent/10 p-5">
      <h3 className="mt-0 text-base font-extrabold text-fal-fg">Devolução autorizada</h3>
      <p className="mt-1 mb-0 text-sm text-fal-muted">
        Modo: {POST_SALE_RETURN_MODE_LABEL[returnMode]}. Caso {occurrenceId.slice(0, 8)}… · pedido{' '}
        {orderId.slice(0, 8)}…
      </p>

      {returnMode === 'me_codigo' ? (
        <div className="mt-4 space-y-3">
          {hasCode ? (
            <>
              <p className="m-0 text-sm font-extrabold text-fal-fg">
                Código de devolução: {meReverse?.tracking_code}
              </p>
              {meReverse?.expires_at ? (
                <p className="m-0 text-sm text-fal-muted">
                  Válido até {formatDateTime(meReverse.expires_at)} — leve à agência dos Correios.
                </p>
              ) : (
                <p className="m-0 text-sm text-fal-muted">
                  Informe o código no balcão dos Correios (não precisa imprimir etiqueta).
                </p>
              )}
              {meReverse?.tracking_url ? (
                <p className="m-0 text-sm">
                  <a
                    className="font-semibold text-fal-navy underline"
                    href={meReverse.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Acompanhar postagem
                  </a>
                </p>
              ) : null}
              <p className="m-0 text-xs text-fal-muted">
                A DC-e (Declaração de Conteúdo eletrônica) é tratada automaticamente quando
                disponível; leve a peça na embalagem original.
              </p>
            </>
          ) : (
            <>
              <p className="m-0 text-sm text-fal-muted">
                Gere o código quando for postar — ele vale cerca de 7 dias.
              </p>
              <Button type="button" disabled={busy} onClick={() => void onGenerateCode()}>
                Gerar código de devolução
              </Button>
            </>
          )}
        </div>
      ) : null}

      {returnMode === 'wa' || returnMode === 'loja' ? (
        <div className="mt-4 space-y-3">
          {returnMode === 'loja' ? (
            <p className="m-0 text-sm text-fal-muted">
              Leve a peça e o número do pedido à loja
              {storeAddress ? `: ${storeAddress}` : ''}. Combine o horário pelo WhatsApp se
              preferir.
            </p>
          ) : (
            <p className="m-0 text-sm text-fal-muted">
              A loja orienta a postagem pelos Correios (sem código automático). Fale no WhatsApp
              com o número do pedido.
            </p>
          )}
          {waPhone ? (
            <a
              className="inline-flex items-center justify-center rounded-[10px] border border-fal-line bg-fal-surface px-4 py-2 text-sm font-extrabold text-fal-fg no-underline"
              href={whatsAppHref(waPhone, waMsg)}
              target="_blank"
              rel="noreferrer"
            >
              Abrir WhatsApp
            </a>
          ) : (
            <p className="m-0 text-sm font-semibold text-fal-fg">
              WhatsApp da loja indisponível neste momento — use o telefone do site.
            </p>
          )}
        </div>
      ) : null}

      {returnMode === 'me_codigo' && waPhone ? (
        <p className="mt-4 mb-0 text-xs text-fal-muted">
          Dúvidas?{' '}
          <a
            className="font-semibold text-fal-navy underline"
            href={whatsAppHref(waPhone, waMsg)}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp da loja
          </a>
        </p>
      ) : null}
    </div>
  )
}
