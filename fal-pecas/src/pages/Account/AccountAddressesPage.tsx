import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  upsertAddress,
} from '@/services/customers/addressService'
import type { CustomerAddress } from '@/types'
import { useEffect, useState, type FormEvent } from 'react'

const emptyForm = {
  label: '',
  recipient: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
  postalCode: '',
  isDefault: false,
}

export function AccountAddressesPage() {
  const [items, setItems] = useState<CustomerAddress[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    try {
      setItems(await listAddresses())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao listar endereços')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await upsertAddress({
        id: editingId ?? undefined,
        ...form,
        label: form.label || null,
        complement: form.complement || null,
        district: form.district || null,
      })
      setForm(emptyForm)
      setEditingId(null)
      setMessage(editingId ? 'Endereço atualizado.' : 'Endereço cadastrado.')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar endereço')
    }
  }

  function startEdit(a: CustomerAddress) {
    setEditingId(a.id)
    setForm({
      label: a.label ?? '',
      recipient: a.recipient,
      street: a.street,
      number: a.number,
      complement: a.complement ?? '',
      district: a.district ?? '',
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      isDefault: a.isDefault,
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-fal border border-fal-line bg-white p-5">
        <h2 className="mt-0 text-xl font-extrabold">Endereços</h2>
        <p className="text-sm text-fal-muted">Você pode manter vários endereços e marcar um padrão.</p>
        {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
        {message ? <p className="text-sm font-semibold text-fal-navy">{message}</p> : null}

        <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input label="Apelido (Casa, Trabalho…)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <Input label="Destinatário" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} required />
          <Input label="CEP" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} required />
          <Input label="UF" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
          <Input label="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          <Input label="Bairro" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
          <div className="sm:col-span-2">
            <Input label="Logradouro" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} required />
          </div>
          <Input label="Número" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
          <Input label="Complemento" value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} />
          <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            Definir como endereço padrão
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">{editingId ? 'Salvar endereço' : 'Adicionar endereço'}</Button>
            {editingId ? (
              <Button
                type="button"
                variant="light"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                }}
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      </div>

      {loading ? <Loading /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState title="Você ainda não possui endereços cadastrados." description="Cadastre o primeiro endereço no formulário acima." />
      ) : null}

      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.id} className="rounded-fal border border-fal-line bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="m-0 font-extrabold">
                  {a.label || 'Endereço'} {a.isDefault ? <span className="text-xs text-fal-success">· Padrão</span> : null}
                </p>
                <p className="mb-0 mt-1 text-sm text-fal-muted">
                  {a.recipient} — {a.street}, {a.number}
                  {a.complement ? ` (${a.complement})` : ''}
                  <br />
                  {a.district ? `${a.district}, ` : ''}
                  {a.city}/{a.state} · CEP {a.postalCode}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="light" size="sm" onClick={() => startEdit(a)}>
                  Editar
                </Button>
                {!a.isDefault ? (
                  <Button
                    type="button"
                    variant="light"
                    size="sm"
                    onClick={() =>
                      void setDefaultAddress(a.id)
                        .then(reload)
                        .catch((err) => setError(String(err)))
                    }
                  >
                    Tornar padrão
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (!window.confirm('Excluir este endereço?')) return
                    void deleteAddress(a.id)
                      .then(reload)
                      .catch((err) => setError(String(err)))
                  }}
                >
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
