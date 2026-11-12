import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { formatDateTime } from '@/lib/datetime'
import {
  deriveOccurrences,
  OCCURRENCE_STATUS_LABEL,
  validateOccurrenceAction,
  type OccurrenceCurrent,
  type OccurrencePriority,
  type OccurrenceSeverity,
} from '@/lib/orderOccurrences'
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
  { value: 'pos_venda', label: 'Pós-venda' },
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

  const [tipo, setTipo] = useState<string>('divergencia')
  const [gravidade, setGravidade] = useState<OccurrenceSeverity>('media')
  const [prioridade, setPrioridade] = useState<OccurrencePriority>('media')
  const [acaoNecessaria, setAcaoNecessaria] = useState('')
  const [note, setNote] = useState('')
  const [visibility, setVisibility] = useState<'internal' | 'customer'>('internal')
  const [resolveFor, setResolveFor] = useState<OccurrenceCurrent | null>(null)
  const [reopenFor, setReopenFor] = useState<OccurrenceCurrent | null>(null)
  const [solucao, setSolucao] = useState('')
  const [reopenReason, setReopenReason] = useState('')

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
      await adminOccurrenceAction({
        orderId: order.id,
        action: 'start',
        occurrenceId: o.occurrenceId,
        visibility: o.visibility === 'customer' ? 'customer' : 'internal',
      })
      onOk('Ocorrência em andamento')
      await onReload()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao iniciar'))
    } finally {
      onBusy(false)
    }
  }

  async function resolveOccurrence() {
    const v = validateOccurrenceAction({ action: 'resolve', solucao })
    if (!resolveFor || !v.ok) {
      onError(v.reason ?? 'Informe a solução.')
      return
    }
    onBusy(true)
    try {
      await adminOccurrenceAction({
        orderId: order.id,
        action: 'resolve',
        occurrenceId: resolveFor.occurrenceId,
        solucao: solucao.trim(),
        motivoEncerramento: solucao.trim(),
        visibility: resolveFor.visibility === 'customer' ? 'customer' : 'internal',
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
    onBusy(true)
    try {
      await adminOccurrenceAction({
        orderId: order.id,
        action: 'reopen',
        occurrenceId: reopenFor.occurrenceId,
        motivoReabertura: reopenReason.trim(),
        visibility: reopenFor.visibility === 'customer' ? 'customer' : 'internal',
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
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">Ocorrências / revisão</h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Ciclo: aberta → em andamento → resolvida → (reaberta com motivo). Histórico
          append-only — não some.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-semibold text-fal-muted">
          Tipo
          <select
            className="mt-1 block w-full rounded-[9px] border border-fal-line bg-white px-3 py-2 text-sm font-normal text-fal-navy"
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
            className="mt-1 block w-full rounded-[9px] border border-fal-line bg-white px-3 py-2 text-sm font-normal text-fal-navy"
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
            className="mt-1 block w-full rounded-[9px] border border-fal-line bg-white px-3 py-2 text-sm font-normal text-fal-navy"
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
            className="mt-1 block w-full rounded-[9px] border border-fal-line bg-white px-3 py-2 text-sm font-normal text-fal-navy"
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
          {list.map((o) => (
            <li key={o.occurrenceId} className="rounded-[12px] border border-fal-line px-3 py-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="m-0 text-sm font-bold text-fal-navy">
                    {o.tipo ?? 'ocorrência'} · {OCCURRENCE_STATUS_LABEL[o.status]} · prioridade{' '}
                    {o.prioridade} · {o.gravidade}
                  </p>
                  <p className="mb-0 mt-1 text-xs text-fal-muted">
                    ID {o.occurrenceId.slice(0, 8)}… · {o.eventCount} evento(s) ·{' '}
                    {formatDateTime(o.lastEventAt)}
                  </p>
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
                  {(o.status === 'open' || o.status === 'reopened') && (
                    <Button
                      type="button"
                      variant="light"
                      disabled={busy}
                      onClick={() => void startOccurrence(o)}
                    >
                      Em andamento
                    </Button>
                  )}
                  {o.status !== 'resolved' ? (
                    <Button
                      type="button"
                      variant="light"
                      disabled={busy}
                      onClick={() => {
                        setResolveFor(o)
                        setSolucao('')
                        setReopenFor(null)
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
                      }}
                    >
                      Reabrir
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {resolveFor ? (
        <div className="rounded-[12px] border border-fal-navy/30 bg-[#f7f9fc] p-3">
          <p className="m-0 text-sm font-bold text-fal-navy">
            Resolver {resolveFor.occurrenceId.slice(0, 8)}…
          </p>
          <Input
            label="Solução / motivo de encerramento (obrigatório)"
            value={solucao}
            disabled={busy}
            onChange={(e) => setSolucao(e.target.value)}
            placeholder="Como foi tratado"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy || !solucao.trim()}
              onClick={() => void resolveOccurrence()}
            >
              Confirmar resolução
            </Button>
            <Button type="button" variant="light" disabled={busy} onClick={() => setResolveFor(null)}>
              Voltar
            </Button>
          </div>
        </div>
      ) : null}

      {reopenFor ? (
        <div className="rounded-[12px] border border-amber-300 bg-amber-50 p-3">
          <p className="m-0 text-sm font-bold text-fal-navy">
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
