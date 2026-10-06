import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { formatMoney } from '@/lib/money'
import {
  adminApplyCostImport,
  adminCreateCostImport,
  adminPreviewCostImport,
  type CostImportPreviewRow,
} from '@/services/admin/adminCostImportService'
import {
  adminApplyPriceImport,
  adminCreatePriceImport,
  adminGetPriceListsOverview,
  adminPreviewPriceImport,
  type ImportPreviewRow,
  type PriceListOverviewRow,
} from '@/services/admin/adminPriceListService'
import {
  classifyPriceImportAction,
  filterRowsForImportMode,
  priceImportActionLabel,
  summarizePriceImportActions,
  type PriceImportMode,
} from '@/services/admin/priceImportActions'
import { adminListSuppliers } from '@/services/admin/adminSupplierService'
import {
  detectImportProfile,
  fingerprintHeaders,
  listImportProfiles,
  saveImportProfile,
  type SavedImportProfile,
} from '@/services/import/importProfiles'
import type { Supplier } from '@/types'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type SheetKind = 'sell_price' | 'supplier_cost'
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

type Props = {
  open: boolean
  onClose: () => void
  /** Pré-selecionada quando aberto do detalhe (fluxo venda) */
  initialPriceListId?: string
  createdBy?: string | null
  allowed: boolean
  onApplied?: () => void
}

