import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useAuth } from '@/contexts/AuthContext'
import { formatDateTime } from '@/lib/datetime'
import { PRICE_LIST_LAYERS_HINT } from '@/lib/priceLabels'
import { PriceImportWizard } from '@/pages/admin/prices/PriceImportWizard'
import { PriceListQuickAdjustPanel } from '@/pages/admin/prices/PriceListQuickAdjustPanel'
import {
  adminDeletePriceList,
  adminDuplicatePriceList,
  adminGetPriceListsOverview,
  adminSaveListExtraCostPercent,
  adminUpsertPriceList,
  priceListStatusLabel,
  pricingMethodLabel,
  pricingRuleLabel,
  withWindowScrollPreserved,
  type PriceListOverviewRow,
  type PriceListStatus,
  type PriceListsOverview,
} from '@/services/admin/adminPriceListService'
import type { PricingMethod } from '@/services/pricing/pricingFormulas'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

type FormMode = 'closed' | 'create' | 'edit'

function emptyOverview(): PriceListsOverview {
  return { lists: [], activeLists: 0, totalItems: 0, withPrice: 0, withoutPrice: 0 }
}

function canManagePricing(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

export function AdminPriceListsPage() {
  const { user } = useAuth()
  const allowed = canManagePricing(user?.role)
  const [overview, setOverview] = useState<PriceListsOverview>(emptyOverview())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<FormMode>('closed')
  const [editing, setEditing] = useState<PriceListOverviewRow | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardListId, setWizardListId] = useState<string | undefined>(undefined)
  const [panelListId, setPanelListId] = useState('')
  const [forceWithoutPrice, setForceWithoutPrice] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<PriceListStatus>('draft')
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('fixed')
  const [pricingPercent, setPricingPercent] = useState('0')
  const [listExtraCostPercent, setListExtraCostPercent] = useState('0')
  const [formNotice, setFormNotice] = useState<string | null>(null)

  const formRef = useRef<HTMLFormElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  async function reload(opts?: { showPageLoading?: boolean }) {
    const showPageLoading = opts?.showPageLoading ?? false
    if (showPageLoading) setLoading(true)
    setError(null)
    try {
      setOverview(await adminGetPriceListsOverview())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar listas')
    } finally {
      setLoading(false)
    }
  }

  /** KPIs/tabela sem desmontar o painel de consulta. */
  async function reloadOverviewQuiet() {
    setError(null)
    try {
      setOverview(await adminGetPriceListsOverview())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar listas')
    }
  }

  useEffect(() => {
    void reload({ showPageLoading: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function focusForm() {
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
  }

  function openCreate() {
    setFormMode('create')
    setEditing(null)
    setName('')
    setDescription('')
    setStatus('draft')
    setPricingMethod('fixed')
    setPricingPercent('0')
    setListExtraCostPercent('0')
    setFormNotice(null)
    setAdvancedOpen(false)
    focusForm()
  }

  function openConfigure(list: PriceListOverviewRow) {
    setFormMode('edit')
    setEditing(list)
    setName(list.name)
    setDescription(list.description ?? '')
    setStatus(list.status)
    setPricingMethod(list.pricingMethod)
    setPricingPercent(String(list.pricingPercent ?? 0))
    setListExtraCostPercent(String(list.listExtraCostPercent ?? 0))
    setFormNotice(null)
    setAdvancedOpen(true)
    setMenuOpenId(null)
    focusForm()
  }

  function closeForm() {
    setFormMode('closed')
    setEditing(null)
    setAdvancedOpen(false)
    setFormNotice(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setFormNotice(null)
    try {
      const saved = await adminUpsertPriceList({
        id: editing?.id,
        name,
        description,
        status,
        scope: editing?.scope ?? 'public',
        priority: editing?.priority ?? 0,
        isDefault: editing?.isDefault ?? false,
        validFrom: editing?.validFrom,
        validUntil: editing?.validUntil,
        slug: editing?.slug,
        pricingMethod,
        pricingPercent: Number(pricingPercent) || 0,
      })
      const pctExtra = Number(String(listExtraCostPercent).replace(',', '.'))
      let pendingExtra = false
      if (Number.isFinite(pctExtra) && pctExtra >= 0) {
        const extra = await adminSaveListExtraCostPercent(saved.id, pctExtra)
        pendingExtra = Boolean(extra.pendingMigration)
      }
      closeForm()
      await reloadOverviewQuiet()
      if (pendingExtra) {
        setFormNotice(
          'Lista salva. Adicional de custo (%) aguarda migration prepared (não aplicada). list_extra_cost (R$) permanece inalterado.',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar lista')
    } finally {
      setBusy(false)
    }
  }

  async function onToggleStatus(list: PriceListOverviewRow) {
    const next: PriceListStatus = list.status === 'active' ? 'inactive' : 'active'
    if (!window.confirm(`Deseja ${next === 'active' ? 'ativar' : 'inativar'} a lista "${list.name}"?`)) {
      return
    }
    setBusy(true)
    setError(null)
    setMenuOpenId(null)
    try {
      await adminUpsertPriceList({
        id: list.id,
        name: list.name,
        description: list.description,
        status: next,
        scope: list.scope,
        priority: list.priority,
        isDefault: list.isDefault,
        validFrom: list.validFrom,
        validUntil: list.validUntil,
        slug: list.slug,
        pricingMethod: list.pricingMethod,
        pricingPercent: list.pricingPercent,
      })
      await reloadOverviewQuiet()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao alterar status')
    } finally {
      setBusy(false)
    }
  }

  async function onDuplicate(list: PriceListOverviewRow) {
    if (
      !window.confirm(
        `Duplicar a lista "${list.name}"?\n\nItens e origem de preço serão copiados. Nenhum recálculo será executado.`,
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    setMenuOpenId(null)
    try {
      await adminDuplicatePriceList(list.id)
      await reloadOverviewQuiet()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao duplicar lista')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(list: PriceListOverviewRow) {
    const ok = window.confirm(
      `Excluir a lista "${list.name}"?\n\nEsta ação não pode ser desfeita.\n` +
        `Todos os ${list.itemCount ?? 0} item(ns) desta lista também serão excluídos (cascade).`,
    )
    if (!ok) return
    setBusy(true)
    setError(null)
    setMenuOpenId(null)
    try {
      await adminDeletePriceList(list.id)
      if (editing?.id === list.id) closeForm()
      await reloadOverviewQuiet()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir lista')
    } finally {
      setBusy(false)
    }
  }

  function openWizard(listId?: string) {
    setWizardListId(listId)
    setWizardOpen(true)
    setMenuOpenId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fal-navy">Listas de preços</h1>
          <p className="mt-1 max-w-2xl text-sm text-fal-muted">
            Consulte e ajuste preços da lista selecionada. {PRICE_LIST_LAYERS_HINT} Para
            classificar um produto (Categoria / Grupo / Subgrupo), abra o cadastro em{' '}
            <Link className="font-semibold text-fal-navy underline" to="/admin/produtos">
              Produtos
            </Link>{' '}
            ou gerencie a árvore em{' '}
            <Link className="font-semibold text-fal-navy underline" to="/admin/categorias">
              Categorias
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="light" onClick={() => openWizard()} disabled={busy}>
            Importar planilha
          </Button>
          <Button type="button" variant="light" onClick={openCreate} disabled={busy}>
            + Nova lista
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm">
        <span>
          <span className="text-fal-muted">Ativas </span>
          <strong className="tabular-nums text-fal-navy">{overview.activeLists}</strong>
        </span>
        <span className="text-fal-line">·</span>
        <span>
          <span className="text-fal-muted">Itens </span>
          <strong className="tabular-nums text-fal-navy">{overview.totalItems}</strong>
        </span>
        <span className="text-fal-line">·</span>
        <span>
          <span className="text-fal-muted">Com preço </span>
          <strong className="tabular-nums text-fal-navy">{overview.withPrice}</strong>
        </span>
        <span className="text-fal-line">·</span>
        <button
          type="button"
          className={`font-semibold underline ${
            overview.withoutPrice > 0 ? 'text-amber-800' : 'text-fal-navy'
          }`}
          onClick={() => setForceWithoutPrice((v) => !v)}
          title="Filtrar itens sem preço no painel"
        >
          Sem preço {overview.withoutPrice}
          {forceWithoutPrice ? ' (filtro on)' : ''}
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {formNotice ? <p className="text-sm text-amber-800">{formNotice}</p> : null}
      {loading ? <Loading label="Carregando listas…" /> : null}

      <div>
        <h2 className="mb-2 text-lg font-extrabold text-fal-navy">Gerenciar listas</h2>
        <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-fal-line bg-fal-bg text-fal-muted">
              <tr>
                <th className="px-3 py-2">Lista</th>
                <th className="px-3 py-2">Status</th>
                <th className="hidden px-3 py-2 md:table-cell">Método</th>
                <th className="hidden px-3 py-2 md:table-cell">Regra</th>
                <th className="px-3 py-2 text-right">Itens</th>
                <th className="hidden px-3 py-2 text-right lg:table-cell">Com preço</th>
                <th className="hidden px-3 py-2 lg:table-cell">Atualizada</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {!loading && overview.lists.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4">
                    <EmptyState
                      title="Nenhuma lista cadastrada"
                      description="Crie a primeira lista de preços para formar e publicar valores."
                    >
                      <div className="mt-5 flex justify-center">
                        <Button type="button" onClick={openCreate}>
                          Criar primeira lista
                        </Button>
                      </div>
                    </EmptyState>
                  </td>
                </tr>
              ) : null}
              {overview.lists.map((list) => (
                <tr
                  key={list.id}
                  className={`border-b border-fal-line/70 ${
                    panelListId === list.id ? 'bg-fal-yellow/15' : ''
                  }`}
                >
                  <td className="px-3 py-2">
                    <div className="font-semibold text-fal-navy">{list.name}</div>
                    <div className="text-xs text-fal-muted">
                      {list.slug}
                      {list.isDefault ? ' · padrão' : ''}
                    </div>
                  </td>
                  <td className="px-3 py-2">{priceListStatusLabel(list.status)}</td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    {pricingMethodLabel(list.pricingMethod)}
                  </td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    {pricingRuleLabel(list.pricingMethod, list.pricingPercent)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{list.itemCount ?? 0}</td>
                  <td className="hidden px-3 py-2 text-right tabular-nums lg:table-cell">
                    {list.withPriceCount}
                  </td>
                  <td className="hidden px-3 py-2 text-xs text-fal-muted lg:table-cell">
                    {list.updatedAt ? formatDateTime(list.updatedAt) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="relative flex flex-wrap items-center gap-2">
                      <Link
                        className="text-sm font-extrabold text-fal-navy underline"
                        to={`/admin/precos/${list.id}?tab=produtos`}
                      >
                        Abrir
                      </Link>
                      <button
                        type="button"
                        className="text-sm font-semibold text-fal-navy underline"
                        disabled={busy}
                        onClick={() => openConfigure(list)}
                      >
                        Configurar
                      </button>
                      <button
                        type="button"
                        className="rounded border border-fal-line px-2 py-0.5 text-sm font-bold text-fal-navy"
                        disabled={busy}
                        aria-label="Mais ações"
                        onClick={() =>
                          setMenuOpenId((menuId) => (menuId === list.id ? null : list.id))
                        }
                      >
                        ⋯
                      </button>
                      {menuOpenId === list.id ? (
                        <div className="absolute right-0 top-8 z-10 min-w-[140px] rounded-[10px] border border-fal-line bg-white p-2 shadow-md">
                          <button
                            type="button"
                            className="block w-full px-2 py-1.5 text-left text-sm font-semibold text-fal-navy hover:bg-fal-bg"
                            onClick={() => openWizard(list.id)}
                          >
                            Importar
                          </button>
                          <button
                            type="button"
                            className="block w-full px-2 py-1.5 text-left text-sm font-semibold text-fal-navy hover:bg-fal-bg"
                            onClick={() => void onDuplicate(list)}
                          >
                            Duplicar
                          </button>
                          <button
                            type="button"
                            className="block w-full px-2 py-1.5 text-left text-sm font-semibold text-fal-navy hover:bg-fal-bg"
                            onClick={() => void onToggleStatus(list)}
                          >
                            {list.status === 'active' ? 'Inativar' : 'Ativar'}
                          </button>
                          <button
                            type="button"
                            className="block w-full px-2 py-1.5 text-left text-sm font-semibold text-red-700 hover:bg-fal-bg"
                            onClick={() => void onDelete(list)}
                          >
                            Excluir
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {formMode !== 'closed' ? (
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className={`grid gap-3 rounded-[14px] border bg-white p-4 md:grid-cols-2 ${
            formMode === 'edit'
              ? 'border-fal-yellow-dark ring-2 ring-fal-yellow/40'
              : 'border-fal-line'
          }`}
        >
          <Input
            ref={nameInputRef}
            label={formMode === 'edit' ? 'Configurar lista' : 'Nome da lista'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-fal-navy">Status</span>
            <select
              className="w-full rounded-[10px] border border-fal-line bg-white px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value as PriceListStatus)}
            >
              <option value="draft">Rascunho</option>
              <option value="active">Ativa</option>
              <option value="inactive">Inativa</option>
            </select>
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-semibold text-fal-navy">Descrição</span>
            <textarea
              className="min-h-[72px] w-full rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="button"
              className="text-sm font-semibold text-fal-navy underline"
              onClick={() => setAdvancedOpen((v) => !v)}
            >
              {advancedOpen ? '▾' : '▸'} Avançado — regra de formação
            </button>
            {advancedOpen ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block text-sm md:col-span-2">
                  <span className="mb-1 block font-semibold text-fal-navy">Regra de formação</span>
                  <select
                    className="w-full rounded-[10px] border border-fal-line bg-white px-3 py-2"
                    value={pricingMethod}
                    onChange={(e) => setPricingMethod(e.target.value as PricingMethod)}
                  >
                    <option value="fixed">Preço fixo (sem fórmula automática)</option>
                    <option value="markup_on_cost">Markup sobre custo</option>
                    <option value="margin_on_sell">Margem sobre venda</option>
                  </select>
                </label>
                {pricingMethod !== 'fixed' ? (
                  <Input
                    label={pricingMethod === 'markup_on_cost' ? 'Markup (%)' : 'Margem (%)'}
                    type="number"
                    step="0.01"
                    min="0"
                    value={pricingPercent}
                    onChange={(e) => setPricingPercent(e.target.value)}
                    required
                    hint="Regra de formação de venda — não confundir com adicional de custo."
                  />
                ) : null}
                <Input
                  label="Adicional de custo (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={listExtraCostPercent}
                  onChange={(e) => setListExtraCostPercent(e.target.value)}
                  hint="CUSTO → este % → base de formação → markup/margem. Paralelo a list_extra_cost (R$). Gravação efetiva após migration prepared."
                />
                {editing ? (
                  <p className="text-sm text-fal-muted md:col-span-2">
                    Preferir a tela completa?{' '}
                    <Link
                      className="font-semibold text-fal-navy underline"
                      to={`/admin/precos/${editing.id}?tab=formacao`}
                    >
                      Abrir formação na lista
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={busy}>
              {formMode === 'edit' ? 'Salvar' : 'Criar lista'}
            </Button>
            <Button type="button" variant="light" onClick={closeForm} disabled={busy}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}

      {!loading || overview.lists.length > 0 ? (
        <PriceListQuickAdjustPanel
          lists={overview.lists}
          allowed={allowed}
          changedBy={user?.id ?? null}
          onItemsChanged={() => void withWindowScrollPreserved(() => reloadOverviewQuiet())}
          onListIdChange={setPanelListId}
          forceWithoutPrice={forceWithoutPrice}
          onRequestImport={() => openWizard(panelListId || undefined)}
        />
      ) : null}

      <PriceImportWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        initialPriceListId={wizardListId}
        createdBy={user?.id ?? null}
        allowed={allowed}
        onApplied={() => void reloadOverviewQuiet()}
      />
    </div>
  )
}
