import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useAuth } from '@/contexts/AuthContext'
import {
  adminApplyPriceImport,
  adminCreatePriceImport,
  adminDeletePriceListItem,
  adminFindProductIdBySku,
  adminGetPriceList,
  adminListPriceListItems,
  adminUpsertPriceListItem,
  type ImportPreviewRow,
  type PriceList,
  type PriceListItem,
} from '@/services/admin/adminPriceListService'
import { parsePriceCsv, parsePriceXlsx } from '@/services/admin/priceImportParser'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

export function AdminPriceListDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const [list, setList] = useState<PriceList | null>(null)
  const [items, setItems] = useState<PriceListItem[]>([])
  const [q, setQ] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportPreviewRow[] | null>(null)
  const [importFileName, setImportFileName] = useState('')
  const [importId, setImportId] = useState<string | null>(null)
  const [importReport, setImportReport] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function reload(search = q) {
    setLoading(true)
    setError(null)
    try {
      const [l, its] = await Promise.all([
        adminGetPriceList(id),
        adminListPriceListItems(id, search),
      ])
      setList(l)
      setItems(its)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function onAddItem(e: FormEvent) {
    e.preventDefault()
    try {
      const productId = await adminFindProductIdBySku(sku)
      if (!productId) throw new Error(`SKU não encontrado: ${sku}`)
      await adminUpsertPriceListItem({
        priceListId: id,
        productId,
        price: Number(price),
        source: 'manual',
        changedBy: user?.id ?? null,
      })
      setSku('')
      setPrice('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar item')
    }
  }

  async function buildPreview(file: File) {
    setBusy(true)
    setError(null)
    setImportReport(null)
    setImportId(null)
    try {
      setImportFileName(file.name)
      const lower = file.name.toLowerCase()
      const parsed =
        lower.endsWith('.xlsx') || lower.endsWith('.xls')
          ? await parsePriceXlsx(await file.arrayBuffer())
          : parsePriceCsv(await file.text())

      const rows: ImportPreviewRow[] = []
      for (const p of parsed) {
        const errors: string[] = []
        const warnings: string[] = []
        if (!p.sku) errors.push('SKU vazio')
        if (p.price == null || Number.isNaN(p.price)) errors.push('Preço inválido')
        else if (p.price < 0) errors.push('Preço negativo')
        let productId: string | null = null
        if (p.sku) {
          productId = await adminFindProductIdBySku(p.sku)
          if (!productId) errors.push('SKU não encontrado')
        }
        rows.push({
          line: p.line,
          sku: p.sku,
          price: p.price,
          productId,
          errors,
          warnings,
          ok: errors.length === 0,
        })
      }
      setPreview(rows)
      const createdId = await adminCreatePriceImport({
        filename: file.name,
        priceListId: id,
        createdBy: user?.id ?? null,
        rows,
      })
      setImportId(createdId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no parse')
      setPreview(null)
    } finally {
      setBusy(false)
    }
  }

  async function confirmImport() {
    if (!importId) return
    setBusy(true)
    setError(null)
    try {
      const result = await adminApplyPriceImport(importId, id)
      setImportReport(`Aplicados: ${result.applied}. Falhas: ${result.failed}.`)
      setPreview(null)
      setImportId(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao importar')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !list) return <Loading label="Carregando lista…" />
  if (!list) return <p className="text-red-600">Lista não encontrada.</p>

  const validCount = preview?.filter((r) => r.ok).length ?? 0
  const invalidCount = preview?.filter((r) => !r.ok).length ?? 0

  return (
    <div className="space-y-4">
      <div>
        <Link to="/admin/precos" className="text-sm font-semibold text-fal-navy underline">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-fal-navy">{list.name}</h1>
        <p className="text-sm text-fal-muted">
          {list.slug} · {list.status} · prioridade {list.priority}
        </p>
      </div>

      <form
        onSubmit={onAddItem}
        className="grid gap-3 rounded-[14px] border border-fal-line bg-white p-4 md:grid-cols-4"
      >
        <Input label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} required />
        <Input
          label="Preço"
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <div className="flex items-end">
          <Button type="submit">Upsert item</Button>
        </div>
        <div className="flex items-end gap-2">
          <Input label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="button" variant="light" onClick={() => void reload(q)}>
            Filtrar
          </Button>
        </div>
      </form>

      <div className="rounded-[14px] border border-fal-line bg-white p-4">
        <h2 className="text-lg font-extrabold text-fal-navy">Importar CSV/XLSX</h2>
        <p className="mt-1 text-sm text-fal-muted">
          Formato: SKU;PRECO — preview obrigatório antes de aplicar.
        </p>
        <input
          className="mt-3 block w-full text-sm"
          type="file"
          accept=".csv,.xlsx,.xls,text/csv"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void buildPreview(f)
            e.target.value = ''
          }}
        />
        {preview ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm">
              Arquivo <strong>{importFileName}</strong> — válidos: {validCount}, inválidos:{' '}
              {invalidCount}
            </p>
            <div className="max-h-48 overflow-auto rounded border border-fal-line text-xs">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-fal-bg text-left">
                    <th className="px-2 py-1">Linha</th>
                    <th className="px-2 py-1">SKU</th>
                    <th className="px-2 py-1">Preço</th>
                    <th className="px-2 py-1">Erros</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((r) => (
                    <tr key={r.line} className={r.ok ? '' : 'bg-red-50'}>
                      <td className="px-2 py-1">{r.line}</td>
                      <td className="px-2 py-1">{r.sku}</td>
                      <td className="px-2 py-1">{r.price ?? '—'}</td>
                      <td className="px-2 py-1">{r.errors.join('; ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={busy || validCount === 0}
                onClick={() => void confirmImport()}
              >
                Confirmar importação ({validCount})
              </Button>
              <Button
                type="button"
                variant="light"
                onClick={() => {
                  setPreview(null)
                  setImportId(null)
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
        {importReport ? <p className="mt-2 text-sm text-green-700">{importReport}</p> : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-fal-line bg-fal-bg text-fal-muted">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Produto</th>
              <th className="px-3 py-2">Preço</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-fal-line/70">
                <td className="px-3 py-2 font-mono text-xs">{item.sku}</td>
                <td className="px-3 py-2">{item.productName}</td>
                <td className="px-3 py-2">
                  {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-sm font-semibold text-red-700 underline"
                    onClick={() =>
                      void adminDeletePriceListItem(item.id).then(() => reload())
                    }
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
