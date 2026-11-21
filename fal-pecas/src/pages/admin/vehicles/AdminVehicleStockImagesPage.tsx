import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminListStockImages,
  adminSetStockImageActive,
  adminUpsertStockImage,
  type AdminStockImageRow,
} from '@/services/admin/adminVehicleStockImageService'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

export function AdminVehicleStockImagesPage() {
  useDocumentTitle('Imagens stock 2D | Admin FAL')
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AdminStockImageRow[]>([])
  const [saving, setSaving] = useState(false)
  const [maker, setMaker] = useState('')
  const [model, setModel] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [matchLevel, setMatchLevel] = useState<'exact' | 'family' | 'generic'>('exact')
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')

  const reload = useCallback(async () => {
    setRows(await adminListStockImages())
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        await reload()
      } catch (e) {
        toast.push(toUserMessage(e, 'Erro ao carregar stock 2D'), 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [reload, toast])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!maker.trim() || !model.trim() || !imageUrl.trim()) {
      toast.push('Informe montadora, modelo e URL da imagem', 'error')
      return
    }
    setSaving(true)
    try {
      await adminUpsertStockImage({
        maker,
        model,
        imageUrl,
        matchLevel,
        yearFrom: yearFrom.trim() ? Number(yearFrom) : null,
        yearTo: yearTo.trim() ? Number(yearTo) : null,
      })
      toast.push('Imagem stock salva', 'success')
      setMaker('')
      setModel('')
      setImageUrl('')
      setYearFrom('')
      setYearTo('')
      await reload()
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao salvar'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading label="Carregando imagens stock…" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="m-0 text-2xl font-extrabold text-fal-fg">Imagens stock 2D</h1>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Cascata da garagem: foto pessoal → stock local → placeholder. Sem CarImages.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="grid gap-3 rounded-fal border border-fal-line bg-fal-surface p-4 sm:grid-cols-2"
      >
        <Input label="Montadora" value={maker} onChange={(ev) => setMaker(ev.target.value)} />
        <Input label="Modelo" value={model} onChange={(ev) => setModel(ev.target.value)} />
        <div className="sm:col-span-2">
          <Input
            label="URL da imagem (https)"
            value={imageUrl}
            onChange={(ev) => setImageUrl(ev.target.value)}
          />
        </div>
        <label className="block text-sm font-semibold">
          Nível de match
          <select
            className="mt-1 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm"
            value={matchLevel}
            onChange={(ev) => setMatchLevel(ev.target.value as typeof matchLevel)}
          >
            <option value="exact">exact (modelo)</option>
            <option value="family">family (família)</option>
            <option value="generic">generic (marca)</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Ano de"
            value={yearFrom}
            onChange={(ev) => setYearFrom(ev.target.value)}
            inputMode="numeric"
          />
          <Input
            label="Ano até"
            value={yearTo}
            onChange={(ev) => setYearTo(ev.target.value)}
            inputMode="numeric"
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving}>
            Adicionar stock
          </Button>
        </div>
      </form>

      {!rows.length ? (
        <EmptyState
          title="Nenhuma imagem stock"
          description="Cadastre URLs licenciadas para os modelos mais comuns da loja."
        />
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-3 rounded-fal border border-fal-line bg-fal-surface px-3 py-2"
            >
              {row.imageUrl ? (
                <img
                  src={row.imageUrl}
                  alt=""
                  className="h-14 w-20 rounded object-cover"
                />
              ) : (
                <div className="flex h-14 w-20 items-center justify-center rounded bg-fal-bg text-[10px] text-fal-muted">
                  sem URL
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="m-0 text-sm font-extrabold">
                  {row.maker} {row.model}
                </p>
                <p className="m-0 text-xs text-fal-muted">
                  {row.matchLevel}
                  {row.yearFrom != null || row.yearTo != null
                    ? ` · ${row.yearFrom ?? '…'}–${row.yearTo ?? '…'}`
                    : ''}
                  {row.active ? '' : ' · inativa'}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="light"
                onClick={() =>
                  void adminSetStockImageActive(row.id, !row.active)
                    .then(() => reload())
                    .then(() => toast.push(row.active ? 'Desativada' : 'Ativada', 'success'))
                    .catch((err) => toast.push(toUserMessage(err, 'Falha'), 'error'))
                }
              >
                {row.active ? 'Desativar' : 'Ativar'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
