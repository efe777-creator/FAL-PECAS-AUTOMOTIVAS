import { collapseSpaces } from '@/lib/entityNormalize'

/**
 * Identidade do produto (FAL-IMP-03 / D-REF).
 * - commercialRef = Código referência (operacional / loja)
 * - sku = SKU FAL técnico (import / matching / auditoria)
 */

export function normalizeCommercialRef(input: string | null | undefined): string {
  return collapseSpaces(input ?? '')
}

export function normalizeSku(input: string | null | undefined): string {
  return collapseSpaces(input ?? '')
}

export function resolveProductIdentity(input: {
  commercialRef?: string | null
  sku?: string | null
}): { commercialRef: string; sku: string } {
  const commercialRef = normalizeCommercialRef(input.commercialRef)
  const sku = normalizeSku(input.sku)

  if (!commercialRef && !sku) {
    throw new Error('Informe o Código referência (ou o código interno).')
  }

  // Se um estiver vazio, espelha o outro (ainda permitem divergir quando ambos preenchidos).
  return {
    commercialRef: commercialRef || sku,
    sku: sku || commercialRef,
  }
}

/** Valor exibido como Código referência. */
export function displayCodigoReferencia(product: {
  commercialRef?: string | null
  sku: string
}): string {
  const ref = normalizeCommercialRef(product.commercialRef)
  return ref || product.sku
}
