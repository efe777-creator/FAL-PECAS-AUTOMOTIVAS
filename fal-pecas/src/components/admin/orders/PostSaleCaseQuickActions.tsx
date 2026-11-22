import { Button } from '@/components/common/Button'
import {
  actionPostSaleCase,
  type OrderOpsActionRunner,
} from '@/lib/orderOpsActions'
import { deriveOccurrences } from '@/lib/orderOccurrences'
import {
  evaluateMeReverseEligibility,
  countShipmentVolumes,
  readMeCartItemId,
} from '@/lib/meReverseEligibility'
import {
  POST_SALE_RETURN_MODE_LABEL,
  POST_SALE_STAGE_LABEL,
  type PostSaleReturnMode,
} from '@/lib/postSaleStages'
import { POST_SALE_MOTIVES } from '@/lib/postSaleMotives'
import { pickPrimaryPostSaleOccurrence } from '@/lib/postSaleReturnOpsSummary'
import type { AdminOrderDetail } from '@/services/admin/adminOrderService'
import { useMemo, useState } from 'react'

function motivoLabel(code: string | null): string | null {
  if (!code) return null
  return POST_SALE_MOTIVES.find((m) => m.code === code)?.label ?? code
}

type Props = {
  order: AdminOrderDetail
  busy: boolean
  runner: OrderOpsActionRunner
  pushOk: (m: string) => void
  pushError: (m: string) => void
  onBusy: (busy: boolean) => void
  reload: () => Promise<void>
}

/**
 * CTAs do caso pós-venda no topo da Logística (acima do contexto Ida × devolução).
 * Histórico completo permanece em OrderOccurrencesPanel.
 */
