import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { SKU_FAL_LABEL } from '@/lib/productLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminFindProductIdBySku,
  adminRemoveApplicationsBulk,
  type AdminApplicationRow,
} from '@/services/admin/adminApplicationService'
import { useState } from 'react'

export type ApplicationGuideMode = 'create' | 'bulk'

type Props = {
  mode: ApplicationGuideMode
  selectedRows: AdminApplicationRow[]
  onClose: () => void
  onMutated: (opts?: { focusSku?: string }) => void
  /** Após resolver SKU, abre a guia centrada no produto. */
  onOpenProduct: (productId: string, sku: string) => void
}

/**
 * Superfície contextual do hub Aplicações (Adaptive).
 * create = resolver SKU → guia do item; bulk = exclusão em lote.
 * Edição de vínculos: ProductApplicationsEditor.
 */
export function ApplicationWorkSurface({
  mode,
  selectedRows,
  onClose,
  onMutated,
  onOpenProduct,
}: Props) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [createSku, setCreateSku] = useState('')

  async function deleteBulk() {
    if (!selectedRows.length) return
    const { confirmed } = await confirmDialog({
      title: 'Excluir aplicações?',
      message: `Excluir ${selectedRows.length} aplicação(ões)?`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!confirmed) return
    setBusy(true)
    try {
      const n = await adminRemoveApplicationsBulk(selectedRows.map((r) => r.id))
      toast.push(`${n} aplicação(ões) excluída(s).`, 'success')
      onClose()
      onMutated()
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao excluir seleção'), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onResolveSku() {
    const sku = createSku.trim()
    if (!sku) {
      toast.push(`Informe o ${SKU_FAL_LABEL.toLowerCase()} do produto`, 'error')
      return
    }
    setBusy(true)
    try {
      const productId = await adminFindProductIdBySku(sku)
      if (!productId) {
        toast.push(`Produto não encontrado: ${sku}`, 'error')
        return
      }
      onOpenProduct(productId, sku)
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao buscar produto'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3" data-application-ops-density="compact">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line pb-2">
        <p className="m-0 text-xs font-semibold text-fal-muted">
          {mode === 'create'
            ? 'Nova aplicação na guia'
            : `Lote · ${selectedRows.length} selecionada(s)`}
        </p>
        <button
          type="button"
          className="text-xs font-semibold text-fal-muted underline"
          onClick={onClose}
        >
          Fechar guia
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto fal-admin-scroll">
        {mode === 'create' ? (
          <section className="space-y-3 rounded-[12px] border border-fal-line bg-fal-surface p-3">
            <p className="m-0 text-xs text-fal-muted">
              Informe o {SKU_FAL_LABEL} para abrir a guia do item e vincular quantos veículos
              quiser (fila multi-montadora).
            </p>
            <Input
              label={SKU_FAL_LABEL}
              value={createSku}
              onChange={(e) => setCreateSku(e.target.value)}
              placeholder="Código do produto"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void onResolveSku()
                }
              }}
            />
            <Button type="button" disabled={busy || !createSku.trim()} onClick={() => void onResolveSku()}>
              {busy ? 'Abrindo…' : 'Abrir guia do item'}
            </Button>
          </section>
        ) : null}

        {mode === 'bulk' ? (
          <section className="space-y-3 rounded-[12px] border border-fal-line bg-fal-surface p-3">
            <p className="m-0 text-sm text-fal-fg">
              {selectedRows.length} aplicação(ões) selecionada(s) na lista.
            </p>
            <ul className="m-0 max-h-40 list-none space-y-1 overflow-y-auto p-0 text-xs text-fal-muted">
              {selectedRows.slice(0, 20).map((r) => (
                <li key={r.id}>
                  {r.productSku} · {r.makerName} {r.modelName}
                </li>
              ))}
              {selectedRows.length > 20 ? (
                <li>… e mais {selectedRows.length - 20}</li>
              ) : null}
            </ul>
            <Button type="button" variant="danger" disabled={busy} onClick={() => void deleteBulk()}>
              {busy ? 'Excluindo…' : 'Excluir seleção'}
            </Button>
          </section>
        ) : null}
      </div>
    </div>
  )
}
