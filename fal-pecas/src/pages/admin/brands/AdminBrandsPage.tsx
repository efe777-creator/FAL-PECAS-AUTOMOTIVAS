import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { adminListBrands, adminSetBrandStatus, adminUpsertBrand } from '@/services/admin/adminBrandService'
import type { ProductBrand } from '@/types'
import { useEffect, useState, type FormEvent } from 'react'

export function AdminBrandsPage() {
  const [items, setItems] = useState<ProductBrand[]>([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<ProductBrand | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    try {
      setItems(await adminListBrands())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await adminUpsertBrand({ id: editing?.id, name, status: editing?.status ?? 'active' })
      setName('')
      setEditing(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-fal-navy">Fabricantes</h1>
      <p className="text-sm text-fal-muted">Fabricante de peça (ex.: Nakata). Diferente de montadora e fornecedor.</p>
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 rounded-[14px] border border-fal-line bg-white p-4">
        <div className="min-w-[220px] flex-1">
          <Input label="Nome do fabricante" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <Button type="submit">{editing ? 'Salvar' : 'Criar'}</Button>
      </form>
      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {loading ? <Loading /> : null}
      <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-fal-bg text-fal-muted">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-t border-fal-line">
                <td className="px-3 py-2 font-semibold">{b.name}</td>
                <td className="px-3 py-2 text-fal-muted">{b.slug}</td>
                <td className="px-3 py-2">{b.status}</td>
                <td className="px-3 py-2 space-x-2">
                  <button type="button" className="font-semibold text-fal-auth-link" onClick={() => { setEditing(b); setName(b.name) }}>Editar</button>
                  <button type="button" className="font-semibold text-fal-muted" onClick={() => void adminSetBrandStatus(b.id, b.status === 'active' ? 'inactive' : 'active').then(reload)}>
                    {b.status === 'active' ? 'Inativar' : 'Ativar'}
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
