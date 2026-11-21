import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatMoney, formatMoneyInput, parseMoneyBr } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  PRICE_LIST_KITS_MANUAL_ID,
  adminGetKitPricePreview,
  adminSetKitPriceModeAndSync,
  type KitPricePreview,
} from '@/services/admin/adminKitPricingService'
import { adminListProducts } from '@/services/admin/adminProductService'
import type { Product } from '@/types'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type RowState = {
  kit: Product
  preview: KitPricePreview | null
  draft: string
  busy: boolean
}

export function AdminKitPricesPage() {
  useDocumentTitle('Preços dos kits | Admin FAL')
  const { user } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState<RowState[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const kits = await adminListProducts({ productKind: 'kit' })
      const next: RowState[] = []
      for (const kit of kits) {
        let preview: KitPricePreview | null = null
        try {
          preview = await adminGetKitPricePreview(kit.id)
        } catch {
          preview = null
        }
        next.push({
          kit,
          preview,
          draft:
            preview?.manualListPrice != null
              ? formatMoneyInput(preview.manualListPrice)
              : preview
                ? formatMoneyInput(preview.effectiveHint)
                : '',
          busy: false,
        })
      }
      setRows(next)
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao carregar preços dos kits'), 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void reload()
  }, [reload])

  function patchRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => prev.map((r) => (r.kit.id === id ? { ...r, ...patch } : r)))
  }

  async function saveManual(row: RowState) {
    const parsed = parseMoneyBr(row.draft)
    if (parsed == null || parsed < 0) {
      toast.push('Informe um preço manual válido', 'error')
      return
    }
    patchRow(row.kit.id, { busy: true })
    try {
      const preview = await adminSetKitPriceModeAndSync({
        kitProductId: row.kit.id,
        kitPriceMode: 'manual',
        manualPrice: parsed,
        changedBy: user?.id ?? null,
      })
      patchRow(row.kit.id, {
        preview,
        draft: formatMoneyInput(preview.manualListPrice ?? preview.effectiveHint),
        kit: { ...row.kit, kitPriceMode: 'manual', price: preview.effectiveHint },
        busy: false,
      })
      toast.push('Preço manual salvo na lista Preços dos kits.', 'success')
    } catch (e) {
      patchRow(row.kit.id, { busy: false })
      toast.push(toUserMessage(e, 'Falha ao salvar'), 'error')
    }
  }

  async function recalculateAuto(row: RowState) {
    patchRow(row.kit.id, { busy: true })
    try {
      const preview = await adminSetKitPriceModeAndSync({
        kitProductId: row.kit.id,
        kitPriceMode: 'auto',
        changedBy: user?.id ?? null,
      })
      patchRow(row.kit.id, {
        preview,
        draft: formatMoneyInput(preview.effectiveHint),
        kit: { ...row.kit, kitPriceMode: 'auto', price: preview.effectiveHint },
        busy: false,
      })
      toast.push('Preço automático recalculado (soma → Base).', 'success')
    } catch (e) {
      patchRow(row.kit.id, { busy: false })
      toast.push(toUserMessage(e, 'Falha ao recalcular'), 'error')
    }
  }

  async function switchToManual(row: RowState) {
    const parsed = parseMoneyBr(row.draft)
    const manual =
      parsed != null && parsed >= 0
        ? parsed
        : (row.preview?.effectiveHint ?? row.kit.price)
    patchRow(row.kit.id, { busy: true })
    try {
      const preview = await adminSetKitPriceModeAndSync({
        kitProductId: row.kit.id,
        kitPriceMode: 'manual',
        manualPrice: manual,
        changedBy: user?.id ?? null,
      })
      patchRow(row.kit.id, {
        preview,
        draft: formatMoneyInput(preview.manualListPrice ?? preview.effectiveHint),
        kit: { ...row.kit, kitPriceMode: 'manual', price: preview.effectiveHint },
        busy: false,
      })
      toast.push('Kit em modo manual.', 'success')
    } catch (e) {
      patchRow(row.kit.id, { busy: false })
      toast.push(toUserMessage(e, 'Falha ao mudar modo'), 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-sm">
            <Link to="/admin/kits" className="text-fal-muted hover:underline">
              ← Kits
            </Link>
          </p>
          <h1 className="mt-1 mb-0 text-2xl font-extrabold text-fal-fg">Preços dos kits</h1>
          <p className="mt-1 mb-0 max-w-3xl text-sm text-fal-muted">
            Lista-base operacional dos kits (slug <code>preco-kits-manual</code>). Automático e
            manual convivem aqui; a loja continua resolvendo pela Lista Base (espelho após sync).
            Id da lista: <code className="text-xs">{PRICE_LIST_KITS_MANUAL_ID}</code>
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void reload()}>
          Atualizar
        </Button>
      </div>

      {loading ? <Loading label="Carregando preços…" /> : null}

      {!loading && rows.length === 0 ? (
        <EmptyState
          title="Nenhum kit cadastrado"
          description="Crie um kit para precificar."
          actionLabel="Novo kit"
          actionTo="/admin/kits/novo"
        />
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="fal-admin-scroll overflow-x-auto rounded-[14px] border border-fal-line bg-fal-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-fal-bg text-fal-muted">
              <tr>
                <th className="px-3 py-2">Kit</th>
                <th className="px-3 py-2">Modo</th>
                <th className="px-3 py-2">Soma itens</th>
                <th className="px-3 py-2">Lista kits</th>
                <th className="px-3 py-2">Base (espelho)</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const mode = row.kit.kitPriceMode === 'manual' ? 'manual' : 'auto'
                const preview = row.preview
                return (
                  <tr key={row.kit.id} className="border-t border-fal-line/70 align-top">
                    <td className="px-3 py-2">
                      <p className="m-0 font-mono text-xs text-fal-muted">
                        {row.kit.commercialRef ?? row.kit.sku}
                      </p>
                      <p className="mb-0 mt-0.5 font-semibold">{row.kit.name}</p>
                      <Link
                        className="text-xs font-semibold underline"
                        to={`/admin/kits/${row.kit.id}`}
                      >
                        Abrir kit
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          mode === 'manual'
                            ? 'rounded-full bg-fal-yellow/30 px-2 py-0.5 text-xs font-bold'
                            : 'rounded-full bg-fal-bg px-2 py-0.5 text-xs font-bold'
                        }
                      >
                        {mode === 'manual' ? 'Manual' : 'Automático'}
                      </span>
                      {preview?.provisional ? (
                        <p className="mb-0 mt-1 text-xs text-amber-800">provisório</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      {preview ? formatMoney(preview.componentsSum) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {mode === 'manual' ? (
                        <div className="w-32">
                          <Input
                            label=""
                            aria-label="Preço na lista kits"
                            value={row.draft}
                            onChange={(e) => patchRow(row.kit.id, { draft: e.target.value })}
                          />
                        </div>
                      ) : (
                        <span className="text-fal-muted">— (modo auto)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-bold">
                      {preview?.baseListPrice != null
                        ? formatMoney(preview.baseListPrice)
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        {mode === 'manual' ? (
                          <Button
                            type="button"
                            disabled={row.busy}
                            onClick={() => void saveManual(row)}
                          >
                            {row.busy ? '…' : 'Salvar manual'}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={row.busy}
                            onClick={() => void recalculateAuto(row)}
                          >
                            {row.busy ? '…' : 'Recalcular auto'}
                          </Button>
                        )}
                        {mode === 'auto' ? (
                          <Button
                            type="button"
                            variant="light"
                            disabled={row.busy}
                            onClick={() => void switchToManual(row)}
                          >
                            Mudar para manual
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="light"
                            disabled={row.busy}
                            onClick={() => void recalculateAuto(row)}
                          >
                            Voltar ao automático
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
