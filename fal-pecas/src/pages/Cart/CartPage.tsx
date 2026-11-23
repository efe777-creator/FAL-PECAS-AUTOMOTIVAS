import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/components/common/Toast'
import { CartShippingQuoteBlock } from '@/components/cart/CartShippingQuoteBlock'
import { ReplaceCartItemModal } from '@/components/cart/ReplaceCartItemModal'
import { CompatVerdictSummary } from '@/components/product/CompatVerdictSummary'
import { ProductImagePlaceholder } from '@/components/product/ProductImagePlaceholder'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useProductCompatVerdicts } from '@/hooks/useProductCompatVerdicts'
import { formatMoney } from '@/lib/money'
import {
  applyPaymentCondition,
  formatPixConditionLine,
  storefrontPrimaryAmount,
} from '@/lib/paymentDisplay'
import {
  trackCompatGateCompleteVehicle,
  trackCompatGateContinue,
  trackCompatGateReplace,
  trackCompatGateShown,
  trackCompatItemReplaced,
} from '@/lib/analytics'
import { formatReferenciaFromProduct } from '@/lib/productLabels'
import { usePaymentDisplay } from '@/hooks/usePaymentDisplay'
import {
  buildCompatDecisionEntries,
  compatGateCounts,
  compatGateDialogCopy,
  writeCompatDecisionLog,
} from '@/services/compatibility/compatDecisionSession'
import { resolveCardSeal } from '@/services/compatibility/compatibilityEngine'
import type { CartItem, Product } from '@/types'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { saveCheckoutReturnTo } from '@/services/checkout/checkoutReturnTo'
import { formatVehicleSnapshotLabel } from '@/services/garage/vehicleSnapshot'

/** Acima do MobileNav (shell ~56px + safe-area). */
const STICKY_BOTTOM =
  'fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-[140] border-t border-fal-line bg-fal-surface/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm dark:bg-fal-bg/95 lg:hidden'

