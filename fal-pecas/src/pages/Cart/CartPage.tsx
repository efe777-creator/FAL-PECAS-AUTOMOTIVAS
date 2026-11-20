import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/components/common/Toast'
import { CartShippingQuoteBlock } from '@/components/cart/CartShippingQuoteBlock'
import { ReplaceCartItemModal } from '@/components/cart/ReplaceCartItemModal'
import { CompatibilityStateBadge } from '@/components/product/CompatibilityStateBadge'
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
  compatFaltante,
  compatMotivo,
  compatSealDisplayLabel,
} from '@/services/compatibility/compatCopy'
import {
  buildCompatDecisionEntries,
  compatGateCounts,
  compatGateDialogCopy,
  writeCompatDecisionLog,
} from '@/services/compatibility/compatDecisionSession'
import { resolveCardSeal } from '@/services/compatibility/compatibilityEngine'
import type { CartItem, Product } from '@/types'
import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { saveCheckoutReturnTo } from '@/services/checkout/checkoutReturnTo'
import { formatVehicleSnapshotLabel } from '@/services/garage/vehicleSnapshot'

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
              // E.4: Completar dados → garagem (não muda o carrinho)
              navigate('/garagem', { state: { from: '/carrinho' } })
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
    <Container className="py-8">
      <h1 className="mt-0 mb-2 text-[28px] font-extrabold sm:text-[34px]">
        Carrinho ({itemCount})
      </h1>
      <p className="mt-0 mb-6 text-sm text-fal-muted">
        {storageKind === 'supabase'
          ? 'Carrinho salvo nesta conta.'
          : 'Carrinho salvo neste dispositivo.'}
        {syncPending ? ' Salvando…' : ''}
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_350px]">
        <div className="rounded-fal border border-fal-line bg-fal-surface p-5">
          {items.map((item) => {
            const productHref = item.slug
              ? `/produto/${encodeURIComponent(item.slug)}`
              : `/produto/${item.productId}`
            return (
              <div
                key={item.productId}
                className="grid grid-cols-[86px_1fr_auto] gap-4 border-b border-fal-line py-4 last:border-0"
              >
                <Link
                  to={productHref}
                  className="flex h-[75px] items-center justify-center overflow-hidden rounded-[9px] bg-[#f8f9fa] p-1.5 text-3xl no-underline"
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
                    '🧩'
                  )}
                </Link>
                <div className="min-w-0">
                  <h3 className="m-0 text-base font-bold">
                    <Link
                      to={productHref}
                      className="text-fal-navy no-underline hover:underline"
                    >
                      {item.name}
                    </Link>
                  </h3>
                  <p className="m-0 text-xs text-fal-muted">
                    <Link to={productHref} className="text-inherit no-underline hover:underline">
                      {formatReferenciaFromProduct({
                        commercialRef: item.commercialRef,
                        sku: item.sku,
                      })}
                    </Link>
                  </p>
                  <p className="mb-0 mt-1">
                    <Link
                      to={productHref}
                      className="text-xs font-extrabold text-fal-navy underline"
                    >
                      Ver produto
                    </Link>
                  </p>
                  {item.vehicleSnapshot ? (
                    <p className="mb-0 mt-1 text-xs text-fal-muted">
                      Veículo associado:{' '}
                      {formatVehicleSnapshotLabel(item.vehicleSnapshot) ?? '—'}
                    </p>
                  ) : null}
                  {(() => {
                    const verdict = compatVerdicts.get(item.productId)
                    if (!verdict) return null
                    const seal = resolveCardSeal(verdict)
                    const motivo = compatMotivo(verdict)
                    const faltante = compatFaltante(verdict)
                    return (
                      <div className="mt-1.5 space-y-0.5">
                        {seal.kind === 'hide' ? (
                          <p className="m-0 text-xs font-bold text-fal-danger">
                            {compatSealDisplayLabel(verdict)}
                          </p>
                        ) : (
                          <CompatibilityStateBadge verdict={verdict} variant="card" />
                        )}
                        {motivo ? (
                          <p className="m-0 text-[11px] text-fal-muted">Motivo: {motivo}</p>
                        ) : null}
                        {faltante ? (
                          <p className="m-0 text-[11px] text-fal-muted">Falta: {faltante}</p>
                        ) : null}
                        {seal.kind === 'hide' ? (
                          <button
                            type="button"
                            className="mt-1 text-xs font-extrabold text-fal-accent underline-offset-2 hover:underline"
                            onClick={() => setReplaceItem(item)}
                          >
                            Trocar peça
                          </button>
                        ) : null}
                      </div>
                    )
                  })()}
                  <p className="mb-0 mt-1 text-xs text-fal-muted">
                    {formatMoney(item.price)} cada (lista)
                    {paymentDisplay
                      ? ` · ${formatMoney(storefrontPrimaryAmount(item.price, paymentDisplay).amount)} à vista`
                      : ''}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="h-9 w-9 rounded-[7px] border border-fal-line bg-fal-surface"
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
                      className="h-9 w-9 rounded-[7px] border border-fal-line bg-fal-surface"
                      aria-label={`Aumentar quantidade de ${item.name}`}
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="ml-2 text-sm font-bold text-fal-danger"
                      aria-label={`Remover ${item.name} do carrinho`}
                      onClick={() => onRemove(item)}
                    >
                      Remover
                    </button>
                  </div>
                </div>
                <Link
                  to={productHref}
                  className="text-right font-black text-fal-ink no-underline hover:text-fal-navy"
                  aria-label={`Abrir produto ${item.name} — total`}
                >
                  {formatMoney(item.price * item.quantity)}
                </Link>
              </div>
            )
          })}
        </div>
        <aside className="h-max rounded-fal border border-fal-line bg-fal-surface p-5">
          <div className="mb-3 flex justify-between">
            <span>Subtotal (lista)</span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>
          {primary.adjustPercent !== 0 ? (
            <div className="mb-3 flex justify-between text-sm text-emerald-900">
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
          <div className="mb-3 flex justify-between text-fal-muted">
            <span>Frete</span>
            <span>{shippingAmount != null ? formatMoney(shippingAmount) : 'A calcular'}</span>
          </div>
          <div className="flex justify-between border-t border-fal-line pt-3 text-2xl font-black">
            <span>Total estimado</span>
            <span>{formatMoney(storefrontSubtotal + (shippingAmount ?? 0))}</span>
          </div>
          <p className="mt-2 mb-0 text-xs text-fal-muted">
            No checkout o total muda conforme Pix, débito ou crédito.
          </p>
          {user ? (
            <div className="mt-4">
              <Button
                variant="primary"
                fullWidth
                disabled={gateBusy}
                onClick={() => void onFinalizarCompra()}
              >
                {gateBusy ? 'Verificando…' : 'Finalizar compra'}
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <Link to="/cadastro" state={{ from: '/checkout' }} className="block">
                <Button variant="primary" fullWidth>
                  Criar conta e continuar
                </Button>
              </Link>
              <Link to="/login" state={{ from: '/checkout' }} className="block">
                <Button variant="light" fullWidth>
                  Já tenho conta — entrar
                </Button>
              </Link>
              <p className="m-0 text-xs text-fal-muted">
                Conta rápida: nome, e-mail e senha. CPF/CNPJ entram no checkout.
              </p>
            </div>
          )}
          <p className="mt-3 text-xs text-fal-muted">
            Cotação do conjunto no carrinho; o checkout revalida frete e pagamento.
          </p>
        </aside>
      </div>
      <ReplaceCartItemModal
        open={Boolean(replaceItem)}
        item={replaceItem}
        excludeCartProductIds={productIds}
        onClose={() => setReplaceItem(null)}
        onReplace={onReplaceCartItem}
      />
    </Container>
  )
}
