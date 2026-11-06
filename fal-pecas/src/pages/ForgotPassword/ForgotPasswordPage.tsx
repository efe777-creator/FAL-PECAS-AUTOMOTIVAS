import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Container } from '@/components/layout/Container'
import { AuthNotConfiguredError, useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'

export function ForgotPasswordPage() {
  useDocumentTitle('Recuperar senha | FAL Peças Automotivas')
  const { resetPassword, isConfigured } = useAuth()
  const location = useLocation()
  const fromState = (location.state as { from?: string } | null)?.from
  const loginState = fromState ? { from: fromState } : undefined

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    try {
      await resetPassword(email)
      setSuccess(true)
    } catch (err) {
      if (err instanceof AuthNotConfiguredError) setError(err.message)
      else if (err instanceof Error) setError(err.message)
      else setError('Não foi possível enviar o e-mail.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container className="py-8">
      <div className="mx-auto max-w-md rounded-fal border border-fal-line bg-white p-6">
        <h1 className="mt-0 text-[28px] font-extrabold">Recuperar senha</h1>
        <p className="text-fal-muted">
          Enviaremos um link de redefinição para o e-mail cadastrado.
        </p>
        {!isConfigured ? (
          <p className="mt-3 rounded-[10px] border border-[#f0d979] bg-[#fff8db] p-3 text-sm">
            Recuperação de senha indisponível no momento. Tente mais tarde.
          </p>
        ) : null}
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <Input
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error ? (
            <p className="text-sm text-fal-danger" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-fal-success">
              Se o e-mail existir, você receberá as instruções em breve.
            </p>
          ) : null}
          <Button type="submit" variant="primary" fullWidth disabled={submitting}>
            {submitting ? 'Enviando…' : 'Enviar link'}
          </Button>
        </form>
        <p className="mt-4 text-sm">
          <Link to="/login" state={loginState} className="font-bold text-fal-auth-link">
            Voltar ao login
          </Link>
        </p>
      </div>
    </Container>
  )
}
