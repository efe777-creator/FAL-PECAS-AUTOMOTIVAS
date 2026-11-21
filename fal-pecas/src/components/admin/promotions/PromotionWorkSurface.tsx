import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { useToast } from '@/components/common/Toast'
import { formatMoneyInput, parseMoneyBr } from '@/lib/money'
import { toUserMessage } from '@/lib/toUserMessage'
import { adminListProducts } from '@/services/admin/adminProductService'
import {
  adminActivatePromotion,
  type AdminPromotionRow,
} from '@/services/admin/adminProductPromotionService'
import { useEffect, useState } from 'react'

type ListOpt = { id: string; name: string; slug: string }

type Props = {
  isKits: boolean
  lists: ListOpt[]
  rows: AdminPromotionRow[]
  /** Prefill ao abrir a partir de uma linha inativa. */
  seed?: AdminPromotionRow | null
  onClose: () => void
  onMutated: () => void
}

/**
 * Superfície contextual do hub Promoções (Adaptive).
 * Incluir / ativar na guia — form não fica permanente no primary.
 */
export function PromotionWorkSurface({
  isKits,
  lists,
  rows,
  seed = null,
  onClose,
  onMutated,
}: Props) {
  const { push } = useToast()
  const [productQ, setProductQ] = useState('')
  const [hits, setHits] = useState<
    Array<{
      id: string
      name: string
      sku: string
      productKind: 'item' | 'kit'
      price: number | null
    }>
  >([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedProductLabel, setSelectedProductLabel] = useState('')
  const [selectedListId, setSelectedListId] = useState(lists[0]?.id ?? '')
  const [endsAt, setEndsAt] = useState('')
  const [promoPriceDraft, setPromoPriceDraft] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!seed) return
    const label = `${seed.sku} — ${seed.name}`
    setSelectedProductId(seed.productId)
    setSelectedProductLabel(label)
    setProductQ(label)
    setSelectedListId(seed.priceListId)
    setPromoPriceDraft(
      seed.promoPrice != null ? formatMoneyInput(seed.promoPrice) : '',
    )
    if (seed.endsAt) {
      const d = new Date(seed.endsAt)
      if (!Number.isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0')
        setEndsAt(
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
        )
      }
    }
  }, [seed])

  useEffect(() => {
    if (selectedProductId && productQ === selectedProductLabel) {
      setHits([])
      return
    }
    const term = productQ.trim()
    if (term.length < 2) {
      setHits([])
      return
    }
    let cancelled = false
    const t = window.setTimeout(() => {
      void adminListProducts({
        q: term,
        limit: 8,
        productKind: isKits ? 'kit' : 'item',
      })
        .then((found) => {
          if (cancelled) return
          setHits(
            found.map((p) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              productKind: p.productKind === 'kit' ? 'kit' : 'item',
              price: typeof p.price === 'number' && Number.isFinite(p.price) ? p.price : null,
            })),
          )
        })
        .catch(() => {
          if (!cancelled) setHits([])
        })
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [productQ, selectedProductId, selectedProductLabel, isKits])

  const canActivate =
    lists.length > 0 && Boolean(selectedProductId) && Boolean(selectedListId)

  function clearProductSelection() {
    setSelectedProductId('')
    setSelectedProductLabel('')
    setProductQ('')
    setHits([])
    setPromoPriceDraft('')
  }

  async function onActivate() {
    if (!selectedProductId || !selectedListId) {
      push(
        isKits ? 'Selecione kit e lista promocional' : 'Selecione produto e lista promocional',
        'error',
      )
      return
    }
    if (!lists.length) {
      push('Ative a Lista Promocional em Preços antes de ativar SKUs', 'error')
      return
    }
    const parsedPromo = parseMoneyBr(promoPriceDraft)
    const alreadyOnList = rows.some(
      (r) => r.productId === selectedProductId && r.priceListId === selectedListId,
    )
    if (!alreadyOnList && (parsedPromo == null || parsedPromo < 0)) {
      push(
        isKits
          ? 'Informe o preço promocional do kit para incluí-lo na lista.'
          : 'Informe o preço promocional para incluir o item na lista.',
        'error',
      )
      return
    }
    setBusy(true)
    try {
      await adminActivatePromotion({
        productId: selectedProductId,
        priceListId: selectedListId,
        endsAt: endsAt.trim() ? new Date(endsAt).toISOString() : null,
        promoPrice: parsedPromo,
      })
      push(
        alreadyOnList
          ? 'Promoção ativada — preço da loja passa a usar a lista promocional'
          : 'SKU incluído na lista e promoção ativada',
        'success',
      )
      clearProductSelection()
      setEndsAt('')
      onMutated()
      onClose()
    } catch (e) {
      push(toUserMessage(e, 'Falha ao ativar'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3" data-promo-ops-density="compact">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line pb-2">
        <p className="m-0 text-xs font-semibold text-fal-muted">
          {seed
            ? `Reativar na guia · ${seed.sku}`
            : isKits
              ? 'Incluir / ativar kit na guia'
              : 'Incluir / ativar produto na guia'}
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
        <p className="m-0 text-sm text-fal-muted">
          {isKits
            ? 'Kit cadastrado em Catálogo › Kits pode entrar na Lista Promocional com preço próprio (não herda desconto dos itens).'
            : 'Inclui o SKU na Lista Promocional (se ainda não estiver) e ativa o gate na loja.'}
        </p>

        <div className="grid gap-3">
          <div>
            <Input
              label={isKits ? 'Kit' : 'Produto'}
              value={productQ}
              onChange={(e) => {
                const v = e.target.value
                setProductQ(v)
                if (selectedProductId && v !== selectedProductLabel) {
                  setSelectedProductId('')
                  setSelectedProductLabel('')
                }
              }}
              placeholder={
                isKits
                  ? 'Digite nome ou SKU do kit (mín. 2 letras)'
                  : 'Digite nome ou SKU (mín. 2 letras)'
              }
              disabled={lists.length === 0}
            />
            {selectedProductId ? (
              <p className="mt-1 mb-0 flex flex-wrap items-center gap-2 text-xs text-fal-success">
                Selecionado: <strong>{selectedProductLabel}</strong>
                <button
                  type="button"
                  className="font-semibold text-fal-fg underline"
                  onClick={clearProductSelection}
                >
                  Limpar
                </button>
              </p>
            ) : null}
            {hits.length > 0 ? (
              <ul className="mt-1 max-h-44 list-none overflow-auto rounded-[9px] border border-fal-line bg-fal-surface p-0 text-sm">
                {hits.map((h) => (
                  <li key={h.id} className="border-b border-fal-line/60 last:border-0">
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left hover:bg-fal-bg"
                      onClick={() => {
                        const label = `${h.sku} — ${h.name}`
                        setSelectedProductId(h.id)
                        setSelectedProductLabel(label)
                        setProductQ(label)
                        const existing = rows.find(
                          (r) => r.productId === h.id && r.priceListId === selectedListId,
                        )
                        const hint = existing?.promoPrice ?? h.price
                        setPromoPriceDraft(hint != null ? formatMoneyInput(hint) : '')
                        setHits([])
                      }}
                    >
                      <span className="font-mono text-xs text-fal-muted">
                        {h.sku}
                        {h.productKind === 'kit' ? ' · Kit' : ''}
                      </span>
                      <span className="mt-0.5 block font-semibold text-fal-fg">{h.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <Select
            label="Lista"
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            options={
              lists.length
                ? lists.map((l) => ({ value: l.id, label: l.name }))
                : [{ value: '', label: 'Nenhuma lista ativa' }]
            }
            disabled={lists.length === 0}
          />

          <Input
            label="Preço promocional"
            value={promoPriceDraft}
            onChange={(e) => setPromoPriceDraft(e.target.value)}
            placeholder="0,00"
            hint={
              isKits
                ? 'Obrigatório se o kit ainda não está na lista'
                : 'Obrigatório se o SKU ainda não está na lista'
            }
            disabled={lists.length === 0}
          />

          <Input
            label="Término (opcional)"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            disabled={lists.length === 0}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            type="button"
            variant="primary"
            disabled={busy || !canActivate}
            onClick={() => void onActivate()}
          >
            {busy ? 'Ativando…' : 'Incluir e ativar'}
          </Button>
          <p className="m-0 text-xs text-fal-muted">
            {isKits
              ? 'Kits cadastrados entram na mesma Lista Promocional dos itens.'
              : 'Independente de o produto estar ou não em Destaques.'}
          </p>
        </div>
      </div>
    </div>
  )
}
