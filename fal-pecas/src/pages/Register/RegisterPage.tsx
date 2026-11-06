import { Button } from '@/components/common/Button'
import { ButtonLink } from '@/components/common/ButtonLink'
import { Input } from '@/components/common/Input'
import { Container } from '@/components/layout/Container'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatCpfMask, isValidCpf, onlyDigits } from '@/lib/document'
import { formatPhoneMask, isValidPhone, normalizePhone } from '@/lib/phone'
import {
  MIN_PASSWORD_LENGTH,
  passwordRuleHint,
  passwordTooShortMessage,
} from '@/lib/authPassword'
import { toUserMessage } from '@/lib/toUserMessage'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

export function RegisterPage() {
  useDocumentTitle('Criar conta | FAL Peças Automotivas')
  const { signUp, user, loading, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const fromState = (location.state as { from?: string } | null)?.from
  // Veio do funil (carrinho/checkout) → volta para lá; senão área da conta.
  const from = fromState ?? '/conta'
  const loginState = fromState ? { from: fromState } : undefined

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

  if (!loading && user) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(passwordTooShortMessage())
      return
    }
    if (password !== password2) {
      setError('As senhas não coincidem.')
      return
    }
    if (!terms) {
      setError('Aceite os termos para continuar.')
      return
    }
    const cpfDigits = onlyDigits(cpf)
    if (!isValidCpf(cpfDigits)) {
      setError('CPF inválido. Confira os 11 dígitos.')
      return
    }
    const phoneDigits = phone.trim() ? normalizePhone(phone) : ''
    if (phoneDigits && !isValidPhone(phoneDigits)) {
      setError('Telefone inválido. Use DDD + número (10 ou 11 dígitos).')
      return
    }
    setSubmitting(true)
    try {
      const result = await signUp({
        email,
        password,
        firstName,
        lastName,
        username: username || undefined,
        phone: phoneDigits || undefined,
        cpf: cpfDigits,
      })
      if (!result.session) {
        setNeedsEmailConfirm(true)
        return
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(toUserMessage(err, 'Não foi possível criar a conta. Tente novamente.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (needsEmailConfirm) {
    return (
      <Container className="py-8">
        <div className="mx-auto max-w-[560px] rounded-fal border border-fal-line bg-white p-6 text-center sm:p-8">
          <h1 className="mt-0 text-[28px] font-black">Confirme seu e-mail</h1>
          <p className="text-fal-muted">
            Enviamos um link de confirmação para <strong>{email}</strong>. Abra o e-mail, confirme
            o cadastro e depois entre na sua conta.
          </p>
          <ButtonLink to="/login" state={loginState} variant="primary" className="mt-2">
            Ir para o login
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
            Crie sua conta FAL
          </h1>
          <p className="text-[17px] text-fal-muted">
            Crie sua conta com nome, e-mail, CPF e senha. Você já pode navegar na loja; confirme o
            e-mail quando receber a mensagem.
          </p>
          {!isConfigured ? (
            <p className="mt-4 rounded-[10px] border border-[#f0d979] bg-[#fff8db] p-3 text-sm">
              Cadastro indisponível no momento. Tente novamente mais tarde.
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-fal border border-fal-line bg-white">
          <div className="grid grid-cols-2 border-b border-fal-line">
            <Link
              to="/login"
              state={loginState}
              className="px-4 py-4 text-center font-extrabold hover:bg-[#fafbfc]"
            >
              Entrar
            </Link>
            <span className="bg-[#fafbfc] px-4 py-4 text-center font-extrabold shadow-[inset_0_-3px_var(--fal-yellow)]">
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
                label="CPF"
                name="cpf"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCpfMask(e.target.value))}
                required
              />
              <Input
                label="Telefone / WhatsApp"
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
              />
              <Input
                label="Usuário (opcional)"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                hint="Opcional. Você também pode entrar com o e-mail."
              />
              <Input
                label="Senha"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint={passwordRuleHint()}
                required
              />
              <Input
                label="Confirmar senha"
                name="password2"
                type="password"
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
                <Link to="/termos" className="font-semibold text-fal-navy hover:underline">
                  termos de uso
                </Link>{' '}
                e a{' '}
                <Link to="/privacidade" className="font-semibold text-fal-navy hover:underline">
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
              {submitting ? 'Criando…' : 'Criar conta'}
            </Button>
          </form>
        </div>
      </div>
    </Container>
  )
}
