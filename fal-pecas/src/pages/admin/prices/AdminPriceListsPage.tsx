import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  adminListPriceLists,
  adminUpsertPriceList,
  type PriceList,
  type PriceListScope,
  type PriceListStatus,
} from '@/services/admin/adminPriceListService'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

export function AdminPriceListsPage() {
  const [items, setItems] = useState<PriceList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<PriceList | null>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState<PriceListStatus>('draft')
  const [scope, setScope] = useState<PriceListScope>('public')
  const [priority, setPriority] = useState('0')
  const [isDefault, setIsDefault] = useState(false)
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      setItems(await adminListPriceLists())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar listas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  function startEdit(list: PriceList) {
    setEditing(list)
    setName(list.name)
    setStatus(list.status)
    setScope(list.scope)
    setPriority(String(list.priority))
    setIsDefault(list.isDefault)
    setValidFrom(list.validFrom ? list.validFrom.slice(0, 16) : '')
    setValidUntil(list.validUntil ? list.validUntil.slice(0, 16) : '')
  }

  function resetForm() {
    setEditing(null)
    setName('')
    setStatus('draft')
    setScope('public')
    setPriority('0')
    setIsDefault(false)
    setValidFrom('')
    setValidUntil('')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await adminUpsertPriceList({
        id: editing?.id,
        name,
        status,
        scope,
        priority: Number(priority) || 0,
        isDefault,
        validFrom: validFrom ? new Date(validFrom).toISOString() : null,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
        description: editing?.description,
        slug: editing?.slug,
      })
      resetForm()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar lista')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-fal-navy">Listas de preços</h1>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-[14px] border border-fal-line bg-white p-4 md:grid-cols-3"
      >
        <Input
          label={editing ? 'Editar lista' : 'Nova lista'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-fal-navy">Status</span>
          <select
            className="w-full rounded-[10px] border border-fal-line bg-white px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as PriceListStatus)}
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-fal-navy">Escopo</span>
          <select
            className="w-full rounded-[10px] border border-fal-line bg-white px-3 py-2"
            value={scope}
            onChange={(e) => setScope(e.target.value as PriceListScope)}
          >
            <option value="public">public</option>
            <option value="assigned">assigned</option>
          </select>
        </label>
        <Input
          label="Prioridade"
          type="number"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        />
        <Input
          label="Válida de"
          type="datetime-local"
          value={validFrom}
          onChange={(e) => setValidFrom(e.target.value)}
        />
        <Input
          label="Válida até"
          type="datetime-local"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy md:col-span-2">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          Lista padrão (fallback)
        </label>
        <div className="flex gap-2 md:col-span-3">
          <Button type="submit">{editing ? 'Salvar' : 'Criar lista'}</Button>
          {editing ? (
            <Button type="button" variant="light" onClick={resetForm}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <Loading label="Carregando listas…" /> : null}

      <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-fal-line bg-fal-bg text-fal-muted">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Prioridade</th>
              <th className="px-3 py-2">Itens</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((list) => (
              <tr key={list.id} className="border-b border-fal-line/70">
                <td className="px-3 py-2">
                  <div className="font-semibold text-fal-navy">{list.name}</div>
                  <div className="text-xs text-fal-muted">
                    {list.slug}
                    {list.isDefault ? ' · default' : ''}
                    {list.scope === 'assigned' ? ' · assigned' : ''}
                  </div>
                </td>
                <td className="px-3 py-2">{list.status}</td>
                <td className="px-3 py-2">{list.priority}</td>
                <td className="px-3 py-2">{list.itemCount ?? 0}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="text-sm font-semibold text-fal-navy underline"
                      to={`/admin/precos/${list.id}`}
                    >
                      Itens
                    </Link>
                    <button
                      type="button"
                      className="text-sm font-semibold text-fal-navy underline"
                      onClick={() => startEdit(list)}
                    >
                      Editar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
