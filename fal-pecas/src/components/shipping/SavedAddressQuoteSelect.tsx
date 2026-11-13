import { Select } from '@/components/common/Select'
import { formatCepMask } from '@/lib/cep'
import { useAuth } from '@/contexts/AuthContext'
import { listAddresses } from '@/services/customers/addressService'
import type { CustomerAddress } from '@/types'
import { useEffect, useMemo, useState } from 'react'

type Props = {
  valueId: string
  onSelect: (address: CustomerAddress | null) => void
  /** id do select (acessibilidade) */
  name?: string
}

function addressOptionLabel(a: CustomerAddress): string {
  const tag = a.label?.trim() || (a.isDefault ? 'Padrão' : 'Endereço')
  const cep = formatCepMask(a.postalCode)
  return `${tag} — ${cep} — ${a.street}, ${a.number} · ${a.city}/${a.state}`
}

/** Seletor de endereços salvos no perfil para cotar frete (PDP/carrinho). */
export function SavedAddressQuoteSelect({ valueId, onSelect, name = 'saved-ship-address' }: Props) {
  const { user } = useAuth()
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      setAddresses([])
      return
    }
    let active = true
    setLoading(true)
    void listAddresses()
      .then((list) => {
        if (!active) return
        setAddresses(list)
      })
      .catch(() => {
        if (active) setAddresses([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  const options = useMemo(
    () =>
      addresses.map((a) => ({
        value: a.id,
        label: addressOptionLabel(a),
      })),
    [addresses],
  )

  if (!user || (!loading && addresses.length === 0)) return null

  return (
    <div className="mb-2">
      <Select
        label="Endereço salvo no perfil"
        name={name}
        placeholder={loading ? 'Carregando…' : 'Outro CEP (digitar abaixo)'}
        options={options}
        value={valueId}
        disabled={loading}
        onChange={(e) => {
          const id = e.target.value
          const found = addresses.find((a) => a.id === id) ?? null
          onSelect(found)
        }}
      />
      <p className="mb-0 mt-1 text-[11px] text-fal-muted">Ou digite outro CEP abaixo.</p>
    </div>
  )
}
