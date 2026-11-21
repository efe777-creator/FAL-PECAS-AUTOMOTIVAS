import { Button } from '@/components/common/Button'
import { ButtonLink } from '@/components/common/ButtonLink'
import { Input } from '@/components/common/Input'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Container } from '@/components/layout/Container'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatCpfMask, isValidCpf, onlyDigits } from '@/lib/document'
import { parseOptionalUsername, usernameFieldHint } from '@/lib/accountUsername'
import {
  formatPhoneMask,
  isValidWhatsAppPhone,
  normalizePhone,
  whatsappPhoneFieldHint,
  whatsappPhoneInvalidMessage,
} from '@/lib/phone'
import {
  MIN_PASSWORD_LENGTH,
  passwordMismatchMessage,
  passwordRuleHint,
  passwordTooShortMessage,
} from '@/lib/authPassword'
import { toUserMessage } from '@/lib/toUserMessage'
import { resolveAuthReturnPath } from '@/services/plates/authReturnPath'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

export function RegisterPage() {
  useDocumentTitle('Criar conta | FAL Peças Automotivas')
  const { signUp, user, loading, isConfigured } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const fromState = (location.state as { from?: string } | null)?.from
  // Funil (checkout/catálogo/pending garagem) → volta; senão área da conta.
  const from = resolveAuthReturnPath(fromState, '/conta')
  const fromCheckout = Boolean(from.includes('/checkout'))
  const loginState = from !== '/conta' ? { from } : undefined

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false)

  function pushError(message: string) {
    setError(message)
    toast.push(message, 'error')
  }

  if (!loading && user) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD_LENGTH) {
      pushError(passwordTooShortMessage())
      return
    }
    if (password !== password2) {
      pushError(passwordMismatchMessage())
      return
    }
    if (!terms) {
      pushError('Aceite os termos para continuar.')
      return
    }
    const cpfDigits = onlyDigits(cpf)
    if (cpfDigits && !isValidCpf(cpfDigits)) {
      pushError('CPF inválido. Confira os 11 dígitos ou deixe em branco.')
      return
    }
    const phoneDigits = phone.trim() ? normalizePhone(phone) : ''
    if (phoneDigits && !isValidWhatsAppPhone(phoneDigits)) {
      pushError(whatsappPhoneInvalidMessage())
      return
    }
    let usernameClean: string | undefined
    try {
      usernameClean = parseOptionalUsername(username) ?? undefined
    } catch (err) {
      pushError(err instanceof Error ? err.message : 'Usuário inválido.')
      return
    }
    setSubmitting(true)
    try {
      const result = await signUp({
        email,
        password,
        firstName,
        lastName,
        username: usernameClean,
        phone: phoneDigits || undefined,
        cpf: cpfDigits || undefined,
      })
      if (!result.session) {
        setNeedsEmailConfirm(true)
        toast.push(
          fromCheckout
            ? 'Conta criada. Confirme o e-mail (ou o WhatsApp, se cadastrou) e entre para finalizar.'
            : phoneDigits
              ? 'Conta criada. Confirme por e-mail agora; WhatsApp entrará quando o envio estiver ativo.'
              : 'Conta criada. Sem WhatsApp no cadastro — confirme pelo e-mail para entrar.',
          'info',
        )
        return
      }
      navigate(from, { replace: true })
    } catch (err) {
      pushError(toUserMessage(err, 'Não foi possível criar a conta. Tente novamente.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (needsEmailConfirm) {
    return (
      <Container className="py-8">
        <div className="mx-auto max-w-[560px] rounded-fal border border-fal-line bg-fal-surface p-6 text-center sm:p-8">
          <h1 className="mt-0 text-[28px] font-black">Confirme seu e-mail</h1>
          <p className="text-fal-muted">
            Enviamos um link de confirmação para <strong>{email}</strong>. Abra o e-mail, confirme
            o cadastro e depois entre na sua conta
            {fromCheckout ? ' para retomar o checkout' : ''}.
          </p>
          <ButtonLink to="/login" state={loginState} variant="primary" className="mt-2">
            {fromCheckout ? 'Entrar e finalizar compra' : 'Ir para o login'}
          </ButtonLink>
        </div>
      </Container>
    )
  }

  return (
    <Container className="py-8">
      <div className="mx-auto grid max-w-[1050px] grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="py-4 lg:py-10">
          <h1 className="mt-0 text-[36px] leading-tight font-black lg:text-[44px]">
            {fromCheckout ? 'Quase lá — crie sua conta' : 'Crie sua conta FAL'}
          </h1>
          <p className="text-[17px] text-fal-muted">
            {fromCheckout
              ? 'Nome, e-mail e senha bastam. WhatsApp celular ajuda na confirmação; sem ele, validamos por e-mail.'
              : 'Nome, e-mail e senha bastam. Informe um celular WhatsApp válido para confirmação por mensagem — ou use só o e-mail.'}
          </p>
          {!isConfigured ? (
            <p className="mt-4 rounded-[10px] border border-fal-yellow-dark/50 bg-fal-yellow/30 p-3 text-sm">
              Cadastro indisponível no momento. Tente novamente mais tarde.
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-fal border border-fal-line bg-fal-surface">
          <div className="grid grid-cols-2 border-b border-fal-line">
            <Link
              to="/login"
              state={loginState}
              className="px-4 py-4 text-center font-extrabold hover:bg-fal-surface-2"
            >
              Entrar
            </Link>
            <span className="bg-fal-surface-2 px-4 py-4 text-center font-extrabold shadow-[inset_0_-3px_var(--fal-yellow)]">
              Criar conta grátis
            </span>
          </div>
          <form className="p-5 sm:p-7" onSubmit={onSubmit}>
            <h2 className="mt-0 text-xl font-extrabold">Criar conta</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Nome"
                name="firstName"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label="Sobrenome"
                name="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <div className="sm:col-span-2">
                <Input
                  label="E-mail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Input
                label="CPF (opcional)"
                name="cpf"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCpfMask(e.target.value))}
                hint={
                  fromCheckout
                    ? 'Pode deixar em branco — pediremos no checkout.'
                    : 'Opcional. Também pode informar no checkout.'
                }
              />
              <Input
                label="WhatsApp (celular)"
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                hint={whatsappPhoneFieldHint()}
              />
              <Input
                label="Usuário (opcional)"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                hint={usernameFieldHint()}
              />
              <PasswordInput
                label="Senha"
                name="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint={passwordRuleHint()}
                required
              />
              <PasswordInput
                label="Confirmar senha"
                name="password2"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
              />
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
              />
              <span>
                Li e aceito os{' '}
                <Link to="/termos" className="font-semibold text-fal-navy dark:text-fal-fg hover:underline">
                  termos de uso
                </Link>{' '}
                e a{' '}
                <Link to="/privacidade" className="font-semibold text-fal-navy dark:text-fal-fg hover:underline">
                  política de privacidade
                </Link>
                .
              </span>
            </label>
            {error ? (
              <p className="mt-3 text-sm text-fal-danger" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" fullWidth className="mt-4" disabled={submitting}>
              {submitting
                ? 'Criando…'
                : fromCheckout
                  ? 'Criar conta e continuar'
                  : 'Criar conta'}
            </Button>
          </form>
        </div>
      </div>
    </Container>
  )
}
