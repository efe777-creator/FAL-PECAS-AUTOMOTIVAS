import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { useToast } from '@/components/common/Toast'
import {
  deleteVehicleAsset,
  listVehicleAssets,
  reorderVehicleAssets,
  setPrimaryVehicleAsset,
  uploadVehicleAsset,
} from '@/services/customers/vehicleAssetService'
import {
  VEHICLE_ASSET_MAX_PER_VEHICLE,
  validateVehicleAssetFile,
} from '@/services/customers/vehicleAssetLimits'
import { toUserMessage } from '@/lib/toUserMessage'
import type { CustomerVehicleAsset } from '@/types'
import { useEffect, useRef, useState } from 'react'

type Props = {
  vehicleId: string
  onChanged?: () => void
}

export function VehiclePhotoGallery({ vehicleId, onChanged }: Props) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [assets, setAssets] = useState<CustomerVehicleAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function reload() {
    setLoading(true)
    try {
      setAssets(await listVehicleAssets(vehicleId))
    } catch (e) {
      toast.push(toUserMessage(e, 'Erro ao carregar fotos'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- vehicleId
  }, [vehicleId])

  async function onPick(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    const msg = validateVehicleAssetFile(file)
    if (msg) {
      toast.push(msg, 'error')
      return
    }
    setBusy(true)
    try {
      await uploadVehicleAsset(vehicleId, file)
      toast.push('Foto adicionada.', 'success')
      await reload()
      onChanged?.()
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha no upload'), 'error')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <p className="m-0 text-sm text-fal-muted">
        Até {VEHICLE_ASSET_MAX_PER_VEHICLE} fotos (JPEG/PNG/WebP, máx. 5 MB). A capa pessoal
        substitui a imagem stock só na apresentação.
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => void onPick(e.target.files)}
        />
        <Button
          type="button"
          size="sm"
          disabled={busy || assets.length >= VEHICLE_ASSET_MAX_PER_VEHICLE}
          onClick={() => inputRef.current?.click()}
        >
          Enviar foto
        </Button>
      </div>

      {loading ? <p className="text-sm text-fal-muted">Carregando fotos…</p> : null}

      {!loading && assets.length === 0 ? (
        <p className="text-sm text-fal-muted">Nenhuma foto pessoal ainda.</p>
      ) : null}

      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
        {assets.map((a) => (
          <li key={a.id} className="overflow-hidden rounded-[10px] border border-fal-line bg-fal-bg">
            <div className="aspect-[4/3] bg-fal-surface-2">
              {a.signedUrl ? (
                <img
                  src={a.signedUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-fal-muted">
                  Sem preview
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1 p-2">
              {a.isPrimary ? (
                <span className="text-[11px] font-extrabold text-fal-success">Capa</span>
              ) : (
                <Button
                  type="button"
                  variant="light"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void setPrimaryVehicleAsset(vehicleId, a.id)
                      .then(async () => {
                        toast.push('Capa atualizada.', 'success')
                        await reload()
                        onChanged?.()
                      })
                      .catch((e) => toast.push(toUserMessage(e, 'Falha ao definir capa'), 'error'))
                  }
                >
                  Usar como capa
                </Button>
              )}
              <Button
                type="button"
                variant="light"
                size="sm"
                disabled={busy || assets[0]?.id === a.id}
                onClick={() => {
                  const idx = assets.findIndex((x) => x.id === a.id)
                  if (idx <= 0) return
                  const next = [...assets]
                  ;[next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!]
                  void reorderVehicleAssets(
                    vehicleId,
                    next.map((x) => x.id),
                  )
                    .then(async () => {
                      await reload()
                      onChanged?.()
                    })
                    .catch((e) => toast.push(toUserMessage(e, 'Falha ao reordenar'), 'error'))
                }}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="light"
                size="sm"
                disabled={busy || assets[assets.length - 1]?.id === a.id}
                onClick={() => {
                  const idx = assets.findIndex((x) => x.id === a.id)
                  if (idx < 0 || idx >= assets.length - 1) return
                  const next = [...assets]
                  ;[next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!]
                  void reorderVehicleAssets(
                    vehicleId,
                    next.map((x) => x.id),
                  )
                    .then(async () => {
                      await reload()
                      onChanged?.()
                    })
                    .catch((e) => toast.push(toUserMessage(e, 'Falha ao reordenar'), 'error'))
                }}
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    const { confirmed } = await confirmDialog({
                      title: 'Excluir foto?',
                      message: 'A foto será removida da galeria e do armazenamento.',
                      confirmLabel: 'Excluir',
                      danger: true,
                    })
                    if (!confirmed) return
                    setBusy(true)
                    try {
                      await deleteVehicleAsset(a)
                      toast.push('Foto removida.', 'success')
                      await reload()
                      onChanged?.()
                    } catch (e) {
                      toast.push(toUserMessage(e, 'Falha ao excluir'), 'error')
                    } finally {
                      setBusy(false)
                    }
                  })()
                }}
              >
                Excluir
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
