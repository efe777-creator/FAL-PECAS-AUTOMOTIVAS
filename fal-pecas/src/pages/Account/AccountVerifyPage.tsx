import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  accountInVerificationGrace,
  accountPastVerificationGrace,
  isAccountVerified,
  verificationGraceRemainingLabel,
} from '@/lib/accountVerification'
import { formatPhoneMask, isValidWhatsAppPhone } from '@/lib/phone'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  resendSignupConfirmation,
  sendAuthOtp,
  verifyAuthOtp,
} from '@/services/supabase/authService'
import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'

/**
 * Confirmação obrigatória pós-graça 48h.
 * Canal WhatsApp só se houver celular válido no perfil; senão prioriza e-mail.
 */
export function AccountVerifyPage() {
  useDocumentTitle('Confirmar conta | FAL Peças Automotivas')
  const { user, refreshUser, profileLoading } = useAuth()
  const toast = useToast()
  const location = useLocation()
  const verifyReason = (location.state as { verifyReason?: string } | null)?.verifyReason
  const [resending, setResending] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [whatsBusy, setWhatsBusy] = useState(false)

  if (!profileLoading && user && isAccountVerified(user)) {
    return <Navigate to="/conta" replace />
  }

  const pastGrace = accountPastVerificationGrace(user)
  const inGrace = accountInVerificationGrace(user)
  const remaining = verificationGraceRemainingLabel(user?.verificationGraceEndsAt)
  const hasWhatsAppPhone = Boolean(user?.phone && isValidWhatsAppPhone(user.phone))
  const phoneLabel = user?.phone ? formatPhoneMask(user.phone) : null
  const fromFirstOrder = verifyReason === 'first_order'

  async function onResendEmail() {
    if (!user?.email) {
      toast.push('Conta sem e-mail para reenvio.', 'error')
      return
    }
    setResending(true)
    try {
      await resendSignupConfirmation(user.email)
      toast.push('E-mail de confirmação reenviado. Confira a caixa de entrada e o spam.', 'success')
    } catch (err) {
      toast.push(toUserMessage(err, 'Não foi possível reenviar o e-mail'), 'error')
    } finally {
      setResending(false)
    }
  }

  async function onRefresh() {
    try {
      await refreshUser()
      toast.push('Status atualizado.', 'success')
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao atualizar'), 'error')
    }
  }

  async function onSendWhatsCode() {
    if (!hasWhatsAppPhone) {
      toast.push('Cadastre um celular WhatsApp válido no perfil para usar este canal.', 'error')
      return
    }
    setWhatsBusy(true)
    try {
      const res = await sendAuthOtp({ purpose: 'account_verify' })
      setOtpSent(true)
      if (res.debugCode) {
        setOtp(res.debugCode)
        toast.push(`Código enviado (mock: ${res.debugCode}).`, 'success')
      } else {
        toast.push(res.message ?? 'Código enviado no WhatsApp.', 'success')
      }
    } catch (err) {
      toast.push(toUserMessage(err, 'Não foi possível enviar o código'), 'error')
    } finally {
      setWhatsBusy(false)
    }
  }

  async function onConfirmWhatsOtp() {
    if (otp.replace(/\D/g, '').length !== 6) {
      toast.push('Informe o código de 6 dígitos.', 'error')
      return
    }
    setWhatsBusy(true)
    try {
      await verifyAuthOtp({ purpose: 'account_verify', code: otp })
      await refreshUser()
      toast.push('Conta confirmada pelo WhatsApp.', 'success')
    } catch (err) {
      toast.push(toUserMessage(err, 'Código inválido ou expirado'), 'error')
    } finally {
      setWhatsBusy(false)
    }
  }

  return (
    <div className="rounded-fal border border-fal-line bg-fal-surface p-5">
      <h2 className="mt-0 text-xl font-extrabold">Confirmar sua conta</h2>
      {fromFirstOrder ? (
        <p className="text-sm text-fal-muted">
          Para pagar o <strong>1º pedido</strong>, confirme a conta. Preferimos código no{' '}
          <strong>WhatsApp</strong>
          {hasWhatsAppPhone ? '' : ' (cadastre o celular no perfil)'}; e-mail também vale quando o
          domínio estiver linkado.
        </p>
      ) : pastGrace ? (
        <p className="text-sm text-fal-muted">
          Passaram 48h do cadastro. No login e no pagamento pedimos validação — preferência:{' '}
          <strong>código WhatsApp</strong>
          {hasWhatsAppPhone ? ` em ${phoneLabel}` : ''}.
        </p>
      ) : inGrace ? (
        <p className="text-sm text-fal-muted">
          Ainda há <strong>{remaining ?? 'algumas horas'}</strong> de graça. Confirmar agora é
          opcional; vira obrigatório após 48h ou no 1º pagamento.
        </p>
      ) : (
        <p className="text-sm text-fal-muted">
          Confirme por WhatsApp (celular válido) ou e-mail.
        </p>
      )}

      {!hasWhatsAppPhone ? (
        <p className="mt-3 rounded-[10px] border border-fal-yellow-dark/40 bg-fal-yellow/15 p-3 text-sm">
          Sem celular WhatsApp válido no cadastro — a confirmação é por <strong>e-mail</strong>.
          Você pode{' '}
          <Link to="/conta/perfil" className="font-bold underline">
            adicionar o WhatsApp no perfil
          </Link>{' '}
          para usar o canal de mensagem depois.
        </p>
      ) : null}

      <section className="mt-5 rounded-[10px] border border-fal-line bg-fal-bg p-4">
        <h3 className="m-0 text-base font-extrabold">
          E-mail{!hasWhatsAppPhone ? ' (canal principal)' : ''}
        </h3>
        <p className="mt-1 text-sm text-fal-muted">
          Enviamos (ou reenviamos) um link para{' '}
          <strong className="text-fal-fg">{user?.email ?? 'seu e-mail'}</strong>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            disabled={resending}
            onClick={() => void onResendEmail()}
          >
            {resending ? 'Enviando…' : 'Reenviar e-mail'}
          </Button>
          <Button type="button" variant="outline" onClick={() => void onRefresh()}>
            Já confirmei — atualizar
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-[10px] border border-fal-line bg-fal-bg p-4">
        <h3 className="m-0 text-base font-extrabold">WhatsApp</h3>
        {hasWhatsAppPhone ? (
          <>
            <p className="mt-1 text-sm text-fal-muted">
              Código de 6 dígitos no celular{' '}
              <strong className="text-fal-fg">{phoneLabel}</strong>.
            </p>
            <div className="mt-3 grid max-w-md gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={whatsBusy}
                onClick={() => void onSendWhatsCode()}
              >
                {whatsBusy && !otpSent ? 'Enviando…' : otpSent ? 'Reenviar código' : 'Enviar código'}
              </Button>
              <Input
                label="Código (6 dígitos)"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                disabled={whatsBusy}
              />
              <Button
                type="button"
                variant="primary"
                disabled={whatsBusy || otp.replace(/\D/g, '').length !== 6}
                onClick={() => void onConfirmWhatsOtp()}
              >
                {whatsBusy && otpSent ? 'Validando…' : 'Confirmar código'}
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-1 mb-0 text-sm text-fal-muted">
            Indisponível sem celular válido. Cadastre um WhatsApp (DDD + 9) no{' '}
            <Link to="/conta/perfil" className="font-semibold underline">
              perfil
            </Link>{' '}
            ou confirme pelo e-mail acima.
          </p>
        )}
      </section>

      <p className="mb-0 mt-5 text-sm">
        <Link
          to="/catalogo"
          className="font-semibold text-fal-accent underline-offset-2 hover:underline"
        >
          Continuar no catálogo →
        </Link>
      </p>
    </div>
  )
}
