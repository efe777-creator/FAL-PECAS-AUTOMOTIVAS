import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  createVehicleShare,
  listVehicleShares,
  revokeVehicleShare,
  type VehicleShare,
} from '@/services/garage/vehicleShareService'
import { useCallback, useEffect, useState } from 'react'

export function VehicleSharesPanel({
  vehicleIdentityId,
}: {
  vehicleIdentityId: string
}) {
  const toast = useToast()
  const [items, setItems] = useState<VehicleShare[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [granteeId, setGranteeId] = useState('')
  const [readHistory, setReadHistory] = useState(false)
  const [readEvidence, setReadEvidence] = useState(false)
  const [registerEvent, setRegisterEvent] = useState(false)
  const [updateKm, setUpdateKm] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await listVehicleShares(vehicleIdentityId))
    } catch (e) {
      toast.push(toUserMessage(e, 'Erro ao carregar shares'), 'error')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [vehicleIdentityId, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    const id = granteeId.trim()
    if (!id) {
      toast.push('Informe o customer_id do destinatário', 'error')
      return
    }
    setSaving(true)
    try {
      await createVehicleShare({
        vehicleIdentityId,
        granteeCustomerId: id,
        modules: ['visao', ...(readHistory ? ['historico'] : []), ...(readEvidence ? ['evidencias'] : [])],
        canReadHistory: readHistory,
        canReadEvidence: readEvidence,
        canRegisterEvent: registerEvent,
        canUpdateKm: updateKm,
      })
      setGranteeId('')
      setReadHistory(false)
      setReadEvidence(false)
      setRegisterEvent(false)
      setUpdateKm(false)
      toast.push('Share criado (revoke no servidor)', 'success')
      await reload()
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao criar share'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function onRevoke(shareId: string) {
    setSaving(true)
    try {
      await revokeVehicleShare(shareId)
      toast.push('Share revogado', 'success')
      await reload()
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao revogar'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="m-0 text-xs text-fal-muted">
        Share não concede histórico total nem todos os arquivos por padrão. Revoke vale no servidor
        imediatamente (URL assinada já emitida pode durar até o TTL).
      </p>

      <form
        onSubmit={onCreate}
        className="grid gap-2 rounded-fal border border-fal-line bg-fal-surface p-3"
      >
        <Input
          label="Customer ID do destinatário"
          value={granteeId}
          onChange={(ev) => setGranteeId(ev.target.value)}
          placeholder="uuid do customer"
        />
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={readHistory}
              onChange={(ev) => setReadHistory(ev.target.checked)}
            />
            Histórico autorizado
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={readEvidence}
              onChange={(ev) => setReadEvidence(ev.target.checked)}
            />
            Evidências
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={registerEvent}
              onChange={(ev) => setRegisterEvent(ev.target.checked)}
            />
            Registrar evento
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={updateKm}
              onChange={(ev) => setUpdateKm(ev.target.checked)}
            />
            Atualizar km
          </label>
        </div>
        <Button type="submit" size="sm" disabled={saving}>
          Criar compartilhamento
        </Button>
      </form>

      {loading ? (
        <Loading label="Carregando shares…" />
      ) : !items.length ? (
        <EmptyState
          title="Nenhum compartilhamento"
          description="Convide outro customer com permissões explícitas."
        />
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {items.map((s) => (
            <li
              key={s.id}
              className="rounded-fal border border-fal-line bg-fal-bg/40 px-3 py-2"
            >
              <p className="m-0 text-sm font-extrabold text-fal-fg">
                → {s.granteeCustomerId ?? '—'}
              </p>
              <p className="m-0 mt-1 text-xs font-semibold text-fal-muted">
                {s.revokedAt
                  ? 'Revogado'
                  : s.expiresAt && new Date(s.expiresAt) < new Date()
                    ? 'Expirado'
                    : 'Ativo'}
                {s.canReadHistory ? ' · histórico' : ''}
                {s.canReadEvidence ? ' · evidências' : ''}
                {s.canRegisterEvent ? ' · eventos' : ''}
                {s.canUpdateKm ? ' · km' : ''}
              </p>
              {!s.revokedAt ? (
                <Button
                  type="button"
                  size="sm"
                  variant="light"
                  className="mt-2"
                  disabled={saving}
                  onClick={() => void onRevoke(s.id)}
                >
                  Revogar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
