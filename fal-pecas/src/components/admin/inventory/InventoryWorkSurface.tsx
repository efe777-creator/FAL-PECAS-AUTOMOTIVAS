import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { formatDateTime } from '@/lib/datetime'
import {
  adjustInventory,
  formatInventoryError,
  listInventory,
  listInventoryMovements,
  type InventoryMode,
  type InventoryMovementRow,
  type InventoryRow,
} from '@/services/admin/adminInventoryService'
import { useEffect, useState } from 'react'

type Props = {
  focused: InventoryRow
  mode: InventoryMode
  allowAdjust: boolean
  onClose: () => void
  onMutated: (refreshed: InventoryRow | null) => void
}

/**
 * Superfície contextual do hub Estoque (Adaptive).
 * Ajuste + movimentos na guia — sem painel mid-page permanente.
 */
export function InventoryWorkSurface({
  focused,
  mode,
  allowAdjust,
  onClose,
  onMutated,
}: Props) {
  const toast = useToast()
  const [delta, setDelta] = useState('1')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [movements, setMovements] = useState<InventoryMovementRow[]>([])
  const [row, setRow] = useState(focused)

  useEffect(() => {
    setRow(focused)
    setDelta('1')
    setReason('')
    let cancelled = false
    void listInventoryMovements(focused.productId)
      .then((m) => {
        if (!cancelled) setMovements(m)
      })
      .catch((e) => {
        if (!cancelled) {
          toast.push(formatInventoryError(e, 'Erro ao carregar movimentos'), 'error')
          setMovements([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [focused, toast])

  async function onAdjust(sign: 1 | -1) {
    if (!allowAdjust) return
    const n = Number(delta)
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      toast.push('Informe um delta inteiro positivo', 'error')
      return
    }
    setBusy(true)
    try {
      await adjustInventory(row.productId, sign * n, reason || undefined)
      toast.push('Ajuste registrado', 'success')
      const refreshed =
        (await listInventory(row.sku)).find((r) => r.productId === row.productId) ?? null
      if (refreshed) {
        setRow(refreshed)
        setMovements(await listInventoryMovements(refreshed.productId))
      }
      onMutated(refreshed)
    } catch (e) {
      toast.push(formatInventoryError(e, 'Falha no ajuste'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3" data-inventory-ops-density="compact">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line pb-2">
        <p className="m-0 text-xs font-semibold text-fal-muted">
          Estoque na guia · {row.sku}
        </p>
        <button
          type="button"
          className="text-xs font-semibold text-fal-muted underline"
          onClick={onClose}
        >
          Fechar guia
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto fal-admin-scroll">
        <h2 className="m-0 text-lg font-extrabold text-fal-fg">
          {row.sku} — {row.name}
        </h2>
        {(mode === 'com_estoque' || mode === 'estoque_ficticio') && (
          <p className="m-0 text-sm text-fal-muted">
            Físico/exib. <strong className="text-fal-fg">{row.onHand}</strong>
            {' · '}Reservado <strong className="text-fal-fg">{row.reserved}</strong>
            {' · '}Disponível <strong className="text-fal-fg">{row.available}</strong>
          </p>
        )}

        {allowAdjust ? (
          <div className="flex flex-wrap items-end gap-2">
            <Input label="Delta" value={delta} onChange={(e) => setDelta(e.target.value)} />
            <Input
              label="Motivo"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ajuste_manual"
            />
            <Button type="button" disabled={busy} onClick={() => void onAdjust(1)}>
              + Entrada
            </Button>
            <Button type="button" variant="light" disabled={busy} onClick={() => void onAdjust(-1)}>
              − Saída
            </Button>
          </div>
        ) : (
          <p className="m-0 text-sm text-fal-muted">
            {mode === 'com_estoque'
              ? 'Sem permissão de ajuste.'
              : 'Ajuste físico disponível apenas no modo Com estoque (real).'}
          </p>
        )}

        <div>
          <h3 className="m-0 text-xs font-bold uppercase text-fal-muted">Movimentos</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {movements.length === 0 ? (
              <li className="text-fal-muted">Nenhum movimento.</li>
            ) : (
              movements.map((m) => (
                <li key={m.id} className="border-b border-fal-line py-1 last:border-0">
                  <span className="font-semibold">{m.type}</span> {m.quantity}{' '}
                  <span className="text-fal-muted">
                    · {m.reason ?? '—'} · {formatDateTime(m.createdAt)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
