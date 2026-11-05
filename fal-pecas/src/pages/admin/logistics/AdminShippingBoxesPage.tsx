import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminDeleteShippingBox,
  adminListShippingBoxes,
  adminUpsertShippingBox,
  type ShippingBoxTemplate,
} from '@/services/admin/adminShippingBoxService'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

const emptyForm = {
  name: '',
  lengthCm: '40',
  widthCm: '30',
  heightCm: '20',
  emptyWeightKg: '0.2',
  maxWeightKg: '30',
  active: true,
  sortOrder: '0',
}

export function AdminShippingBoxesPage() {
  const [rows, setRows] = useState<ShippingBoxTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function reload() {
    setLoading(true)
    try {
      setRows(await adminListShippingBoxes())
      setError(null)
    } catch (e) {
      setError(toUserMessage(e, 'Erro ao carregar caixas'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await adminUpsertShippingBox({
        id: editingId ?? undefined,
        name: form.name,
        lengthCm: Number(form.lengthCm),
        widthCm: Number(form.widthCm),
        heightCm: Number(form.heightCm),
        emptyWeightKg: Number(form.emptyWeightKg),
        maxWeightKg: form.maxWeightKg.trim() ? Number(form.maxWeightKg) : null,
        active: form.active,
        sortOrder: Number(form.sortOrder) || 0,
      })
      setForm(emptyForm)
      setEditingId(null)
      await reload()
    } catch (err) {
      setError(toUserMessage(err, 'Falha ao salvar caixa'))
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(row: ShippingBoxTemplate) {
    const { confirmed } = await confirmDialog({
      title: 'Excluir caixa',
      message: `Excluir o modelo "${row.name}"?`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!confirmed) return
    setBusy(true)
    try {
      await adminDeleteShippingBox(row.id)
      await reload()
    } catch (err) {
      setError(toUserMessage(err, 'Falha ao excluir'))
    } finally {
      setBusy(false)
    }
  }

  function startEdit(row: ShippingBoxTemplate) {
    setEditingId(row.id)
    setForm({
      name: row.name,
      lengthCm: String(row.lengthCm),
      widthCm: String(row.widthCm),
      heightCm: String(row.heightCm),
      emptyWeightKg: String(row.emptyWeightKg),
      maxWeightKg: row.maxWeightKg != null ? String(row.maxWeightKg) : '',
      active: row.active,
      sortOrder: String(row.sortOrder),
    })
  }

  return (
    <div className="space-y-4">
      <Link to="/admin/logistica" className="text-sm font-semibold text-fal-navy no-underline">
        ← Logística
      </Link>
      <div>
        <h1 className="mt-0 text-[28px] font-extrabold text-fal-navy">Caixas e embalagens</h1>
        <p className="m-0 text-sm text-fal-muted">
          Modelos usados na cotação de frete. A regra v1 escolhe a menor caixa que comporta o volume
          e o peso dos itens do carrinho.
        </p>
      </div>

      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {loading ? <Loading label="Carregando caixas…" /> : null}

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-[14px] border border-fal-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Input
          label="Nome"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <Input
          label="Comprimento (cm)"
          type="number"
          step="0.1"
          min="0.1"
          value={form.lengthCm}
          onChange={(e) => setForm((f) => ({ ...f, lengthCm: e.target.value }))}
          required
        />
        <Input
          label="Largura (cm)"
          type="number"
          step="0.1"
          min="0.1"
          value={form.widthCm}
          onChange={(e) => setForm((f) => ({ ...f, widthCm: e.target.value }))}
          required
        />
        <Input
          label="Altura (cm)"
          type="number"
          step="0.1"
          min="0.1"
          value={form.heightCm}
          onChange={(e) => setForm((f) => ({ ...f, heightCm: e.target.value }))}
          required
        />
        <Input
          label="Peso da embalagem (kg)"
          type="number"
          step="0.001"
          min="0"
          value={form.emptyWeightKg}
          onChange={(e) => setForm((f) => ({ ...f, emptyWeightKg: e.target.value }))}
        />
        <Input
          label="Peso máx. (kg, opcional)"
          type="number"
          step="0.1"
          min="0"
          value={form.maxWeightKg}
          onChange={(e) => setForm((f) => ({ ...f, maxWeightKg: e.target.value }))}
        />
        <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
          />
          Ativa
        </label>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="submit" variant="primary" disabled={busy}>
            {editingId ? 'Salvar alterações' : 'Adicionar caixa'}
          </Button>
          {editingId ? (
            <Button
              type="button"
              variant="light"
              onClick={() => {
                setEditingId(null)
                setForm(emptyForm)
              }}
            >
              Cancelar edição
            </Button>
          ) : null}
        </div>
      </form>

      {!loading && rows.length === 0 ? (
        <p className="text-sm text-fal-muted">Nenhuma caixa cadastrada ainda.</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-fal-bg text-fal-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Nome</th>
                <th className="px-3 py-2 font-semibold">Dimensões</th>
                <th className="px-3 py-2 font-semibold">Peso emb.</th>
                <th className="px-3 py-2 font-semibold">Máx.</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-fal-line">
                  <td className="px-3 py-2 font-semibold text-fal-navy">{r.name}</td>
                  <td className="px-3 py-2">
                    {r.lengthCm} × {r.widthCm} × {r.heightCm} cm
                  </td>
                  <td className="px-3 py-2">{r.emptyWeightKg} kg</td>
                  <td className="px-3 py-2">
                    {r.maxWeightKg != null ? `${r.maxWeightKg} kg` : '—'}
                  </td>
                  <td className="px-3 py-2">{r.active ? 'Ativa' : 'Inativa'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="light" onClick={() => startEdit(r)}>
                        Editar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void onDelete(r)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
