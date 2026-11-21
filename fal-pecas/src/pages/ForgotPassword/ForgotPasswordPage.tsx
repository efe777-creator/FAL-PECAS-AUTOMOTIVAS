import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Container } from '@/components/layout/Container'
import { useToast } from '@/components/common/Toast'
import { AuthNotConfiguredError, useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  isAuthEmailRecoveryEnabled,
  isAuthWhatsAppRecoveryReady,
} from '@/lib/authRecovery'
import {
  formatPhoneMask,
  isValidWhatsAppPhone,
  normalizePhone,
  whatsappPhoneInvalidMessage,
} from '@/lib/phone'
import {
  MIN_PASSWORD_LENGTH,
  passwordMismatchMessage,
  passwordRuleHint,
  passwordTooShortMessage,
} from '@/lib/authPassword'
import { toUserMessage } from '@/lib/toUserMessage'
import { sendAuthOtp, verifyAuthOtp } from '@/services/supabase/authService'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

/**
 * Recuperação de senha:
 * 1) WhatsApp por código (caminho principal quando provider estiver ativo)
 * 2) E-mail com link — só com domínio linkado (`VITE_AUTH_EMAIL_RECOVERY=1`)
 */
export function ForgotPasswordPage() {
  useDocumentTitle('Recuperar senha | FAL Peças Automotivas')
  const { resetPassword, isConfigured, updatePassword } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const fromState = (location.state as { from?: string } | null)?.from
  const loginState = fromState ? { from: fromState } : undefined

  const emailRecoveryOn = isAuthEmailRecoveryEnabled()
  const whatsReady = isAuthWhatsAppRecoveryReady()

  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [whatsBusy, setWhatsBusy] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [whatsStep, setWhatsStep] = useState<'phone' | 'otp' | 'password'>('phone')

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailSubmitting, setEmailSubmitting] = useState(false)

  function pushError(message: string) {
    setError(message)
    toast.push(message, 'error')
  }

  function pushOk(message: string) {
    setError(null)
    toast.push(message, 'success')
  }

  async function onSendWhatsCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const digits = phone.trim() ? normalizePhone(phone) : ''
    if (!isValidWhatsAppPhone(digits)) {
      pushError(whatsappPhoneInvalidMessage())
      return
    }
    setWhatsBusy(true)
    try {
      // Sempre tenta invoke; flag só muda copy da UI. Anti-enumeração na Edge.
      const res = await sendAuthOtp({ purpose: 'password_reset', phone: digits })
      setOtpSent(true)
      setWhatsStep('otp')
      if (res.debugCode) {
        setOtp(res.debugCode)
        pushOk(`Código enviado (mock: ${res.debugCode}). Digite os 6 dígitos.`)
      } else {
        pushOk(
          res.message ??
            'Se o número estiver cadastrado, você receberá um código em breve.',
        )
      }
    } catch (err) {
      if (!whatsReady) {
        toast.push(
          'Recuperação por WhatsApp ainda não está ativa no ambiente. Use o e-mail quando o domínio estiver linkado.',
          'info',
        )
        return
      }
      pushError(toUserMessage(err, 'Não foi possível enviar o código'))
    } finally {
      setWhatsBusy(false)
    }
  }

  async function onConfirmWhatsOtp(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const digits = phone.trim() ? normalizePhone(phone) : ''
    if (otp.replace(/\D/g, '').length !== 6) {
      pushError('Informe o código de 6 dígitos.')
      return
    }
    setWhatsBusy(true)
    try {
      await verifyAuthOtp({
        purpose: 'password_reset',
        code: otp,
        phone: digits,
      })
      setWhatsStep('password')
      pushOk('Código ok. Defina a nova senha.')
    } catch (err) {
      pushError(toUserMessage(err, 'Código inválido ou expirado'))
    } finally {
      setWhatsBusy(false)
    }
  }

  async function onSaveWhatsPassword(e: FormEvent) {
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
    setWhatsBusy(true)
    try {
      await updatePassword(newPassword)
      pushOk('Senha atualizada. Entre com a nova senha.')
      navigate('/login', { replace: true, state: loginState })
    } catch (err) {
      pushError(toUserMessage(err, 'Não foi possível salvar a nova senha'))
    } finally {
      setWhatsBusy(false)
    }
  }

  async function onSubmitEmail(e: FormEvent) {
    e.preventDefault()
    if (!emailRecoveryOn) {
      pushError('Recuperação por e-mail só após linkarmos o domínio da loja no Auth.')
      return
    }
    setError(null)
    setEmailSuccess(false)
    setEmailSubmitting(true)
    try {
      await resetPassword(email)
      setEmailSuccess(true)
      toast.push('Se o e-mail existir, você receberá o link em breve.', 'success')
    } catch (err) {
      if (err instanceof AuthNotConfiguredError) pushError(err.message)
      else pushError(toUserMessage(err, 'Não foi possível enviar o e-mail.'))
    } finally {
      setEmailSubmitting(false)
    }
  }

  return (
    <Container className="py-8">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-fal border border-fal-line bg-fal-surface p-6">
          <h1 className="mt-0 text-[28px] font-extrabold">Recuperar senha</h1>
          <p className="text-fal-muted">
            Preferimos código no <strong>WhatsApp</strong> do celular cadastrado. Link por e-mail
            só com o domínio da loja linkado no Auth.
          </p>
          {!isConfigured ? (
            <p className="mt-3 rounded-[10px] border border-fal-yellow-dark/50 bg-fal-yellow/30 p-3 text-sm">
              Recuperação indisponível no momento. Tente mais tarde.
            </p>
          ) : null}

          {error ? (
            <p className="mt-3 text-sm text-fal-danger" role="alert">
              {error}
            </p>
          ) : null}

          <section className="mt-4 rounded-[10px] border border-fal-line bg-fal-bg p-4">
            <h2 className="m-0 text-base font-extrabold">WhatsApp (código)</h2>
            <p className="mt-1 text-sm text-fal-muted">
              {whatsReady
                ? 'Enviamos um código de 6 dígitos no celular da conta.'
                : 'Tentamos o envio via Edge. Se o provedor ainda não estiver no ar, use e-mail com domínio linkado.'}
            </p>

            {whatsStep === 'phone' ? (
              <form className="mt-3 space-y-3" onSubmit={(e) => void onSendWhatsCode(e)}>
                <Input
                  label="WhatsApp (celular da conta)"
                  name="phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                  hint="Mesmo celular WhatsApp do cadastro (DDD + 9)."
                  required
                />
                <Button type="submit" variant="primary" fullWidth disabled={whatsBusy || !isConfigured}>
                  {whatsBusy ? 'Enviando…' : 'Enviar código'}
                </Button>
              </form>
            ) : null}

            {whatsStep === 'otp' || (otpSent && whatsStep !== 'password') ? (
              <form className="mt-3 space-y-3" onSubmit={(e) => void onConfirmWhatsOtp(e)}>
                <Input
                  label="Código (6 dígitos)"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                />
                <Button type="submit" variant="primary" fullWidth disabled={whatsBusy}>
                  {whatsBusy ? 'Validando…' : 'Confirmar código'}
                </Button>
                <button
                  type="button"
                  className="text-xs font-bold text-fal-muted underline"
                  onClick={() => {
                    setWhatsStep('phone')
                    setOtpSent(false)
                    setOtp('')
                  }}
                >
                  Usar outro número
                </button>
              </form>
            ) : null}

            {whatsStep === 'password' ? (
              <form className="mt-3 space-y-3" onSubmit={(e) => void onSaveWhatsPassword(e)}>
                <PasswordInput
                  label="Nova senha"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  hint={passwordRuleHint()}
                  required
                />
                <PasswordInput
                  label="Confirmar senha"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Button type="submit" variant="primary" fullWidth disabled={whatsBusy}>
                  {whatsBusy ? 'Salvando…' : 'Salvar nova senha'}
                </Button>
              </form>
            ) : null}
          </section>
        </div>

        <div className="rounded-fal border border-fal-line bg-fal-surface p-6">
          <h2 className="mt-0 text-base font-extrabold">E-mail (link)</h2>
          {emailRecoveryOn ? (
            <>
              <p className="text-sm text-fal-muted">
                Domínio linkado: enviamos um link de redefinição para o e-mail da conta.
              </p>
              <form className="mt-3 space-y-3" onSubmit={(e) => void onSubmitEmail(e)}>
                <Input
                  label="E-mail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {emailSuccess ? (
                  <p className="text-sm text-fal-success">
                    Se o e-mail existir, você receberá as instruções em breve.
                  </p>
                ) : null}
                <Button type="submit" variant="outline" fullWidth disabled={emailSubmitting || !isConfigured}>
                  {emailSubmitting ? 'Enviando…' : 'Enviar link por e-mail'}
                </Button>
              </form>
            </>
          ) : (
            <p className="mb-0 text-sm text-fal-muted">
              Disponível <strong>depois</strong> de linkarmos o domínio da loja no Supabase Auth
              (Site URL + Redirect URLs). Até lá, o canal previsto é o código no WhatsApp.
              Flag: <code className="text-xs">VITE_AUTH_EMAIL_RECOVERY=1</code>.
            </p>
          )}
        </div>

        <p className="text-sm">
          <Link to="/login" state={loginState} className="font-bold text-fal-auth-link">
            Voltar ao login
          </Link>
        </p>
      </div>
    </Container>
  )
}
