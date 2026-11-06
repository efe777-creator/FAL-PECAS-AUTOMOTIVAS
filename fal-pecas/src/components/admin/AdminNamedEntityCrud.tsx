import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { entityStatusLabel } from '@/lib/adminLabels'
import type { EntityStatus } from '@/types'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'

export type NamedEntityRow = {
  id: string
  name: string
  status: EntityStatus
  /** Fabricante/montadora */
  slug?: string
  /** Fornecedor */
  code?: string | null
}

type Props = {
  title: string
  description?: string
  /** Singular, ex.: fabricante / montadora / fornecedor */
  entityLabel: string
  emptyTitle: string
  emptyDescription: string
  /** Coluna secundária: slug (padrão) ou código */
  secondaryField?: 'slug' | 'code'
  headerActions?: ReactNode
  list: () => Promise<NamedEntityRow[]>
  upsert: (input: {
    id?: string
    name: string
    status?: EntityStatus
    code?: string | null
  }) => Promise<unknown>
  setStatus: (id: string, status: EntityStatus) => Promise<unknown>
}

/** CRUD compartilhado Fabricantes / Montadoras / Fornecedores. */
export function AdminNamedEntityCrud({
  title,
  description,
  entityLabel,
  emptyTitle,
  emptyDescription,
  secondaryField = 'slug',
  headerActions,
  list,
  upsert,
  setStatus,
}: Props) {
  const toast = useToast()
  const [items, setItems] = useState<NamedEntityRow[]>([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [editing, setEditing] = useState<NamedEntityRow | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  function pushError(msg: string) {
    setError(msg)
    toast.push(msg, 'error')
  }

  async function reload() {
    setLoading(true)
    try {
      setItems(await list())
      setError(null)
    } catch (e) {
      pushError(e instanceof Error ? e.message : `Erro ao carregar ${entityLabel}s`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((row) => {
      if (row.name.toLowerCase().includes(q)) return true
      if ((row.slug ?? '').toLowerCase().includes(q)) return true
      if ((row.code ?? '').toLowerCase().includes(q)) return true
      return false
    })
  }, [items, search])

  function startEdit(row: NamedEntityRow) {
    setEditing(row)
    setName(row.name)
    setCode(row.code ?? '')
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
  }

  function cancelEdit() {
    setEditing(null)
    setName('')
    setCode('')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await upsert({
        id: editing?.id,
        name,
        status: editing?.status ?? 'active',
        ...(secondaryField === 'code' ? { code: code || null } : {}),
      })
      setName('')
      setCode('')
      setEditing(null)
      await reload()
      toast.push(editing ? `${entityLabel} atualizado(a).` : `${entityLabel} criado(a).`, 'success')
    } catch (err) {
      pushError(err instanceof Error ? err.message : `Falha ao salvar ${entityLabel}`)
    }
  }

  async function onToggleStatus(row: NamedEntityRow) {
    const next: EntityStatus = row.status === 'active' ? 'inactive' : 'active'
    try {
      await setStatus(row.id, next)
      await reload()
      toast.push(
        next === 'active' ? `${entityLabel} ativado(a).` : `${entityLabel} inativado(a).`,
        'success',
      )
    } catch (err) {
      pushError(err instanceof Error ? err.message : `Falha ao alterar status`)
    }
  }

  const createLabel = editing
    ? `Editar ${entityLabel}`
    : entityLabel.endsWith('a')
      ? `Nova ${entityLabel}`
      : `Novo ${entityLabel}`

  const secondaryHeader = secondaryField === 'code' ? 'Código' : 'Slug'
  const searchHint = secondaryField === 'code' ? 'Nome ou código…' : 'Nome ou slug…'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fal-navy">{title}</h1>
          {description ? <p className="mt-1 text-sm text-fal-muted">{description}</p> : null}
        </div>
        {headerActions ? <div className="flex flex-wrap gap-2">{headerActions}</div> : null}
      </div>
      <form
        ref={formRef}
        onSubmit={(e) => void onSubmit(e)}
        className={`flex flex-wrap items-end gap-3 rounded-[14px] border bg-white p-4 ${
          editing ? 'border-fal-yellow-dark ring-2 ring-fal-yellow/40' : 'border-fal-line'
        }`}
      >
        <div className="min-w-[220px] flex-1">
          <Input
            ref={nameInputRef}
            label={createLabel}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        {secondaryField === 'code' ? (
          <div className="min-w-[140px]">
            <Input label="Código" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
        ) : null}
        <Button type="submit" variant="primary">
          {editing ? 'Salvar' : 'Criar'}
        </Button>
        {editing ? (
          <Button type="button" variant="light" onClick={cancelEdit}>
            Cancelar
          </Button>
        ) : null}
      </form>
      <Input
        label={`Buscar ${entityLabel}`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={searchHint}
      />
      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {loading ? <Loading /> : null}
      <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-fal-bg text-fal-muted">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">{secondaryHeader}</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t border-fal-line ${
                    editing?.id === row.id ? 'bg-fal-yellow/20' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-semibold">{row.name}</td>
                  <td className="px-3 py-2 text-fal-muted">
                    {secondaryField === 'code' ? (row.code ?? '—') : (row.slug ?? '—')}
                  </td>
                  <td className="px-3 py-2">{entityStatusLabel(row.status)}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      type="button"
                      className="font-semibold text-fal-auth-link"
                      onClick={() => startEdit(row)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="font-semibold text-fal-muted"
                      onClick={() => void onToggleStatus(row)}
                    >
                      {row.status === 'active' ? 'Inativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