export function PostSaleCaseQuickActions({
  order,
  busy,
  runner,
  pushOk,
  pushError,
  onBusy,
  reload,
}: Props) {
  const [returnMode, setReturnMode] = useState<PostSaleReturnMode>('wa')
  const [authOpen, setAuthOpen] = useState(false)
  const [authNote, setAuthNote] = useState('')

  const primary = useMemo(() => {
    const list = deriveOccurrences(
      (order.events ?? []).map((e) => ({
        id: e.id,
        eventType: e.eventType,
        payload: e.payload,
        visibility: e.visibility,
        createdAt: e.createdAt,
      })),
    )
    const o = pickPrimaryPostSaleOccurrence(list)
    if (!o || o.status === 'resolved') return null
    return o
  }, [order.events])

  const meEligible = useMemo(
    () =>
      evaluateMeReverseEligibility({
        orderStatus: order.status,
        provider: order.shipment?.provider,
        volumeCount: countShipmentVolumes(order.shipment?.metadata ?? null),
        meOrderId: readMeCartItemId(order.shipment?.metadata ?? null),
      }),
    [order],
  )

  if (!primary) return null

  const stage = primary.stage
  const stageLabel = stage ? POST_SALE_STAGE_LABEL[stage] : 'Caso aberto'
  const fb = { ok: pushOk, error: pushError }

  async function run(
    action:
      | 'start'
      | 'authorize'
      | 'refuse'
      | 'awaiting_piece'
      | 'conference'
      | 'resolve',
    extra?: { returnMode?: PostSaleReturnMode; note?: string; solucao?: string },
  ) {
    onBusy(true)
    try {
      const ok = await actionPostSaleCase(
        runner,
        {
          orderId: order.id,
          occurrenceId: primary!.occurrenceId,
          action,
          returnMode: extra?.returnMode,
          note: extra?.note ?? null,
          solucao: extra?.solucao ?? null,
        },
        fb,
      )
      if (ok) {
        setAuthOpen(false)
        await reload()
      }
    } finally {
      onBusy(false)
    }
  }

  const motivo = motivoLabel(primary.motivoCode)
  const customerNote = primary.note?.trim() || null

  return (
    <section
      className="rounded-fal border border-fal-navy/30 bg-fal-surface px-3 py-2.5 shadow-sm"
      aria-label="Ações do caso pós-venda"
    >
      <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
        Caso · {stageLabel}
      </p>
      <p className="mb-0 mt-1 text-xs font-semibold text-fal-fg">
        {motivo ?? primary.tipo ?? 'pós-venda'}
        <span className="font-normal text-fal-muted">
          {' '}
          · {primary.occurrenceId.slice(0, 8)}…
        </span>
      </p>
      {customerNote ? (
        <div className="mt-2 rounded-fal border border-fal-line bg-fal-bg px-2.5 py-2">
          <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
            Mensagem do cliente
          </p>
          <p className="mb-0 mt-1 whitespace-pre-wrap text-sm text-fal-ink">{customerNote}</p>
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {(!stage || stage === 'aberto') && (
          <Button
            type="button"
            variant="primary"
            disabled={busy}
            onClick={() => void run('start')}
          >
            Em análise
          </Button>
        )}
        {stage === 'em_analise' ? (
          <>
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => {
                setReturnMode(meEligible.ok ? 'me_codigo' : 'wa')
                setAuthNote('')
                setAuthOpen(true)
              }}
            >
              Autorizar
            </Button>
            <Button
              type="button"
              variant="light"
              disabled={busy}
              onClick={() =>
                void run('refuse', {
                  solucao: 'Solicitação recusada após análise',
                  note: 'Recusa fundamentada',
                })
              }
            >
              Recusar
            </Button>
          </>
        ) : null}
        {stage === 'autorizada' ? (
          <Button
            type="button"
            variant="primary"
            disabled={busy}
            onClick={() => void run('awaiting_piece')}
          >
            Aguardando peça
          </Button>
        ) : null}
        {(stage === 'autorizada' || stage === 'aguardando_peca') && (
          <Button
            type="button"
            variant={stage === 'aguardando_peca' ? 'primary' : 'light'}
            disabled={busy}
            onClick={() => void run('conference')}
          >
            Conferência
          </Button>
        )}
        {stage === 'em_conferencia' || stage === 'recusada' ? (
          <Button
            type="button"
            variant="primary"
            disabled={busy}
            onClick={() =>
              void run('resolve', {
                solucao:
                  stage === 'recusada'
                    ? 'Encerrado após recusa'
                    : 'Conferência concluída',
              })
            }
          >
            Resolver
          </Button>
        ) : null}
      </div>

      {authOpen ? (
        <div className="mt-2 rounded-[8px] border border-fal-line bg-fal-bg/60 p-2">
          <label className="block text-xs font-semibold text-fal-muted">
            Modo de retorno
            <select
              className="mt-1 block w-full rounded-[8px] border border-fal-line bg-fal-surface px-2 py-1.5 text-sm text-fal-fg"
              value={returnMode}
              disabled={busy}
              onChange={(e) => setReturnMode(e.target.value as PostSaleReturnMode)}
            >
              {(Object.keys(POST_SALE_RETURN_MODE_LABEL) as PostSaleReturnMode[]).map(
                (m) => (
                  <option key={m} value={m} disabled={m === 'me_codigo' && !meEligible.ok}>
                    {POST_SALE_RETURN_MODE_LABEL[m]}
                    {m === 'me_codigo' && !meEligible.ok ? ' (indisponível)' : ''}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="mt-2 block text-xs font-semibold text-fal-muted">
            Nota (opcional)
            <input
              className="mt-1 block w-full rounded-[8px] border border-fal-line bg-fal-surface px-2 py-1.5 text-sm text-fal-fg"
              value={authNote}
              disabled={busy}
              onChange={(e) => setAuthNote(e.target.value)}
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void run('authorize', {
                  returnMode,
                  note: authNote.trim() || undefined,
                })
              }
            >
              Confirmar autorização
            </Button>
            <Button
              type="button"
              variant="light"
              disabled={busy}
              onClick={() => setAuthOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
