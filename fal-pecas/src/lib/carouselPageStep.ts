/**
 * Passo de scroll do carrossel de produtos: largura de um item + gap,
 * para o snap pousar em cards inteiros (sem cortar ao meio).
 */
export function carouselPageStep(
  itemWidth: number,
  gapPx: number,
  visibleCount: number,
): number {
  const w = Math.max(0, itemWidth)
  const g = Math.max(0, gapPx)
  const n = Math.max(1, Math.floor(visibleCount))
  return n * w + (n - 1) * g
}
