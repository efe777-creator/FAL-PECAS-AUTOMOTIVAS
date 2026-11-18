import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  createProfessionalProfile,
  listMyProfessionalProfiles,
  listProfessionalsForIdentity,
  listSpecialtyCatalog,
  type ProfessionalProfile,
} from '@/services/garage/professionalProfileService'
import { trustLabel } from '@/services/garage/professionalTrust'
import { useCallback, useEffect, useState } from 'react'

export function VehicleProfessionalsPanel({
  vehicleIdentityId,
}: {
  vehicleIdentityId: string
}) {
  const toast = useToast()
  const [mine, setMine] = useState<ProfessionalProfile[]>([])
  const [linked, setLinked] = useState<ProfessionalProfile[]>([])
  const [specialties, setSpecialties] = useState<Array<{ id: string; label: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [description, setDescription] = useState('')
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [m, l, s] = await Promise.all([
        listMyProfessionalProfiles(),
        listProfessionalsForIdentity(vehicleIdentityId),
        listSpecialtyCatalog(),
      ])
      setMine(m)
      setLinked(l)
      setSpecialties(s)
    } catch (e) {
      toast.push(toUserMessage(e, 'Erro ao carregar profissionais'), 'error')
    } finally {
      setLoading(false)
    }
  }, [vehicleIdentityId, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  function toggleSpec(id: string) {
    setSelectedSpecs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.push('Informe o nome', 'error')
      return
    }
    setSaving(true)
    try {
      await createProfessionalProfile({
        displayName: name.trim(),
        region: region.trim() || null,
        contactPhone: phone.trim() || null,
        contactEmail: email.trim() || null,
        description: description.trim() || null,
        specialtyIds: selectedSpecs,
      })
      setName('')
      setRegion('')
      setPhone('')
      setEmail('')
      setDescription('')
      setSelectedSpecs([])
      toast.push('Profissional cadastrado (nível 1 — declarado)', 'success')
      await reload()
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao cadastrar'), 'error')
    } finally {
      setSaving(false)
    }
  }

  function renderCard(p: ProfessionalProfile) {
    return (
      <li
        key={p.id}
        className="rounded-fal border border-fal-line bg-fal-bg/40 px-3 py-2"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-extrabold text-fal-fg">{p.displayName}</span>
          <span className="text-xs font-semibold tabular-nums text-fal-muted">{p.falCode}</span>
        </div>
        <p className="m-0 mt-1 text-xs font-semibold text-fal-muted">
          {trustLabel(p.trustLevel)}
          {p.trustLevel === 1 ? ' · não verificado' : ''}
          {p.region ? ` · ${p.region}` : ''}
        </p>
        {p.description ? (
          <p className="m-0 mt-1 text-sm text-fal-fg">{p.description}</p>
        ) : null}
        {p.specialtyIds.length ? (
          <p className="m-0 mt-1 text-xs text-fal-muted">
            {p.specialtyIds
              .map((id) => specialties.find((s) => s.id === id)?.label ?? id)
              .join(' · ')}
          </p>
        ) : null}
      </li>
    )
  }

  return (
    <div className="space-y-4">
      <p className="m-0 text-xs text-fal-muted">
        Cadastro não concede acesso à garagem. Trust é critério verificável — sem medalha. Convite
        com share limitado fica na Etapa 4.
      </p>

      <form
        onSubmit={onCreate}
        className="grid gap-2 rounded-fal border border-fal-line bg-fal-surface p-3 sm:grid-cols-2"
      >
        <Input label="Nome" value={name} onChange={(ev) => setName(ev.target.value)} />
        <Input label="Região" value={region} onChange={(ev) => setRegion(ev.target.value)} />
        <Input label="Telefone" value={phone} onChange={(ev) => setPhone(ev.target.value)} />
        <Input label="E-mail" value={email} onChange={(ev) => setEmail(ev.target.value)} />
        <div className="sm:col-span-2">
          <Input
            label="Descrição"
            value={description}
            onChange={(ev) => setDescription(ev.target.value)}
          />
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-semibold">Especialidades</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {specialties.map((s) => (
              <label
                key={s.id}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-fal-line bg-fal-bg px-2 py-1 text-xs font-semibold"
              >
                <input
                  type="checkbox"
                  checked={selectedSpecs.includes(s.id)}
                  onChange={() => toggleSpec(s.id)}
                />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={saving}>
            Cadastrar profissional
          </Button>
        </div>
      </form>

      {loading ? (
        <Loading label="Carregando profissionais…" />
      ) : (
        <>
          <section>
            <h3 className="m-0 mb-2 text-sm font-extrabold">Vinculados a este veículo</h3>
            {!linked.length ? (
              <EmptyState
                title="Nenhum vínculo ainda"
                description="Vincule ao registrar uma manutenção com profissional."
              />
            ) : (
              <ul className="m-0 list-none space-y-3 p-0">{linked.map(renderCard)}</ul>
            )}
          </section>
          <section>
            <h3 className="m-0 mb-2 text-sm font-extrabold">Meus cadastros</h3>
            {!mine.length ? (
              <EmptyState
                title="Nenhum profissional cadastrado"
                description="Cadastre oficinas e mecânicos que você usa."
              />
            ) : (
              <ul className="m-0 list-none space-y-3 p-0">{mine.map(renderCard)}</ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
