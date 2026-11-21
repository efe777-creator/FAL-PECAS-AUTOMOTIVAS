import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { formatDateTime } from '@/lib/datetime'
import {
  countShipmentVolumes,
  evaluateMeReverseEligibility,
  readMeCartItemId,
} from '@/lib/meReverseEligibility'
import {
  deriveOccurrences,
  OCCURRENCE_STATUS_LABEL,
  validateOccurrenceAction,
  type OccurrenceCurrent,
  type OccurrencePriority,
  type OccurrenceSeverity,
} from '@/lib/orderOccurrences'
import { createOrderOpsActionRunner, actionPostSaleCase } from '@/lib/orderOpsActions'
import {
  isPostSaleTipo,
  meReverseCodeValid,
  POST_SALE_RETURN_MODE_LABEL,
  POST_SALE_STAGE_LABEL,
  type PostSaleReturnMode,
} from '@/lib/postSaleStages'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminOccurrenceAction,
  type AdminOrderDetail,
} from '@/services/admin/adminOrderService'
import { useMemo, useState } from 'react'

const TIPOS = [
  { value: 'divergencia', label: 'Divergência' },
  { value: 'falta', label: 'Falta física' },
  { value: 'dano', label: 'Dano' },
  { value: 'atraso', label: 'Atraso' },
  { value: 'pos_venda', label: 'Pós-venda (geral)' },
  { value: 'pos_venda_suporte', label: 'Pós-venda · suporte' },
  { value: 'pos_venda_incompat', label: 'Pós-venda · incompatibilidade' },
  { value: 'pos_venda_devolucao', label: 'Pós-venda · devolução' },
  { value: 'pos_entrega', label: 'Pós-entrega (legado)' },
  { value: 'outro', label: 'Outro' },
] as const

type Props = {
  order: AdminOrderDetail
  busy: boolean
  onBusy: (v: boolean) => void
  onReload: () => Promise<void>
  onOk: (msg: string) => void
  onError: (msg: string) => void
}

