import { AdminNamedEntityCrud } from '@/components/admin/AdminNamedEntityCrud'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  adminListManufacturers,
  adminSetManufacturerStatus,
  adminUpsertManufacturer,
} from '@/services/admin/adminManufacturerService'

export function AdminManufacturersPage() {
  useDocumentTitle('Montadoras | Admin FAL')
  return (
    <AdminNamedEntityCrud
      title="Montadoras"
      description="Cadastro de montadora (veículo). Não confundir com fabricante de peça."
      entityLabel="montadora"
      emptyTitle="Nenhuma montadora encontrada"
      emptyDescription="Cadastre uma montadora ou ajuste a busca."
      list={adminListManufacturers}
      upsert={adminUpsertManufacturer}
      setStatus={adminSetManufacturerStatus}
    />
  )
}
