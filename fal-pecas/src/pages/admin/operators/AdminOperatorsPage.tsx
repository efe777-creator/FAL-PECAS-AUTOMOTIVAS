import { Loading } from '@/components/common/Loading'
import { useAuth } from '@/contexts/AuthContext'
import { formatDateTime } from '@/lib/datetime'
import {
  ASSIGNABLE_ROLES,
  adminSearchUsers,
  adminSetUserRole,
  type AdminOperatorUserRow,
  type AssignableRole,
} from '@/services/admin/adminOperatorsService'
import { useState, type FormEvent } from 'react'

export function AdminOperatorsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'administrador'

  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<AdminOperatorUserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  async function search(e?: FormEvent) {
    e?.preventDefault()
    if (!isAdmin) return
    setError(null)
    setOkMsg(null)
    setLoading(true)
    setSearched(true)
    try {
      setRows(await adminSearchUsers(query))
    } catch (err) {
      setRows([])
      setError(err instanceof Error ? err.message : 'Erro ao pesquisar usuários')
    } finally {
      setLoading(false)
    }
  }

  async function onRoleChange(row: AdminOperatorUserRow, next: AssignableRole) {
    if (!isAdmin || next === row.role) return
    setError(null)
    setOkMsg(null)
    setSavingId(row.id)
    try {
      const updated = await adminSetUserRole(row.id, next)
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, role: updated.role, fullName: updated.fullName ?? r.fullName } : r,
        ),
      )
      setOkMsg(`Acesso atualizado: ${row.email ?? row.id} → ${next}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar acesso')
    } finally {
      setSavingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <p className="text-sm text-red-600">
        Sem permissão. Somente administrador gerencia acesso ao painel.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold text-fal-navy">Operadores</h1>
        <p className="mt-1 text-sm text-fal-muted">
          Pesquise usuários cadastrados e ative ou revogue acesso ao painel admin.
        </p>
      </header>

      <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm">
          <span className="mb-1 block font-semibold text-fal-navy">E-mail ou nome</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ex: lucas@…"
            className="w-full rounded-[10px] border border-fal-line bg-white px-3 py-2 text-fal-navy outline-none focus:border-fal-yellow"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-[10px] bg-fal-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {loading ? 'Buscando…' : 'Pesquisar'}
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {okMsg ? <p className="text-sm text-emerald-700">{okMsg}</p> : null}

      {loading ? <Loading label="Pesquisando usuários…" /> : null}

      {!loading && searched && rows.length === 0 ? (
        <p className="text-sm text-fal-muted">Nenhum usuário encontrado para essa busca.</p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-fal-line bg-fal-bg text-xs uppercase text-fal-muted">
              <tr>
                <th className="px-3 py-2">E-mail</th>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Desde</th>
                <th className="px-3 py-2">Acesso (role)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-fal-line last:border-0">
                  <td className="px-3 py-2 font-medium text-fal-navy">{r.email ?? '—'}</td>
                  <td className="px-3 py-2 text-fal-muted">{r.fullName ?? r.username ?? '—'}</td>
                  <td className="px-3 py-2 text-fal-muted">{formatDateTime(r.createdAt)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={r.role}
                      disabled={savingId === r.id}
                      onChange={(e) => void onRoleChange(r, e.target.value as AssignableRole)}
                      className="w-full max-w-[220px] rounded-[8px] border border-fal-line bg-white px-2 py-1.5 text-sm font-semibold text-fal-navy disabled:opacity-50"
                    >
                      {ASSIGNABLE_ROLES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
