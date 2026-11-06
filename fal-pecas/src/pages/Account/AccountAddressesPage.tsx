import { AddressForm, emptyAddressForm } from '@/components/address/AddressForm'
import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Loading } from '@/components/common/Loading'
import { useAuth } from '@/contexts/AuthContext'
import { formatCepMask } from '@/lib/cep'
import {
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  upsertAddress,
} from '@/services/customers/addressService'
import type { CustomerAddress } from '@/types'
import { useEffect, useState } from 'react'

export function AccountAddressesPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<CustomerAddress[]>([])
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [initial, setInitial] = useState(emptyAddressForm)
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

  function openCreate() {
    setEditingId(null)
    setInitial({
      ...emptyAddressForm,
      recipient: user?.fullName?.trim() || user?.email || '',
      isDefault: items.length === 0,
    })
    setFormKey((k) => k + 1)
    setMode('create')
    setMessage(null)
  }

  function startEdit(a: CustomerAddress) {
    setEditingId(a.id)
    setInitial({
      label: a.label ?? '',
      recipient: a.recipient,
      street: a.street,
      number: a.number,
      complement: a.complement ?? '',
      reference: a.reference ?? '',
      district: a.district ?? '',
      city: a.city,
      state: a.state,
      postalCode: formatCepMask(a.postalCode),
      isDefault: a.isDefault,
    })
    setFormKey((k) => k + 1)
    setMode('edit')
    setMessage(null)
  }

  function backToList() {
    setMode('list')
    setEditingId(null)
    setInitial(emptyAddressForm)
    setFormKey((k) => k + 1)
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-fal-navy">{message}</p> : null}

      {mode === 'list' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-xl font-extrabold">Meus endereços</h2>
              <p className="mt-1 mb-0 text-sm text-fal-muted">
                Use o CEP para preencher o endereço automaticamente — depois informe só o número.
              </p>
            </div>
            <Button type="button" onClick={openCreate}>
              + Adicionar endereço
            </Button>
          </div>

          {loading ? <Loading /> : null}
          {!loading && items.length === 0 ? (
            <EmptyState
              title="Você ainda não possui endereços cadastrados."
              description="Adicione um endereço para usar no checkout."
            />
          ) : null}

          <div className="space-y-3">
            {items.map((a) => (
              <div key={a.id} className="rounded-fal border border-fal-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="m-0 font-extrabold">
                      {a.label || 'Endereço'}{' '}
                      {a.isDefault ? (
                        <span className="ml-1 rounded bg-fal-yellow px-2 py-0.5 text-[10px] font-extrabold text-fal-navy-dark">
                          Principal
                        </span>
                      ) : null}
                    </p>
                    <p className="mb-0 mt-1 text-sm text-fal-muted">
                      {a.recipient}
                      <br />
                      {a.street}, {a.number}
                      {a.complement ? ` — ${a.complement}` : ''}
                      <br />
                      {a.district ? `${a.district}` : ''}
                      {a.district ? <br /> : null}
                      {a.city} - {a.state}
                      <br />
                      {formatCepMask(a.postalCode)}
                      {a.reference ? (
                        <>
                          <br />
                          Ref.: {a.reference}
                        </>
                      ) : null}
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
                        void (async () => {
                          const { confirmed } = await confirmDialog({
                            title: 'Excluir endereço?',
                            message: 'Excluir este endereço?',
                            confirmLabel: 'Excluir',
                            danger: true,
                          })
                          if (!confirmed) return
                          try {
                            await deleteAddress(a.id)
                            await reload()
                          } catch (err) {
                            setError(String(err))
                          }
                        })()
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-fal border border-fal-line bg-white p-5">
          <h2 className="mt-0 text-xl font-extrabold">
            {mode === 'edit' ? 'Editar endereço' : 'Novo endereço'}
          </h2>
          <p className="text-sm text-fal-muted">
            Informe o CEP para preencher o endereço. Em seguida digite o número.
          </p>
          <div className="mt-4">
            <AddressForm
              key={formKey}
              initial={initial}
              submitLabel="Salvar endereço"
              showCancel
              onCancel={backToList}
              onSubmit={async (values) => {
                setError(null)
                setMessage(null)
                await upsertAddress({
                  id: editingId ?? undefined,
                  ...values,
                  label: values.label || null,
                  complement: values.complement || null,
                  reference: values.reference || null,
                  district: values.district || null,
                })
                setMessage(editingId ? 'Endereço atualizado.' : 'Endereço cadastrado.')
                backToList()
                await reload()
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
