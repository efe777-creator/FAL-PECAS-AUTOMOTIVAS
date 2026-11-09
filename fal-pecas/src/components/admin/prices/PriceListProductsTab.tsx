import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  isPriceListItemPriced,
  priceListItemPricingStateLabel,
  priceOriginLabel,
} from '@/lib/priceLabels'
import { CODIGO_REFERENCIA_LABEL, SKU_FAL_LABEL } from '@/lib/productLabels'
import { formatMoney } from '@/lib/money'
import {
  pricingMethodLabel,
  pricingRuleLabel,
  type PriceList,
  type PriceListItem,
  type PriceListItemSortKey,
  type PriceOrigin,
} from '@/services/admin/adminPriceListService'
import type { FormEvent } from 'react'

function originClass(o: PriceOrigin): string {
  if (o === 'calculated') return 'bg-emerald-100 text-emerald-900'
  if (o === 'imported') return 'bg-sky-100 text-sky-900'
  return 'bg-amber-100 text-amber-900'
}

function pendingLabels(item: PriceListItem): string[] {
  const labels: string[] = []
  if (item.baseCost == null) labels.push('Sem custo')
  if (!isPriceListItemPriced(item.price)) labels.push(priceListItemPricingStateLabel(item.price))
  if (item.hasOverride) labels.push('Ajuste avulso')
  if (item.priceOrigin === 'calculated' && item.baseCost == null) labels.push('Pendente recálculo')
  return labels
}

