import { Link, useParams } from 'react-router-dom'

const copy: Record<string, { title: string; body: string }> = {
  'melhor-envio': {
    title: 'Melhor Envio',
    body: 'Conexão, credenciais e cotação (≠ contratação) exigem secrets + MARCHA. Não autorizado sob D-FRETE B sozinho.',
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

  return (
    <div className="space-y-4">
      <Link to="/admin/logistica" className="text-sm font-semibold text-fal-navy no-underline">
        ← Logística
      </Link>
      <h1 className="mt-0 text-[28px] font-extrabold text-fal-navy">{meta.title}</h1>
      <p className="rounded-[14px] border border-fal-line bg-white p-5 text-sm text-fal-muted">
        {meta.body}
      </p>
    </div>
  )
}
