import { Button } from '@/components/common/Button'
import {
  POST_SALE_MOTIVES,
  type PostSaleMotiveCode,
  motiveRequiresItemScope,
  motiveRequiresPolicyAck,
} from '@/lib/postSaleMotives'
import { postSaleWindowDaysLeft, postSaleWindowOpen } from '@/lib/postSaleWindow'
import { RETURN_POLICY_ACK_LABEL, RETURN_POLICY_BULLETS } from '@/lib/returnPolicyCopy'
import { useMemo, useState } from 'react'

export type PostSaleItemOption = {
  id: string
  label: string
  quantity: number
}

type Props = {
  deliveredAt: string | null | undefined
  orderStatus: string
  hasOpenPostSaleCase: boolean
  items: PostSaleItemOption[]
  busy: boolean
  onSubmit: (input: {
    reason: string
    motivoCode: PostSaleMotiveCode
    scope: 'order' | 'items'
    items: { order_item_id: string; qty: number }[]
    policyAck: boolean
  }) => Promise<void>
}

export function PostSaleHelpPanel({
  deliveredAt,
  orderStatus,
  hasOpenPostSaleCase,
  items,
  busy,
  onSubmit,
}: Props) {
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState<PostSaleMotiveCode>('outro_suporte')
  const [scope, setScope] = useState<'order' | 'items'>('order')
  const [selected, setSelected] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [ack, setAck] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const windowOpen = useMemo(() => {
    if (orderStatus === 'enviado') return true
    if (hasOpenPostSaleCase) return true
    return postSaleWindowOpen(deliveredAt)
  }, [deliveredAt, orderStatus, hasOpenPostSaleCase])

  const daysLeft =
    orderStatus === 'entregue' && deliveredAt ? postSaleWindowDaysLeft(deliveredAt) : null

  const needsAck = motiveRequiresPolicyAck(motivo)
  const needsScope = motiveRequiresItemScope(motivo)

  async function submit() {
    setLocalError(null)
    if (!note.trim()) {
      setLocalError('Descreva o problema.')
      return
    }
    if (needsAck && !ack) {
      setLocalError('Confirme que leu as condições de devolução.')
      return
    }
    const effectiveScope = needsScope ? scope : 'order'
    const itemRows =
      effectiveScope === 'items'
        ? Object.entries(selected)
            .filter(([, qty]) => qty > 0)
            .map(([order_item_id, qty]) => ({ order_item_id, qty }))
        : []
    if (needsScope && effectiveScope === 'items' && itemRows.length === 0) {
      setLocalError('Selecione ao menos um item.')
      return
    }
    await onSubmit({
      reason: note.trim(),
      motivoCode: motivo,
      scope: effectiveScope,
      items: itemRows,
      policyAck: needsAck ? ack : false,
    })
    setOpen(false)
    setNote('')
    setAck(false)
    setSelected({})
  }

  return (
    <div className="rounded-fal border border-fal-line bg-fal-surface p-5">
      <h3 className="mt-0 text-base font-extrabold text-fal-fg">Ajuda com este pedido</h3>
      {orderStatus === 'entregue' && daysLeft != null ? (
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          {windowOpen
            ? daysLeft > 0
              ? `Suporte disponível · ${daysLeft} dia(s) restantes (a partir da entrega pela loja).`
              : 'Suporte disponível (caso já em andamento).'
            : 'O prazo de 7 dias para abrir um novo suporte neste pedido encerrou.'}
        </p>
      ) : (
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Informe um problema com a entrega ou solicite análise da loja.
        </p>
      )}

      {hasOpenPostSaleCase ? (
        <p className="mt-3 mb-0 text-sm font-semibold text-fal-fg">
          Já existe atendimento em andamento neste pedido. Acompanhe as atualizações abaixo — não
          é necessário abrir outro chamado.
        </p>
      ) : !windowOpen ? (
        <p className="mt-3 mb-0 text-sm font-semibold text-fal-fg">
          O prazo de 7 dias para abrir um novo suporte neste pedido encerrou. Se precisar, fale
          pelo WhatsApp do pedido.
        </p>
      ) : !open ? (
        <div className="mt-4">
          <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(true)}>
            Informar problema
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-semibold text-fal-fg">
            Motivo
            <select
              className="mt-1 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as PostSaleMotiveCode)}
            >
              {POST_SALE_MOTIVES.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          {needsScope ? (
            <fieldset className="m-0 space-y-2 border-0 p-0">
              <legend className="text-sm font-semibold text-fal-fg">Escopo</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'order'}
                  onChange={() => setScope('order')}
                />
                Pedido inteiro
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'items'}
                  onChange={() => setScope('items')}
                />
                Selecionar itens
              </label>
              {scope === 'items' ? (
                <ul className="m-0 list-none space-y-2 p-0">
                  {items.map((it) => (
                    <li
                      key={it.id}
                      className="flex flex-wrap items-center gap-2 rounded-md border border-fal-line px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={(selected[it.id] ?? 0) > 0}
                        onChange={(e) => {
                          setSelected((prev) => {
                            const next = { ...prev }
                            if (e.target.checked) next[it.id] = it.quantity
                            else delete next[it.id]
                            return next
                          })
                        }}
                      />
                      <span className="flex-1 font-medium">{it.label}</span>
                      {(selected[it.id] ?? 0) > 0 ? (
                        <input
                          type="number"
                          min={1}
                          max={it.quantity}
                          className="w-16 rounded border border-fal-line px-2 py-1"
                          value={selected[it.id] ?? 1}
                          onChange={(e) => {
                            const q = Math.min(
                              it.quantity,
                              Math.max(1, Number(e.target.value) || 1),
                            )
                            setSelected((prev) => ({ ...prev, [it.id]: q }))
                          }}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </fieldset>
          ) : null}

          {needsAck ? (
            <div className="rounded-[10px] border border-fal-warning/40 bg-fal-warning/10 p-3 text-sm text-fal-ink">
              <p className="mt-0 mb-2 font-extrabold text-fal-fg">Condições de devolução</p>
              <ul className="mb-3 mt-0 list-disc space-y-1 pl-5">
                {RETURN_POLICY_BULLETS.slice(0, 5).map((b) => (
                  <li key={b.slice(0, 48)}>{b}</li>
                ))}
              </ul>
              <label className="flex items-start gap-2 font-semibold">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                />
                <span>{RETURN_POLICY_ACK_LABEL}</span>
              </label>
            </div>
          ) : null}

          <label className="block text-sm font-semibold text-fal-fg">
            Descreva o problema
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex.: embalagem danificada, item errado…"
            />
          </label>

          {localError ? <p className="m-0 text-sm font-semibold text-red-700">{localError}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void submit()}>
              Enviar solicitação
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setOpen(false)
                setLocalError(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
