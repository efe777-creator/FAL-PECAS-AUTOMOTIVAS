import { Button } from '@/components/common/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PriceImportWizard } from '@/pages/admin/prices/PriceImportWizard'
import { useState } from 'react'
import { Link } from 'react-router-dom'

function canImport(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

/** Rota clássica de custo — mesmo assistente das listas, modo só-custo. */
export function AdminSupplierCostImportPage() {
  useDocumentTitle('Importar custos | Admin FAL')
  const { user } = useAuth()
  const allowed = canImport(user?.role)
  const [open, setOpen] = useState(true)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="mt-0 text-2xl font-extrabold text-fal-navy">Importar custos</h1>
        <p className="mt-1 text-sm text-fal-muted">
          Formato: <code className="rounded bg-fal-bg px-1">codigo_fornecedor;custo</code>. Atualiza
          o custo base no fornecedor (exige conversão prévia). Preços de venda não são
          recalculados aqui. Para custo + lista de preços, use o assistente em{' '}
          <Link className="font-semibold underline" to="/admin/precos">
            Listas de preços
          </Link>
          .
        </p>
      </div>

      {!allowed ? (
        <p className="rounded-[14px] border border-fal-danger/40 bg-red-50 p-4 text-sm text-fal-danger">
          Somente administrador ou gerente podem importar custos.
        </p>
      ) : (
        <div className="rounded-[14px] border border-fal-line bg-white p-4">
          <p className="m-0 text-sm text-fal-muted">
            O assistente unificado abre automaticamente. Se fechou, use o botão abaixo.
          </p>
          <Button type="button" className="mt-3" onClick={() => setOpen(true)}>
            Abrir assistente de importação
          </Button>
        </div>
      )}

      <PriceImportWizard
        open={open && allowed}
        onClose={() => setOpen(false)}
        allowed={allowed}
        createdBy={user?.id ?? null}
        initialSheetKind="supplier_cost"
        lockSheetKind
        costOnly
      />
    </div>
  )
}
