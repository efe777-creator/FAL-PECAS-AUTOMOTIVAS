import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { productStatusLabel } from '@/lib/adminLabels'
import { adminListProducts, adminSetProductStatus } from '@/services/admin/adminProductService'
import type { Product } from '@/types'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([])
  const [q, setQ] = useState('')
  const [withoutImage, setWithoutImage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    try {
      setItems(await adminListProducts({ q, withoutImage }))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao listar produtos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [withoutImage])

  async function toggleArchive(p: Product) {
    const next = p.status === 'archived' ? 'published' : 'archived'
    if (next === 'archived') {
      const ok = window.confirm(
        `Remover "${p.name}" do catálogo público?\n\nO produto será arquivado (permanece no banco; some da loja e da busca).`,
      )
      if (!ok) return
    }
    setMessage(null)
    setError(null)
    try {
      await adminSetProductStatus(p.id, next)
      setMessage(next === 'archived' ? 'Produto arquivado e removido da loja.' : 'Produto publicado novamente.')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao alterar status')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fal-navy">Produtos</h1>
          <p className="mt-1 text-sm text-fal-muted">
            Arquivar = remoção comercial da loja. Exclusão permanente não é usada (integridade).
          </p>
        </div>
        <Link to="/admin/produtos/novo">
          <Button variant="primary">Novo produto</Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-[14px] border border-fal-line bg-white p-4">
        <div className="min-w-[220px] flex-1">
          <Input label="Buscar (nome/SKU)" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-fal-navy">
          <input type="checkbox" checked={withoutImage} onChange={(e) => setWithoutImage(e.target.checked)} />
          Sem imagem / incompletos
        </label>
        <Button type="button" variant="light" onClick={() => void reload()}>
          Filtrar
        </Button>
      </div>

      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-fal-navy">{message}</p> : null}
      {loading ? <Loading /> : null}

      <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-fal-bg text-fal-muted">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Preço</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-fal-muted">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : null}
            {items.map((p) => (
              <tr key={p.id} className="border-t border-fal-line">
                <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                <td className="px-3 py-2 font-semibold">
                  {p.name}
                  {p.isIncomplete ? (
                    <span className="ml-2 text-xs font-bold text-fal-yellow-dark">INCOMPLETO</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">{productStatusLabel(p.status)}</td>
                <td className="px-3 py-2">
                  {p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-3 py-2 space-x-2">
                  <Link className="font-semibold text-fal-auth-link" to={`/admin/produtos/${p.id}`}>
                    Editar
                  </Link>
                  <button type="button" className="font-semibold text-fal-muted" onClick={() => void toggleArchive(p)}>
                    {p.status === 'archived' ? 'Publicar' : 'Arquivar (remover da loja)'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
