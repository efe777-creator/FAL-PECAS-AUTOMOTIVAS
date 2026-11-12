/**
 * FIND-SMOKE-UI-001 / AJUSTE-035 — empty só quando não há itens de checkout,
 * nem buy_now, nem sessão de pagamento em andamento.
 */
export function showCheckoutEmptyCart(
  itemCount: number,
  hasMpAwaiting: boolean,
  hasBuyNow = false,
): boolean {
  return itemCount === 0 && !hasMpAwaiting && !hasBuyNow
}
