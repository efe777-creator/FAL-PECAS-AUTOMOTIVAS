import {
  isKitsManualPriceList,
  PriceListWorkSurface,
  priceListsForWorkspaceGuide,
} from '@/components/admin/prices/PriceListWorkSurface'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { PricingRuleFields } from '@/components/admin/prices/PricingRuleFields'
import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useIdSplitTabs } from '@/hooks/useIdSplitTabs'
import { toUserMessage } from '@/lib/toUserMessage'
import { formatDateTime } from '@/lib/datetime'
import { PRICE_LIST_LAYERS_HINT } from '@/lib/priceLabels'
import { PriceImportWizard } from '@/pages/admin/prices/PriceImportWizard'
import {
  adminDeletePriceList,
  adminDuplicatePriceList,
  adminGetPriceListsOverview,
  adminSaveListExtraCostPercent,
  adminUpsertPriceList,
  PRICE_LIST_BASE_ID,
  PRICE_LIST_PROMO_ID,
  priceListStatusLabel,
  pricingMethodLabel,
  pricingRuleLabel,
  withWindowScrollPreserved,
  type PriceListOverviewRow,
  type PriceListStatus,
  type PriceListsOverview,
} from '@/services/admin/adminPriceListService'
import type { PricingMethod } from '@/services/pricing/pricingFormulas'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

type FormMode = 'closed' | 'create' | 'edit'

function emptyOverview(): PriceListsOverview {
  return { lists: [], activeLists: 0, totalItems: 0, withPrice: 0, withoutPrice: 0 }
}

