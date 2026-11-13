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
      <section className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-emerald-900">Análise concluída</h3>
        <p className="text-sm text-emerald-800">
          Pedido confirmado. Imprima o romaneio / lista de separação e siga a conferência física.
        </p>
        {onPrintSeparation ? (
          <button
            type="button"
            disabled={busy}
            onClick={onPrintSeparation}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Imprimir lista de separação / romaneio
          </button>
        ) : null}
      </section>
    )
  }

  if (awaitingDecision) {
    return (
      <section className="rounded-xl border border-sky-200 bg-sky-50/80 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-sky-900">Aguardando decisão do cliente</h3>
        <p className="text-sm text-sky-800">
          Proposta:{' '}
          <strong>{String(order.decisionProposal?.kind ?? '—')}</strong>
          {order.decisionProposal?.reason_text
            ? ` — ${String(order.decisionProposal.reason_text)}`
            : null}
        </p>
        <p className="text-xs text-sky-700">
          Decisão atual: {order.customerDecision ?? 'pending'}
        </p>
        {order.customerDecision === 'continue_available' ||
        order.customerDecision === 'authorized' ? (
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            Cliente aprovou. Use <strong>Confirmar pedido e enviar para separação</strong> abaixo —
            a separação não inicia sozinha.
          </p>
        ) : null}
        {onWithdraw ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onWithdraw()}
            className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm text-sky-900 hover:bg-sky-100 disabled:opacity-50"
          >
            Retirar solicitação (voltar à análise)
          </button>
        ) : null}
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-amber-950">Resolução da análise</h3>
        <p className="mt-1 text-xs text-amber-800">
          {mode === 'incomplete' && 'Defina a disponibilidade de todos os itens antes de seguir.'}
          {mode === 'all_ok' && 'Tudo disponível — confirme o envio para separação.'}
          {mode === 'prazo_only' &&
            'Há prazo maior que o cotado. Atualize e siga, ou peça confirmação ao cliente.'}
          {mode === 'has_unavailable' &&
            'Há item indisponível. Espere a chegada, ou peça decisão ao cliente (continuar / esperar / cancelar).'}
          {inHold ? ' (pedido em aguardando disponibilidade)' : null}
        </p>
      </div>

      <label className="block text-xs font-medium text-amber-950">
        Texto para o cliente (proposta)
        <textarea
          value={reasonDraft}
          onChange={(e) => setReasonDraft(e.target.value)}
          rows={3}
          disabled={busy || mode === 'incomplete'}
          className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800"
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
            className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-amber-950"
          >
            Pré-preencher texto de prazo
          </button>
        </div>
      ) : null}

      {mode === 'has_unavailable' ? (
        <div className="space-y-3">
          <p className="text-xs text-amber-900 rounded-lg bg-amber-100/80 px-3 py-2">
            {REFUND_MANUAL_NOTICE}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-medium text-amber-950">
              Dias estimados (espera)
              <input
                type="number"
                min={1}
                value={waitDays}
                onChange={(e) => setWaitDays(e.target.value)}
                disabled={busy}
                className="mt-1 block w-28 rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-amber-950 flex-1 min-w-[12rem]">
              Nota do hold
              <input
                type="text"
                value={holdNote}
                onChange={(e) => setHoldNote(e.target.value)}
                disabled={busy}
                className="mt-1 block w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm"
                placeholder="Ex.: aguardando reposição do SKU"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void onHold(waitDays.trim() ? Number(waitDays) : null, holdNote.trim())
              }
              className="rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
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
        <p className="text-sm text-amber-900">Salve a disponibilidade de cada item acima.</p>
      ) : null}
    </section>
  )
}
