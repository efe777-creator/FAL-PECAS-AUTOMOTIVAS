import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { productStatusLabel } from '@/lib/adminLabels'
import { formatMoney, formatMoneyInput, parseMoneyBr } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminCopyPrimaryImageToProduct,
  adminEnsureKitImageFromComponents,
  adminListImages,
  adminPrimaryImageUrlMap,
} from '@/services/admin/adminImageService'
import {
  adminGetKitPricePreview,
  adminSetKitPriceModeAndSync,
  type KitPricePreview,
} from '@/services/admin/adminKitPricingService'
import {
  adminAddKitComponent,
  adminListKitComponents,
  adminRemoveKitComponent,
  adminSwapKitComponentSortOrder,
  adminUpdateKitComponentQuantity,
  isKitCompositionPublishable,
  type AdminKitComponentRow,
} from '@/services/admin/adminProductKitService'
import { adminListProducts } from '@/services/admin/adminProductService'
import { useAuth } from '@/contexts/AuthContext'
import type { Product } from '@/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  kitProductId: string
  kitPriceMode: 'auto' | 'manual'
  /** Exibe só BOM ou só bloco de preço (aba full). */
  surfacePart?: 'all' | 'bom' | 'pricing'
  /** Densidade compacta para guia Adaptive. */
  compact?: boolean
  /** Após mutação BOM/preço — refresh do hub/guia. */
  onMutated?: () => void
  /** Alternar auto/manual na própria section (guia Preços). */
  onPriceModeChange?: (mode: 'auto' | 'manual') => void
}

type Candidate = Product & { imageUrl?: string }

