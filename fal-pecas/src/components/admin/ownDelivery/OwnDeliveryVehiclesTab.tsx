import { iconLabel } from '@/components/admin/ownDelivery/ownDeliveryHelpers'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  OWN_VEHICLE_ICON_OPTIONS,
  deleteOwnVehicleCategory,
  listOwnVehicleCategories,
  listOwnVehicleTariffs,
  upsertOwnVehicleCategory,
  type OwnVehicleCategory,
  type OwnVehicleTariff,
} from '@/services/admin/adminOwnDeliveryService'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toUserMessage } from '@/lib/toUserMessage'

type Props = {
  onOk: (msg: string) => void
  onError: (msg: string) => void
  /** Mantém a aba Produtos alinhada após CRUD de veículos. */
  onCategoriesChange?: (cats: OwnVehicleCategory[]) => void
}

export function OwnDeliveryVehiclesTab({ onOk, onError, onCategoriesChange }: Props) {
  const [categories, setCategories] = useState<OwnVehicleCategory[]>([])
  const [tariffs, setTariffs] = useState<OwnVehicleTariff[]>([])
  const [showTech, setShowTech] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newIcon, setNewIcon] = useState('car')
  const [newPol, setNewPol] = useState('12')
  const [newMaxKm, setNewMaxKm] = useState('')
  const onCategoriesChangeRef = useRef(onCategoriesChange)
  onCategoriesChangeRef.current = onCategoriesChange

  const reload = useCallback(async () => {
    const [cats, tars] = await Promise.all([
      listOwnVehicleCategories().catch(() => [] as OwnVehicleCategory[]),
      listOwnVehicleTariffs().catch(() => [] as OwnVehicleTariff[]),
    ])
    setCategories(cats)
    setTariffs(tars)
    onCategoriesChangeRef.current?.(cats)
  }, [])

  useEffect(() => {
    void reload().catch((e) => onError(toUserMessage(e, 'Falha ao carregar veículos')))
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
    <div className="space-y-4">
      <section className="rounded-[14px] border border-fal-line bg-white p-4">
        <h2 className="mt-0 text-lg font-extrabold text-fal-navy">Tipos de veículo</h2>
        <p className="m-0 mb-3 text-sm text-fal-muted">
          Cada tipo define quanto carrega e até quantos km atende. Inclua ou remova conforme a
          frota.
        </p>
        <div className="space-y-3">
          {categories.map((c) => (
            <form
              key={c.id}
              className="grid gap-2 rounded-xl border border-fal-line p-3 md:grid-cols-5"
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                void (async () => {
                  try {
                    const newLabelSaved = String(fd.get('label') || c.label)
                    await upsertOwnVehicleCategory({
                      id: c.id,
                      code: c.code,
                      label: newLabelSaved,
                      icon: String(fd.get('icon') || c.icon),
                      capacityPol: Number(fd.get('capacity') || c.capacityPol),
                      maxDistanceKm: String(fd.get('maxKm') || '').trim()
                        ? Number(fd.get('maxKm'))
                        : null,
                      sortOrder: Number(fd.get('sort') || c.sortOrder),
                      active: fd.get('active') === 'on',
                    })
                    onOk(`“${newLabelSaved}” atualizado.`)
                    await reload()
                  } catch (err) {
                    onError(toUserMessage(err, 'Falha ao salvar veículo'))
                  }
                })()
              }}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs md:col-span-5">
                <span className="font-semibold text-fal-navy">{iconLabel(c.icon)}</span>
                {activeTariffByCat.has(c.id) ? (
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800">
                    Preço cadastrado
                  </span>
                ) : (
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">
                    Falta cadastrar preço em Tarifas
                  </span>
                )}
              </div>
              <Input name="label" label="Nome" defaultValue={c.label} required />
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-extrabold text-fal-muted">Ícone</span>
                <select
                  name="icon"
                  defaultValue={c.icon}
                  className="w-full rounded-[9px] border border-fal-line px-3 py-3"
                >
                  {OWN_VEHICLE_ICON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                name="capacity"
                label="Capacidade"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={String(c.capacityPol)}
                required
                hint="Quanto esse veículo aguenta"
              />
              <Input
                name="maxKm"
                label="Atende até (km)"
                type="number"
                step="0.1"
                min="0"
                defaultValue={c.maxDistanceKm != null ? String(c.maxDistanceKm) : ''}
                hint="Vazio = usa o limite geral"
              />
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
                <input name="active" type="checkbox" defaultChecked={c.active} /> Em uso
              </label>
              {showTech ? (
                <div className="grid gap-2 sm:grid-cols-2 md:col-span-5">
                  <Input
                    name="sort"
                    label="Ordem na cotação"
                    type="number"
                    defaultValue={String(c.sortOrder)}
                  />
                  <p className="m-0 self-end pb-2 text-xs text-fal-muted">
                    Código interno: <span className="font-mono">{c.code}</span>
                  </p>
                </div>
              ) : (
                <input type="hidden" name="sort" value={String(c.sortOrder)} />
              )}
              <div className="flex flex-wrap gap-2 md:col-span-5">
                <Button type="submit">Salvar</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (
                      !confirm(
                        `Excluir “${c.label}”? Os preços desse veículo também serão removidos.`,
                      )
                    )
                      return
                    void (async () => {
                      try {
                        await deleteOwnVehicleCategory(c.id)
                        onOk(`“${c.label}” excluído.`)
                        await reload()
                      } catch (err) {
                        onError(toUserMessage(err, 'Falha ao excluir'))
                      }
                    })()
                  }}
                >
                  Excluir
                </Button>
              </div>
            </form>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-fal-muted">
          <input
            type="checkbox"
            checked={showTech}
            onChange={(e) => setShowTech(e.target.checked)}
          />
          Mostrar detalhes técnicos
        </label>
      </section>

      <section className="rounded-[14px] border border-fal-line bg-white p-4">
        <h2 className="mt-0 text-lg font-extrabold text-fal-navy">Incluir novo veículo</h2>
        <form
          className="grid gap-2 md:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault()
            void (async () => {
              try {
                await upsertOwnVehicleCategory({
                  label: newLabel,
                  icon: newIcon,
                  capacityPol: Number(newPol),
                  maxDistanceKm: newMaxKm.trim() ? Number(newMaxKm) : null,
                  sortOrder: (categories.at(-1)?.sortOrder ?? 0) + 10,
                  active: true,
                })
                setNewLabel('')
                setNewPol('12')
                setNewMaxKm('')
                onOk('Novo veículo criado.')
                await reload()
              } catch (err) {
                onError(toUserMessage(err, 'Falha ao criar'))
              }
            })()
          }}
        >
          <Input
            label="Nome"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            required
          />
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-extrabold text-fal-muted">Ícone</span>
            <select
              className="w-full rounded-[9px] border border-fal-line px-3 py-3"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
            >
              {OWN_VEHICLE_ICON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Capacidade"
            type="number"
            value={newPol}
            onChange={(e) => setNewPol(e.target.value)}
            required
          />
          <Input
            label="Atende até (km)"
            type="number"
            value={newMaxKm}
            onChange={(e) => setNewMaxKm(e.target.value)}
          />
          <Button type="submit">Incluir veículo</Button>
        </form>
      </section>
    </div>
  )
}
