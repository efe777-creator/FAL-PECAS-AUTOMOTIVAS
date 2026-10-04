import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useAuth } from '@/contexts/AuthContext'
import {
  formatCnpjMask,
  formatCpfMask,
  isValidCnpj,
  isValidCpf,
  onlyDigits,
} from '@/lib/document'
import { formatPhoneMask, isValidPhone, normalizePhone } from '@/lib/phone'
import { getCustomerProfile, updateCustomerProfile } from '@/services/customers/customerService'
import { useEffect, useState, type FormEvent } from 'react'

export function AccountProfilePage() {
  const { user, session } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    void (async () => {
      setLoading(true)
      try {
        const { profile } = await getCustomerProfile(user.id)
        setFullName(profile.fullName ?? '')
        setPhone(profile.phone ? formatPhoneMask(profile.phone) : '')
        setCpf(profile.cpf ? formatCpfMask(profile.cpf) : '')
        setCnpj(profile.cnpj ? formatCnpjMask(profile.cnpj) : '')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar perfil')
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setMessage(null)

    const phoneDigits = phone.trim() ? normalizePhone(phone) : ''
    if (phoneDigits && !isValidPhone(phoneDigits)) {
      setError('Telefone inválido. Use DDD + número (10 ou 11 dígitos).')
      return
    }

    const cpfDigits = cpf.trim() ? onlyDigits(cpf) : ''
    const cnpjDigits = cnpj.trim() ? onlyDigits(cnpj) : ''
    if (cpfDigits && cnpjDigits) {
      setError('Informe CPF ou CNPJ, não ambos.')
      return
    }
    if (cpfDigits && !isValidCpf(cpfDigits)) {
      setError('CPF inválido.')
      return
    }
    if (cnpjDigits && !isValidCnpj(cnpjDigits)) {
      setError('CNPJ inválido.')
      return
    }

    setSaving(true)
    try {
      await updateCustomerProfile({
        userId: user.id,
        fullName,
        phone: phoneDigits || null,
        cpf: cpfDigits || null,
        cnpj: cnpjDigits || null,
      })
      setMessage('Dados salvos com sucesso.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading label="Carregando perfil…" />

  return (
    <div className="rounded-fal border border-fal-line bg-white p-5">
      <h2 className="mt-0 text-xl font-extrabold">Perfil</h2>
      <p className="text-sm text-fal-muted">E-mail vinculado à autenticação. Role não é editável.</p>
      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-fal-navy">{message}</p> : null}
      <form onSubmit={onSubmit} className="mt-4 grid max-w-xl gap-3">
        <Input label="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Input label="E-mail" value={session?.user?.email ?? user?.email ?? ''} disabled />
        <Input
          label="Telefone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          value={phone}
          onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
        />
        <Input
          label="CPF (opcional)"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(formatCpfMask(e.target.value))}
        />
        <Input
          label="CNPJ (opcional)"
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
          value={cnpj}
          onChange={(e) => setCnpj(formatCnpjMask(e.target.value))}
        />
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </form>
    </div>
  )
}