export function PriceImportWizard({
  open,
  onClose,
  initialPriceListId,
  createdBy,
  allowed,
  onApplied,
}: Props) {
  const [step, setStep] = useState<Step>(0)
  const [sheetKind, setSheetKind] = useState<SheetKind | null>(null)

  const [lists, setLists] = useState<PriceListOverviewRow[]>([])
  const [priceListId, setPriceListId] = useState(initialPriceListId ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<PriceImportMode>('both')
  const [allowZeroPrice, setAllowZeroPrice] = useState(false)
  const [rawRows, setRawRows] = useState<ImportPreviewRow[] | null>(null)
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importId, setImportId] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('HF — Lista de preços')
  const [detectedProfile, setDetectedProfile] = useState<SavedImportProfile | null>(null)
  const [savedProfiles, setSavedProfiles] = useState<SavedImportProfile[]>([])

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [costRows, setCostRows] = useState<CostImportPreviewRow[] | null>(null)
  const [costImportId, setCostImportId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSheetKind(null)
    setStep(0)
    setPriceListId(initialPriceListId ?? '')
    setFile(null)
    setRawRows(null)
    setCostRows(null)
    setFileErrors([])
    setError(null)
    setImportId(null)
    setCostImportId(null)
    setProgress(null)
    setResultMsg(null)
    setSupplierId('')
    setSavedProfiles(listImportProfiles('price_list'))
    void adminGetPriceListsOverview()
      .then((o) => setLists(o.lists))
      .catch(() => setLists([]))
    void adminListSuppliers()
      .then((s) => setSuppliers(s.filter((x) => x.status === 'active')))
      .catch(() => setSuppliers([]))
  }, [open, initialPriceListId])

  const preparedRows = useMemo(() => {
    if (!rawRows) return null
    let rows = rawRows.map((r) => {
      if (!allowZeroPrice && r.ok && r.price === 0) {
        return { ...r, ok: false, errors: [...r.errors, 'Preço zero bloqueado'] }
      }
      return r
    })
    rows = filterRowsForImportMode(rows, mode === 'simulate' ? 'both' : mode)
    return rows
  }, [rawRows, allowZeroPrice, mode])

  const summary = useMemo(
    () => (preparedRows ? summarizePriceImportActions(preparedRows) : null),
    [preparedRows],
  )

  const selectedList = lists.find((l) => l.id === priceListId)
  const selectedSupplier = suppliers.find((s) => s.id === supplierId)
  const costValid = costRows?.filter((r) => r.ok).length ?? 0
  const costInvalid = costRows?.filter((r) => !r.ok).length ?? 0

  function chooseKind(kind: SheetKind) {
    setSheetKind(kind)
    setError(null)
    setRawRows(null)
    setCostRows(null)
    setFile(null)
    if (kind === 'sell_price') {
      setStep(initialPriceListId ? 1 : 1)
    } else {
      setStep(1)
    }
  }

  async function runSellPreview(f: File) {
    if (!priceListId) {
      setError('Selecione a lista de destino')
      return
    }
    setBusy(true)
    setError(null)
    setFileErrors([])
    setRawRows(null)
    try {
      const { rows, fileErrors: fe } = await adminPreviewPriceImport({
        file: f,
        priceListId,
      })
      if (fe.length) {
        setFileErrors(fe)
        setError(fe.join(' · '))
        return
      }
      if (!rows.length) {
        setError('Arquivo sem linhas de dados')
        return
      }
      setFile(f)
      setRawRows(rows)
      const headers = ['sku', 'preco']
      const detected = detectImportProfile('price_list', headers)
      setDetectedProfile(detected)
      setStep(6)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no preview')
    } finally {
      setBusy(false)
    }
  }

  async function runCostPreview(f: File) {
    if (!supplierId) {
      setError('Selecione o fornecedor')
      return
    }
    setBusy(true)
    setError(null)
    setFileErrors([])
    setCostRows(null)
    setCostImportId(null)
    try {
      const { rows, fileErrors: fe } = await adminPreviewCostImport({
        file: f,
        supplierId,
      })
      if (fe.length) {
        setFileErrors(fe)
        setError(fe.join(' · '))
        return
      }
      if (!rows.length) {
        setError('Arquivo sem linhas de dados')
        return
      }
      setFile(f)
      setCostRows(rows)
      const id = await adminCreateCostImport({
        filename: f.name,
        supplierId,
        createdBy: createdBy ?? null,
        rows,
      })
      setCostImportId(id)
      setStep(6)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no preview de custo')
    } finally {
      setBusy(false)
    }
  }

  async function onConfirmSellApply() {
    if (!preparedRows || !file || !priceListId) return
    if (mode === 'simulate') {
      setResultMsg('Simulação concluída — nenhum dado foi gravado.')
      setStep(9)
      return
    }
    const toApply = preparedRows.filter((r) => r.ok)
    if (!toApply.length) {
      setError('Nenhuma linha aplicável no modo selecionado')
      return
    }
    setBusy(true)
    setError(null)
    setStep(8)
    setProgress({ done: 0, total: toApply.length })
    try {
      const id = await adminCreatePriceImport({
        filename: file.name,
        priceListId,
        createdBy: createdBy ?? null,
        rows: preparedRows,
      })
      setImportId(id)
      setProgress({ done: Math.floor(toApply.length / 2), total: toApply.length })
      const result = await adminApplyPriceImport(id)
      setProgress({ done: toApply.length, total: toApply.length })
      setResultMsg(
        `Preços de venda na lista "${selectedList?.name ?? ''}": aplicados ${result.applied} ` +
          `(novos: ${result.inserted}, atualizados: ${result.updated}). Falhas: ${result.failed}. ` +
          `Ignorados: ${result.skipped}. Origem = Importado.`,
      )
      setStep(9)
      onApplied?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao aplicar importação')
      setStep(7)
    } finally {
      setBusy(false)
    }
  }

  async function onConfirmCostApply() {
    if (!costImportId || !costRows) return
    if (costValid === 0) {
      setError('Nenhuma linha válida para aplicar')
      return
    }
    setBusy(true)
    setError(null)
    setStep(8)
    setProgress({ done: 0, total: costValid })
    try {
      const result = await adminApplyCostImport(costImportId)
      setProgress({ done: costValid, total: costValid })
      setResultMsg(
        `Custos do fornecedor "${selectedSupplier?.name ?? ''}": atualizados ${result.updated}. ` +
          `Falhas: ${result.failed}. Ignorados: ${result.skipped}. ` +
          `Preços de venda das listas NÃO foram alterados.`,
      )
      setStep(9)
      onApplied?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao aplicar custos')
      setStep(7)
    } finally {
      setBusy(false)
    }
  }

  function onSaveProfile() {
    saveImportProfile({
      name: profileName || 'Perfil de preços',
      kind: 'price_list',
      headersFingerprint: fingerprintHeaders(['sku', 'preco', 'codigo', 'price']),
      mapping: { sku: 'sku', price: 'preco' },
      allowZeroPrice,
    })
    setSavedProfiles(listImportProfiles('price_list'))
  }

  if (!open) return null

  const title =
    sheetKind === 'supplier_cost'
      ? 'Importar custo do fornecedor'
      : sheetKind === 'sell_price'
        ? 'Importar preço de venda'
        : 'Importar planilha'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-[14px] border border-fal-line bg-white p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-xl font-extrabold text-fal-navy">{title}</h2>
            <p className="mt-1 text-sm text-fal-muted">
              {sheetKind == null
                ? 'Escolha o tipo da planilha'
                : sheetKind === 'sell_price'
                  ? `Etapa ${step} · Lista: ${selectedList?.name ?? '—'}`
                  : `Etapa ${step} · Fornecedor: ${selectedSupplier?.name ?? '—'}`}
            </p>
          </div>
          <Button type="button" variant="light" onClick={onClose} disabled={busy && step === 8}>
            Fechar
          </Button>
        </div>

        {!allowed ? (
          <p className="mt-3 text-sm text-fal-danger">
            Somente administrador/gerente podem importar planilhas.
          </p>
        ) : null}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        {step === 0 ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-fal-navy">O que você está importando?</p>
            <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-fal-line p-3 hover:bg-fal-bg/50">
              <input
                type="radio"
                name="sheetKind"
                className="mt-1"
                onChange={() => chooseKind('sell_price')}
              />
              <span>
                <strong className="text-fal-navy">Preço de venda</strong>
                <span className="mt-1 block text-sm text-fal-muted">
                  Atualiza o preço comercial na lista escolhida (price_list_items).
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-fal-line p-3 hover:bg-fal-bg/50">
              <input
                type="radio"
                name="sheetKind"
                className="mt-1"
                onChange={() => chooseKind('supplier_cost')}
              />
              <span>
                <strong className="text-fal-navy">Custo do fornecedor</strong>
                <span className="mt-1 block text-sm text-fal-muted">
                  Atualiza o custo de compra do fornecedor (supplier_products.cost). Não altera preço
                  de venda das listas.
                </span>
              </span>
            </label>
            <p className="text-xs text-fal-muted">
              Preferir a tela clássica de custo?{' '}
              <Link className="font-semibold underline" to="/admin/fornecedores">
                Abrir fornecedores
              </Link>
            </p>
          </div>
        ) : null}

        {/* —— Venda —— */}
        {sheetKind === 'sell_price' && (step === 1 || step === 2) ? (
          <div className="mt-4 space-y-3">
            <Button type="button" variant="light" onClick={() => { setSheetKind(null); setStep(0) }}>
              ← Trocar tipo
            </Button>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-fal-navy">Lista de destino *</span>
              <select
                className="w-full rounded-[10px] border border-fal-line bg-white px-3 py-2"
                value={priceListId}
                onChange={(e) => setPriceListId(e.target.value)}
                disabled={Boolean(initialPriceListId)}
              >
                <option value="">Selecione…</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <p className="mb-2 text-sm font-semibold text-fal-navy">
                Arquivo (CSV / XLSX, até 2.000 linhas)
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                disabled={busy || !allowed || !priceListId}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void runSellPreview(f)
                }}
              />
            </div>
            {fileErrors.length ? (
              <ul className="text-sm text-red-600">
                {fileErrors.map((fe) => (
                  <li key={fe}>{fe}</li>
                ))}
              </ul>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" variant="light" onClick={() => setStep(3)} disabled={!priceListId}>
                Configurar modo antes do arquivo
              </Button>
            </div>
          </div>
        ) : null}

        {sheetKind === 'sell_price' && step === 3 ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-fal-navy">Como deseja importar?</p>
            {(
              [
                ['update', 'Atualizar preços existentes'],
                ['add', 'Criar itens ausentes na lista (produto já cadastrado)'],
                ['both', 'Atualizar + criar ausentes'],
                ['simulate', 'Apenas simular (não grava)'],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === value}
                  onChange={() => setMode(value)}
                />
                {label}
              </label>
            ))}
            <p className="text-xs text-fal-muted">
              Nunca cria produto novo no catálogo. Código inexistente vai para o relatório.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="light" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button type="button" onClick={() => setStep(5)}>
                Continuar
              </Button>
            </div>
          </div>
        ) : null}

        {sheetKind === 'sell_price' && (step === 4 || step === 5) ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-fal-navy">Regras e perfil</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowZeroPrice}
                onChange={(e) => setAllowZeroPrice(e.target.checked)}
              />
              Permitir preço zero
            </label>
            {detectedProfile ? (
              <p className="text-sm text-green-700">
                Perfil detectado: <strong>{detectedProfile.name}</strong>
              </p>
            ) : null}
            {savedProfiles.length ? (
              <p className="text-xs text-fal-muted">
                Perfis salvos: {savedProfiles.map((p) => p.name).join(', ')}
              </p>
            ) : null}
            <div className="flex flex-wrap items-end gap-2">
              <Input
                label="Salvar perfil como"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
              <Button type="button" variant="light" onClick={onSaveProfile}>
                Salvar perfil
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="light" onClick={() => setStep(3)}>
                Voltar
              </Button>
              <Button type="button" onClick={() => setStep(1)}>
                Ir ao arquivo
              </Button>
            </div>
          </div>
        ) : null}

        {sheetKind === 'sell_price' && step === 6 && preparedRows && summary ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-fal-navy">Prévia — nada foi gravado ainda</p>
            <p className="text-sm">
              {preparedRows.length} linhas · atualizar {summary.update} · adicionar {summary.add} ·
              sem alteração {summary.unchanged} · não encontrados {summary.notFound} · erros{' '}
              {summary.error} · aplicáveis {summary.applyable}
            </p>
            <div className="max-h-64 overflow-auto rounded border border-fal-line text-xs">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-fal-bg text-left">
                    <th className="px-2 py-1">Código</th>
                    <th className="px-2 py-1">Atual</th>
                    <th className="px-2 py-1">Novo</th>
                    <th className="px-2 py-1">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {preparedRows.slice(0, 80).map((r) => {
                    const action = classifyPriceImportAction(r)
                    return (
                      <tr key={r.line} className={r.ok ? '' : 'bg-red-50'}>
                        <td className="px-2 py-1 font-mono">{r.sku}</td>
                        <td className="px-2 py-1">
                          {r.currentPrice != null ? formatMoney(r.currentPrice) : '—'}
                        </td>
                        <td className="px-2 py-1">
                          {r.price != null ? formatMoney(r.price) : '—'}
                        </td>
                        <td className="px-2 py-1">{priceImportActionLabel(action)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="light" onClick={() => setStep(3)}>
                Ajustar modo
              </Button>
              <Button
                type="button"
                disabled={!summary.applyable && mode !== 'simulate'}
                onClick={() => setStep(7)}
              >
                Continuar
              </Button>
            </div>
          </div>
        ) : null}

        {sheetKind === 'sell_price' && step === 7 && summary ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-fal-navy">Confirmação — preço de venda</p>
            <ul className="list-inside list-disc text-sm">
              <li>Lista: {selectedList?.name}</li>
              <li>Modo: {mode}</li>
              <li>Aplicáveis: {summary.applyable}</li>
            </ul>
            <div className="flex gap-2">
              <Button type="button" variant="light" onClick={() => setStep(6)} disabled={busy}>
                Voltar
              </Button>
              <Button type="button" disabled={busy || !allowed} onClick={() => void onConfirmSellApply()}>
                {mode === 'simulate' ? 'Executar simulação' : 'Confirmar importação'}
              </Button>
            </div>
          </div>
        ) : null}

        {/* —— Custo —— */}
        {sheetKind === 'supplier_cost' && step === 1 ? (
          <div className="mt-4 space-y-3">
            <Button type="button" variant="light" onClick={() => { setSheetKind(null); setStep(0) }}>
              ← Trocar tipo
            </Button>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-fal-navy">Fornecedor *</span>
              <select
                className="w-full rounded-[10px] border border-fal-line bg-white px-3 py-2"
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value)
                  setCostRows(null)
                  setCostImportId(null)
                }}
              >
                <option value="">Selecione…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.code ? ` (${s.code})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-fal-muted">
              Formato: codigo_fornecedor;custo. Exige conversão prévia. Não grava em listas de
              preços.
            </p>
            <div>
              <p className="mb-2 text-sm font-semibold text-fal-navy">Arquivo (CSV / XLSX)</p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                disabled={busy || !allowed || !supplierId}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void runCostPreview(f)
                }}
              />
            </div>
            {fileErrors.length ? (
              <ul className="text-sm text-red-600">
                {fileErrors.map((fe) => (
                  <li key={fe}>{fe}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {sheetKind === 'supplier_cost' && step === 6 && costRows ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-fal-navy">Prévia de custos — nada aplicado ainda</p>
            <p className="text-sm">
              {costRows.length} linhas · válidas {costValid} · com erro {costInvalid}
            </p>
            <div className="max-h-64 overflow-auto rounded border border-fal-line text-xs">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-fal-bg text-left">
                    <th className="px-2 py-1">Cód. forn.</th>
                    <th className="px-2 py-1">Código FAL</th>
                    <th className="px-2 py-1">Custo atual</th>
                    <th className="px-2 py-1">Novo</th>
                    <th className="px-2 py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {costRows.slice(0, 80).map((r) => (
                    <tr key={r.line} className={r.ok ? '' : 'bg-red-50'}>
                      <td className="px-2 py-1 font-mono">{r.supplierSku}</td>
                      <td className="px-2 py-1 font-mono">{r.productSku ?? '—'}</td>
                      <td className="px-2 py-1">
                        {r.oldCost != null ? formatMoney(r.oldCost) : '—'}
                      </td>
                      <td className="px-2 py-1">
                        {r.cost != null ? formatMoney(r.cost) : '—'}
                      </td>
                      <td className="px-2 py-1">
                        {r.ok ? 'ok' : r.errors.join('; ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="light" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button type="button" disabled={costValid === 0} onClick={() => setStep(7)}>
                Continuar
              </Button>
            </div>
          </div>
        ) : null}

        {sheetKind === 'supplier_cost' && step === 7 ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-fal-navy">Confirmação — custo do fornecedor</p>
            <ul className="list-inside list-disc text-sm">
              <li>Fornecedor: {selectedSupplier?.name}</li>
              <li>Linhas válidas: {costValid}</li>
              <li>Destino: supplier_products.cost (não altera listas de preços)</li>
            </ul>
            <div className="flex gap-2">
              <Button type="button" variant="light" onClick={() => setStep(6)} disabled={busy}>
                Voltar
              </Button>
              <Button type="button" disabled={busy || !allowed} onClick={() => void onConfirmCostApply()}>
                Confirmar custos
              </Button>
            </div>
          </div>
        ) : null}

        {step === 8 ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-fal-navy">Processando…</p>
            <p className="text-sm">
              {progress ? `${progress.done} de ${progress.total}` : 'Aguarde'}
            </p>
            <p className="text-xs text-fal-muted">Não feche esta tela.</p>
            {importId || costImportId ? (
              <p className="text-xs text-fal-muted">Import id: {importId ?? costImportId}</p>
            ) : null}
          </div>
        ) : null}

        {step === 9 ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-fal-navy">Resultado</p>
            {resultMsg ? <p className="text-sm text-green-700">{resultMsg}</p> : null}
            <Button type="button" onClick={onClose}>
              Fechar
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
