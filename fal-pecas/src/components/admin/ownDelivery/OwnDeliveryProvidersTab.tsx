import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  deleteOwnTransportProvider,
  listOwnTransportProviders,
  upsertOwnTransportProvider,
  type OwnTransportProviderRow,
} from '@/services/admin/adminOwnTransportProvidersService'
import { useCallback, useEffect, useState } from 'react'

type Props = {
  onOk: (msg: string) => void
  onError: (msg: string) => void
}

export function OwnDeliveryProvidersTab({ onOk, onError }: Props) {
  const [rows, setRows] = useState<OwnTransportProviderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [slug, setSlug] = useState('')
  const [label, setLabel] = useState('')
  const [sortOrder, setSortOrder] = useState('100')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await listOwnTransportProviders())
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao carregar prestadores'))
    } finally {
      setLoading(false)
    }
  }, [onError])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onAdd() {
    setBusy(true)
    try {
      await upsertOwnTransportProvider({
        slug,
        label,
        active: true,
        sortOrder: Number(sortOrder) || 100,
      })
      setSlug('')
      setLabel('')
      setSortOrder('100')
      onOk('Prestador cadastrado')
      await reload()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao salvar'))
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(row: OwnTransportProviderRow) {
    setBusy(true)
    try {
      await upsertOwnTransportProvider({
        id: row.id,
        slug: row.slug,
        label: row.label,
        active: !row.active,
        sortOrder: row.sortOrder,
      })
      onOk(row.active ? 'Prestador desativado' : 'Prestador ativado')
      await reload()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao atualizar'))
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(row: OwnTransportProviderRow) {
    if (!window.confirm(`Excluir “${row.label}”?`)) return
    setBusy(true)
    try {
      await deleteOwnTransportProvider(row.id)
      onOk('Prestador excluído')
      await reload()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao excluir'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-fal-line bg-white p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">Prestadores / apps</h2>
        <p className="mb-0 mt-1 text-sm text-fal-muted">
          Uber, 99 e outros usados no despacho de frete próprio. Não altera o frete cobrado do
          cliente.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="uber" />
        <Input
          label="Nome"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Uber"
        />
        <Input
          label="Ordem"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          placeholder="10"
        />
        <div className="flex items-end">
          <Button type="button" disabled={busy || !slug.trim() || !label.trim()} onClick={() => void onAdd()}>
            Adicionar
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-fal-muted">Carregando…</p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-fal-line px-3 py-2"
            >
              <div>
                <strong className="text-fal-navy">{row.label}</strong>
                <span className="ml-2 text-xs text-fal-muted">
                  {row.slug} · ordem {row.sortOrder}
                  {!row.active ? ' · inativo' : ''}
                </span>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="light" disabled={busy} onClick={() => void toggleActive(row)}>
                  {row.active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => void onDelete(row)}>
                  Excluir
                </Button>
              </div>
            </li>
          ))}
          {!rows.length ? (
            <li className="text-sm text-fal-muted">Nenhum prestador. Use o formulário acima.</li>
          ) : null}
        </ul>
      )}
    </section>
  )
}
