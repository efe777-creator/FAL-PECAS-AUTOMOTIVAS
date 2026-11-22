export type FiscalDocumentSource = 'manual' | 'issuer'

export type OrderFiscalDocument = {
  id: string
  orderId: string
  documentNumber: string | null
  issuedAt: string | null
  storagePath: string
  mimeType: string | null
  fileName: string | null
  source: FiscalDocumentSource
  isCurrent: boolean
  createdAt: string
}

export type AttachFiscalInput = {
  orderId: string
  file: File
  documentNumber?: string | null
  issuedAt?: string | null
}
