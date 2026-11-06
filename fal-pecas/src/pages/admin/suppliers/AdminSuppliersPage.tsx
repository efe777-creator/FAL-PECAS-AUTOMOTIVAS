import { AdminNamedEntityCrud } from '@/components/admin/AdminNamedEntityCrud'
import { Button } from '@/components/common/Button'
import {
  adminListSuppliers,
  adminSetSupplierStatus,
  adminUpsertSupplier,
} from '@/services/admin/adminSupplierService'
import { Link } from 'react-router-dom'

export function AdminSuppliersPage() {
  return (
    <AdminNamedEntityCrud
      title="Fornecedores"
      entityLabel="fornecedor"
      secondaryField="code"
      emptyTitle="Nenhum fornecedor cadastrado"
      emptyDescription="Crie o primeiro fornecedor para importar custos e conversões."
      headerActions={
        <>
          <Link to="/admin/fornecedores/importar-conversoes">
            <Button variant="light">Importar conversões</Button>
          </Link>
          <Link to="/admin/fornecedores/importar-custos">
            <Button variant="light">Importar custos</Button>
          </Link>
        </>
      }
      list={async () => {
        const rows = await adminListSuppliers()
        return rows.map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          code: s.code,
        }))
      }}
      upsert={adminUpsertSupplier}
      setStatus={adminSetSupplierStatus}
    />
  )
}
