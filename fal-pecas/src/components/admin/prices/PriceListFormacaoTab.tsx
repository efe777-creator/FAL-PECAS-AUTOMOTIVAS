import { PricingRuleFields } from '@/components/admin/prices/PricingRuleFields'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { formatMoney, formatMoneyInput } from '@/lib/money'
import {
  computeAdjustedPrice,
  type PriceAdjustMode,
  type PriceList,
  type PriceListItem,
} from '@/services/admin/adminPriceListService'
import type { PricingMethod } from '@/services/pricing/pricingFormulas'
import { Link } from 'react-router-dom'

type Props = {
  list: PriceList
  items: PriceListItem[]
  allowed: boolean
  busy: boolean
  ruleMethod: PricingMethod
  rulePercent: string
  ruleExtraCostPercent: string
  adjustMode: PriceAdjustMode
  adjustDirection: 'up' | 'down'
  adjustValue: string
  onRuleMethod: (v: PricingMethod) => void
  onRulePercent: (v: string) => void
  onRuleExtraCostPercent: (v: string) => void
  onAdjustMode: (v: PriceAdjustMode) => void
  onAdjustDirection: (v: 'up' | 'down') => void
  onAdjustValue: (v: string) => void
  onSaveRuleKeepPrices: () => void
  onApplyMarginToSell: () => void
  onApplyGlobalAdjust: () => void
}

export function PriceListFormacaoTab({
  list,
  items,
  allowed,
  busy,
  ruleMethod,
  rulePercent,
  ruleExtraCostPercent,
  adjustMode,
  adjustDirection,
  adjustValue,
  onRuleMethod,
  onRulePercent,
  onRuleExtraCostPercent,
  onAdjustMode,
  onAdjustDirection,
  onAdjustValue,
  onSaveRuleKeepPrices,
  onApplyMarginToSell,
  onApplyGlobalAdjust,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-[14px] border border-fal-line bg-white p-4">
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">Regra de formação</h2>
        <p className="mt-1 text-sm text-fal-muted">
          Fluxo: CUSTO → adicional de custo (%) → base → markup/margem ou preço fixo → preço final.
          Formação não altera a origem de preço de itens importados/manuais. O adicional em R$ da
          lista permanece informativo e fora do cálculo.
        </p>
        <div className="mt-3 space-y-3">
          <PricingRuleFields
            method={ruleMethod}
            percent={rulePercent}
            extraCostPercent={ruleExtraCostPercent}
            disabled={busy || !allowed}
            className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
            selectClassName="w-full rounded-[9px] border border-fal-line px-3 py-3"
            onMethod={onRuleMethod}
            onPercent={onRulePercent}
            onExtraCostPercent={onRuleExtraCostPercent}
          />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Adicional em R$ (informativo)"
              value={formatMoneyInput(list.listExtraCost)}
              disabled
              hint="Não entra no cálculo. Não reinterpretar como %."
            />
            <div className="flex flex-wrap items-end gap-2 md:col-span-2">
              <Button
                type="button"
                variant="light"
                disabled={busy || !allowed}
                onClick={onSaveRuleKeepPrices}
              >
                Salvar margem (manter venda)
              </Button>
              <Button
                type="button"
                disabled={busy || !allowed || ruleMethod === 'fixed'}
                onClick={onApplyMarginToSell}
              >
                Aplicar margem → atualizar venda
              </Button>
              <Link className="pb-3 text-sm font-semibold text-fal-navy underline" to="/admin/precos">
                Voltar à consulta
              </Link>
            </div>
            <p className="text-xs text-fal-muted md:col-span-2">
              Salvar margem: só persiste regra/adicional. Aplicar margem: inclui produtos com custo
              ainda fora da lista e recalcula só itens Calculados (Importado/Manual ficam iguais).
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-fal-line bg-white p-4">
        <h2 className="text-lg font-extrabold text-fal-navy">Ajuste global (lista inteira)</h2>
        <p className="mt-1 text-sm text-fal-muted">
          Ajuste de todos os preços desta lista — distinto da seleção em massa na aba Produtos.
          Aplica só à lista <strong>{list.name}</strong>. Ex.:{' '}
          {items[0] ? formatMoney(computeAdjustedPrice(items[0].price, 'percent', 10)) : '—'}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <select
            className="rounded-[9px] border border-fal-line px-3 py-3"
            value={adjustMode}
            onChange={(e) => onAdjustMode(e.target.value as PriceAdjustMode)}
          >
            <option value="percent">Percentual</option>
            <option value="fixed">Valor fixo</option>
          </select>
          <select
            className="rounded-[9px] border border-fal-line px-3 py-3"
            value={adjustDirection}
            onChange={(e) => onAdjustDirection(e.target.value as 'up' | 'down')}
          >
            <option value="up">Aumentar</option>
            <option value="down">Diminuir</option>
          </select>
          <Input label="Valor" value={adjustValue} onChange={(e) => onAdjustValue(e.target.value)} />
          <div className="flex items-end">
            <Button type="button" disabled={busy || !allowed} onClick={onApplyGlobalAdjust}>
              Aplicar a todos
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
