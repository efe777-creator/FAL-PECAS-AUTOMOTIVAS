import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { PasswordInput } from '@/components/common/PasswordInput'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  formatCnpjMask,
  formatCpfMask,
  isValidCnpj,
  isValidCpf,
  onlyDigits,
} from '@/lib/document'
import {
  formatPhoneMask,
  isValidWhatsAppPhone,
  normalizePhone,
  whatsappPhoneFieldHint,
  whatsappPhoneInvalidMessage,
} from '@/lib/phone'
import { parseOptionalUsername, usernameFieldHint } from '@/lib/accountUsername'
import {
  MIN_PASSWORD_LENGTH,
  passwordMismatchMessage,
  passwordRuleHint,
  passwordTooShortMessage,
} from '@/lib/authPassword'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import { requestAccountDeletion } from '@/services/customers/accountDeletionService'
import { getCustomerProfile, updateCustomerProfile } from '@/services/customers/customerService'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

export function AccountProfilePage() {
  useDocumentTitle('Perfil | FAL Peças Automotivas')
  const toast = useToast()
  const { user, session, signOut, refreshUser, changePassword, updateEmail } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  function pushError(message: string) {
    setError(message)
    toast.push(message, 'error')
  }

  function pushOk(message: string) {
    setError(null)
    toast.push(message, 'success')
  }

  useEffect(() => {
    if (!user) return
    void (async () => {
      setLoading(true)
      try {
        const { profile } = await getCustomerProfile(user.id)
        setFullName(profile.fullName ?? '')
        setUsername(profile.username ?? '')
        setPhone(profile.phone ? formatPhoneMask(profile.phone) : '')
        setCpf(profile.cpf ? formatCpfMask(profile.cpf) : '')
        setCnpj(profile.cnpj ? formatCnpjMask(profile.cnpj) : '')
        setError(null)
      } catch (e) {
        pushError(toUserMessage(e, 'Erro ao carregar perfil'))
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- user identity
  }, [user])

  async function onSubmitProfile(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)

    const phoneDigits = phone.trim() ? normalizePhone(phone) : ''
    if (phoneDigits && !isValidWhatsAppPhone(phoneDigits)) {
      pushError(whatsappPhoneInvalidMessage())
      return
    }

    const cpfDigits = cpf.trim() ? onlyDigits(cpf) : ''
    const cnpjDigits = cnpj.trim() ? onlyDigits(cnpj) : ''
    if (cpfDigits && cnpjDigits) {
      pushError('Informe CPF ou CNPJ, não ambos.')
      return
    }
    if (cpfDigits && !isValidCpf(cpfDigits)) {
      pushError('CPF inválido.')
      return
    }
    if (cnpjDigits && !isValidCnpj(cnpjDigits)) {
      pushError('CNPJ inválido.')
      return
    }

    let usernameClean: string | null
    try {
      usernameClean = parseOptionalUsername(username)
    } catch (err) {
      pushError(err instanceof Error ? err.message : 'Usuário inválido.')
      return
    }

    setSaving(true)
    try {
      await updateCustomerProfile({
        userId: user.id,
        fullName,
        username: usernameClean,
        phone: phoneDigits || null,
        cpf: cpfDigits || null,
        cnpj: cnpjDigits || null,
      })
      await refreshUser()
      pushOk('Dados salvos com sucesso.')
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao salvar'))
    } finally {
      setSaving(false)
    }
  }

  async function onSubmitEmail(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = newEmail.trim().toLowerCase()
    if (!trimmed.includes('@')) {
      pushError('Informe um e-mail válido.')
      return
    }
    if (!emailPassword) {
      pushError('Informe sua senha atual para trocar o e-mail.')
      return
    }
    setEmailSaving(true)
    try {
      await updateEmail({ newEmail: trimmed, currentPassword: emailPassword })
      setNewEmail('')
      setEmailPassword('')
      pushOk('Enviamos um link para o novo e-mail. Confirme para concluir a troca.')
    } catch (err) {
      pushError(toUserMessage(err, 'Não foi possível solicitar a troca de e-mail'))
    } finally {
      setEmailSaving(false)
    }
  }

  async function onSubmitPassword(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      pushError(passwordTooShortMessage())
      return
    }
    if (newPassword !== confirmPassword) {
      pushError(passwordMismatchMessage())
      return
    }
    if (!currentPassword) {
      pushError('Informe a senha atual.')
      return
    }
    setPasswordSaving(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      pushOk('Senha alterada com sucesso.')
    } catch (err) {
      pushError(toUserMessage(err, 'Não foi possível alterar a senha'))
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) return <Loading label="Carregando perfil…" />

  const currentEmail = session?.user?.email ?? user?.email ?? ''
  const busy = saving || deleting || emailSaving || passwordSaving

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="rounded-fal border border-fal-line bg-fal-surface p-4 sm:p-5">
        <h2 className="mt-0 text-lg font-extrabold sm:text-xl">Dados pessoais</h2>
        <p className="text-sm text-fal-muted">Nome, usuário e documentos da conta.</p>
        {error ? (
          <p className="mt-2 text-sm text-fal-danger" role="alert">
            {error}
          </p>
        ) : null}
        <form onSubmit={onSubmitProfile} className="mt-4 grid max-w-xl gap-3">
          <Input
            label="Nome completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Usuário"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            hint={usernameFieldHint()}
          />
          <Input
            label="WhatsApp (celular)"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
            hint={whatsappPhoneFieldHint()}
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
          <Button type="submit" fullWidth className="sm:w-auto" disabled={busy}>
            {saving ? 'Salvando…' : 'Salvar dados'}
          </Button>
        </form>
      </div>

      <div className="rounded-fal border border-fal-line bg-fal-surface p-4 sm:p-5">
        <h2 className="mt-0 text-lg font-extrabold sm:text-xl">E-mail</h2>
        <p className="text-sm text-fal-muted">
          E-mail atual: <strong className="text-fal-fg">{currentEmail || '—'}</strong>
        </p>
        {user?.emailChangePending ? (
          <p className="mt-2 rounded-[10px] border border-fal-yellow-dark/40 bg-fal-yellow/15 p-3 text-sm">
            Pendente: confira a caixa de <strong>{user.emailChangePending}</strong> e clique no
            link. O e-mail atual continua ativo até a confirmação.
          </p>
        ) : null}
        <form onSubmit={onSubmitEmail} className="mt-4 grid max-w-xl gap-3">
          <Input
            label="Novo e-mail"
            type="email"
            name="newEmail"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <PasswordInput
            label="Senha atual"
            name="emailCurrentPassword"
            autoComplete="current-password"
            value={emailPassword}
            onChange={(e) => setEmailPassword(e.target.value)}
            required
          />
          <Button type="submit" fullWidth className="sm:w-auto" disabled={busy}>
            {emailSaving ? 'Enviando…' : 'Trocar e-mail'}
          </Button>
        </form>
      </div>

      <div className="rounded-fal border border-fal-line bg-fal-surface p-4 sm:p-5">
        <h2 className="mt-0 text-lg font-extrabold sm:text-xl">Senha</h2>
        <p className="text-sm text-fal-muted">Altere a senha da conta.</p>
        <form onSubmit={onSubmitPassword} className="mt-4 grid max-w-xl gap-3">
          <PasswordInput
            label="Senha atual"
            name="currentPassword"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <PasswordInput
            label="Nova senha"
            name="newPassword"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint={passwordRuleHint()}
            required
          />
          <PasswordInput
            label="Confirmar nova senha"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" fullWidth className="sm:w-auto" disabled={busy}>
            {passwordSaving ? 'Alterando…' : 'Alterar senha'}
          </Button>
        </form>
      </div>

      <div className="rounded-fal border border-fal-line bg-fal-surface p-4 sm:p-5">
        <h3 className="m-0 text-base font-extrabold text-fal-fg">Encerrar conta</h3>
        <p className="mt-1 text-sm text-fal-muted">
          Seus pedidos e histórico comercial são preservados. Dados pessoais de cadastro são
          removidos. Esta ação não pode ser desfeita por você.
        </p>
        <button
          type="button"
          disabled={busy}
          className="mt-3 min-h-11 w-full rounded-[10px] border border-fal-danger px-4 py-2 text-sm font-bold text-fal-danger hover:bg-red-50 disabled:opacity-50 sm:w-auto"
          onClick={() => {
            void (async () => {
              const { confirmed } = await confirmDialog({
                title: 'Encerrar conta?',
                message:
                  'Pedidos antigos continuam no sistema da loja, mas seus dados de cadastro serão anonimizados.',
                confirmLabel: 'Encerrar conta',
                danger: true,
              })
              if (!confirmed) return
              setDeleting(true)
              setError(null)
              try {
                await requestAccountDeletion()
                await signOut()
                navigate('/', { replace: true })
              } catch (err) {
                pushError(toUserMessage(err, 'Não foi possível encerrar a conta'))
              } finally {
                setDeleting(false)
              }
            })()
          }}
        >
          {deleting ? 'Encerrando…' : 'Encerrar minha conta'}
        </button>
      </div>
    </div>
  )
}
