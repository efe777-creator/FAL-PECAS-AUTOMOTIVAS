/**
 * Lista branca do mini-menu (⋯) — navegação / print.
 * Mutações de pedido ficam em orderOpsActions + OrderOpsSurface (não aqui).
 */

export const ORDER_PREVIEW_ACTION_IDS = [
  'open-preview',
  'open-full',
  'copy-id',
  'print-separation',
  'print-romaneio',
  'pdf-stub',
] as const

export type OrderPreviewActionId = (typeof ORDER_PREVIEW_ACTION_IDS)[number]

export function isAllowedOrderPreviewAction(id: string): boolean {
  return (ORDER_PREVIEW_ACTION_IDS as readonly string[]).includes(id)
}

export function isPdfStubDisabled(): boolean {
  return true
}
