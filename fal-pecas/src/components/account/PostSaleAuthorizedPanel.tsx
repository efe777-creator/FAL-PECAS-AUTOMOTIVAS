import { Button } from '@/components/common/Button'
import { PostSaleWhatsAppButton } from '@/components/account/PostSaleWhatsAppButton'
import { formatDateTime } from '@/lib/datetime'
import {
  meReverseCodeValid,
  POST_SALE_RETURN_MODE_LABEL,
  type MeReversePayload,
  type PostSaleReturnMode,
  type PostSaleStage,
} from '@/lib/postSaleStages'

type Props = {
  orderId: string
  orderNumber: string
  occurrenceId: string
  returnMode: PostSaleReturnMode
  stage?: PostSaleStage | string | null
  meReverse: MeReversePayload | null
  /** Se false, esconde CTA Gerar (ex.: já em conferência sem código e stage bloqueado). */
  canGenerateCode?: boolean
  storeAddress?: string | null
  busy: boolean
  onGenerateCode: () => Promise<void>
}

export function PostSaleAuthorizedPanel({
  orderId,
  orderNumber,
  occurrenceId,
  returnMode,
  stage = 'autorizada',
  meReverse,
  canGenerateCode = true,
  storeAddress,
  busy,
  onGenerateCode,
}: Props) {
  const hasCode = meReverseCodeValid(meReverse)
  const trackingCode = hasCode ? String(meReverse?.tracking_code ?? '') : null

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
          ) : canGenerateCode ? (
            <>
              <p className="m-0 text-sm text-fal-muted">
                Gere o código quando for postar — ele vale cerca de 7 dias.
              </p>
              <Button type="button" disabled={busy} onClick={() => void onGenerateCode()}>
                Gerar código de devolução
              </Button>
            </>
          ) : (
            <p className="m-0 text-sm text-fal-muted">
              Aguardando orientação da loja sobre a postagem. Se já gerou o código, ele aparece
              aqui.
            </p>
          )}
          <div className="pt-1">
            <PostSaleWhatsAppButton
              orderNumber={orderNumber}
              occurrenceId={occurrenceId}
              stage={stage}
              returnMode={returnMode}
              trackingCode={trackingCode}
              intent="duvida_codigo"
              label={hasCode ? 'Dúvidas no WhatsApp' : 'Falar no WhatsApp'}
              variant="link"
            />
          </div>
        </div>
      ) : null}

      {returnMode === 'wa' ? (
        <div className="mt-4 space-y-3">
          <p className="m-0 text-sm text-fal-muted">
            A loja orienta a postagem pelos Correios (sem código automático). Use o botão abaixo —
            a mensagem já leva o número do pedido e do caso.
          </p>
          <PostSaleWhatsAppButton
            orderNumber={orderNumber}
            occurrenceId={occurrenceId}
            stage={stage}
            returnMode={returnMode}
            intent="devolucao_wa"
            label="Abrir WhatsApp — combinar postagem"
          />
        </div>
      ) : null}

      {returnMode === 'loja' ? (
        <div className="mt-4 space-y-3">
          <p className="m-0 text-sm text-fal-muted">
            Leve a peça e o número do pedido à loja
            {storeAddress ? `: ${storeAddress}` : ''}. Combine o horário pelo WhatsApp se
            preferir.
          </p>
          <PostSaleWhatsAppButton
            orderNumber={orderNumber}
            occurrenceId={occurrenceId}
            stage={stage}
            returnMode={returnMode}
            intent="devolver_loja"
            label="Abrir WhatsApp — combinar retirada na loja"
          />
        </div>
      ) : null}
    </div>
  )
}
