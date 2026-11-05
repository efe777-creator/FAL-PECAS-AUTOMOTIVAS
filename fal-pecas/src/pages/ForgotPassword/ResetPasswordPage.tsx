import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Container } from '@/components/layout/Container'
import { AuthNotConfiguredError, useAuth } from '@/contexts/AuthContext'
import { toUserMessage } from '@/lib/toUserMessage'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

/**
 * Destino do link de recuperação (PASSWORD_RECOVERY).
 * O cliente define a nova senha aqui; o e-mail aponta para /redefinir-senha.
 */
export function ResetPasswordPage() {
  const { updatePassword, isConfigured } = useAuth()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setReady(false)
      return
    }
    let active = true
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })
    void supabase.auth.getSession().then(({ data: sess }) => {
      if (!active) return
      if (sess.session) setReady(true)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setSubmitting(true)
    try {
      await updatePassword(password)
      setSuccess(true)
      window.setTimeout(() => navigate('/login', { replace: true }), 1800)
    } catch (err) {
      if (err instanceof AuthNotConfiguredError) setError(err.message)
      else setError(toUserMessage(err, 'Não foi possível redefinir a senha.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container className="py-8">
      <div className="mx-auto max-w-md rounded-fal border border-fal-line bg-white p-6">
        <h1 className="mt-0 text-[28px] font-extrabold">Redefinir senha</h1>
        <p className="text-fal-muted">
          Escolha uma nova senha para acessar sua conta.
        </p>
        {!isConfigured ? (
          <p className="mt-3 rounded-[10px] border border-[#f0d979] bg-[#fff8db] p-3 text-sm">
            Autenticação indisponível no momento. Tente mais tarde.
          </p>
        ) : null}
        {!ready && isConfigured ? (
          <p className="mt-3 text-sm text-fal-muted">
            Abra o link enviado por e-mail para continuar. Se o link expirou,{' '}
            <Link to="/recuperar-senha" className="font-bold text-fal-auth-link">
              solicite um novo
            </Link>
            .
          </p>
        ) : null}
        {ready ? (
          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <Input
              label="Nova senha"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Input
              label="Confirmar senha"
              name="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
            <p className="m-0 text-xs text-fal-muted">Mínimo de 6 caracteres.</p>
            {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
            {success ? (
              <p className="text-sm text-fal-success">
                Senha atualizada. Redirecionando para o login…
              </p>
            ) : null}
            <Button type="submit" variant="primary" fullWidth disabled={submitting || success}>
              {submitting ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
          </form>
        ) : null}
        <p className="mt-4 text-sm">
          <Link to="/login" className="font-bold text-fal-auth-link">
            Voltar ao login
          </Link>
        </p>
      </div>
    </Container>
  )
}