export function CartPage() {
  useDocumentTitle('Carrinho | FAL Peças Automotivas')
  const { user } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const {
    items,
    itemCount,
    subtotal,
    addItem,
    updateQty,
    removeItem,
    restoreItem,
    storageKind,
    syncPending,
  } = useCart()
  const [shippingAmount, setShippingAmount] = useState<number | null>(null)
  const [gateBusy, setGateBusy] = useState(false)
  const [replaceItem, setReplaceItem] = useState<CartItem | null>(null)
  const paymentDisplay = usePaymentDisplay()
  const productIds = useMemo(() => items.map((i) => i.productId), [items])
  const { verdicts: compatVerdicts, loading: compatLoading } =
    useProductCompatVerdicts(productIds)

  function onReplaceCartItem(
    fromProductId: string,
    replacement: Product,
    quantity: number,
    fromEquivalence?: boolean,
  ) {
    removeItem(fromProductId)
    addItem(replacement, quantity)
    trackCompatItemReplaced({
      fromProductId,
      toProductId: replacement.id,
      fromEquivalence,
    })
    push(`Trocado por ${replacement.name}`, 'success')
  }

  async function onFinalizarCompra() {
    if (gateBusy) return
    setGateBusy(true)
    try {
      if (!compatLoading) {
        const entries = buildCompatDecisionEntries(items, compatVerdicts)
        if (entries.length) {
          const counts = compatGateCounts(entries)
          trackCompatGateShown(counts)
          const copy = compatGateDialogCopy(entries)
          const hasIncompat = counts.incompatCount > 0
          const { confirmed } = await confirmDialog({
            ...copy,
            cancelLabel: hasIncompat ? 'Trocar no carrinho' : 'Completar dados do veículo',
          })
          if (!confirmed) {
            if (hasIncompat) {
              const first = entries.find((e) => e.action === 'continue_incompatible')
              const target = first
                ? items.find((i) => i.productId === first.productId) ?? null
                : null
              if (target) {
                trackCompatGateReplace({
                  productId: target.productId,
                  incompatCount: counts.incompatCount,
                })
                setReplaceItem(target)
              }
            } else {
              trackCompatGateCompleteVehicle(counts)
              navigate('/conta/veiculos', { state: { from: '/carrinho' } })
            }
            return
          }
          trackCompatGateContinue(counts)
          writeCompatDecisionLog({
            gatedAt: new Date().toISOString(),
            entries,
          })
        }
      }
      saveCheckoutReturnTo('/carrinho')
      navigate('/checkout', { state: { from: '/carrinho' } })
    } finally {
      setGateBusy(false)
    }
  }

  const onShippingAmountChange = useCallback((amount: number | null) => {
    setShippingAmount(amount)
  }, [])

  const storefrontSubtotal = useMemo(
    () =>
      items.reduce(
        (sum, i) => sum + storefrontPrimaryAmount(i.price, paymentDisplay).amount * i.quantity,
        0,
      ),
    [items, paymentDisplay],
  )
  const pixHint = formatPixConditionLine(subtotal, paymentDisplay)
  const primary = storefrontPrimaryAmount(subtotal, paymentDisplay)
  const creditCart = applyPaymentCondition(subtotal, 'credit_card', paymentDisplay)
  const estimatedTotal = storefrontSubtotal + (shippingAmount ?? 0)

  function onRemove(item: CartItem) {
    const snapshot: CartItem = { ...item }
    removeItem(item.productId)
    push('Item removido do carrinho', 'info', {
      durationMs: 7000,
      action: {
        label: 'Desfazer',
        onClick: () => {
          restoreItem(snapshot)
          push('Item restaurado no carrinho', 'success')
        },
      },
    })
  }

  function renderCheckoutActions(opts: { compact?: boolean }): ReactNode {
    if (user) {
      return (
        <Button
          variant="primary"
          fullWidth
          disabled={gateBusy}
          onClick={() => void onFinalizarCompra()}
        >
          {gateBusy ? 'Verificando…' : 'Finalizar compra'}
        </Button>
      )
    }
    return (
      <div className={opts.compact ? 'space-y-1' : 'space-y-2'}>
        <Link to="/cadastro" state={{ from: '/checkout' }} className="block">
          <Button variant="primary" fullWidth>
            Criar conta e continuar
          </Button>
        </Link>
        <Link
          to="/login"
          state={{ from: '/checkout' }}
          className="block text-center text-xs font-semibold text-fal-navy underline-offset-2 hover:underline dark:text-fal-fg"
        >
          Já tenho conta — entrar
        </Link>
      </div>
    )
  }

  if (!items.length) {
    return (
      <Container className="py-8">
        <h1 className="mt-0 text-[28px] font-extrabold sm:text-[34px]">Carrinho</h1>
        <EmptyState
          title="Seu carrinho está vazio"
          description="Adicione peças pelo início ou pelo catálogo."
          actionLabel="Ver catálogo"
          actionTo="/catalogo"
        />
      </Container>
    )
  }

  return (
    <>
      <Container className="py-6 sm:py-8">
        <div className="mb-5 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h1 className="m-0 text-[28px] font-extrabold sm:text-[34px]">
              Carrinho ({itemCount})
            </h1>
            <p className="mt-1 mb-0 text-sm text-fal-muted">
              {storageKind === 'supabase'
                ? 'Salvo nesta conta.'
                : 'Salvo neste dispositivo.'}
              {syncPending ? ' Salvando…' : ''}
            </p>
          </div>
          <Link
            to="/catalogo"
            className="shrink-0 text-sm font-semibold text-fal-accent underline-offset-2 hover:underline"
          >
            Continuar comprando
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_350px]">
          <div className="rounded-fal border border-fal-line bg-fal-surface px-3 py-1 sm:px-5 sm:py-2">
            {items.map((item) => {
              const productHref = item.slug
                ? `/produto/${encodeURIComponent(item.slug)}`
                : `/produto/${item.productId}`
              const lineTotal = item.price * item.quantity
              const unitVista = paymentDisplay
                ? storefrontPrimaryAmount(item.price, paymentDisplay).amount
                : null
              const verdict = compatVerdicts.get(item.productId)
              const seal = verdict ? resolveCardSeal(verdict) : null

              return (
                <article
                  key={item.productId}
                  className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-b border-fal-line py-4 last:border-0 sm:grid-cols-[86px_minmax(0,1fr)_auto] sm:gap-4"
                >
                  <Link
                    to={productHref}
                    className="flex h-[72px] items-center justify-center overflow-hidden rounded-[9px] bg-fal-surface-2 p-1.5 no-underline sm:h-[75px]"
                    aria-label={`Abrir produto ${item.name}`}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="max-h-full max-w-full object-contain object-center"
                        loading="lazy"
                      />
                    ) : (
                      <ProductImagePlaceholder className="scale-75" />
                    )}
                  </Link>

                  <div className="min-w-0">
                    <h3 className="m-0 text-[15px] font-bold leading-snug sm:text-base">
                      <Link
                        to={productHref}
                        className="text-fal-navy no-underline hover:underline dark:text-fal-fg"
                      >
                        {item.name}
                      </Link>
                    </h3>
                    <p className="m-0 mt-0.5 text-xs text-fal-muted">
                      {formatReferenciaFromProduct({
                        commercialRef: item.commercialRef,
                        sku: item.sku,
                      })}
                    </p>
                    {item.vehicleSnapshot ? (
                      <p className="mb-0 mt-1 text-xs text-fal-muted">
                        Veículo:{' '}
                        {formatVehicleSnapshotLabel(item.vehicleSnapshot) ?? '—'}
                      </p>
                    ) : null}
                    {verdict ? (
                      <CompatVerdictSummary
                        className="mt-1.5"
                        verdict={verdict}
                        showFaltante
                      >
                        {seal?.kind === 'hide' ? (
                          <button
                            type="button"
                            className="mt-1 text-xs font-extrabold text-fal-accent underline-offset-2 hover:underline"
                            onClick={() => setReplaceItem(item)}
                          >
                            Trocar peça
                          </button>
                        ) : null}
                      </CompatVerdictSummary>
                    ) : null}
                    {item.quantity > 1 ||
                    (unitVista != null && Math.abs(unitVista - item.price) > 0.009) ? (
                      <p className="mb-0 mt-1 text-xs text-fal-muted">
                        {item.quantity > 1 ? `${formatMoney(item.price)} cada` : null}
                        {unitVista != null && Math.abs(unitVista - item.price) > 0.009
                          ? `${item.quantity > 1 ? ' · ' : ''}${formatMoney(unitVista)} à vista`
                          : null}
                      </p>
                    ) : null}
                    {/* Total empilhado no mobile — evita coluna estreita / overlap (P0). */}
                    <p className="mb-0 mt-1 text-sm font-black text-fal-ink sm:hidden">
                      {formatMoney(lineTotal)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="grid h-9 w-9 place-items-center rounded-[7px] border border-fal-line bg-fal-surface"
                        aria-label={`Diminuir quantidade de ${item.name}`}
                        onClick={() => updateQty(item.productId, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span
                        className="min-w-[30px] text-center font-extrabold"
                        aria-label={`Quantidade: ${item.quantity}`}
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="grid h-9 w-9 place-items-center rounded-[7px] border border-fal-line bg-fal-surface"
                        aria-label={`Aumentar quantidade de ${item.name}`}
                        onClick={() => updateQty(item.productId, item.quantity + 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="ml-1 text-sm font-bold text-fal-danger"
                        aria-label={`Remover ${item.name} do carrinho`}
                        onClick={() => onRemove(item)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>

                  <Link
                    to={productHref}
                    className="hidden text-right font-black text-fal-ink no-underline hover:text-fal-navy sm:block"
                    aria-label={`Total ${item.name}: ${formatMoney(lineTotal)}`}
                  >
                    {formatMoney(lineTotal)}
                  </Link>
                </article>
              )
            })}
          </div>

          <aside className="h-max rounded-fal border border-fal-line bg-fal-surface p-4 sm:p-5">
            <div className="mb-3 flex justify-between gap-3 text-sm sm:text-base">
              <span>Subtotal (lista)</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
            {primary.adjustPercent !== 0 ? (
              <div className="mb-3 flex justify-between gap-3 text-sm text-emerald-900 dark:text-emerald-300">
                <span>
                  {primary.method === 'pix' ? 'À vista no Pix' : 'À vista'}
                  {primary.adjustPercent < 0
                    ? ` (${primary.adjustPercent}%)`
                    : ` (+${primary.adjustPercent}%)`}
                </span>
                <strong>{formatMoney(storefrontSubtotal)}</strong>
              </div>
            ) : null}
            {pixHint && primary.method !== 'pix' ? (
              <p className="mb-3 mt-0 text-xs text-fal-muted">{pixHint}</p>
            ) : null}
            {paymentDisplay?.creditEnabled !== false &&
            Math.abs(creditCart.amount - storefrontSubtotal) > 0.009 ? (
              <p className="mb-3 mt-0 text-xs text-fal-muted">
                No crédito: {formatMoney(creditCart.amount)}
                {creditCart.adjustPercent
                  ? ` (${creditCart.adjustPercent > 0 ? '+' : ''}${creditCart.adjustPercent}%)`
                  : ''}
              </p>
            ) : null}
            <CartShippingQuoteBlock
              items={items}
              subtotal={subtotal}
              onShippingAmountChange={onShippingAmountChange}
            />
            <div className="mb-3 flex justify-between gap-3 text-fal-muted">
              <span>Frete</span>
              <span>{shippingAmount != null ? formatMoney(shippingAmount) : 'A calcular'}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-fal-line pt-3 text-xl font-black sm:text-2xl">
              <span>Total estimado</span>
              <span>{formatMoney(estimatedTotal)}</span>
            </div>
            <p className="mt-2 mb-0 text-xs text-fal-muted">
              Checkout revalida frete e forma de pagamento.
            </p>
            {/* CTAs no aside só desktop — mobile usa sticky (E.3), sem duplicar. */}
            <div className="mt-4 hidden lg:block">{renderCheckoutActions({})}</div>
          </aside>
        </div>

        {/* Espaço para sticky empilhado + MobileNav */}
        <div className="h-36 lg:hidden" aria-hidden />
      </Container>

      <div className={STICKY_BOTTOM}>
        <div className="mx-auto flex max-w-6xl flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="m-0 text-xs text-fal-muted">Total estimado</p>
            <p className="m-0 text-lg font-black leading-none">{formatMoney(estimatedTotal)}</p>
          </div>
          {renderCheckoutActions({ compact: true })}
        </div>
      </div>

      <ReplaceCartItemModal
        open={Boolean(replaceItem)}
        item={replaceItem}
        excludeCartProductIds={productIds}
        onClose={() => setReplaceItem(null)}
        onReplace={onReplaceCartItem}
      />
    </>
  )
}
