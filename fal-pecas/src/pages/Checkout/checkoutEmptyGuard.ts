/**
 * FIND-SMOKE-UI-001 — após place_order MP o carrinho é limpo; com mpAwaiting
 * ainda devemos renderizar Pix/Brick, não o EmptyState.
 */
export function showCheckoutEmptyCart(
  itemCount: number,
  hasMpAwaiting: boolean,
): boolean {
  return itemCount === 0 && !hasMpAwaiting
}
