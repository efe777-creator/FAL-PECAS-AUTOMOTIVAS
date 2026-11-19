/**
 * @deprecated Preferir OrderSplitTabPanels (guias empilhadas abertas).
 * Mantido só se algum casco ainda importar — reexporta tipo.
 */
export type { OrderSplitStackItem as OrderSplitTab } from '@/components/admin/orders/OrderSplitTabPanels'

/** Strip horizontal removido: guias ficam empilhadas abertas no OrderSplitTabPanels. */
export function OrderSplitTabStrip(_props: {
  tabs: { id: string; label: string; statusLabel?: string }[]
  activeId: string
  onSelect: (id: string) => void
  onCloseTab: (id: string) => void
}) {
  return null
}
