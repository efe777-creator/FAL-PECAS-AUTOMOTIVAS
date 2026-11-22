/**
 * Camada fiscal evolutiva (#14).
 * Hoje: ManualFiscalProvider. Amanhã: FutureFiscalProvider (emissor).
 */

import {
  attachManualFiscalDocument,
  createFiscalDownloadUrl,
  getCurrentOrderFiscalDocument,
  listOrderFiscalDocuments,
} from '@/services/fiscal/ManualFiscalProvider'
import type { AttachFiscalInput, OrderFiscalDocument } from '@/services/fiscal/types'

export type FiscalProvider = {
  list(orderId: string): Promise<OrderFiscalDocument[]>
  getCurrent(orderId: string): Promise<OrderFiscalDocument | null>
  attachManual(input: AttachFiscalInput): Promise<OrderFiscalDocument>
  downloadUrl(storagePath: string): Promise<string>
}

const manualProvider: FiscalProvider = {
  list: listOrderFiscalDocuments,
  getCurrent: getCurrentOrderFiscalDocument,
  attachManual: attachManualFiscalDocument,
  downloadUrl: createFiscalDownloadUrl,
}

/** Provider ativo — trocar aqui quando houver emissor automático. */
export const fiscalDocumentService: FiscalProvider = manualProvider
