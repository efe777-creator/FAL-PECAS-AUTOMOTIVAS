import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  adminListCategories,
  adminSetCategoryStatus,
  adminUpsertCategory,
} from '@/services/admin/adminCategoryService'
import type { Category } from '@/types'
import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'

export function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      setItems(await adminListCategories())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const roots = useMemo(() => items.filter((c) => !c.parentId), [items])
  const childrenOf = (id: string) => items.filter((c) => c.parentId === id)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await adminUpsertCategory({
        id: editing?.id,
        name,
        parentId: parentId || null,
        status: editing?.status ?? 'published',
        sortOrder: editing?.sortOrder ?? 0,
      })
      setName('')
      setParentId('')
      setEditing(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-fal-navy">Categorias</h1>
      <form onSubmit={onSubmit} className="grid gap-3 rounded-[14px] border border-fal-line bg-white p-4 md:grid-cols-3">
        <Input
          label={editing ? 'Editar categoria' : 'Nova categoria'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-fal-navy">Categoria pai</span>
          <select
            className="w-full rounded-[10px] border border-fal-line bg-white px-3 py-2"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">(raiz)</option>
            {roots.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit" variant="primary">
            {editing ? 'Salvar' : 'Criar'}
          </Button>
          {editing ? (
            <Button type="button" variant="light" onClick={() => { setEditing(null); setName(''); setParentId('') }}>
              Cancelar
            </Button>
          ) : null}
        </div>
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
            {roots.map((root) => (
              <Fragment key={root.id}>
                <tr className="border-t border-fal-line">
                  <td className="px-3 py-2 font-bold">{root.name}</td>
                  <td className="px-3 py-2 text-fal-muted">{root.slug}</td>
                  <td className="px-3 py-2">{root.status}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button type="button" className="text-fal-auth-link font-semibold" onClick={() => { setEditing(root); setName(root.name); setParentId(root.parentId ?? '') }}>Editar</button>
                    <button type="button" className="text-fal-muted font-semibold" onClick={() => void adminSetCategoryStatus(root.id, root.status === 'archived' ? 'published' : 'archived').then(reload)}>
                      {root.status === 'archived' ? 'Publicar' : 'Arquivar'}
                    </button>
                  </td>
                </tr>
                {childrenOf(root.id).map((child) => (
                  <tr key={child.id} className="border-t border-fal-line bg-fal-bg/40">
                    <td className="px-3 py-2 pl-8">↳ {child.name}</td>
                    <td className="px-3 py-2 text-fal-muted">{child.slug}</td>
                    <td className="px-3 py-2">{child.status}</td>
                    <td className="px-3 py-2 space-x-2">
                      <button type="button" className="text-fal-auth-link font-semibold" onClick={() => { setEditing(child); setName(child.name); setParentId(child.parentId ?? '') }}>Editar</button>
                      <button type="button" className="text-fal-muted font-semibold" onClick={() => void adminSetCategoryStatus(child.id, child.status === 'archived' ? 'published' : 'archived').then(reload)}>
                        {child.status === 'archived' ? 'Publicar' : 'Arquivar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
