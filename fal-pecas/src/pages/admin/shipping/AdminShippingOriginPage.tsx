import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { formatCepMask, normalizeCep } from '@/lib/cep'
import {
  getStoreShippingOrigin,
  upsertStoreShippingOrigin,
} from '@/services/admin/adminShippingOriginService'
import { useEffect, useState, type FormEvent } from 'react'

export function AdminShippingOriginPage() {
  const [id, setId] = useState<string | undefined>()
  const [postalCode, setPostalCode] = useState('')
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [complement, setComplement] = useState('')
  const [district, setDistrict] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const o = await getStoreShippingOrigin()
        if (o) {
          setId(o.id)
          setPostalCode(formatCepMask(o.postalCode))
          setStreet(o.street)
          setNumber(o.number)
          setComplement(o.complement ?? '')
          setDistrict(o.district ?? '')
          setCity(o.city)
          setState(o.state)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar origem')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      const saved = await upsertStoreShippingOrigin({
        id,
        postalCode: normalizeCep(postalCode),
        street,
        number,
        complement: complement || null,
        district: district || null,
        city,
        state,
      })
      setId(saved.id)
      setOk('Origem de frete salva.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading label="Carregando origem…" />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-fal-navy">Origem de frete (FAL)</h1>
      <p className="text-sm text-fal-muted">
        CEP e endereço usados como origem nas cotações. Providers reais entram na F9.
      </p>
      <form
        onSubmit={onSubmit}
        className="grid max-w-2xl gap-3 rounded-[14px] border border-fal-line bg-white p-4 sm:grid-cols-2"
      >
        <Input
          label="CEP"
          inputMode="numeric"
          value={postalCode}
          onChange={(e) => setPostalCode(formatCepMask(e.target.value))}
          required
        />
        <Input
          label="UF"
          value={state}
          maxLength={2}
          onChange={(e) => setState(e.target.value.toUpperCase())}
          required
        />
        <Input label="Cidade" value={city} onChange={(e) => setCity(e.target.value)} required />
        <Input label="Bairro" value={district} onChange={(e) => setDistrict(e.target.value)} />
        <div className="sm:col-span-2">
          <Input label="Logradouro" value={street} onChange={(e) => setStreet(e.target.value)} required />
        </div>
        <Input label="Número" value={number} onChange={(e) => setNumber(e.target.value)} required />
        <Input
          label="Complemento"
          value={complement}
          onChange={(e) => setComplement(e.target.value)}
        />
        {error ? <p className="text-sm text-red-600 sm:col-span-2">{error}</p> : null}
        {ok ? <p className="text-sm text-green-700 sm:col-span-2">{ok}</p> : null}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar origem'}
          </Button>
        </div>
      </form>
    </div>
  )
}
