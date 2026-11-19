import { useMemo, useState } from 'react'
import type { AdminOrderDetail, StaffDecisionReasonKind } from '@/services/admin/adminOrderService'
import {
  REFUND_MANUAL_NOTICE,
  classifyAnalysisItems,
  defaultProposalText,
} from '@/lib/orderAnalysisResolution'

type Props = {
  order: AdminOrderDetail
  busy: boolean
  onFinalize: () => void | Promise<void>
  onRequestDecision: (
    kind: StaffDecisionReasonKind,
    reasonText: string,
    proposal?: Record<string, unknown>,
  ) => void | Promise<void>
  onHold: (waitDays: number | null, note: string) => void | Promise<void>
  onWithdraw?: () => void | Promise<void>
  onPrintSeparation?: () => void
}

export function OrderAnalysisResolutionPanel({
  order,
  busy,
  onFinalize,
  onRequestDecision,
  onHold,
  onWithdraw,
  onPrintSeparation,
}: Props) {
  const [reasonDraft, setReasonDraft] = useState('')
  const [waitDays, setWaitDays] = useState('')
  const [holdNote, setHoldNote] = useState('')

  const mode = useMemo(
    () =>
      classifyAnalysisItems(
        order.items.map((i) => ({ availability: i.availability, leadDays: i.leadDays })),
      ),
    [order.items],
  )

  const maxLead = useMemo(() => {
    const days = order.items
      .filter((i) => i.availability === 'disponivel_com_prazo')
      .map((i) => Number(i.leadDays ?? 0))
      .filter((n) => n > 0)
    return days.length ? Math.max(...days) : null
  }, [order.items])

  const unavailableNames = useMemo(
    () =>
      order.items
        .filter((i) => i.availability === 'indisponivel')
        .map((i) => i.nameSnapshot || i.sku),
    [order.items],
  )

  const awaitingDecision = order.status === 'aguardando_decisao'
  const inHold = order.status === 'aguardando_disponibilidade'
  const confirmedLike = ['confirmado', 'em_separacao', 'pronto_para_envio'].includes(order.status)

  function fillTemplate(kind: StaffDecisionReasonKind) {
    setReasonDraft(defaultProposalText(kind, { leadDays: maxLead, unavailableNames }))
  }

  async function request(kind: StaffDecisionReasonKind) {
    const text =
      reasonDraft.trim() ||
      defaultProposalText(kind, { leadDays: maxLead, unavailableNames })
    await onRequestDecision(kind, text, {
      new_eta: maxLead,
      wait_days: waitDays.trim() ? Number(waitDays) : null,
    })
  }

  if (confirmedLike) {
    return (
      <section className="space-y-3 rounded-xl border border-fal-success/40 bg-fal-success/15 p-4 text-fal-fg">
        <h3 className="text-sm font-semibold text-fal-fg">Análise concluída</h3>
        <p className="text-sm text-fal-muted">
          Pedido confirmado. Imprima o romaneio / lista de separação e siga a conferência física.
        </p>
        {onPrintSeparation ? (
          <button
            type="button"
            disabled={busy}
            onClick={onPrintSeparation}
            className="rounded-lg bg-fal-success px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Imprimir lista de separação / romaneio
          </button>
        ) : null}
      </section>
    )
  }

  if (awaitingDecision) {
    return (
      <section className="space-y-3 rounded-xl border border-fal-accent/40 bg-fal-accent/15 p-4 text-fal-fg">
        <h3 className="text-sm font-semibold text-fal-fg">Aguardando decisão do cliente</h3>
        <p className="text-sm text-fal-fg">
          Proposta:{' '}
          <strong>{String(order.decisionProposal?.kind ?? '—')}</strong>
          {order.decisionProposal?.reason_text
            ? ` — ${String(order.decisionProposal.reason_text)}`
            : null}
        </p>
        <p className="text-xs text-fal-muted">
          Decisão atual: {order.customerDecision ?? 'pending'}
        </p>
        {order.customerDecision === 'continue_available' ||
        order.customerDecision === 'authorized' ? (
          <p className="rounded-lg border border-fal-success/40 bg-fal-success/15 px-3 py-2 text-sm text-fal-fg">
            Cliente aprovou. Use <strong>Confirmar e enviar à separação</strong> em{' '}
            <strong>Ações do pedido</strong> (rodapé) — a separação não inicia sozinha.
          </p>
        ) : null}
        {onWithdraw ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onWithdraw()}
            className="rounded-lg border border-fal-line bg-fal-surface px-3 py-2 text-sm text-fal-fg hover:bg-fal-surface-2 disabled:opacity-50"
          >
            Retirar solicitação (voltar à análise)
          </button>
        ) : null}
      </section>
    )
  }

  return (
    <section className="space-y-4 rounded-xl border border-fal-yellow-dark/50 bg-fal-yellow/20 p-4 text-fal-fg">
      <div>
        <h3 className="text-sm font-semibold text-fal-fg">Resolução da análise</h3>
        <p className="mt-1 text-xs text-fal-muted">
          {mode === 'incomplete' && 'Defina a disponibilidade de todos os itens antes de seguir.'}
          {mode === 'all_ok' && 'Tudo disponível — confirme o envio para separação.'}
          {mode === 'prazo_only' &&
            'Há prazo maior que o cotado. Atualize e siga, ou peça confirmação ao cliente.'}
          {mode === 'has_unavailable' &&
            'Há item indisponível. Espere a chegada, ou peça decisão ao cliente (continuar / esperar / cancelar).'}
          {inHold ? ' (pedido em aguardando disponibilidade)' : null}
        </p>
      </div>

      <label className="block text-xs font-medium text-fal-fg">
        Texto para o cliente (proposta)
        <textarea
          value={reasonDraft}
          onChange={(e) => setReasonDraft(e.target.value)}
          rows={3}
          disabled={busy || mode === 'incomplete'}
          className="fal-field mt-1 w-full rounded-lg border border-fal-line bg-fal-surface px-3 py-2 text-sm text-fal-fg placeholder:text-fal-muted"
          placeholder="Pré-preencha com o botão do caminho escolhido ou escreva livremente"
        />
      </label>

      {mode === 'all_ok' ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onFinalize()}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Confirmar envio para separação
          </button>
        </div>
      ) : null}

      {mode === 'prazo_only' ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onFinalize()}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Atualizar prazo e seguir
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              fillTemplate('prazo')
              void request('prazo')
            }}
            className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
          >
            Pedir confirmação do cliente (prazo)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => fillTemplate('prazo')}
            className="rounded-lg border border-fal-line bg-fal-surface px-3 py-2 text-sm text-fal-fg"
          >
            Pré-preencher texto de prazo
          </button>
        </div>
      ) : null}

      {mode === 'has_unavailable' ? (
        <div className="space-y-3">
          <p className="rounded-lg border border-fal-yellow-dark/40 bg-fal-yellow/15 px-3 py-2 text-xs text-fal-fg">
            {REFUND_MANUAL_NOTICE}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-medium text-fal-fg">
              Dias estimados (espera)
              <input
                type="number"
                min={1}
                value={waitDays}
                onChange={(e) => setWaitDays(e.target.value)}
                disabled={busy}
                className="fal-field mt-1 block w-28 rounded-lg border border-fal-line bg-fal-surface px-2 py-1.5 text-sm text-fal-fg"
              />
            </label>
            <label className="min-w-[12rem] flex-1 text-xs font-medium text-fal-fg">
              Nota do hold
              <input
                type="text"
                value={holdNote}
                onChange={(e) => setHoldNote(e.target.value)}
                disabled={busy}
                className="fal-field mt-1 block w-full rounded-lg border border-fal-line bg-fal-surface px-2 py-1.5 text-sm text-fal-fg placeholder:text-fal-muted"
                placeholder="Ex.: aguardando reposição do SKU"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void onHold(waitDays.trim() ? Number(waitDays) : null, holdNote.trim())
              }
              className="rounded-lg border border-fal-yellow-dark/50 bg-fal-surface px-3 py-2 text-sm font-medium text-fal-fg hover:bg-fal-surface-2 disabled:opacity-50"
            >
              Esperar chegada
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                fillTemplate('parcial')
                void request('parcial')
              }}
              className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
            >
              Pedir: continuar só com disponível
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                fillTemplate('escolha')
                void request('escolha')
              }}
              className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-50"
            >
              Pedir decisão completa (continuar / esperar / cancelar)
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'incomplete' ? (
        <p className="text-sm text-fal-muted">
          Salve a disponibilidade de cada item na conferência (nesta seção Ops / aba Itens).
        </p>
      ) : null}
    </section>
  )
}