export function OrderOccurrencesPanel({
  order,
  busy,
  onBusy,
  onReload,
  onOk,
  onError,
}: Props) {
  const runner = useMemo(() => createOrderOpsActionRunner(), [])
  const list = useMemo(
    () =>
      deriveOccurrences(
        order.events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          payload: e.payload,
          visibility: e.visibility,
          createdAt: e.createdAt,
        })),
      ),
    [order.events],
  )

  const meEligible = useMemo(() => {
    const meta = order.shipment?.metadata ?? null
    return evaluateMeReverseEligibility({
      orderStatus: order.status,
      provider: order.shipment?.provider,
      volumeCount: countShipmentVolumes(meta),
      meOrderId: readMeCartItemId(meta),
    })
  }, [order])

  const [tipo, setTipo] = useState<string>('divergencia')
  const [gravidade, setGravidade] = useState<OccurrenceSeverity>('media')
  const [prioridade, setPrioridade] = useState<OccurrencePriority>('media')
  const [acaoNecessaria, setAcaoNecessaria] = useState('')
  const [note, setNote] = useState('')
  const [visibility, setVisibility] = useState<'internal' | 'customer'>('internal')
  const [resolveFor, setResolveFor] = useState<OccurrenceCurrent | null>(null)
  const [reopenFor, setReopenFor] = useState<OccurrenceCurrent | null>(null)
  const [authorizeFor, setAuthorizeFor] = useState<OccurrenceCurrent | null>(null)
  const [returnMode, setReturnMode] = useState<PostSaleReturnMode>('wa')
  const [serviceOverride, setServiceOverride] = useState<'pac' | 'sedex' | ''>('')
  const [solucao, setSolucao] = useState('')
  const [conferenceCondition, setConferenceCondition] = useState<'ok' | 'sujo_usado'>('ok')
  const [reopenReason, setReopenReason] = useState('')
  const [authNote, setAuthNote] = useState('')

  async function openOccurrence() {
    const v = validateOccurrenceAction({
      action: 'open',
      tipo,
      acaoNecessaria,
    })
    if (!v.ok) {
      onError(v.reason ?? 'Dados inválidos')
      return
    }
    if (!note.trim()) {
      onError('Descreva a ocorrência.')
      return
    }
    onBusy(true)
    try {
      await adminOccurrenceAction({
        orderId: order.id,
        action: 'open',
        tipo,
        gravidade,
        prioridade,
        acaoNecessaria: acaoNecessaria.trim(),
        note: note.trim(),
        visibility,
      })
      setNote('')
      setAcaoNecessaria('')
      onOk('Ocorrência aberta')
      await onReload()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao abrir ocorrência'))
    } finally {
      onBusy(false)
    }
  }

  async function startOccurrence(o: OccurrenceCurrent) {
    onBusy(true)
    try {
      if (isPostSaleTipo(o.tipo)) {
        const ok = await actionPostSaleCase(
          runner,
          { orderId: order.id, occurrenceId: o.occurrenceId, action: 'start' },
          { ok: onOk, error: onError },
        )
        if (ok) await onReload()
      } else {
        await adminOccurrenceAction({
          orderId: order.id,
          action: 'start',
          occurrenceId: o.occurrenceId,
          visibility: o.visibility === 'customer' ? 'customer' : 'internal',
        })
        onOk('Ocorrência em andamento')
        await onReload()
      }
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao iniciar'))
    } finally {
      onBusy(false)
    }
  }

  async function runPostSale(
    o: OccurrenceCurrent,
    action: 'authorize' | 'refuse' | 'awaiting_piece' | 'conference' | 'resolve' | 'reopen',
    extra?: {
      returnMode?: PostSaleReturnMode
      note?: string
      serviceOverride?: 'pac' | 'sedex' | null
      solucao?: string
    },
  ) {
    onBusy(true)
    try {
      const ok = await actionPostSaleCase(
        runner,
        {
          orderId: order.id,
          occurrenceId: o.occurrenceId,
          action,
          returnMode: extra?.returnMode ?? null,
          note: extra?.note ?? null,
          serviceOverride: extra?.serviceOverride ?? null,
          solucao: extra?.solucao ?? null,
        },
        { ok: onOk, error: onError },
      )
      if (ok) await onReload()
    } catch (e) {
      onError(toUserMessage(e, 'Falha na ação pós-venda'))
    } finally {
      onBusy(false)
    }
  }

  async function confirmAuthorize() {
    if (!authorizeFor) return
    if (!returnMode) {
      onError('Escolha o modo de devolução.')
      return
    }
    if (returnMode === 'me_codigo' && !meEligible.ok) {
      onError(meEligible.reason)
      return
    }
    await runPostSale(authorizeFor, 'authorize', {
      returnMode,
      note: authNote.trim() || undefined,
      serviceOverride: serviceOverride || null,
    })
    setAuthorizeFor(null)
    setAuthNote('')
  }

  async function resolveOccurrence() {
    const v = validateOccurrenceAction({ action: 'resolve', solucao })
    if (!resolveFor || !v.ok) {
      onError(v.reason ?? 'Informe a solução.')
      return
    }
    const target = resolveFor
    if (isPostSaleTipo(target.tipo)) {
      if (
        (target.stage === 'em_conferencia' || target.stage === 'aguardando_peca') &&
        conferenceCondition === 'sujo_usado'
      ) {
        const note =
          solucao.trim() ||
          'Peça suja/usada/danificada — devolução recusada na conferência.'
        await runPostSale(target, 'refuse', {
          solucao: note,
          note: `conferencia_condicao=sujo_usado · ${note}`,
        })
        setResolveFor(null)
        setSolucao('')
        setConferenceCondition('ok')
        return
      }
      const suffix =
        conferenceCondition === 'ok' &&
        (target.stage === 'em_conferencia' || target.stage === 'aguardando_peca')
          ? ' · conferencia_condicao=ok · seguir Repor estoque + Marcar estorno no OrderOps'
          : ''
      await runPostSale(target, 'resolve', { solucao: `${solucao.trim()}${suffix}` })
      setResolveFor(null)
      setSolucao('')
      setConferenceCondition('ok')
      return
    }
    onBusy(true)
    try {
      await adminOccurrenceAction({
        orderId: order.id,
        action: 'resolve',
        occurrenceId: target.occurrenceId,
        solucao: solucao.trim(),
        motivoEncerramento: solucao.trim(),
        visibility: target.visibility === 'customer' ? 'customer' : 'internal',
      })
      setResolveFor(null)
      setSolucao('')
      onOk('Ocorrência resolvida')
      await onReload()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao resolver'))
    } finally {
      onBusy(false)
    }
  }

  async function reopenOccurrence() {
    const v = validateOccurrenceAction({ action: 'reopen', reopenReason })
    if (!reopenFor || !v.ok) {
      onError(v.reason ?? 'Informe o motivo da reabertura.')
      return
    }
    const target = reopenFor
    if (isPostSaleTipo(target.tipo)) {
      await runPostSale(target, 'reopen', { note: reopenReason.trim() })
      setReopenFor(null)
      setReopenReason('')
      return
    }
    onBusy(true)
    try {
      await adminOccurrenceAction({
        orderId: order.id,
        action: 'reopen',
        occurrenceId: target.occurrenceId,
        motivoReabertura: reopenReason.trim(),
        visibility: target.visibility === 'customer' ? 'customer' : 'internal',
      })
      setReopenFor(null)
      setReopenReason('')
      onOk('Ocorrência reaberta')
      await onReload()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao reabrir'))
    } finally {
      onBusy(false)
    }
  }

  return (
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-fal-surface p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-fg">Ocorrências / revisão</h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Ciclo: aberta → em andamento → resolvida → (reaberta com motivo). Pós-venda: stages
          autorizar / conferência / resolver. Histórico append-only.
        </p>
        {!meEligible.ok ? (
          <p className="mt-2 mb-0 text-xs text-fal-muted">
            ME reversa: {meEligible.reason} Fallback: WA ou loja.
          </p>
        ) : (
          <p className="mt-2 mb-0 text-xs text-fal-muted">
            Pedido elegível para código Melhor Envio (volume único).
          </p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-semibold text-fal-muted">
          Tipo
          <select
            className="mt-1 block w-full rounded-[9px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-normal text-fal-fg"
            value={tipo}
            disabled={busy}
            onChange={(e) => setTipo(e.target.value)}
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-fal-muted">
          Prioridade
          <select
            className="mt-1 block w-full rounded-[9px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-normal text-fal-fg"
            value={prioridade}
            disabled={busy}
            onChange={(e) => setPrioridade(e.target.value as OccurrencePriority)}
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-fal-muted">
          Gravidade
          <select
            className="mt-1 block w-full rounded-[9px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-normal text-fal-fg"
            value={gravidade}
            disabled={busy}
            onChange={(e) => setGravidade(e.target.value as OccurrenceSeverity)}
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
        </label>
        <Input
          label="Ação necessária"
          value={acaoNecessaria}
          disabled={busy}
          onChange={(e) => setAcaoNecessaria(e.target.value)}
          placeholder="O que a equipe deve fazer"
        />
        <label className="text-sm font-semibold text-fal-muted">
          Visibilidade
          <select
            className="mt-1 block w-full rounded-[9px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-normal text-fal-fg"
            value={visibility}
            disabled={busy}
            onChange={(e) => setVisibility(e.target.value as 'internal' | 'customer')}
          >
            <option value="internal">Interna</option>
            <option value="customer">Cliente</option>
          </select>
        </label>
        <Input
          label="Descrição"
          value={note}
          disabled={busy}
          onChange={(e) => setNote(e.target.value)}
          placeholder="O que aconteceu"
        />
      </div>
      <Button type="button" disabled={busy} onClick={() => void openOccurrence()}>
        Abrir ocorrência
      </Button>

      {list.length === 0 ? (
        <p className="text-sm text-fal-muted">Nenhuma ocorrência neste pedido.</p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {list.map((o) => {
            const postSale = isPostSaleTipo(o.tipo)
            const stageLabel = o.stage ? POST_SALE_STAGE_LABEL[o.stage] : null
            const modeLabel = o.returnMode ? POST_SALE_RETURN_MODE_LABEL[o.returnMode] : null
            const hasCode = meReverseCodeValid(o.meReverse)
            return (
              <li key={o.occurrenceId} className="rounded-[12px] border border-fal-line px-3 py-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="m-0 text-sm font-bold text-fal-fg">
                      {o.tipo ?? 'ocorrência'} · {OCCURRENCE_STATUS_LABEL[o.status]}
                      {stageLabel ? ` · ${stageLabel}` : ''} · prioridade {o.prioridade} ·{' '}
                      {o.gravidade}
                    </p>
                    <p className="mb-0 mt-1 text-xs text-fal-muted">
                      ID {o.occurrenceId.slice(0, 8)}… · {o.eventCount} evento(s) ·{' '}
                      {formatDateTime(o.lastEventAt)}
                    </p>
                    {modeLabel ? (
                      <p className="mb-0 mt-1 text-sm">Devolução: {modeLabel}</p>
                    ) : null}
                    {hasCode ? (
                      <p className="mb-0 mt-1 text-sm font-semibold text-fal-fg">
                        Código ME: {o.meReverse?.tracking_code}
                        {o.meReverse?.expires_at
                          ? ` · válido até ${formatDateTime(o.meReverse.expires_at)}`
                          : ''}
                      </p>
                    ) : null}
                  {o.motivoCode ? (
                    <p className="mb-0 mt-1 text-xs text-fal-muted">Motivo: {o.motivoCode}</p>
                  ) : null}
                  {o.scope ? (
                    <p className="mb-0 mt-1 text-xs text-fal-muted">
                      Escopo: {o.scope === 'items' ? 'itens selecionados' : 'pedido inteiro'}
                    </p>
                  ) : null}
                  {o.acaoNecessaria ? (
                    <p className="mb-0 mt-1 text-sm">Ação: {o.acaoNecessaria}</p>
                  ) : null}
                  {o.note ? <p className="mb-0 mt-1 text-sm">{o.note}</p> : null}
                    {o.solucao ? (
                      <p className="mb-0 mt-1 text-sm text-fal-muted">Solução: {o.solucao}</p>
                    ) : null}
                    {o.motivoReabertura ? (
                      <p className="mb-0 mt-1 text-sm text-amber-800">
                        Reabertura: {o.motivoReabertura}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(o.status === 'open' || o.status === 'reopened') &&
                      (!postSale || o.stage === 'aberto' || !o.stage) && (
                        <Button
                          type="button"
                          variant="light"
                          disabled={busy}
                          onClick={() => void startOccurrence(o)}
                        >
                          Em análise
                        </Button>
                      )}
                    {postSale && o.status !== 'resolved' && o.stage === 'em_analise' ? (
                      <>
                        <Button
                          type="button"
                          variant="light"
                          disabled={busy}
                          onClick={() => {
                            setAuthorizeFor(o)
                            setReturnMode(meEligible.ok ? 'me_codigo' : 'wa')
                            setServiceOverride('')
                            setAuthNote('')
                            setResolveFor(null)
                            setReopenFor(null)
                          }}
                        >
                          Autorizar
                        </Button>
                        <Button
                          type="button"
                          variant="light"
                          disabled={busy}
                          onClick={() =>
                            void runPostSale(o, 'refuse', {
                              solucao: 'Solicitação recusada após análise',
                              note: 'Recusa fundamentada',
                            })
                          }
                        >
                          Recusar
                        </Button>
                      </>
                    ) : null}
                    {postSale &&
                    o.status !== 'resolved' &&
                    (o.stage === 'autorizada' || o.stage === 'aguardando_peca') ? (
                      <>
                        {o.stage === 'autorizada' ? (
                          <Button
                            type="button"
                            variant="light"
                            disabled={busy}
                            onClick={() => void runPostSale(o, 'awaiting_piece')}
                          >
                            Aguardando peça
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="light"
                          disabled={busy}
                          onClick={() => void runPostSale(o, 'conference')}
                        >
                          Conferência
                        </Button>
                      </>
                    ) : null}
                    {o.status !== 'resolved' ? (
                      <Button
                        type="button"
                        variant="light"
                        disabled={busy}
                        onClick={() => {
                          setResolveFor(o)
                          setSolucao('')
                          setReopenFor(null)
                          setAuthorizeFor(null)
                        }}
                      >
                        Resolver
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="light"
                        disabled={busy}
                        onClick={() => {
                          setReopenFor(o)
                          setReopenReason('')
                          setResolveFor(null)
                          setAuthorizeFor(null)
                        }}
                      >
                        Reabrir
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {authorizeFor ? (
        <div className="rounded-[12px] border border-fal-navy/30 bg-fal-surface-2 p-3">
          <p className="m-0 text-sm font-bold text-fal-fg">
            Autorizar devolução {authorizeFor.occurrenceId.slice(0, 8)}…
          </p>
          <label className="mt-2 block text-sm font-semibold text-fal-muted">
            Modo de retorno
            <select
              className="mt-1 block w-full rounded-[9px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-normal text-fal-fg"
              value={returnMode}
              disabled={busy}
              onChange={(e) => setReturnMode(e.target.value as PostSaleReturnMode)}
            >
              {meEligible.ok ? (
                <option value="me_codigo">Código Melhor Envio (FAL paga)</option>
              ) : null}
              <option value="wa">WhatsApp / Correios manual</option>
              <option value="loja">Devolver na loja</option>
            </select>
          </label>
          {returnMode === 'me_codigo' ? (
            <label className="mt-2 block text-sm font-semibold text-fal-muted">
              Override serviço (opcional)
              <select
                className="mt-1 block w-full rounded-[9px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-normal text-fal-fg"
                value={serviceOverride}
                disabled={busy}
                onChange={(e) =>
                  setServiceOverride(e.target.value as 'pac' | 'sedex' | '')
                }
              >
                <option value="">Mais barato (PAC/SEDEX)</option>
                <option value="pac">Forçar PAC</option>
                <option value="sedex">Forçar SEDEX</option>
              </select>
            </label>
          ) : null}
          <Input
            label="Nota (opcional)"
            value={authNote}
            disabled={busy}
            onChange={(e) => setAuthNote(e.target.value)}
            placeholder="Orientação ao cliente"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void confirmAuthorize()}>
              Confirmar autorização
            </Button>
            <Button
              type="button"
              variant="light"
              disabled={busy}
              onClick={() => setAuthorizeFor(null)}
            >
              Voltar
            </Button>
          </div>
        </div>
      ) : null}

      {resolveFor ? (
        <div className="rounded-[12px] border border-fal-navy/30 bg-fal-surface-2 p-3">
          <p className="m-0 text-sm font-bold text-fal-fg">
            Resolver {resolveFor.occurrenceId.slice(0, 8)}…
          </p>
          {isPostSaleTipo(resolveFor.tipo) &&
          (resolveFor.stage === 'em_conferencia' ||
            resolveFor.stage === 'aguardando_peca' ||
            resolveFor.stage === 'autorizada') ? (
            <div className="mt-2 space-y-2">
              <label className="block text-sm font-semibold text-fal-muted">
                Condição na conferência
                <select
                  className="mt-1 block w-full rounded-[9px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-normal text-fal-fg"
                  value={conferenceCondition}
                  disabled={busy}
                  onChange={(e) =>
                    setConferenceCondition(e.target.value as 'ok' | 'sujo_usado')
                  }
                >
                  <option value="ok">Peça ok (sem uso / embalagem)</option>
                  <option value="sujo_usado">Suja / usada / danificada → recusar</option>
                </select>
              </label>
              {conferenceCondition === 'ok' ? (
                <p className="m-0 text-xs text-fal-muted">
                  Após resolver: aba Itens → <strong>Repor estoque</strong>; aba Pagamento →{' '}
                  <strong>Marcar estorno feito</strong> (só depois do estorno no provedor).
                </p>
              ) : (
                <p className="m-0 text-xs text-amber-800">
                  Recusa fundamentada: o caso será encerrado como recusado (sem restock/estorno
                  automático).
                </p>
              )}
            </div>
          ) : null}
          <Input
            label="Solução / motivo de encerramento (obrigatório)"
            value={solucao}
            disabled={busy}
            onChange={(e) => setSolucao(e.target.value)}
            placeholder="Como foi tratado (ex.: restock + estorno no provedor)"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy || !solucao.trim()}
              onClick={() => void resolveOccurrence()}
            >
              {conferenceCondition === 'sujo_usado' && isPostSaleTipo(resolveFor.tipo)
                ? 'Recusar na conferência'
                : 'Confirmar resolução'}
            </Button>
            <Button
              type="button"
              variant="light"
              disabled={busy}
              onClick={() => {
                setResolveFor(null)
                setConferenceCondition('ok')
              }}
            >
              Voltar
            </Button>
          </div>
        </div>
      ) : null}

      {reopenFor ? (
        <div className="rounded-[12px] border border-amber-300 bg-amber-50 p-3">
          <p className="m-0 text-sm font-bold text-fal-fg">
            Reabrir {reopenFor.occurrenceId.slice(0, 8)}…
          </p>
          <Input
            label="Motivo da reabertura (obrigatório)"
            value={reopenReason}
            disabled={busy}
            onChange={(e) => setReopenReason(e.target.value)}
            placeholder="Por que voltou à fila"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy || !reopenReason.trim()}
              onClick={() => void reopenOccurrence()}
            >
              Confirmar reabertura
            </Button>
            <Button type="button" variant="light" disabled={busy} onClick={() => setReopenFor(null)}>
              Voltar
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
