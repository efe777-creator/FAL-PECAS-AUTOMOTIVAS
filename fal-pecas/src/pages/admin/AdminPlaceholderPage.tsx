import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function AdminPlaceholderPage({ title }: { title: string }) {
  useDocumentTitle(`${title} | Admin FAL`)
  return (
    <div className="rounded-[14px] border border-fal-line bg-white p-6">
      <h1 className="text-2xl font-extrabold text-fal-navy">{title}</h1>
      <p className="mt-2 text-fal-muted">
        Módulo listado no menu. A operação completa ainda não está disponível nesta tela.
      </p>
    </div>
  )
}
