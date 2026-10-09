/**
 * D-LIBERAR — checklist mínimo para liberar na loja (FAL-IMP-10).
 * Hard = bloqueia; Soft = aviso (não bloqueia).
 */

export type ReleaseChecklistInput = {
  productId: string
  name: string
  commercialRef?: string | null
  sku: string
  categoryId?: string | null
  status: string
  /** Preço via resolve_product_price; null = não resolvido. */
  resolvedPrice: number | null
  hasApplication: boolean
  hasImage: boolean
  /** Se false e status ≠ published, hard fail. */
  publishIfNeeded?: boolean
}

export type ReleaseCheckItem = {
  code: string
  label: string
  level: 'hard' | 'soft'
  ok: boolean
  detail?: string
}

export type ReleaseChecklistResult = {
  productId: string
  canRelease: boolean
  checks: ReleaseCheckItem[]
  hardFails: ReleaseCheckItem[]
  softWarnings: ReleaseCheckItem[]
  summary: string
}

function codeRef(input: ReleaseChecklistInput): string {
  return (input.commercialRef ?? input.sku ?? '').trim()
}

/** Avaliação pura (testável) — sem I/O. */
export function evaluateReleaseChecklist(
  input: ReleaseChecklistInput,
): ReleaseChecklistResult {
  const checks: ReleaseCheckItem[] = []

  const nameOk = Boolean(input.name?.trim())
  checks.push({
    code: 'name',
    label: 'Nome',
    level: 'hard',
    ok: nameOk,
    detail: nameOk ? undefined : 'Nome vazio',
  })

  const ref = codeRef(input)
  const refOk = Boolean(ref)
  checks.push({
    code: 'commercial_ref',
    label: 'Código referência',
    level: 'hard',
    ok: refOk,
    detail: refOk ? ref : 'Código referência / SKU ausente',
  })

  const catOk = Boolean(input.categoryId?.trim())
  checks.push({
    code: 'category',
    label: 'Categoria',
    level: 'hard',
    ok: catOk,
    detail: catOk ? undefined : 'Sem categoria',
  })

  const priceOk = input.resolvedPrice != null && input.resolvedPrice > 0
  checks.push({
    code: 'price',
    label: 'Preço resolvido',
    level: 'hard',
    ok: priceOk,
    detail: priceOk
      ? `R$ ${Number(input.resolvedPrice).toFixed(2)}`
      : 'Sem preço resolvido > 0 (override/lista pública/default)',
  })

  const publishOk =
    input.status === 'published' || input.publishIfNeeded === true
  checks.push({
    code: 'published',
    label: 'Publicação',
    level: 'hard',
    ok: publishOk,
    detail: publishOk
      ? input.status === 'published'
        ? 'Já published'
        : 'Será publicado neste passo'
      : 'Status ≠ published (marque publicar neste passo)',
  })

  checks.push({
    code: 'application',
    label: 'Aplicação veículo',
    level: 'soft',
    ok: input.hasApplication,
    detail: input.hasApplication ? undefined : 'Sem aplicação PVC (aviso)',
  })

  checks.push({
    code: 'image',
    label: 'Imagem',
    level: 'soft',
    ok: input.hasImage,
    detail: input.hasImage ? undefined : 'Sem imagem (aviso)',
  })

  const hardFails = checks.filter((c) => c.level === 'hard' && !c.ok)
  const softWarnings = checks.filter((c) => c.level === 'soft' && !c.ok)
  const canRelease = hardFails.length === 0
  const summary = canRelease
    ? softWarnings.length
      ? `OK com ${softWarnings.length} aviso(s)`
      : 'OK'
    : hardFails.map((f) => f.detail ?? f.label).join('; ')

  return {
    productId: input.productId,
    canRelease,
    checks,
    hardFails,
    softWarnings,
    summary,
  }
}
