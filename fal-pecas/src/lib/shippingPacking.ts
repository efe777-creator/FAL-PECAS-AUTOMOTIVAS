/** Modelo mínimo de caixa para packing v1 (loja + Edge). */
export type PackingBox = {
  id: string
  name: string
  lengthCm: number
  widthCm: number
  heightCm: number
  emptyWeightKg: number
  maxWeightKg: number | null
  active: boolean
}

export type PackingItem = {
  lengthCm: number
  widthCm: number
  heightCm: number
  weightKg: number
  qty: number
}

/**
 * Regra v1: menor caixa (por volume interno) que comporta volume e peso dos itens.
 * Volume = soma (L×W×H×qty); peso total = soma pesos + emptyWeight da caixa.
 */
export function pickSmallestFittingBox(
  boxes: PackingBox[],
  items: PackingItem[],
): PackingBox | null {
  const active = boxes.filter((b) => b.active)
  if (!active.length || !items.length) return null
  let volume = 0
  let weight = 0
  for (const it of items) {
    const q = Math.max(1, it.qty)
    volume += it.lengthCm * it.widthCm * it.heightCm * q
    weight += it.weightKg * q
  }
  const candidates = active
    .map((b) => ({
      box: b,
      vol: b.lengthCm * b.widthCm * b.heightCm,
      totalWeight: weight + b.emptyWeightKg,
    }))
    .filter(
      (c) =>
        c.vol >= volume &&
        (c.box.maxWeightKg == null || c.totalWeight <= c.box.maxWeightKg),
    )
    .sort((a, b) => a.vol - b.vol)
  return candidates[0]?.box ?? null
}

export function sumItemsWeightKg(items: PackingItem[]): number {
  return items.reduce((n, it) => n + it.weightKg * Math.max(1, it.qty), 0)
}

export type PackingStrategy =
  | { mode: 'box_template'; box: PackingBox }
  /** Sem templates ativos — cotação envia produtos individuais à API. */
  | { mode: 'per_item' }
  /** Há caixas ativas, mas nenhuma comporta volume/peso. */
  | { mode: 'packing_failed' }

/**
 * O1-C: com templates ativos, exige caixa; sem templates, fallback por item
 * (não inventa envelope “max eixos” como se fosse embalagem).
 */
export function resolvePackingStrategy(
  boxes: PackingBox[],
  items: PackingItem[],
): PackingStrategy {
  const active = boxes.filter((b) => b.active)
  if (!active.length) return { mode: 'per_item' }
  const box = pickSmallestFittingBox(active, items)
  if (box) return { mode: 'box_template', box }
  return { mode: 'packing_failed' }
}
