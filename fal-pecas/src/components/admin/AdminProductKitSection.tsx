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
import type { Product } from '@/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  kitProductId: string
  kitPriceMode: 'auto' | 'manual'
}

type Candidate = Product & { imageUrl?: string }

export function AdminProductKitSection({ kitProductId, kitPriceMode }: Props) {
  const toast = useToast()
  const { user } = useAuth()
  const [rows, setRows] = useState<AdminKitComponentRow[]>([])
  const [rowImages, setRowImages] = useState<Map<string, string>>(() => new Map())
  const [kitHasImage, setKitHasImage] = useState(false)
  const [preview, setPreview] = useState<KitPricePreview | null>(null)
  const [manualPrice, setManualPrice] = useState('')
  const [q, setQ] = useState('')
  const [qty, setQty] = useState('1')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchSeq = useRef(0)

  const reload = useCallback(async () => {
    const [comps, price, kitImgs] = await Promise.all([
      adminListKitComponents(kitProductId),
      adminGetKitPricePreview(kitProductId),
      adminListImages(kitProductId),
    ])
    setRows(comps)
    setPreview(price)
    setKitHasImage(kitImgs.length > 0)
    if (price.manualListPrice != null) {
      setManualPrice(formatMoneyInput(price.manualListPrice))
    }
    const urls = await adminPrimaryImageUrlMap(comps.map((c) => c.componentProductId))
    setRowImages(urls)
  }, [kitProductId])

  useEffect(() => {
    void reload().catch((e) => setError(toUserMessage(e, 'Falha ao carregar composição')))
  }, [reload])

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
    setBusy(true)
    setError(null)
    try {
      await adminAddKitComponent({
        kitProductId,
        componentProductId: match.id,
        quantity,
        actorId: user?.id ?? null,
      })
      setQ('')
      setQty('1')
      setCandidates([])
      await reload()
      toast.push(`Item linkado: ${match.commercialRef ?? match.sku}`, 'success')
    } catch (e) {
      const msg = toUserMessage(e, 'Não foi possível linkar o item')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
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
    setBusy(true)
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
        throw new Error(
          candidates.length
            ? 'Escolha o item na lista (SKU/ref exato ou clique em Linkar)'
            : 'Nenhum item do cadastro com esse SKU/ref (só tipo item)',
        )
      }
      await linkComponent(match, quantity)
    } catch (e) {
      const msg = toUserMessage(e, 'Não foi possível adicionar')
      setError(msg)
      toast.push(msg, 'error')
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

  async function handlePullImageFromItems(replace: boolean) {
    if (!rows.length) {
      toast.push('Linke ao menos um item com foto', 'error')
      return
    }
    setBusy(true)
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
      if (ok) toast.push('Foto do item aplicada na capa do kit', 'success')
      else toast.push('Nenhum item da composição tem foto para puxar', 'error')
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao puxar foto dos itens')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  const quantity = Number(qty.replace(',', '.')) || 1

  return (
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-fal-surface p-4">
      <div>
        <h2 className="m-0 font-extrabold text-fal-fg">Composição do kit</h2>
        <p className="mt-1 text-xs text-fal-muted">
          Linke produtos já cadastrados (tipo item). Ao adicionar, se o kit ainda não tiver capa, a
          foto principal do item é puxada automaticamente. Você também pode enviar uma foto própria
          na seção Imagens abaixo.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-fal-line bg-white px-3 py-2">
        <p className="m-0 flex-1 text-xs text-fal-muted">
          Capa do kit:{' '}
          <strong className="text-fal-fg">{kitHasImage ? 'com foto' : 'sem foto'}</strong>
        </p>
        <Button
          type="button"
          variant="light"
          disabled={busy || rows.length === 0}
          onClick={() => void handlePullImageFromItems(false)}
        >
          Puxar foto dos itens
        </Button>
        {kitHasImage ? (
          <Button
            type="button"
            variant="light"
            disabled={busy || rows.length === 0}
            onClick={() => void handlePullImageFromItems(true)}
          >
            Substituir pela foto do item
          </Button>
        ) : null}
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

      <div className="relative space-y-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <Input
              label="Buscar item do cadastro (SKU / ref / nome)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleAddFromQuery()
                }
              }}
              autoComplete="off"
            />
          </div>
          <div className="w-24">
            <Input label="Qtd" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <Button type="button" disabled={busy || !q.trim()} onClick={() => void handleAddFromQuery()}>
            {busy ? '…' : 'Linkar item'}
          </Button>
        </div>

        {q.trim().length >= 2 ? (
          <ul
            className="m-0 max-h-56 list-none space-y-1 overflow-y-auto rounded-[10px] border border-fal-line bg-white p-2"
            role="listbox"
            aria-label="Itens do cadastro para linkar"
          >
            {searching && candidates.length === 0 ? (
              <li className="px-2 py-1.5 text-xs text-fal-muted">Buscando…</li>
            ) : null}
            {!searching && candidates.length === 0 ? (
              <li className="px-2 py-1.5 text-xs text-fal-muted">Nenhum item encontrado</li>
            ) : null}
            {candidates.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={busy}
                  className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-sm hover:bg-fal-bg"
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
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-fal-navy">Linkar</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="m-0 text-sm text-fal-muted">Nenhum item linkado ainda.</p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {rows.map((row) => {
            const thumb = rowImages.get(row.componentProductId)
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm"
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
                      className="font-semibold text-fal-fg underline"
                    >
                      {row.componentCommercialRef || row.componentSku}
                    </Link>
                    <span className="text-fal-muted"> — {row.componentName}</span>
                    <span className="ml-2 text-xs text-fal-muted">
                      ({productStatusLabel(row.componentStatus)})
                    </span>
                  </div>
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
            )
          })}
        </ul>
      )}
    </section>
  )
}