function canManagePricing(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

export function AdminPriceListsPage() {
  useDocumentTitle('Listas de preço | Admin FAL')
  const { user } = useAuth()
  const toast = useToast()
  const splitTabs = useIdSplitTabs()
  const allowed = canManagePricing(user?.role)
  const [overview, setOverview] = useState<PriceListsOverview>(emptyOverview())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<FormMode>('closed')
  const [editing, setEditing] = useState<PriceListOverviewRow | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardListId, setWizardListId] = useState<string | undefined>(undefined)
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

  const nameInputRef = useRef<HTMLInputElement>(null)

  const guideLists = useMemo(
    () => priceListsForWorkspaceGuide(overview.lists),
    [overview.lists],
  )

  const focusedList = useMemo(() => {
    if (!splitTabs.activeId) return null
    return guideLists.find((l) => l.id === splitTabs.activeId) ?? null
  }, [guideLists, splitTabs.activeId])

  const contextualOpen = splitTabs.hasOpen || formMode !== 'closed'

  function pushError(msg: string) {
    setError(msg)
    toast.push(msg, 'error')
  }

  function pushOk(msg: string) {
    toast.push(msg, 'success')
  }

  function pushNotice(msg: string) {
    setFormNotice(msg)
    toast.push(msg, 'info')
  }

  async function reload(opts?: { showPageLoading?: boolean }) {
    const showPageLoading = opts?.showPageLoading ?? false
    if (showPageLoading) setLoading(true)
    setError(null)
    try {
      setOverview(await adminGetPriceListsOverview())
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao carregar listas'))
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
      pushError(toUserMessage(e, 'Erro ao carregar listas'))
    }
  }

  useEffect(() => {
    void reload({ showPageLoading: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (formMode === 'closed') return
    window.requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
  }, [formMode])

  function openCreate() {
    splitTabs.closeAll()
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
  }

  function openConfigure(list: PriceListOverviewRow) {
    if (isKitsManualPriceList(list)) return
    splitTabs.closeAll()
    setFormMode('edit')
    setEditing(list)
    setName(list.name)
    setDescription(list.description ?? '')
    setStatus(list.status)
    setPricingMethod(list.pricingMethod)
    setPricingPercent(String(list.pricingPercent ?? 0))
    setListExtraCostPercent(String(list.listExtraCostPercent ?? 0))
    setFormNotice(null)
    setAdvancedOpen(false)
    setMenuOpenId(null)
  }

  function openListGuide(list: PriceListOverviewRow) {
    if (isKitsManualPriceList(list)) return
    setFormMode('closed')
    setFormNotice(null)
    splitTabs.openTab(list.id)
    setMenuOpenId(null)
  }

  function closeForm() {
    setFormMode('closed')
    setEditing(null)
    setAdvancedOpen(false)
    setFormNotice(null)
  }

  function closeContextual() {
    closeForm()
    splitTabs.closeAll()
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
        pushNotice(
          'Lista salva. Adicional de custo (%) não pôde ser gravado neste ambiente. O adicional em R$ permanece inalterado.',
        )
      } else if (Number.isFinite(pctExtra) && pctExtra >= 0) {
        pushNotice(`Lista salva. Adicional de custo: ${pctExtra}%.`)
      } else {
        pushOk('Lista salva.')
      }
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao salvar lista'))
    } finally {
      setBusy(false)
    }
  }

  async function onToggleStatus(list: PriceListOverviewRow) {
    const next: PriceListStatus = list.status === 'active' ? 'inactive' : 'active'
    const { confirmed } = await confirmDialog({
      title: `${next === 'active' ? 'Ativar' : 'Inativar'} lista?`,
      message: `Deseja ${next === 'active' ? 'ativar' : 'inativar'} a lista "${list.name}"?`,
      confirmLabel: next === 'active' ? 'Ativar' : 'Inativar',
      danger: next === 'inactive',
    })
    if (!confirmed) return
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
      pushOk(next === 'active' ? 'Lista ativada.' : 'Lista inativada.')
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao alterar status'))
    } finally {
      setBusy(false)
    }
  }

  async function onDuplicate(list: PriceListOverviewRow) {
    const { confirmed } = await confirmDialog({
      title: 'Duplicar lista?',
      message: `Duplicar a lista "${list.name}"?\n\nItens e origem de preço serão copiados. Nenhum recálculo será executado.`,
      confirmLabel: 'Duplicar',
    })
    if (!confirmed) return
    setBusy(true)
    setError(null)
    setMenuOpenId(null)
    try {
      await adminDuplicatePriceList(list.id)
      await reloadOverviewQuiet()
      pushOk(`Lista "${list.name}" duplicada.`)
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao duplicar lista'))
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(list: PriceListOverviewRow) {
    if (
      list.id === PRICE_LIST_BASE_ID ||
      list.id === PRICE_LIST_PROMO_ID ||
      /^(base|promo)$/i.test(list.slug ?? '') ||
      /^(lista\s*)?base$/i.test(list.name) ||
      /^(lista\s*)?promo/i.test(list.name)
    ) {
      pushError('Listas de sistema (Base e Promo) não podem ser excluídas.')
      setMenuOpenId(null)
      return
    }
    const { confirmed } = await confirmDialog({
      title: 'Excluir lista de preços',
      message:
        `Excluir a lista "${list.name}"?\n\nEsta ação não pode ser desfeita.\n` +
        `Todos os ${list.itemCount ?? 0} item(ns) desta lista também serão excluídos.`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!confirmed) return
    setBusy(true)
    setError(null)
    setMenuOpenId(null)
    try {
      await adminDeletePriceList(list.id)
      if (editing?.id === list.id) closeForm()
      if (splitTabs.activeId === list.id) splitTabs.closeTab(list.id)
      await reloadOverviewQuiet()
      pushOk('Lista excluída.')
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao excluir lista'))
    } finally {
      setBusy(false)
    }
  }

  function openWizard(listId?: string) {
    setWizardListId(listId)
    setWizardOpen(true)
    setMenuOpenId(null)
  }

  const activeGuideListId = splitTabs.activeId ?? ''

  const formGuide = (
    <div className="flex h-full min-h-0 flex-col gap-3 p-1">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line pb-2">
        <p className="m-0 text-xs font-semibold text-fal-muted">
          {formMode === 'edit' ? 'Configurar lista na guia' : 'Nova lista na guia'}
        </p>
        <button
          type="button"
          className="text-xs font-semibold text-fal-muted underline"
          onClick={closeContextual}
        >
          Fechar guia
        </button>
      </div>
      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <Input
          ref={nameInputRef}
          label="Nome da lista"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-fal-fg">Status</span>
          <select
            className="w-full rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as PriceListStatus)}
          >
            <option value="draft">Rascunho</option>
            <option value="active">Ativa</option>
            <option value="inactive">Inativa</option>
          </select>
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block font-semibold text-fal-fg">Descrição</span>
          <textarea
            className="min-h-[72px] w-full rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div className="md:col-span-2">
          <button
            type="button"
            className="text-sm font-semibold text-fal-fg underline"
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            {advancedOpen ? '▾' : '▸'} Avançado — regra de formação
          </button>
          {advancedOpen ? (
            <div className="mt-3 space-y-3">
              <PricingRuleFields
                method={pricingMethod}
                percent={pricingPercent}
                extraCostPercent={listExtraCostPercent}
                hidePercentWhenFixed
                onMethod={setPricingMethod}
                onPercent={setPricingPercent}
                onExtraCostPercent={setListExtraCostPercent}
              />
              {editing ? (
                <p className="text-sm text-fal-muted">
                  Preferir configuração avançada na tela completa?{' '}
                  <Link
                    className="font-semibold text-fal-fg underline"
                    to={`/admin/precos/${editing.id}?tab=config`}
                  >
                    Abrir configuração na lista
                  </Link>
                  {' · '}
                  <Link
                    className="font-semibold text-fal-fg underline"
                    to={`/admin/precos/${editing.id}?tab=formacao`}
                  >
                    Formação
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
          <Button type="button" variant="light" onClick={closeContextual} disabled={busy}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )

  const primary = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fal-fg">Listas de preço</h1>
          <p className="mt-1 max-w-2xl text-sm text-fal-muted">
            Consulte e ajuste preços da lista selecionada na guia. {PRICE_LIST_LAYERS_HINT} Para
            classificar um produto (Categoria / Grupo / Subgrupo), abra o cadastro em{' '}
            <Link className="font-semibold text-fal-fg underline" to="/admin/produtos">
              Produtos
            </Link>{' '}
            ou gerencie a árvore em{' '}
            <Link className="font-semibold text-fal-fg underline" to="/admin/categorias">
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
          {overview.lists.some((l) => l.id === PRICE_LIST_BASE_ID) ? (
            <Button
              type="button"
              onClick={() => {
                const base = overview.lists.find((l) => l.id === PRICE_LIST_BASE_ID)
                if (base) openListGuide(base)
              }}
              disabled={busy}
            >
              Abrir guia Base
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm">
        <span>
          <span className="text-fal-muted">Ativas </span>
          <strong className="tabular-nums text-fal-fg">{overview.activeLists}</strong>
        </span>
        <span className="text-fal-line">·</span>
        <span>
          <span className="text-fal-muted">Itens </span>
          <strong className="tabular-nums text-fal-fg">{overview.totalItems}</strong>
        </span>
        <span className="text-fal-line">·</span>
        <span>
          <span className="text-fal-muted">Com preço </span>
          <strong className="tabular-nums text-fal-fg">{overview.withPrice}</strong>
        </span>
        <span className="text-fal-line">·</span>
        <button
          type="button"
          className={`font-semibold underline ${
            overview.withoutPrice > 0 ? 'text-amber-800' : 'text-fal-fg'
          }`}
          onClick={() => setForceWithoutPrice((v) => !v)}
          title="Filtrar itens sem preço no painel"
        >
          Sem preço {overview.withoutPrice}
          {forceWithoutPrice ? ' (filtro on)' : ''}
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {formNotice && formMode === 'closed' ? (
        <p className="text-sm text-amber-800">{formNotice}</p>
      ) : null}
      {loading ? <Loading label="Carregando listas…" /> : null}

      <div>
        <h2 className="mb-2 text-lg font-extrabold text-fal-fg">Gerenciar listas</h2>
        <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-fal-surface">
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
              {overview.lists.map((list) => {
                const kitsManual = isKitsManualPriceList(list)
                const onGuide = splitTabs.openIds.includes(list.id)
                const highlighted = splitTabs.activeId === list.id && formMode === 'closed'
                return (
                  <tr
                    key={list.id}
                    className={`border-b border-fal-line/70 ${
                      highlighted ? 'bg-fal-yellow/15' : ''
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div className="font-semibold text-fal-fg">
                        {list.name}
                        {kitsManual ? (
                          <span className="ml-2 rounded-full bg-fal-yellow/40 px-2 py-0.5 text-xs font-bold text-fal-navy-dark">
                            Kits
                          </span>
                        ) : null}
                        {onGuide ? (
                          <span className="ml-2 text-xs font-semibold text-fal-muted">Na guia</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-fal-muted">
                        {list.slug}
                        {list.isDefault ? ' · padrão' : ''}
                        {kitsManual ? ' · só hub Kits' : ''}
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
                        {kitsManual ? (
                          <Link
                            className="text-sm font-extrabold text-fal-fg underline"
                            to="/admin/kits/precos"
                          >
                            Preços dos kits
                          </Link>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="text-sm font-extrabold text-fal-fg underline"
                              disabled={busy}
                              onClick={() => openListGuide(list)}
                            >
                              {onGuide
                                ? 'Na guia'
                                : splitTabs.hasOpen
                                  ? '+ Guia'
                                  : 'Abrir guia'}
                            </button>
                            <Link
                              className="text-sm font-semibold text-fal-muted underline"
                              to={`/admin/precos/${list.id}?tab=produtos`}
                            >
                              Lista completa
                            </Link>
                          </>
                        )}
                        {!kitsManual ? (
                          <button
                            type="button"
                            className="text-sm font-semibold text-fal-fg underline"
                            disabled={busy}
                            onClick={() => openConfigure(list)}
                          >
                            Configurar
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="rounded border border-fal-line px-2 py-0.5 text-sm font-bold text-fal-fg"
                          disabled={busy}
                          aria-label="Mais ações"
                          onClick={() =>
                            setMenuOpenId((menuId) => (menuId === list.id ? null : list.id))
                          }
                        >
                          ⋯
                        </button>
                        {menuOpenId === list.id ? (
                          <div className="absolute right-0 top-8 z-10 min-w-[140px] rounded-[10px] border border-fal-line bg-fal-surface p-2 shadow-md">
                            {!kitsManual ? (
                              <button
                                type="button"
                                className="block w-full px-2 py-1.5 text-left text-sm font-semibold text-fal-fg hover:bg-fal-bg"
                                onClick={() => openWizard(list.id)}
                              >
                                Importar
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="block w-full px-2 py-1.5 text-left text-sm font-semibold text-fal-fg hover:bg-fal-bg"
                              onClick={() => void onDuplicate(list)}
                            >
                              Duplicar
                            </button>
                            <button
                              type="button"
                              className="block w-full px-2 py-1.5 text-left text-sm font-semibold text-fal-fg hover:bg-fal-bg"
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
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

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

  return (
    <AdaptiveWorkspace
      moduleKey="prices"
      primary={primary}
      contextualOpen={contextualOpen}
      onContextualOpenChange={(open) => {
        if (!open) closeContextual()
      }}
      contextualTitle={
        formMode !== 'closed'
          ? formMode === 'create'
            ? 'Nova lista'
            : (editing?.name ?? 'Configurar lista')
          : (focusedList?.name ?? 'Lista de preços')
      }
      contextual={
        contextualOpen ? (
          formMode !== 'closed' ? (
            formGuide
          ) : splitTabs.activeId ? (
            <PriceListWorkSurface
              lists={guideLists}
              listId={activeGuideListId}
              allowed={allowed}
              changedBy={user?.id ?? null}
              onItemsChanged={() => void withWindowScrollPreserved(() => reloadOverviewQuiet())}
              onListIdChange={(id) => splitTabs.selectTab(id)}
              forceWithoutPrice={forceWithoutPrice}
              onRequestImport={() => openWizard(activeGuideListId || undefined)}
              onClose={closeContextual}
            />
          ) : null
        ) : null
      }
    />
  )
}