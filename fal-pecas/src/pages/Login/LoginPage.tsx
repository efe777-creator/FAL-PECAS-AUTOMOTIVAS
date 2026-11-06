import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Container } from '@/components/layout/Container'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { MIN_PASSWORD_LENGTH, passwordRuleHint } from '@/lib/authPassword'
import { toUserMessage } from '@/lib/toUserMessage'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

export function LoginPage() {
  useDocumentTitle('Entrar | FAL Peças Automotivas')
  const { signIn, user, loading, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const fromState = (location.state as { from?: string } | null)?.from
  const from = fromState ?? '/conta'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(toUserMessage(err, 'Não foi possível entrar. Tente novamente.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container className="py-8">
      <div className="mx-auto grid max-w-[1050px] grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
        <div className="py-4 lg:py-10">
          <h1 className="mt-0 text-[36px] leading-tight font-black lg:text-[44px]">
            Bem-vindo à FAL
          </h1>
          <p className="text-[17px] text-fal-muted">
            Acesse sua conta para acompanhar pedidos, endereços e favoritos.
          </p>
          {!isConfigured ? (
            <p className="mt-4 rounded-[10px] border border-[#f0d979] bg-[#fff8db] p-3 text-sm">
              Login indisponível no momento. Tente novamente mais tarde.
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-fal border border-fal-line bg-white">
          <div className="grid grid-cols-2 border-b border-fal-line">
            <span className="bg-[#fafbfc] px-4 py-4 text-center font-extrabold shadow-[inset_0_-3px_var(--fal-yellow)]">
              Entrar
            </span>
            <Link
              to="/cadastro"
              state={fromState ? { from: fromState } : undefined}
              className="px-4 py-4 text-center font-extrabold hover:bg-[#fafbfc]"
            >
              Criar conta grátis
            </Link>
          </div>
          <form className="p-5 sm:p-7" onSubmit={onSubmit}>
            <h2 className="mt-0 text-xl font-extrabold">Entrar na conta</h2>
            <div className="mt-3 space-y-3">
              <Input
                label="E-mail"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Senha"
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={MIN_PASSWORD_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint={passwordRuleHint()}
                required
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2 text-[13px]">
              <Link
                to="/recuperar-senha"
                state={fromState ? { from: fromState } : undefined}
                className="font-bold text-fal-auth-link"
              >
                Esqueci minha senha
              </Link>
            </div>
            {error ? (
              <p className="mt-3 text-sm text-fal-danger" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" fullWidth className="mt-4" disabled={submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </Container>
  )
}
