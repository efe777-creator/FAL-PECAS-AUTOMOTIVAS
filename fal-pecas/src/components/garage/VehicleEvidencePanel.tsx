import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  EVIDENCE_TYPES,
  EVIDENCE_TYPE_LABEL,
  EVIDENCE_VISIBILITIES,
  EVIDENCE_VISIBILITY_LABEL,
  type EvidenceType,
  type EvidenceVisibility,
} from '@/services/garage/evidenceTypes'
import {
  listVehicleEvidence,
  uploadVehicleEvidence,
  type VehicleEvidence,
} from '@/services/garage/vehicleEvidenceService'
import { useCallback, useEffect, useState } from 'react'

export function VehicleEvidencePanel({
  vehicleIdentityId,
}: {
  vehicleIdentityId: string
}) {
  const toast = useToast()
  const [items, setItems] = useState<VehicleEvidence[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<EvidenceType>('foto')
  const [visibility, setVisibility] = useState<EvidenceVisibility>('private_owner')
  const [file, setFile] = useState<File | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await listVehicleEvidence(vehicleIdentityId))
    } catch (e) {
      toast.push(toUserMessage(e, 'Erro ao carregar evidências'), 'error')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [vehicleIdentityId, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      toast.push('Selecione um arquivo', 'error')
      return
    }
    if (!title.trim()) {
      toast.push('Informe um título', 'error')
      return
    }
    setSaving(true)
    try {
      await uploadVehicleEvidence({
        vehicleIdentityId,
        file,
        title: title.trim(),
        evidenceType: type,
        visibility,
      })
      setTitle('')
      setFile(null)
      toast.push('Evidência enviada (URL assinada temporária)', 'success')
      await reload()
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha no upload'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="m-0 text-xs text-fal-muted">
        Anexo ≠ autenticidade. Desvincular de um evento não apaga o arquivo. URLs assinadas expiram
        (revoke de share não invalida URL já emitida até o TTL).
      </p>

      <form
        onSubmit={onUpload}
        className="grid gap-2 rounded-fal border border-fal-line bg-fal-surface p-3 sm:grid-cols-2"
      >
        <Input label="Título" value={title} onChange={(ev) => setTitle(ev.target.value)} />
        <label className="block text-sm font-semibold">
          Tipo
          <select
            className="mt-1 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm"
            value={type}
            onChange={(ev) => setType(ev.target.value as EvidenceType)}
          >
            {EVIDENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVIDENCE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Visibilidade
          <select
            className="mt-1 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm"
            value={visibility}
            onChange={(ev) => setVisibility(ev.target.value as EvidenceVisibility)}
          >
            {EVIDENCE_VISIBILITIES.map((v) => (
              <option key={v} value={v}>
                {EVIDENCE_VISIBILITY_LABEL[v]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Arquivo
          <input
            type="file"
            className="mt-1 block w-full text-sm"
            accept="image/*,application/pdf,video/mp4,video/webm"
            onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={saving}>
            Enviar evidência
          </Button>
        </div>
      </form>

      {loading ? (
        <Loading label="Carregando evidências…" />
      ) : !items.length ? (
        <EmptyState
          title="Nenhuma evidência visível"
          description="Envie NF, OS, foto ou laudo. Itens sem permissão não aparecem (sem “+N ocultos”)."
        />
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-fal border border-fal-line bg-fal-bg/40 px-3 py-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-extrabold text-fal-fg">{item.title}</span>
                {item.signedUrl ? (
                  <a
                    href={item.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-fal-accent underline-offset-2 hover:underline"
                  >
                    Abrir
                  </a>
                ) : null}
              </div>
              <p className="m-0 mt-1 text-xs font-semibold text-fal-muted">
                {EVIDENCE_TYPE_LABEL[item.evidenceType]} ·{' '}
                {EVIDENCE_VISIBILITY_LABEL[item.visibility]}
                {item.mime ? ` · ${item.mime}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
