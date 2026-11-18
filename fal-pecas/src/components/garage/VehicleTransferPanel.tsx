import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  acceptVehicleTransfer,
  cancelVehicleTransfer,
  listIncomingTransfers,
  listTransferRequests,
  rejectVehicleTransfer,
  requestVehicleTransfer,
  type TransferRequest,
} from '@/services/garage/vehicleTransferWizard'
import { useCallback, useEffect, useState } from 'react'

export function VehicleTransferPanel({
  vehicleIdentityId,
}: {
  vehicleIdentityId: string
}) {
  const toast = useToast()
  const [items, setItems] = useState<TransferRequest[]>([])
  const [incoming, setIncoming] = useState<TransferRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toCustomerId, setToCustomerId] = useState('')
  const [consentHistory, setConsentHistory] = useState(false)
  const [consentPrivate, setConsentPrivate] = useState(false)
  const [note, setNote] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [out, inc] = await Promise.all([
        listTransferRequests(vehicleIdentityId),
        listIncomingTransfers(),
      ])
      setItems(out)
      setIncoming(inc.filter((r) => r.vehicleIdentityId === vehicleIdentityId))
    } catch (e) {
      toast.push(toUserMessage(e, 'Erro ao carregar transferências'), 'error')
      setItems([])
      setIncoming([])
    } finally {
      setLoading(false)
    }
  }, [vehicleIdentityId, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onRequest(e: React.FormEvent) {
    e.preventDefault()
    const id = toCustomerId.trim()
    if (!id) {
      toast.push('Informe o customer_id do novo proprietário', 'error')
      return
    }
    setSaving(true)
    try {
      await requestVehicleTransfer({
        vehicleIdentityId,
        toCustomerId: id,
        consentShareHistory: consentHistory,
        consentSharePrivateEvidence: consentPrivate,
        note: note.trim() || null,
      })
      setToCustomerId('')
      setNote('')
      setConsentHistory(false)
      setConsentPrivate(false)
      toast.push('Solicitação enviada — aguardando aceite', 'success')
      await reload()
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao solicitar transferência'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function onCancel(requestId: string) {
    setSaving(true)
    try {
      await cancelVehicleTransfer(requestId)
      toast.push('Solicitação cancelada', 'success')
      await reload()
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao cancelar'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const pending = items.find((i) => i.status === 'pending')

  async function onAccept(requestId: string) {
    setSaving(true)
    try {
      await acceptVehicleTransfer(requestId)
      toast.push('Transferência aceita — ownership atualizado', 'success')
      await reload()
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao aceitar'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function onReject(requestId: string) {
    setSaving(true)
    try {
      await rejectVehicleTransfer(requestId)
      toast.push('Transferência rejeitada', 'success')
      await reload()
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao rejeitar'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="m-0 text-xs text-fal-muted">
        A FAL não substitui DETRAN ou órgãos oficiais. Transferência atômica no servidor: fecha
        período atual, abre novo, revoga shares do grantor. Evidências `private_owner` só
        promovem com consentimento explícito. Preferências do módulo Visual (2B) **não**
        transferem — o novo proprietário começa com aparência padrão.
      </p>

      {incoming.length ? (
        <div className="space-y-2 rounded-fal border border-fal-line bg-fal-surface p-3">
          <p className="m-0 text-sm font-extrabold">Convites recebidos neste veículo</p>
          {incoming.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-fal-muted">
                De {r.fromCustomerId} · expira {new Date(r.expiresAt).toLocaleString('pt-BR')}
              </span>
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => void onAccept(r.id)}
              >
                Aceitar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="light"
                disabled={saving}
                onClick={() => void onReject(r.id)}
              >
                Rejeitar
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {pending ? (
        <div className="rounded-fal border border-fal-line bg-fal-surface p-3">
          <p className="m-0 text-sm font-extrabold">Solicitação pendente</p>
          <p className="m-0 mt-1 text-xs text-fal-muted">
            Destino {pending.toCustomerId} · expira{' '}
            {new Date(pending.expiresAt).toLocaleString('pt-BR')}
          </p>
          <Button
            type="button"
            size="sm"
            variant="light"
            className="mt-2"
            disabled={saving}
            onClick={() => void onCancel(pending.id)}
          >
            Cancelar solicitação
          </Button>
        </div>
      ) : (
        <form
          onSubmit={onRequest}
          className="grid gap-2 rounded-fal border border-fal-line bg-fal-surface p-3"
        >
          <Input
            label="Customer ID do novo proprietário"
            value={toCustomerId}
            onChange={(ev) => setToCustomerId(ev.target.value)}
            placeholder="uuid do customer destino"
          />
          <Input
            label="Nota (opcional)"
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
          />
          <label className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <input
              type="checkbox"
              checked={consentHistory}
              onChange={(ev) => setConsentHistory(ev.target.checked)}
            />
            Consentir compartilhar histórico AUTHORIZED
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <input
              type="checkbox"
              checked={consentPrivate}
              onChange={(ev) => setConsentPrivate(ev.target.checked)}
            />
            Consentir promover evidências private_owner → shared
          </label>
          <Button type="submit" size="sm" disabled={saving}>
            Iniciar transferência
          </Button>
        </form>
      )}

      {loading ? (
        <Loading label="Carregando histórico de transferências…" />
      ) : !items.length ? (
        <EmptyState
          title="Nenhuma transferência"
          description="Inicie quando for passar a propriedade digital deste veículo."
        />
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {items.map((r) => (
            <li
              key={r.id}
              className="rounded-fal border border-fal-line bg-fal-bg/40 px-3 py-2 text-xs font-semibold text-fal-muted"
            >
              {r.status} · → {r.toCustomerId} ·{' '}
              {new Date(r.createdAt).toLocaleString('pt-BR')}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
