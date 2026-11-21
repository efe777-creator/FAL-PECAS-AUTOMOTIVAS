import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { productStatusLabel } from '@/lib/adminLabels'
import { formatMoney, formatMoneyInput, parseMoneyBr } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminGetKitPricePreview,
  adminSyncKitListPrices,
  type KitPricePreview,
} from '@/services/admin/adminKitPricingService'
import {
  adminAddKitComponent,
  adminListKitComponents,
  adminRemoveKitComponent,
  adminUpdateKitComponentQuantity,
  isKitCompositionPublishable,
  type AdminKitComponentRow,
} from '@/services/admin/adminProductKitService'
import { adminListProducts } from '@/services/admin/adminProductService'
import { useAuth } from '@/contexts/AuthContext'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  kitProductId: string
  kitPriceMode: 'auto' | 'manual'
}

export function AdminProductKitSection({ kitProductId, kitPriceMode }: Props) {
  const toast = useToast()
  const { user } = useAuth()
  const [rows, setRows] = useState<AdminKitComponentRow[]>([])
  const [preview, setPreview] = useState<KitPricePreview | null>(null)
  const [manualPrice, setManualPrice] = useState('')
  const [q, setQ] = useState('')
  const [qty, setQty] = useState('1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [comps, price] = await Promise.all([
      adminListKitComponents(kitProductId),
      adminGetKitPricePreview(kitProductId),
    ])
    setRows(comps)
    setPreview(price)
    if (price.manualListPrice != null) {
      setManualPrice(formatMoneyInput(price.manualListPrice))
    }
  }, [kitProductId])

  useEffect(() => {
    void reload().catch((e) => setError(toUserMessage(e, 'Falha ao carregar composição')))
  }, [reload])

  async function handleAdd() {
    const term = q.trim()
    if (!term) return
    const quantity = Number(qty.replace(',', '.'))
    if (!(quantity > 0)) {
      toast.push('Informe uma quantidade válida', 'error')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const found = await adminListProducts({ q: term, limit: 8 })
      const match =
        found.find(
          (p) =>
            p.id !== kitProductId &&
            p.productKind !== 'kit' &&
            (p.sku.toLowerCase() === term.toLowerCase() ||
              (p.commercialRef ?? '').toLowerCase() === term.toLowerCase()),
        ) ?? found.find((p) => p.id !== kitProductId && p.productKind !== 'kit')
      if (!match) throw new Error('Nenhum item encontrado (kits não podem ser componentes na v1)')
      await adminAddKitComponent({
        kitProductId,
        componentProductId: match.id,
        quantity,
        actorId: user?.id ?? null,
      })
      setQ('')
      setQty('1')
      await reload()
      toast.push(`Componente adicionado: ${match.commercialRef ?? match.sku}`, 'success')
    } catch (e) {
      const msg = toUserMessage(e, 'Não foi possível adicionar')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleQty(row: AdminKitComponentRow, nextRaw: string) {
    const next = Number(nextRaw.replace(',', '.'))
    if (!(next > 0) || next === row.quantity) return
    setBusy(true)
    setError(null)
    try {
      await adminUpdateKitComponentQuantity({
        kitProductId,
        rowId: row.id,
        componentProductId: row.componentProductId,
        previousQuantity: row.quantity,
        quantity: next,
        actorId: user?.id ?? null,
      })
      await reload()
      toast.push('Quantidade atualizada', 'success')
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao atualizar quantidade')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(row: AdminKitComponentRow) {
    setBusy(true)
    setError(null)
    try {
      await adminRemoveKitComponent({
        kitProductId,
        rowId: row.id,
        componentProductId: row.componentProductId,
        quantity: row.quantity,
        actorId: user?.id ?? null,
      })
      await reload()
      toast.push('Componente removido', 'success')
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao remover')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  const publishable = isKitCompositionPublishable(rows)

  async function handleSaveManualPrice() {
    const parsed = parseMoneyBr(manualPrice)
    if (parsed == null || parsed < 0) {
      toast.push('Informe um preço manual válido', 'error')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await adminSyncKitListPrices({
        kitProductId,
        kitPriceMode: 'manual',
        manualPrice: parsed,
        changedBy: user?.id ?? null,
      })
      await reload()
      toast.push('Preço manual do kit salvo na lista exclusiva', 'success')
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao salvar preço manual')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-fal-surface p-4">
      <div>
        <h2 className="m-0 font-extrabold text-fal-fg">Composição do kit</h2>
        <p className="mt-1 text-xs text-fal-muted">
          Junte 2+ itens (ou 1 item com qty ≥ 2). Componentes continuam vendáveis individualmente.
          Preço via motor 6B (soma ou lista manual de kits).
        </p>
      </div>

      {!publishable ? (
        <p className="m-0 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Composição incompleta para publicação (H2): precisa de ≥ 2 componentes ou 1 com
          quantidade ≥ 2.
        </p>
      ) : (
        <p className="m-0 text-xs text-green-800">Composição mínima atendida.</p>
      )}

      {preview ? (
        <div className="rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm">
          <p className="m-0">
            Soma dos componentes (Lista Base):{' '}
            <strong>{formatMoney(preview.componentsSum)}</strong>
            {preview.missingComponentPrices.length > 0 ? (
              <span className="ml-2 text-xs text-fal-danger">
                sem preço: {preview.missingComponentPrices.join(', ')}
              </span>
            ) : null}
          </p>
          <p className="mt-1 m-0 text-xs text-fal-muted">
            Modo: {kitPriceMode === 'manual' ? 'manual' : 'automático'} · efetivo sugerido:{' '}
            {formatMoney(preview.effectiveHint)}
          </p>
          {preview.provisional ? (
            <p className="mt-2 m-0 rounded-[8px] border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-950">
              Preço provisório: kit manual sem preço na lista exclusiva — usando a soma até
              cadastrar o valor manual.
            </p>
          ) : null}
        </div>
      ) : null}

      {kitPriceMode === 'manual' ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-40">
            <Input
              label="Preço manual do kit"
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
            />
          </div>
          <Button type="button" disabled={busy} onClick={() => void handleSaveManualPrice()}>
            Salvar preço manual
          </Button>
        </div>
      ) : null}

      {error ? <p className="m-0 text-sm text-fal-danger">{error}</p> : null}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Adicionar item (SKU / ref / nome)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleAdd()
              }
            }}
          />
        </div>
        <div className="w-24">
          <Input label="Qtd" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <Button type="button" disabled={busy || !q.trim()} onClick={() => void handleAdd()}>
          {busy ? '…' : 'Adicionar'}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="m-0 text-sm text-fal-muted">Nenhum componente ainda.</p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <Link
                  to={`/admin/produtos/${row.componentProductId}`}
                  className="font-semibold text-fal-fg underline"
                >
                  {row.componentCommercialRef || row.componentSku}
                </Link>
                <span className="text-fal-muted"> — {row.componentName}</span>
                <span className="ml-2 text-xs text-fal-muted">
                  ({productStatusLabel(row.componentStatus)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="w-20 rounded-[8px] border border-fal-line px-2 py-1 text-sm"
                  defaultValue={String(row.quantity)}
                  disabled={busy}
                  onBlur={(e) => void handleQty(row, e.target.value)}
                  aria-label={`Quantidade de ${row.componentSku}`}
                />
                <Button
                  type="button"
                  variant="light"
                  disabled={busy}
                  onClick={() => void handleRemove(row)}
                >
                  Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
