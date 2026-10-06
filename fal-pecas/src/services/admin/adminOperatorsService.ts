import { getSupabase } from '@/lib/supabase'
import type { UserRole } from '@/types'

export type AssignableRole = UserRole

export const ASSIGNABLE_ROLES: { value: AssignableRole; label: string }[] = [
  { value: 'customer', label: 'Cliente (sem admin)' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'operador', label: 'Operador' },
  { value: 'estoque', label: 'Estoque' },
  { value: 'atendimento', label: 'Atendimento' },
]

export interface AdminOperatorUserRow {
  id: string
  email: string | null
  fullName: string | null
  username: string | null
  role: UserRole
  createdAt: string
}

export async function adminSearchUsers(query: string): Promise<AdminOperatorUserRow[]> {
  const { data, error } = await getSupabase().rpc('admin_search_users', {
    p_query: query.trim(),
  })
  if (error) throw error

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    email: r.email != null ? String(r.email) : null,
    fullName: r.full_name != null ? String(r.full_name) : null,
    username: r.username != null ? String(r.username) : null,
    role: r.role as UserRole,
    createdAt: String(r.created_at),
  }))
}

export async function adminSetUserRole(
  userId: string,
  role: AssignableRole,
): Promise<AdminOperatorUserRow> {
  const { data, error } = await getSupabase().rpc('admin_set_user_role', {
    p_user_id: userId,
    p_role: role,
  })
  if (error) throw error
  if (!data) throw new Error('Resposta vazia ao alterar role')

  const row = data as Record<string, unknown>
  return {
    id: String(row.id),
    email: null,
    fullName: row.full_name != null ? String(row.full_name) : null,
    username: row.username != null ? String(row.username) : null,
    role: row.role as UserRole,
    createdAt: String(row.created_at),
  }
}
