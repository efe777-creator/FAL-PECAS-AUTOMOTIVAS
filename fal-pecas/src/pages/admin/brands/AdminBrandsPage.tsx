import { AdminNamedEntityCrud } from '@/components/admin/AdminNamedEntityCrud'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { adminListBrands, adminSetBrandStatus, adminUpsertBrand } from '@/services/admin/adminBrandService'

export function AdminBrandsPage() {
  useDocumentTitle('Fabricantes | Admin FAL')
  return (
    <AdminNamedEntityCrud
      title="Fabricantes"
      description="Fabricante de peça (ex.: Nakata). Diferente de montadora e fornecedor."
      entityLabel="fabricante"
      emptyTitle="Nenhum fabricante encontrado"
      emptyDescription="Cadastre um fabricante de peça ou ajuste a busca."
      list={adminListBrands}
      upsert={adminUpsertBrand}
      setStatus={adminSetBrandStatus}
    />
  )
}
