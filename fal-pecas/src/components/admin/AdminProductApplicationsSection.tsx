import { ProductApplicationsEditor } from '@/components/admin/applications/ProductApplicationsEditor'

type Props = {
  productId: string
}

/** Aba Aplicações do cadastro — mesma UX da guia Adaptive (editor centrado no item). */
export function AdminProductApplicationsSection({ productId }: Props) {
  return <ProductApplicationsEditor productId={productId} variant="section" />
}
