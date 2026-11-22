import { getSupabase } from '@/lib/supabase'
import type { AttachFiscalInput, OrderFiscalDocument } from '@/services/fiscal/types'

export const ORDER_FISCAL_BUCKET = 'order-fiscal-documents'

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

const MAX_BYTES = 10 * 1024 * 1024

function mapRow(row: Record<string, unknown>): OrderFiscalDocument {
  const source = row.source === 'issuer' ? 'issuer' : 'manual'
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    documentNumber: row.document_number != null ? String(row.document_number) : null,
    issuedAt: row.issued_at != null ? String(row.issued_at) : null,
    storagePath: String(row.storage_path),
    mimeType: row.mime_type != null ? String(row.mime_type) : null,
    fileName: row.file_name != null ? String(row.file_name) : null,
    source,
    isCurrent: Boolean(row.is_current),
    createdAt: String(row.created_at),
  }
}

export async function listOrderFiscalDocuments(
  orderId: string,
): Promise<OrderFiscalDocument[]> {
  const { data, error } = await getSupabase()
    .from('order_fiscal_documents')
    .select(
      'id, order_id, document_number, issued_at, storage_path, mime_type, file_name, source, is_current, created_at',
    )
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
}

export async function getCurrentOrderFiscalDocument(
  orderId: string,
): Promise<OrderFiscalDocument | null> {
  const { data, error } = await getSupabase()
    .from('order_fiscal_documents')
    .select(
      'id, order_id, document_number, issued_at, storage_path, mime_type, file_name, source, is_current, created_at',
    )
    .eq('order_id', orderId)
    .eq('is_current', true)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return mapRow(data as Record<string, unknown>)
}

export async function createFiscalDownloadUrl(
  storagePath: string,
  expiresSec = 120,
): Promise<string> {
  const { data, error } = await getSupabase()
    .storage.from(ORDER_FISCAL_BUCKET)
    .createSignedUrl(storagePath, expiresSec)
  if (error) throw error
  if (!data?.signedUrl) throw new Error('URL do documento indisponível.')
  return data.signedUrl
}

export async function attachManualFiscalDocument(
  input: AttachFiscalInput,
): Promise<OrderFiscalDocument> {
  const file = input.file
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error('Envie PDF, JPG, PNG ou WEBP.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Arquivo acima de 10 MB.')
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'nf.pdf'
  const path = `${input.orderId}/${crypto.randomUUID()}-${safeName}`

  const { error: upErr } = await getSupabase()
    .storage.from(ORDER_FISCAL_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (upErr) throw upErr

  const { data: id, error: rpcErr } = await getSupabase().rpc(
    'admin_attach_order_fiscal_document',
    {
      p_order_id: input.orderId,
      p_storage_path: path,
      p_document_number: input.documentNumber?.trim() || null,
      p_issued_at: input.issuedAt?.trim() || null,
      p_mime_type: file.type,
      p_file_name: file.name.slice(0, 180),
    },
  )
  if (rpcErr) throw rpcErr

  const docs = await listOrderFiscalDocuments(input.orderId)
  const created = docs.find((d) => d.id === String(id)) ?? docs[0]
  if (!created) throw new Error('Documento anexado, mas não foi possível recarregar.')
  return created
}
