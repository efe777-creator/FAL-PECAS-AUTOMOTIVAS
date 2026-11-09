import { iconLabel } from '@/components/admin/ownDelivery/ownDeliveryHelpers'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  createOwnVehicleTariff,
  deleteOwnVehicleTariff,
  listOwnVehicleCategories,
  listOwnVehicleTariffs,
  updateOwnVehicleTariff,
  type OwnVehicleCategory,
  type OwnVehicleTariff,
} from '@/services/admin/adminOwnDeliveryService'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toUserMessage } from '@/lib/toUserMessage'

type Props = {
  onOk: (msg: string) => void
  onError: (msg: string) => void
}

export function OwnDeliveryRatesTab({ onOk, onError }: Props) {
  const [categories, setCategories] = useState<OwnVehicleCategory[]>([])
  const [tariffs, setTariffs] = useState<OwnVehicleTariff[]>([])
  const [showTech, setShowTech] = useState(false)

  const reload = useCallback(async () => {
    const [cats, tars] = await Promise.all([
      listOwnVehicleCategories().catch(() => [] as OwnVehicleCategory[]),
      listOwnVehicleTariffs().catch(() => [] as OwnVehicleTariff[]),
    ])
    setCategories(cats)
    setTariffs(tars)
  }, [])

  useEffect(() => {
    void reload().catch((e) => onError(toUserMessage(e, 'Falha ao carregar tarifas')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeTariffByCat = useMemo(() => {
    const map = new Map<string, OwnVehicleTariff>()
    for (const t of tariffs) {
      if (!t.active) continue
      map.set(t.categoryId, t)
    }
    return map
  }, [tariffs])

  return (
    <div className="space-y-4 rounded-[14px] border border-fal-line bg-white p-4">
      <h2 className="mt-0 text-lg font-extrabold text-fal-navy">Preços por veículo</h2>
      <p className="m-0 text-sm text-fal-muted">
        Para cada tipo: taxa mínima (piso), valor por km de ida e um adicional fixo (opcional). O
        frete fica o maior entre (km × valor/km) e a mínima, mais o adicional.
      </p>
      {!categories.length ? (
        <p className="text-sm text-amber-800">
          Cadastre ao menos um veículo no menu <strong>Veículos</strong>.
        </p>
      ) : null}
      {categories.map((c) => {
        const active = activeTariffByCat.get(c.id)
        const history = tariffs.filter((t) => t.categoryId === c.id)
        return (
          <div key={c.id} className="rounded-xl border border-fal-line p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="m-0 text-base font-extrabold text-fal-navy">{c.label}</h3>
              <span className="text-xs text-fal-muted">{iconLabel(c.icon)}</span>
            </div>
            {active ? (
              <form
                className="grid gap-2 md:grid-cols-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  void (async () => {
                    try {
                      await updateOwnVehicleTariff({
                        id: active.id,
                        tarifaMinima: Number(fd.get('min')),
                        valorPorKm: Number(fd.get('km')),
                        adicional: Number(fd.get('extra') || 0),
                        active: true,
                      })
                      onOk(`Preço de “${c.label}” atualizado.`)
                      await reload()
                    } catch (err) {
                      onError(toUserMessage(err, 'Falha ao salvar preço'))
                    }
                  })()
                }}
              >
                <Input
                  name="min"
                  label="Taxa mínima (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={String(active.tarifaMinima)}
                  required
                  hint="Piso — nunca cobramos menos que isso"
                />
                <Input
                  name="km"
                  label="Valor por km (R$)"
                  type="number"
                  step="0.0001"
                  min="0"
                  defaultValue={String(active.valorPorKm)}
                  required
                  hint="Só ida"
                />
                <Input
                  name="extra"
                  label="Adicional (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={String(active.adicional)}
                  hint="Soma fixa no final (0 se não usar)"
                />
                <div className="flex flex-wrap items-end gap-2">
                  <Button type="submit">Salvar preço</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!confirm(`Remover o preço de “${c.label}”?`)) return
                      void (async () => {
                        try {
                          await deleteOwnVehicleTariff(active.id)
                          onOk('Preço removido.')
                          await reload()
                        } catch (err) {
                          onError(toUserMessage(err, 'Falha ao excluir tarifa'))
                        }
                      })()
                    }}
                  >
                    Remover
                  </Button>
                </div>
                {showTech ? (
                  <p className="m-0 text-xs text-fal-muted md:col-span-4">
                    Versão interna {active.version} · {history.length} registro(s) no histórico
                  </p>
                ) : null}
              </form>
            ) : (
              <form
                className="grid gap-2 md:grid-cols-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  void (async () => {
                    try {
                      await createOwnVehicleTariff({
                        categoryId: c.id,
                        tarifaMinima: Number(fd.get('min')),
                        valorPorKm: Number(fd.get('km')),
                        adicional: Number(fd.get('extra') || 0),
                        active: true,
                      })
                      onOk(`Preço de “${c.label}” cadastrado.`)
                      await reload()
                    } catch (err) {
                      onError(toUserMessage(err, 'Falha ao criar tarifa'))
                    }
                  })()
                }}
              >
                <p className="m-0 text-sm text-amber-800 md:col-span-4">
                  Ainda sem preço — preencha para cotar este veículo na loja.
                </p>
                <Input
                  name="min"
                  label="Taxa mínima (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                />
                <Input
                  name="km"
                  label="Valor por km (R$)"
                  type="number"
                  step="0.0001"
                  min="0"
                  required
                />
                <Input
                  name="extra"
                  label="Adicional (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                />
                <Button type="submit">Cadastrar preço</Button>
              </form>
            )}
          </div>
        )
      })}
      <label className="flex items-center gap-2 text-xs text-fal-muted">
        <input
          type="checkbox"
          checked={showTech}
          onChange={(e) => setShowTech(e.target.checked)}
        />
        Mostrar detalhes técnicos
      </label>
    </div>
  )
}
