import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useParams } from 'react-router-dom'

const copy: Record<string, { title: string; body: string }> = {
  'melhor-envio': {
    title: 'Melhor Envio',
    body: 'Conexão e credenciais ficam no servidor. Cotação na loja não compra etiqueta — isso só na Expedição do pedido.',
  },
  configuracoes: {
    title: 'Configurações de envio',
    body: 'Regras gerais, bloqueio por medidas ausentes e comportamento de cotação — pendências do plano funcional.',
  },
}

export function AdminLogisticsPlaceholderPage() {
  const { slug } = useParams<{ slug: string }>()
  const meta = (slug && copy[slug]) || {
    title: 'Logística',
    body: 'Módulo ainda não implementado.',
  }
  useDocumentTitle(`${meta.title} | Admin FAL`)

  return (
    <div className="space-y-4">
      <h1 className="mt-0 text-[28px] font-extrabold text-fal-navy">{meta.title}</h1>
      <p className="rounded-[14px] border border-fal-line bg-white p-5 text-sm text-fal-muted">
        {meta.body}
      </p>
    </div>
  )
}