export function AdminProductKitSection({
  kitProductId,
  kitPriceMode,
  surfacePart = 'all',
  compact = false,
  onMutated,
  onPriceModeChange,
}: Props) {
  const toast = useToast()
  const { user } = useAuth()
  const [rows, setRows] = useState<AdminKitComponentRow[]>([])
  const [rowQty, setRowQty] = useState<Record<string, string>>({})
  const [rowImages, setRowImages] = useState<Map<string, string>>(() => new Map())
  const [kitHasImage, setKitHasImage] = useState(false)
  const [preview, setPreview] = useState<KitPricePreview | null>(null)
  const [manualPrice, setManualPrice] = useState('')
  const [q, setQ] = useState('')
  const [qty, setQty] = useState('1')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [searching, setSearching] = useState(false)
  const [busyLink, setBusyLink] = useState(false)
  const [busyRowIds, setBusyRowIds] = useState<Set<string>>(() => new Set())
  const [busyReorderId, setBusyReorderId] = useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [pickedIds, setPickedIds] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const [loadingBom, setLoadingBom] = useState(true)
  const searchSeq = useRef(0)

  const showBom = surfacePart === 'all' || surfacePart === 'bom'
  const showPricing = surfacePart === 'all' || surfacePart === 'pricing'

  function setRowBusy(rowId: string, on: boolean) {
    setBusyRowIds((prev) => {
      const next = new Set(prev)
      if (on) next.add(rowId)
      else next.delete(rowId)
      return next
    })
  }

  const rowBusy = (rowId: string) => busyLink || busyRowIds.has(rowId) || busyReorderId === rowId

  const reload = useCallback(async () => {
    setLoadingBom(true)
    setError(null)
    try {
      const [comps, price, kitImgs] = await Promise.all([
        adminListKitComponents(kitProductId),
        adminGetKitPricePreview(kitProductId),
        adminListImages(kitProductId),
      ])
      setRows(comps)
      setRowQty(Object.fromEntries(comps.map((c) => [c.id, String(c.quantity)])))
      setPreview(price)
      setKitHasImage(kitImgs.length > 0)
      if (price.manualListPrice != null) {
        setManualPrice(formatMoneyInput(price.manualListPrice))
      }
      const urls = await adminPrimaryImageUrlMap(comps.map((c) => c.componentProductId))
      setRowImages(urls)
    } finally {
      setLoadingBom(false)
    }
  }, [kitProductId])

  useEffect(() => {
    setRows([])
    setLoadingBom(true)
    void reload().catch((e) => {
      setError(toUserMessage(e, 'Falha ao carregar composição'))
      setLoadingBom(false)
    })
  }, [reload])

  useEffect(() => {
    setHighlightedIndex(0)
    setPickedIds(new Set())
  }, [q, candidates.length])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setCandidates([])
      return
    }
    const seq = ++searchSeq.current
    const t = window.setTimeout(() => {
      void (async () => {
        setSearching(true)
        try {
          const found = await adminListProducts({
            q: term,
            productKind: 'item',
            limit: 10,
          })
          if (seq !== searchSeq.current) return
          const items = found.filter((p) => p.id !== kitProductId && p.productKind !== 'kit')
          const urls = await adminPrimaryImageUrlMap(items.map((p) => p.id))
          if (seq !== searchSeq.current) return
          setCandidates(items.map((p) => ({ ...p, imageUrl: urls.get(p.id) })))
        } catch {
          if (seq === searchSeq.current) setCandidates([])
        } finally {
          if (seq === searchSeq.current) setSearching(false)
        }
      })()
    }, 280)
    return () => window.clearTimeout(t)
  }, [q, kitProductId])

  async function linkComponent(match: Product, quantity: number) {
    setBusyLink(true)
    setError(null)
    try {
      const dup = rows.find((r) => r.componentProductId === match.id)
      if (dup) {
        const merged = dup.quantity + quantity
        await adminUpdateKitComponentQuantity({
          kitProductId,
          rowId: dup.id,
          componentProductId: match.id,
          previousQuantity: dup.quantity,
          quantity: merged,
          actorId: user?.id ?? null,
        })
        await reload()
        onMutated?.()
        toast.push(
          `Item já no kit — quantidade atualizada para ${merged}`,
          'success',
        )
      } else {
        await adminAddKitComponent({
          kitProductId,
          componentProductId: match.id,
          quantity,
          actorId: user?.id ?? null,
        })
        await reload()
        onMutated?.()
        toast.push(`Item linkado: ${match.commercialRef ?? match.sku}`, 'success')
      }
      setQ('')
      setQty('1')
      setCandidates([])
      setPickedIds(new Set())
    } catch (e) {
      const msg = toUserMessage(e, 'Não foi possível linkar o item')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusyLink(false)
    }
  }

  async function linkPickedBatch() {
    const quantity = Number(qty.replace(',', '.')) || 1
    if (!(quantity > 0)) {
      toast.push('Informe uma quantidade válida', 'error')
      return
    }
    const toLink = candidates.filter((c) => pickedIds.has(c.id))
    if (toLink.length === 0) {
      toast.push('Marque ao menos um item na lista', 'error')
      return
    }
    setBusyLink(true)
    setError(null)
    try {
      for (const match of toLink) {
        const dup = rows.find((r) => r.componentProductId === match.id)
        if (dup) {
          const merged = dup.quantity + quantity
          await adminUpdateKitComponentQuantity({
            kitProductId,
            rowId: dup.id,
            componentProductId: match.id,
            previousQuantity: dup.quantity,
            quantity: merged,
            actorId: user?.id ?? null,
          })
          toast.push(
            `${match.commercialRef ?? match.sku}: quantidade ${merged}`,
            'success',
          )
        } else {
          await adminAddKitComponent({
            kitProductId,
            componentProductId: match.id,
            quantity,
            actorId: user?.id ?? null,
          })
          toast.push(`Item linkado: ${match.commercialRef ?? match.sku}`, 'success')
        }
      }
      setQ('')
      setQty('1')
      setCandidates([])
      setPickedIds(new Set())
      await reload()
      onMutated?.()
    } catch (e) {
      const msg = toUserMessage(e, 'Não foi possível linkar em lote')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusyLink(false)
    }
  }

  async function handleAddFromQuery() {
    const term = q.trim()
    if (!term) return
    const quantity = Number(qty.replace(',', '.'))
    if (!(quantity > 0)) {
      toast.push('Informe uma quantidade válida', 'error')
      return
    }
    const exact = candidates.find(
      (p) =>
        p.sku.toLowerCase() === term.toLowerCase() ||
        (p.commercialRef ?? '').toLowerCase() === term.toLowerCase(),
    )
    if (exact) {
      await linkComponent(exact, quantity)
      return
    }
    setBusyLink(true)
    setError(null)
    try {
      const found = await adminListProducts({ q: term, productKind: 'item', limit: 8 })
      const match = found.find(
        (p) =>
          p.id !== kitProductId &&
          p.productKind !== 'kit' &&
          (p.sku.toLowerCase() === term.toLowerCase() ||
            (p.commercialRef ?? '').toLowerCase() === term.toLowerCase()),
      )
      if (!match) {
        if (candidates.length > 0) {
          const pick =
            candidates[highlightedIndex] ?? candidates[0]
          if (pick) {
            await linkComponent(pick, quantity)
            return
          }
        }
        throw new Error(
          candidates.length
            ? 'Escolha o item na lista (Enter no destaque ou clique em Linkar)'
            : 'Nenhum item do cadastro com esse SKU/ref (só tipo item)',
        )
      }
      await linkComponent(match, quantity)
    } catch (e) {
      const msg = toUserMessage(e, 'Não foi possível adicionar')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusyLink(false)
    }
  }

  async function handleQty(row: AdminKitComponentRow, nextRaw: string) {
    const next = Number(nextRaw.replace(',', '.'))
    if (!(next > 0)) {
      toast.push('Quantidade deve ser maior que zero', 'error')
      setRowQty((prev) => ({ ...prev, [row.id]: String(row.quantity) }))
      return
    }
    if (next === row.quantity) return
    setRowBusy(row.id, true)
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
      onMutated?.()
      toast.push('Quantidade atualizada', 'success')
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao atualizar quantidade')
      setError(msg)
      toast.push(msg, 'error')
      setRowQty((prev) => ({ ...prev, [row.id]: String(row.quantity) }))
    } finally {
      setRowBusy(row.id, false)
    }
  }

  function nudgeQty(row: AdminKitComponentRow, delta: number) {
    const current = Number((rowQty[row.id] ?? String(row.quantity)).replace(',', '.'))
    const next = Math.max(0.001, current + delta)
    setRowQty((prev) => ({ ...prev, [row.id]: String(next) }))
    void handleQty(row, String(next))
  }

  async function handleRemove(row: AdminKitComponentRow) {
    setRowBusy(row.id, true)
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
      onMutated?.()
      toast.push('Componente removido', 'success')
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao remover')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setRowBusy(row.id, false)
    }
  }

  async function handleReorder(row: AdminKitComponentRow, direction: 'up' | 'down') {
    setBusyReorderId(row.id)
    try {
      await adminSwapKitComponentSortOrder({ kitProductId, rowId: row.id, direction })
      await reload()
      onMutated?.()
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao reordenar'), 'error')
    } finally {
      setBusyReorderId(null)
    }
  }

  const publishable = isKitCompositionPublishable(rows)

  async function handleSaveManualPrice() {
    const parsed = parseMoneyBr(manualPrice)
    if (parsed == null || parsed < 0) {
      toast.push('Informe um preço manual válido', 'error')
      return
    }
    setBusyLink(true)
    setError(null)
    try {
      // Garante kit_price_mode=manual no produto (não só nas listas)
      await adminSetKitPriceModeAndSync({
        kitProductId,
        kitPriceMode: 'manual',
        manualPrice: parsed,
        changedBy: user?.id ?? null,
      })
      await reload()
      onPriceModeChange?.('manual')
      onMutated?.()
      toast.push('Preço manual do kit salvo na lista exclusiva', 'success')
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao salvar preço manual')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusyLink(false)
    }
  }

  async function handleSetPriceMode(mode: 'auto' | 'manual') {
    if (mode === kitPriceMode) return
    setBusyLink(true)
    setError(null)
    try {
      const parsed = mode === 'manual' ? parseMoneyBr(manualPrice) : null
      await adminSetKitPriceModeAndSync({
        kitProductId,
        kitPriceMode: mode,
        manualPrice: mode === 'manual' ? (parsed ?? preview?.effectiveHint ?? 0) : null,
        changedBy: user?.id ?? null,
      })
      await reload()
      onPriceModeChange?.(mode)
      onMutated?.()
      toast.push(
        mode === 'manual' ? 'Kit em modo preço manual.' : 'Kit em modo automático (soma).',
        'success',
      )
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao alterar modo de preço')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusyLink(false)
    }
  }

  async function handlePullImageFromItems(replace: boolean) {
    if (!rows.length) {
      toast.push('Linke ao menos um item com foto', 'error')
      return
    }
    setBusyLink(true)
    setError(null)
    try {
      let ok = false
      if (replace) {
        for (const row of rows) {
          ok = await adminCopyPrimaryImageToProduct({
            sourceProductId: row.componentProductId,
            targetProductId: kitProductId,
            replace: true,
          })
          if (ok) break
        }
      } else {
        ok = await adminEnsureKitImageFromComponents(
          kitProductId,
          rows.map((r) => r.componentProductId),
        )
      }
      await reload()
      if (ok) toast.push('Fotos dos itens sincronizadas na galeria do kit', 'success')
      else toast.push('Nenhum item da composição tem foto nova para puxar', 'error')
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao puxar foto dos itens')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusyLink(false)
    }
  }

  const quantity = Number(qty.replace(',', '.')) || 1
  const h2LineCount = rows.length
  const h2QtyOk = rows.length === 1 && rows[0]!.quantity >= 2
  const h2ProgressLabel =
    publishable
      ? 'Composição mínima (H2) atendida'
      : h2LineCount === 0
        ? 'H2: linkar itens (mín. 2 linhas ou 1×qty≥2)'
        : h2LineCount === 1 && !h2QtyOk
          ? 'H2: falta 2ª linha ou qty≥2 nesta linha'
          : 'H2: falta ao menos mais uma linha'

  const shellClass = compact
    ? 'space-y-2 rounded-[12px] border border-fal-line bg-fal-surface p-2'
    : 'space-y-3 rounded-[14px] border border-fal-line bg-fal-surface p-4'

  return (
    <section className={shellClass}>
      {showBom ? (
        <>
          <div>
            <h2 className="m-0 font-extrabold text-fal-fg">Composição do kit</h2>
            {compact ? (
              <p className="mt-1 mb-0 text-[11px] text-fal-muted">
                Enter no destaque · multi-seleção · qty na linha
              </p>
            ) : (
              <p className="mt-1 text-xs text-fal-muted">
                Linke produtos já cadastrados (tipo item). Enter no destaque, multi-seleção ou SKU/ref
                exato. Fotos de cada item entram na galeria do kit (capa se ainda não houver).
              </p>
            )}
          </div>

          <p
            className={`m-0 rounded-[10px] border px-3 py-2 text-xs ${
              publishable
                ? 'border-fal-success/40 bg-fal-success/10 text-fal-success'
                : 'border-fal-warning/40 bg-fal-warning/15 text-fal-fg'
            }`}
          >
            {h2ProgressLabel}
          </p>

          {!compact ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2">
              <p className="m-0 flex-1 text-xs text-fal-muted">
                Capa do kit:{' '}
                <strong className="text-fal-fg">{kitHasImage ? 'com foto' : 'sem foto'}</strong>
              </p>
              <Button
                type="button"
                variant="light"
                disabled={busyLink || rows.length === 0}
                onClick={() => void handlePullImageFromItems(false)}
              >
                Puxar fotos dos itens
              </Button>
              {kitHasImage ? (
                <Button
                  type="button"
                  variant="light"
                  disabled={busyLink || rows.length === 0}
                  onClick={() => void handlePullImageFromItems(true)}
                >
                  Substituir pela foto do item
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {showPricing && preview ? (
        <div className="space-y-2 rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm">
          <p className="m-0 text-fal-fg">
            Soma dos componentes (Lista Base):{' '}
            <strong>{formatMoney(preview.componentsSum)}</strong>
            {preview.missingComponentPrices.length > 0 ? (
              <span className="ml-2 text-xs text-fal-danger">
                sem preço: {preview.missingComponentPrices.join(', ')}
              </span>
            ) : null}
          </p>
          <p className="mt-1 m-0 text-xs text-fal-muted">
            Efetivo sugerido: {formatMoney(preview.effectiveHint)}
          </p>
          {onPriceModeChange ? (
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">
                Modo de preço
              </span>
              <select
                className="w-full rounded-[9px] border border-fal-line px-3 py-2.5 text-sm text-fal-fg"
                value={kitPriceMode}
                disabled={busyLink}
                onChange={(e) =>
                  void handleSetPriceMode(e.target.value === 'manual' ? 'manual' : 'auto')
                }
              >
                <option value="auto">Automático (soma → Lista Base)</option>
                <option value="manual">Manual (lista Preços dos kits)</option>
              </select>
            </label>
          ) : (
            <p className="mt-1 m-0 text-xs text-fal-muted">
              Modo:{' '}
              {kitPriceMode === 'manual'
                ? 'manual (lista Preços dos kits)'
                : 'automático (soma → Lista Base)'}
            </p>
          )}
          {preview.provisional ? (
            <p className="m-0 rounded-[8px] border border-fal-warning/40 bg-fal-warning/15 px-2 py-1 text-xs text-fal-fg">
              Preço provisório: kit manual sem preço cadastrado — usando a soma até salvar o valor
              manual.
            </p>
          ) : null}
          <p className="mb-0 text-xs">
            <Link to="/admin/kits/precos" className="font-semibold text-fal-fg underline">
              Ver todos os preços de kits
            </Link>
          </p>
        </div>
      ) : null}

      {showPricing && kitPriceMode === 'manual' ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 w-full sm:w-40">
            <Input
              label="Preço manual do kit"
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
              hint="Grava na lista Preços dos kits e espelha na Base"
            />
          </div>
          <Button type="button" disabled={busyLink} onClick={() => void handleSaveManualPrice()}>
            Salvar preço manual
          </Button>
        </div>
      ) : null}

      {error ? <p className="m-0 text-sm text-fal-danger">{error}</p> : null}

      {showBom ? (
        <>
          <div className="relative space-y-2">
            <div
              className={
                compact
                  ? 'flex flex-col gap-2'
                  : 'flex flex-wrap items-end gap-2'
              }
            >
              <div className={compact ? 'min-w-0 w-full' : 'min-w-[220px] flex-1'}>
                <Input
                  label="Buscar item do cadastro (SKU / ref / nome)"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' && candidates.length) {
                      e.preventDefault()
                      setHighlightedIndex((i) => Math.min(i + 1, candidates.length - 1))
                    }
                    if (e.key === 'ArrowUp' && candidates.length) {
                      e.preventDefault()
                      setHighlightedIndex((i) => Math.max(i - 1, 0))
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleAddFromQuery()
                    }
                  }}
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex w-28 items-end gap-1">
                  <button
                    type="button"
                    className="h-11 w-9 rounded-[8px] border border-fal-line text-fal-fg"
                    disabled={busyLink}
                    onClick={() =>
                      setQty((v) => String(Math.max(1, (Number(v.replace(',', '.')) || 1) - 1)))
                    }
                    aria-label="Diminuir quantidade padrão"
                  >
                    −
                  </button>
                  <Input label="Qtd" value={qty} onChange={(e) => setQty(e.target.value)} />
                  <button
                    type="button"
                    className="h-11 w-9 rounded-[8px] border border-fal-line text-fal-fg"
                    disabled={busyLink}
                    onClick={() => setQty((v) => String((Number(v.replace(',', '.')) || 1) + 1))}
                    aria-label="Aumentar quantidade padrão"
                  >
                    +
                  </button>
                </div>
                <Button
                  type="button"
                  disabled={busyLink || !q.trim()}
                  onClick={() => void handleAddFromQuery()}
                >
                  {busyLink ? '…' : 'Linkar item'}
                </Button>
                {pickedIds.size > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busyLink}
                    onClick={() => void linkPickedBatch()}
                  >
                    Linkar {pickedIds.size} marcados
                  </Button>
                ) : null}
              </div>
            </div>

            {q.trim().length >= 2 ? (
              <ul
                className="m-0 max-h-56 list-none space-y-1 overflow-y-auto rounded-[10px] border border-fal-line bg-fal-surface p-2"
                role="listbox"
                aria-label="Itens do cadastro para linkar"
              >
                {searching && candidates.length === 0 ? (
                  <li className="px-2 py-1.5 text-xs text-fal-muted">Buscando…</li>
                ) : null}
                {!searching && candidates.length === 0 ? (
                  <li className="px-2 py-1.5 text-xs text-fal-muted">Nenhum item encontrado</li>
                ) : null}
                {candidates.map((c, index) => {
                  const highlighted = index === highlightedIndex
                  return (
                    <li key={c.id}>
                      <div
                        className={`flex w-full items-center gap-2 rounded-[8px] px-1 py-1 ${
                          highlighted ? 'bg-fal-accent/15 ring-1 ring-fal-accent/50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="ml-1 h-4 w-4 shrink-0"
                          checked={pickedIds.has(c.id)}
                          disabled={busyLink}
                          onChange={() => {
                            setPickedIds((prev) => {
                              const next = new Set(prev)
                              if (next.has(c.id)) next.delete(c.id)
                              else next.add(c.id)
                              return next
                            })
                          }}
                          aria-label={`Marcar ${c.commercialRef || c.sku}`}
                        />
                        <button
                          type="button"
                          disabled={busyLink}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-[8px] px-1 py-1 text-left text-sm hover:bg-fal-bg"
                          onMouseEnter={() => setHighlightedIndex(index)}
                          onClick={() => void linkComponent(c, quantity > 0 ? quantity : 1)}
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[6px] border border-fal-line bg-fal-bg">
                            {c.imageUrl ? (
                              <img src={c.imageUrl} alt="" className="h-full w-full object-contain" />
                            ) : (
                              <span className="text-[10px] text-fal-muted">sem foto</span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-fal-fg">
                              {c.commercialRef || c.sku}
                            </span>
                            <span className="block truncate text-xs text-fal-muted">{c.name}</span>
                            {c.price <= 0 ? (
                              <span className="text-[10px] font-semibold text-fal-warning">
                                sem preço Base
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-fal-navy">Linkar</span>
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>

          {loadingBom ? (
            <p className="m-0 text-sm text-fal-muted" aria-busy="true">
              Carregando composição…
            </p>
          ) : rows.length === 0 ? (
            <p className="m-0 text-sm text-fal-muted">Nenhum item linkado ainda.</p>
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
              {rows.map((row, index) => {
                const thumb = rowImages.get(row.componentProductId)
                const busyThis = rowBusy(row.id)
                return (
                  <li
                    key={row.id}
                    className={
                      compact
                        ? 'space-y-2 rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm'
                        : 'flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm'
                    }
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-fal-line bg-fal-bg">
                        {thumb ? (
                          <img src={thumb} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-fal-muted">sem foto</span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <Link
                          to={`/admin/produtos/${row.componentProductId}`}
                          className="break-words font-semibold text-fal-fg underline"
                        >
                          {row.componentCommercialRef || row.componentSku}
                        </Link>
                        <p className="mb-0 mt-0.5 break-words text-xs text-fal-muted">
                          {row.componentName}
                          <span className="ml-1">
                            ({productStatusLabel(row.componentStatus)})
                          </span>
                        </p>
                      </div>
                    </div>
                    <div
                      className={
                        compact
                          ? 'flex flex-wrap items-center gap-1 border-t border-fal-line pt-2'
                          : 'flex flex-wrap items-center gap-1'
                      }
                    >
                      <Button
                        type="button"
                        variant="light"
                        size="sm"
                        disabled={busyThis || index === 0}
                        onClick={() => void handleReorder(row, 'up')}
                        aria-label="Subir na ordem"
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="light"
                        size="sm"
                        disabled={busyThis || index === rows.length - 1}
                        onClick={() => void handleReorder(row, 'down')}
                        aria-label="Descer na ordem"
                      >
                        ↓
                      </Button>
                      <button
                        type="button"
                        className="h-9 w-8 rounded-[8px] border border-fal-line text-fal-fg"
                        disabled={busyThis}
                        onClick={() => nudgeQty(row, -1)}
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                      <input
                        className="w-16 rounded-[8px] border border-fal-line bg-fal-surface px-2 py-1 text-sm text-fal-fg"
                        value={rowQty[row.id] ?? String(row.quantity)}
                        disabled={busyThis}
                        onChange={(e) =>
                          setRowQty((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                        onBlur={(e) => void handleQty(row, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void handleQty(row, (e.target as HTMLInputElement).value)
                          }
                        }}
                        aria-label={`Quantidade de ${row.componentSku}`}
                      />
                      <button
                        type="button"
                        className="h-9 w-8 rounded-[8px] border border-fal-line text-fal-fg"
                        disabled={busyThis}
                        onClick={() => nudgeQty(row, 1)}
                        aria-label="Aumentar quantidade"
                      >
                        +
                      </button>
                      <Button
                        type="button"
                        variant="light"
                        disabled={busyThis}
                        onClick={() => void handleRemove(row)}
                      >
                        Remover
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      ) : null}
    </section>
  )
}
