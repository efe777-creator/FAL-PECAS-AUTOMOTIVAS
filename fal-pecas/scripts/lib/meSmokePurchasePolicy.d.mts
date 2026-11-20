export type MeSmokePurchaseFlags = {
  sandbox?: boolean
  dryRun?: boolean
}

export function shouldAutoPurchaseMeLabel(
  flags?: MeSmokePurchaseFlags,
): boolean

export const STOP_AFTER_BEFORE_PURCHASE: Set<string>

export function stopAfterBlocksPurchase(stopAfter: string): boolean
