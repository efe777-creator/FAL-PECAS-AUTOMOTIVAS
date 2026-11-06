import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { BRAZILIAN_STATES } from '@/lib/brazilianStates'
import { formatCepMask, isCompleteCep, normalizeCep } from '@/lib/cep'
import { formatCpfOrCnpjMask } from '@/lib/document'
import { formatPhoneMask } from '@/lib/phone'
import {
  getStoreShippingOrigin,
  upsertStoreShippingOrigin,
} from '@/services/admin/adminShippingOriginService'
import { lookupCep } from '@/services/address/addressLookupService'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

export function AdminShippingOriginPage() {
  const [id, setId] = useState<string | undefined>()
  const [internalName, setInternalName] = useState('Origem principal')
  const [senderName, setSenderName] = useState('')
  const [document, setDocument] = useState('')
  const [phone, setPhone] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [complement, setComplement] = useState('')
  const [district, setDistrict] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [cepMessage, setCepMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const consultedCep = useRef('')
  const requestId = useRef(0)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const o = await getStoreShippingOrigin()
        if (o) {
          setId(o.id)
          setInternalName(o.internalName?.trim() || 'Origem principal')
          setSenderName(o.senderName ?? '')
          setDocument(o.document ? formatCpfOrCnpjMask(o.document) : '')
          setPhone(o.phone ? formatPhoneMask(o.phone) : '')
          setPostalCode(formatCepMask(o.postalCode))
          setStreet(o.street)
          setNumber(o.number)
          setComplement(o.complement ?? '')
          setDistrict(o.district ?? '')
          setCity(o.city)
          setState((o.state ?? '').toUpperCase().slice(0, 2))
          const digits = normalizeCep(o.postalCode)
          if (digits.length === 8) {
            consultedCep.current = digits
            setCepStatus('ok')
            setCepMessage('CEP carregado. Altere para buscar novamente.')
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar origem')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    const digits = normalizeCep(postalCode)
    if (digits.length < 8) {
      setCepStatus((s) => (s === 'loading' ? 'idle' : s))
      return
    }
    if (digits === consultedCep.current) return

    const req = ++requestId.current
    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        setCepStatus('loading')
        setCepMessage('Buscando endereço…')
        const result = await lookupCep(digits)
        if (cancelled || req !== requestId.current) return
        consultedCep.current = digits
        if (result.ok) {
          setStreet(result.data.street || '')
          setDistrict(result.data.district || '')
          setCity(result.data.city || '')
          setState((result.data.state || '').toUpperCase().slice(0, 2))
          setCepStatus('ok')
          setCepMessage('Endereço encontrado. Confira e complete o número.')
        } else {
          setCepStatus('error')
          setCepMessage(result.message || 'CEP não encontrado.')
        }
      })()
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [postalCode])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      if (!isCompleteCep(postalCode)) {
        throw new Error('Informe um CEP válido com 8 dígitos.')
      }
      if (!state || state.length !== 2) {
        throw new Error('Selecione a UF.')
      }
      if (!BRAZILIAN_STATES.some((s) => s.uf === state)) {
        throw new Error('UF inválida.')
      }
      if (!street.trim() || !number.trim() || !city.trim()) {
        throw new Error('Preencha logradouro, número e cidade.')
      }
      const saved = await upsertStoreShippingOrigin({
        id,
        internalName: internalName.trim(),
        senderName: senderName.trim(),
        document,
        phone,
        postalCode: normalizeCep(postalCode),
        street: street.trim(),
        number: number.trim(),
        complement: complement.trim() || null,
        district: district.trim() || null,
        city: city.trim(),
        state,
      })
      setId(saved.id)
      setOk('Origem e remetente salvos.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading label="Carregando origem…" />

  return (
    <div className="space-y-4">
      <Link to="/admin/logistica" className="text-sm font-semibold text-fal-navy no-underline">
        ← Logística
      </Link>
      <h1 className="text-2xl font-extrabold text-fal-navy">Origem e expedição</h1>
      <p className="text-sm text-fal-muted">
        Cadastro da origem da loja + remetente (compartilhado por frete próprio e Melhor Envio).
        Frete com transportadora externa exige credenciais configuradas no servidor. Complemento é o
        único campo opcional.
      </p>
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="grid max-w-2xl gap-3 rounded-[14px] border border-fal-line bg-white p-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <h2 className="m-0 text-sm font-extrabold text-fal-navy">Remetente</h2>
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Nome interno"
            value={internalName}
            onChange={(e) => setInternalName(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Nome do remetente"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            required
          />
        </div>
        <Input
          label="CPF / CNPJ"
          inputMode="numeric"
          value={document}
          onChange={(e) => setDocument(formatCpfOrCnpjMask(e.target.value))}
          required
        />
        <Input
          label="Telefone"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
          required
        />

        <div className="sm:col-span-2 pt-2">
          <h2 className="m-0 text-sm font-extrabold text-fal-navy">Endereço de origem</h2>
        </div>
        <div className="sm:col-span-2">
          <Input
            label="CEP"
            inputMode="numeric"
            placeholder="00000-000"
            value={postalCode}
            onChange={(e) => {
              const next = formatCepMask(e.target.value)
              const digits = normalizeCep(next)
              if (consultedCep.current && digits !== consultedCep.current) {
                consultedCep.current = ''
                setCepStatus('idle')
                setCepMessage(null)
              }
              setPostalCode(next)
            }}
            required
          />
          {cepMessage ? (
            <p
              className={[
                'mt-1 text-xs font-semibold',
                cepStatus === 'error' ? 'text-fal-danger' : '',
                cepStatus === 'ok' ? 'text-fal-success' : '',
                cepStatus === 'loading' || cepStatus === 'idle' ? 'text-fal-muted' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {cepStatus === 'ok' ? '✓ ' : null}
              {cepMessage}
            </p>
          ) : null}
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">UF</span>
          <select
            className="w-full rounded-[9px] border border-fal-line bg-white px-3 py-3 outline-none focus:border-fal-yellow-dark focus:shadow-[0_0_0_3px_rgba(242,200,75,0.2)]"
            name="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
          >
            <option value="">Selecione a UF</option>
            {BRAZILIAN_STATES.map((s) => (
              <option key={s.uf} value={s.uf}>
                {s.name} ({s.uf})
              </option>
            ))}
          </select>
        </label>
        <Input label="Cidade" value={city} onChange={(e) => setCity(e.target.value)} required />
        <Input label="Bairro" value={district} onChange={(e) => setDistrict(e.target.value)} />
        <div className="sm:col-span-2">
          <Input
            label="Logradouro"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            required
          />
        </div>
        <Input
          label="Número"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          required
        />
        <Input
          label="Complemento (opcional)"
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