function OriginBadge({ origin }: { origin: PriceOrigin }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide ${originClass(origin)}`}
      title={`Origem: ${priceOriginLabel(origin)}`}
    >
      {priceOriginLabel(origin)}
    </span>
  )
}

export type PriceListProductsSupplierOption = { id: string; name: string }

type Props = {
  list: PriceList
  items: PriceListItem[]
  visibleItems: PriceListItem[]
  selectedItems: PriceListItem[]
  selectedIds: Set<string>
  singleMatch: PriceListItem | null | undefined
  allVisibleSelected: boolean
  allowed: boolean
  busy: boolean
  rowBusy: string | null
  sku: string
  price: string
  bulkPrice: string
  filterQ: string
  filterQDebounced: string
  filterOrigin: PriceOrigin | ''
  filterWithoutCost: boolean
  filterWithoutPrice: boolean
  filterOnlyCalculated: boolean
  filterWithOverride: boolean
  filterSupplierId: string
  suppliersInList: PriceListProductsSupplierOption[]
  onSku: (v: string) => void
  onPrice: (v: string) => void
  onBulkPrice: (v: string) => void
  onFilterQ: (v: string) => void
  onFilterQDebounced: (v: string) => void
  onFilterOrigin: (v: PriceOrigin | '') => void
  onFilterWithoutCost: (v: boolean) => void
  onFilterWithoutPrice: (v: boolean) => void
  onFilterOnlyCalculated: (v: boolean) => void
  onFilterWithOverride: (v: boolean) => void
  onFilterSupplierId: (v: string) => void
  onClearFilters: () => void
  onAddItem: (e: FormEvent) => void
  onBulkApplyRule: () => void
  onExportSelected: () => void
  onBulkSetPrice: () => void
  onBulkRemove: () => void
  onToggleSort: (key: PriceListItemSortKey) => void
  sortMark: (key: PriceListItemSortKey) => string
  onToggleSelectAllVisible: () => void
  onToggleSelectOne: (itemId: string) => void
  onEditItem: (item: PriceListItem) => void
  onRemoveItem: (itemId: string) => void
}

export function PriceListProductsTab({
  list,
  items,
  visibleItems,
  selectedItems,
  selectedIds,
  singleMatch,
  allVisibleSelected,
  allowed,
  busy,
  rowBusy,
  sku,
  price,
  bulkPrice,
  filterQ,
  filterQDebounced,
  filterOrigin,
  filterWithoutCost,
  filterWithoutPrice,
  filterOnlyCalculated,
  filterWithOverride,
  filterSupplierId,
  suppliersInList,
  onSku,
  onPrice,
  onBulkPrice,
  onFilterQ,
  onFilterQDebounced,
  onFilterOrigin,
  onFilterWithoutCost,
  onFilterWithoutPrice,
  onFilterOnlyCalculated,
  onFilterWithOverride,
  onFilterSupplierId,
  onClearFilters,
  onAddItem,
  onBulkApplyRule,
  onExportSelected,
  onBulkSetPrice,
  onBulkRemove,
  onToggleSort,
  sortMark,
  onToggleSelectAllVisible,
  onToggleSelectOne,
  onEditItem,
  onRemoveItem,
}: Props) {
  const filtersActive =
    Boolean(filterQDebounced.trim()) ||
    Boolean(filterOrigin) ||
    filterWithoutCost ||
    filterWithoutPrice ||
    filterOnlyCalculated ||
    filterWithOverride ||
    Boolean(filterSupplierId)

  return (
    <div className="space-y-4">
      <form
        onSubmit={onAddItem}
        className="grid gap-3 rounded-[14px] border border-fal-line bg-white p-4 md:grid-cols-4"
      >
        <div className="text-sm text-fal-muted md:col-span-4">
          Adicionar item com origem <strong>{priceOriginLabel('manual')}</strong>.
        </div>
        <Input label={SKU_FAL_LABEL} value={sku} onChange={(e) => onSku(e.target.value)} required />
        <Input
          label="Preço"
          inputMode="decimal"
          value={price}
          onChange={(e) => onPrice(e.target.value)}
          required
        />
        <div className="flex items-end">
          <Button type="submit" disabled={!allowed}>
            Adicionar
          </Button>
        </div>
      </form>

      <div className="rounded-[14px] border border-fal-line bg-white p-4">
        <p className="mb-3 text-sm text-fal-muted">
          Contexto: <strong>{list.name}</strong> · {pricingMethodLabel(list.pricingMethod)}{' '}
          {pricingRuleLabel(list.pricingMethod, list.pricingPercent)}. Preços exibidos são só desta
          lista.
        </p>
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            onFilterQDebounced(filterQ.trim())
          }}
        >
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-[200px] flex-1">
              <Input
                label="Código, descrição ou referência"
                hint="Busca em código, descrição e código do fabricante. Referência de fornecedor não incluída nesta tela."
                value={filterQ}
                onChange={(e) => onFilterQ(e.target.value)}
                placeholder="Ex.: filtro, ABC-1…"
              />
            </div>
            <Button type="submit" className="mt-[22px] shrink-0">
              Buscar
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">
                Origem do preço
              </span>
              <select
                className="w-full rounded-[9px] border border-fal-line px-3 py-3"
                value={filterOrigin}
                onChange={(e) => onFilterOrigin(e.target.value as PriceOrigin | '')}
              >
                <option value="">Todas</option>
                <option value="calculated">Calculado</option>
                <option value="imported">Importado</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Fornecedor</span>
              <select
                className="w-full rounded-[9px] border border-fal-line px-3 py-3"
                value={filterSupplierId}
                onChange={(e) => onFilterSupplierId(e.target.value)}
              >
                <option value="">Todos</option>
                {suppliersInList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </form>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={filterWithoutCost}
              onChange={(e) => onFilterWithoutCost(e.target.checked)}
            />
            Sem custo
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={filterWithoutPrice}
              onChange={(e) => onFilterWithoutPrice(e.target.checked)}
            />
            Sem preço
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={filterOnlyCalculated}
              onChange={(e) => onFilterOnlyCalculated(e.target.checked)}
            />
            Só {priceOriginLabel('calculated')}
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={filterWithOverride}
              onChange={(e) => onFilterWithOverride(e.target.checked)}
            />
            Com ajuste avulso
          </label>
          {filtersActive ? (
            <button
              type="button"
              className="font-semibold text-fal-navy underline"
              onClick={onClearFilters}
            >
              Limpar filtros
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-fal-muted">
          Itens na visão (lista + cadastro sem preço): {items.length} · filtrados:{' '}
          {visibleItems.length}. Filtros e ordenação são lembrados nesta sessão.
        </p>
        {singleMatch ? (
          <div className="mt-3 rounded-[10px] border border-fal-yellow-dark/40 bg-fal-yellow/20 px-3 py-2 text-sm">
            Match único · Preço na lista <strong>{list.name}</strong>:{' '}
            <strong>{formatMoney(singleMatch.price)}</strong>
            {singleMatch.sku ? (
              <span className="text-fal-muted"> · {singleMatch.sku}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {selectedItems.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2 rounded-[14px] border border-fal-line bg-white p-3">
          <span className="text-sm font-semibold text-fal-navy">
            {selectedItems.length} selecionado(s)
          </span>
          <Button
            type="button"
            variant="light"
            disabled={busy || !allowed}
            onClick={onBulkApplyRule}
          >
            Incluir e calcular seleção
          </Button>
          <Button type="button" variant="light" disabled={busy} onClick={onExportSelected}>
            Exportar seleção
          </Button>
          <Input
            label={`Novo preço ${priceOriginLabel('manual')}`}
            inputMode="decimal"
            value={bulkPrice}
            onChange={(e) => onBulkPrice(e.target.value)}
          />
          <Button type="button" disabled={busy || !allowed} onClick={onBulkSetPrice}>
            Definir preço manual
          </Button>
          <Button type="button" variant="light" disabled={busy} onClick={onBulkRemove}>
            Remover da lista
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-fal-line bg-fal-bg text-fal-muted">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onToggleSelectAllVisible}
                  title="Selecionar todos os resultados filtrados (carregados)"
                />
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => onToggleSort('description')}>
                  Produto{sortMark('description')}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => onToggleSort('sku')}>
                  {CODIGO_REFERENCIA_LABEL}
                  {sortMark('sku')}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => onToggleSort('cost')}>
                  Custo{sortMark('cost')}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => onToggleSort('markup')}>
                  Markup{sortMark('markup')}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => onToggleSort('margin')}>
                  Margem{sortMark('margin')}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => onToggleSort('price')}>
                  Preço{sortMark('price')}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => onToggleSort('origin')}>
                  Origem{sortMark('origin')}
                </button>
              </th>
              <th className="px-3 py-2">Ação</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-fal-muted">
                  Nenhum item com os filtros atuais.
                </td>
              </tr>
            ) : (
              visibleItems.map((item) => {
                const busyRow = rowBusy === item.id
                const isSingleHit = singleMatch?.id === item.id
                return (
                  <tr
                    key={item.id}
                    className={`border-b border-fal-line/70 align-top ${
                      isSingleHit ? 'bg-fal-yellow/25' : ''
                    }`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => onToggleSelectOne(item.id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {item.productName}
                      {pendingLabels(item).length ? (
                        <div className="text-xs text-amber-800">
                          {pendingLabels(item).join(' · ')}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{item.sku}</td>
                    <td className="px-3 py-2">
                      {item.costTotal != null
                        ? formatMoney(item.costTotal)
                        : item.baseCost != null
                          ? formatMoney(item.baseCost)
                          : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {item.effectiveMarkupPct != null
                        ? `${item.effectiveMarkupPct.toFixed(1)}%`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {item.effectiveMarginPct != null
                        ? `${item.effectiveMarginPct.toFixed(1)}%`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 font-semibold">{formatMoney(item.price)}</td>
                    <td className="px-3 py-2">
                      <OriginBadge origin={item.priceOrigin} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="text-sm font-semibold text-fal-navy underline"
                          disabled={!allowed || busyRow}
                          onClick={() => onEditItem(item)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="text-sm font-semibold text-red-700 underline"
                          disabled={busyRow}
                          onClick={() => onRemoveItem(item.id)}
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
