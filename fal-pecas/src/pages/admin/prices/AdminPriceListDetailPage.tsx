import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useAuth } from '@/contexts/AuthContext'
import { formatMoney, formatMoneyInput, parseMoneyBr } from '@/lib/money'
import { adminListActiveOverrideProductIds } from '@/services/admin/adminPriceOverrideService'
import {
  adminAdjustAllPriceListItems,
  adminApplyPriceImport,
  adminCreatePriceImport,
  adminDeletePriceListItem,
  adminFindProductIdBySku,
  adminGetPriceList,
  adminListPriceListItems,
  adminUpsertPriceListItem,
  computeAdjustedPrice,
  type ImportPreviewRow,
  type PriceAdjustMode,
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
  const [overrideIds, setOverrideIds] = useState<Set<string>>(new Set())
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
  /** itemId em edição inline */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [rowBusy, setRowBusy] = useState<string | null>(null)
  /** Ajuste global */
  const [adjustMode, setAdjustMode] = useState<PriceAdjustMode>('percent')
  const [adjustDirection, setAdjustDirection] = useState<'up' | 'down'>('up')
  const [adjustValue, setAdjustValue] = useState('')
  const [adjustReport, setAdjustReport] = useState<string | null>(null)

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
      setOverrideIds(await adminListActiveOverrideProductIds(its.map((i) => i.productId)))
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
    setError(null)
    try {
      const productId = await adminFindProductIdBySku(sku)
      if (!productId) throw new Error(`SKU não encontrado: ${sku}`)
      const priceNum = parseMoneyBr(price)
      if (priceNum == null || priceNum < 0) throw new Error('Preço inválido')
      await adminUpsertPriceListItem({
        priceListId: id,
        productId,
        price: priceNum,
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

  function startEdit(item: PriceListItem) {
    setEditingId(item.id)
    setEditPrice(formatMoneyInput(item.price))
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditPrice('')
  }

  async function saveEdit(item: PriceListItem) {
    const priceNum = parseMoneyBr(editPrice)
    if (priceNum == null || priceNum < 0) {
      setError('Preço inválido')
      return
    }
    setRowBusy(item.id)
    setError(null)
    try {
      await adminUpsertPriceListItem({
        priceListId: id,
        productId: item.productId,
        price: priceNum,
        source: 'manual',
        changedBy: user?.id ?? null,
      })
      setEditingId(null)
      setEditPrice('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar preço')
    } finally {
      setRowBusy(null)
    }
  }

  async function removeItem(itemId: string) {
    if (!window.confirm('Remover este item da lista?')) return
    setRowBusy(itemId)
    setError(null)
    try {
      await adminDeletePriceListItem(itemId)
      if (editingId === itemId) cancelEdit()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao remover')
    } finally {
      setRowBusy(null)
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

  async function onApplyGlobalAdjust() {
    setError(null)
    setAdjustReport(null)
    const raw =
      adjustMode === 'percent'
        ? Number(String(adjustValue).trim().replace(',', '.'))
        : parseMoneyBr(adjustValue)
    if (raw == null || !Number.isFinite(raw) || raw <= 0) {
      setError('Informe um valor de ajuste maior que zero.')
      return
    }
    if (adjustMode === 'percent' && raw > 100) {
      setError('Percentual deve ser no máximo 100.')
      return
    }
    const signed = adjustDirection === 'up' ? raw : -raw
    const label =
      adjustMode === 'percent'
        ? `${adjustDirection === 'up' ? '+' : '−'}${raw}%`
        : `${adjustDirection === 'up' ? '+' : '−'}${formatMoney(raw)}`

    const sampleLines = items.slice(0, 5).map((it) => {
      const next = computeAdjustedPrice(it.price, adjustMode, signed)
      return `${it.sku ?? '—'}: ${formatMoney(it.price)} → ${formatMoney(next)}`
    })
    const preview =
      sampleLines.length > 0
        ? `\n\nAmostra:\n${sampleLines.join('\n')}`
        : '\n\n(Lista sem itens visíveis na tela — o ajuste atômico vale para todos os itens no banco.)'

    if (
      !window.confirm(
        `Aplicar ajuste global ${label} em TODOS os itens desta lista?${preview}\n\nPreço avulso não é alterado. Operação atômica.`,
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const result = await adminAdjustAllPriceListItems({
        priceListId: id,
        mode: adjustMode,
        value: signed,
        changedBy: user?.id ?? null,
      })
      const rpcSample =
        result.sample.length > 0
          ? ` Amostra: ${result.sample.map((s) => `${s.sku} ${formatMoney(s.old)}→${formatMoney(s.new)}`).join('; ')}.`
          : ''
      setAdjustReport(
        `Ajuste ${label}: ${result.updated} atualizado(s), ${result.skipped} sem mudança.${rpcSample}`,
      )
      setAdjustValue('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no ajuste global')
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
          {list.slug} · {list.status} · prioridade {list.priority} · {items.length} item(ns)
        </p>
      </div>

      <form
        onSubmit={(e) => void onAddItem(e)}
        className="grid gap-3 rounded-[14px] border border-fal-line bg-white p-4 md:grid-cols-4"
      >
        <div className="md:col-span-4">
          <h2 className="m-0 text-lg font-extrabold text-fal-navy">Adicionar ou atualizar item</h2>
          <p className="mt-1 mb-0 text-sm text-fal-muted">
            Preços de lista só são editados aqui (produto a produto). No cadastro do produto o avulso é
            exceção. Informe o SKU e o preço — se o SKU já estiver na lista, o preço é atualizado.
          </p>
        </div>
        <Input label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} required />
        <Input
          label="Preço"
          inputMode="decimal"
          placeholder="0,00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <div className="flex items-end">
          <Button type="submit">Adicionar item</Button>
        </div>
        <div className="flex items-end gap-2">
          <Input
            label="Buscar na lista"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="SKU ou nome"
          />
          <Button type="button" variant="light" onClick={() => void reload(q)}>
            Filtrar
          </Button>
        </div>
      </form>

      <div className="rounded-[14px] border border-fal-line bg-white p-4">
        <h2 className="text-lg font-extrabold text-fal-navy">Ajuste global da lista</h2>
        <p className="mt-1 text-sm text-fal-muted">
          Aplica porcentagem ou valor fixo (acréscimo/desconto) em todos os itens desta lista. Não altera
          preço avulso.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-extrabold text-fal-muted">Tipo</span>
            <select
              className="w-full rounded-[9px] border border-fal-line bg-white px-3 py-3"
              value={adjustMode}
              onChange={(e) => setAdjustMode(e.target.value as PriceAdjustMode)}
              disabled={busy}
            >
              <option value="percent">Percentual (%)</option>
              <option value="fixed">Valor fixo (R$)</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-extrabold text-fal-muted">Operação</span>
            <select
              className="w-full rounded-[9px] border border-fal-line bg-white px-3 py-3"
              value={adjustDirection}
              onChange={(e) => setAdjustDirection(e.target.value as 'up' | 'down')}
              disabled={busy}
            >
              <option value="up">Aumentar</option>
              <option value="down">Diminuir</option>
            </select>
          </label>
          <Input
            label={adjustMode === 'percent' ? 'Valor (%)' : 'Valor (R$)'}
            inputMode="decimal"
            placeholder={adjustMode === 'percent' ? '10' : '5,00'}
            value={adjustValue}
            onChange={(e) => setAdjustValue(e.target.value)}
            disabled={busy}
          />
          <div className="flex items-end">
            <Button type="button" disabled={busy || !adjustValue.trim()} onClick={() => void onApplyGlobalAdjust()}>
              {busy ? 'Aplicando…' : 'Aplicar a todos'}
            </Button>
          </div>
        </div>
        {adjustReport ? <p className="mt-2 text-sm text-green-700">{adjustReport}</p> : null}
      </div>

      <div className="rounded-[14px] border border-fal-line bg-white p-4">
        <h2 className="text-lg font-extrabold text-fal-navy">Importar CSV/XLSX (alteração em massa)</h2>
        <p className="mt-1 text-sm text-fal-muted">
          Caminho para atualizar muitos preços de uma vez. Formato: SKU;PRECO — preview obrigatório
          antes de aplicar. Não altera preço avulso dos produtos.
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
                      <td className="px-2 py-1">
                        {r.price != null ? formatMoney(r.price) : '—'}
                      </td>
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
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-fal-muted">
                  Nenhum item nesta lista. Adicione pelo formulário acima ou por importação.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isEditing = editingId === item.id
                const busyRow = rowBusy === item.id
                return (
                  <tr key={item.id} className="border-b border-fal-line/70">
                    <td className="px-3 py-2 font-mono text-xs">{item.sku}</td>
                    <td className="px-3 py-2">
                      {item.productName}
                      {overrideIds.has(item.productId) ? (
                        <span
                          className="ml-2 inline-block rounded bg-fal-yellow/80 px-1.5 py-0.5 text-[10px] font-extrabold text-fal-navy-dark"
                          title="Há preço avulso ativo — ele vence o preço desta lista na vitrine"
                        >
                          Avulso ativo
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          className="w-28 rounded-[8px] border border-fal-line px-2 py-1"
                          inputMode="decimal"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          disabled={busyRow}
                          autoFocus
                        />
                      ) : (
                        formatMoney(item.price)
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="text-sm font-semibold text-fal-navy underline"
                              disabled={busyRow}
                              onClick={() => void saveEdit(item)}
                            >
                              {busyRow ? 'Salvando…' : 'Salvar'}
                            </button>
                            <button
                              type="button"
                              className="text-sm font-semibold text-fal-muted underline"
                              disabled={busyRow}
                              onClick={cancelEdit}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="text-sm font-semibold text-fal-navy underline"
                            disabled={busyRow}
                            onClick={() => startEdit(item)}
                          >
                            Alterar preço
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-sm font-semibold text-red-700 underline"
                          disabled={busyRow}
                          onClick={() => void removeItem(item.id)}
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
