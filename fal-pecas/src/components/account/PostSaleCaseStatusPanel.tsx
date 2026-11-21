import { PostSaleWhatsAppButton } from '@/components/account/PostSaleWhatsAppButton'
import { formatDateTime } from '@/lib/datetime'
import type { OccurrenceCurrent } from '@/lib/orderOccurrences'
import {
  POST_SALE_RETURN_MODE_LABEL,
  POST_SALE_STAGE_LABEL,
  type PostSaleStage,
} from '@/lib/postSaleStages'

type Props = {
  orderNumber: string
  occurrence: OccurrenceCurrent
}

function stageCopy(stage: PostSaleStage | null, status: OccurrenceCurrent['status']): string {
  if (status === 'resolved' || stage === 'resolvido') {
    return 'Este atendimento foi encerrado pela loja.'
  }
  switch (stage) {
    case 'aberto':
      return 'Recebemos seu pedido de ajuda. A loja vai analisar em breve.'
    case 'em_analise':
      return 'A loja está analisando o caso.'
    case 'autorizada':
      return 'Devolução autorizada — siga as instruções no bloco acima.'
    case 'recusada':
      return 'A solicitação de devolução não foi autorizada. Veja o motivo abaixo.'
    case 'aguardando_peca':
      return 'Aguardando a peça chegar na loja (postagem ou entrega na loja).'
    case 'em_conferencia':
      return 'A loja está conferindo a peça recebida.'
    default:
      return 'Acompanhe o andamento deste atendimento.'
  }
}

export function PostSaleCaseStatusPanel({ orderNumber, occurrence }: Props) {
  const stage = occurrence.stage
  const resolved = occurrence.status === 'resolved' || stage === 'resolvido'
  const stageLabel =
    stage && stage in POST_SALE_STAGE_LABEL
      ? POST_SALE_STAGE_LABEL[stage]
      : resolved
        ? 'Resolvido'
        : 'Em andamento'
  const modeLabel = occurrence.returnMode
    ? POST_SALE_RETURN_MODE_LABEL[occurrence.returnMode]
    : null
  const outcome = occurrence.solucao || occurrence.motivoEncerramento

  return (
    <div
      className={
        resolved
          ? 'rounded-fal border border-fal-line bg-fal-bg p-5'
          : stage === 'recusada'
            ? 'rounded-fal border border-fal-warning/40 bg-fal-warning/10 p-5'
            : 'rounded-fal border border-fal-navy/25 bg-fal-navy/5 p-5'
      }
    >
      <h3 className="mt-0 text-base font-extrabold text-fal-fg">
        {resolved ? 'Atendimento encerrado' : 'Atendimento pós-venda'}
      </h3>
      <p className="mt-1 mb-0 text-sm text-fal-muted">
        Caso {occurrence.occurrenceId.slice(0, 8)}… · Situação: {stageLabel}
        {modeLabel ? ` · ${modeLabel}` : ''}
      </p>
      <p className="mt-2 mb-0 text-sm text-fal-fg">{stageCopy(stage, occurrence.status)}</p>

      {outcome ? (
        <p className="mt-3 mb-0 rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm text-fal-ink">
          <span className="font-extrabold text-fal-fg">
            {resolved ? 'Resultado: ' : 'Orientação: '}
          </span>
          {outcome}
        </p>
      ) : null}

      <p className="mt-2 mb-0 text-xs text-fal-muted">
        Última atualização {formatDateTime(occurrence.lastEventAt)}
      </p>

      {!resolved ? (
        <div className="mt-3">
          <PostSaleWhatsAppButton
            orderNumber={orderNumber}
            occurrenceId={occurrence.occurrenceId}
            stage={stage}
            returnMode={occurrence.returnMode}
            trackingCode={occurrence.meReverse?.tracking_code}
            intent={
              occurrence.returnMode === 'wa'
                ? 'devolucao_wa'
                : occurrence.returnMode === 'loja'
                  ? 'devolver_loja'
                  : occurrence.returnMode === 'me_codigo'
                    ? 'duvida_codigo'
                    : 'caso_aberto'
            }
            label="Falar no WhatsApp sobre este caso"
            variant={stage === 'recusada' ? 'button' : 'link'}
          />
        </div>
      ) : null}
    </div>
  )
}
