/**
 * Política do smoke ME: compra automática só em sandbox/dry-run.
 * Live → nunca purchase automático (gate humano na Expedição).
 */

/** @param {{ sandbox?: boolean, dryRun?: boolean }} flags */
export function shouldAutoPurchaseMeLabel(flags = {}) {
  return flags.sandbox === true || flags.dryRun === true
}

/** Passos em que STOP_AFTER encerra antes de qualquer purchase. */
export const STOP_AFTER_BEFORE_PURCHASE = new Set([
  'seed',
  'status',
  'quote',
  'prepare',
])

/** @param {string} stopAfter */
export function stopAfterBlocksPurchase(stopAfter) {
  return STOP_AFTER_BEFORE_PURCHASE.has(String(stopAfter || '').trim().toLowerCase())
}
