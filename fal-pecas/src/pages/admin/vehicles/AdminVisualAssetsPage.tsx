import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import {
  adminAddVisualCompat,
  adminCreateVisualAssetDraft,
  adminListCompatForAsset,
  adminListVisualAssets,
  adminSetCompatStatus,
  adminSetVisualAssetStatus,
  type AdminVisualAssetRow,
  type AdminVisualCompatRow,
} from '@/services/admin/adminVisualAssetService'
import { adminListModels } from '@/services/admin/adminVehicleService'
import type { Manufacturer, VehicleModel } from '@/types'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

export function AdminVisualAssetsPage() {
  useDocumentTitle('Modelos 3D | Admin FAL')
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState<AdminVisualAssetRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [compat, setCompat] = useState<AdminVisualCompatRow[]>([])
  const [makers, setMakers] = useState<Manufacturer[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])

  const [code, setCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [source, setSource] = useState<'acquired' | 'ai' | 'first_party'>('first_party')
  const [vendor, setVendor] = useState('')
  const [license, setLicense] = useState('')
  const [commercialOk, setCommercialOk] = useState(true)
  const [redistributeOk, setRedistributeOk] = useState(false)
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const [compatMakerId, setCompatMakerId] = useState('')
  const [compatModelId, setCompatModelId] = useState('')
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [compatGeneration, setCompatGeneration] = useState('')
  const [compatBodyStyle, setCompatBodyStyle] = useState('')
  const [compatFacelift, setCompatFacelift] = useState('')
  const [compatPending, setCompatPending] = useState(false)
  const [importNote, setImportNote] = useState('')

  const reload = useCallback(async () => {
    const [list, makerList, modelList] = await Promise.all([
      adminListVisualAssets(),
      adminListManufacturers(),
      adminListModels(),
    ])
    setAssets(list)
    setMakers(makerList)
    setModels(modelList)
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        await reload()
      } catch (e) {
        toast.push(toUserMessage(e, 'Erro ao carregar biblioteca 3D'), 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [reload, toast])

  useEffect(() => {
    if (!selectedId) {
      setCompat([])
      return
    }
    void (async () => {
      try {
        setCompat(await adminListCompatForAsset(selectedId))
      } catch (e) {
        toast.push(toUserMessage(e, 'Erro ao carregar compat'), 'error')
      }
    })()
  }, [selectedId, toast])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!file) {
      toast.push('Selecione um arquivo GLB/GLTF', 'error')
      return
    }
    setSaving(true)
    try {
      const row = await adminCreateVisualAssetDraft({
        code,
        displayName,
        format: file.name.toLowerCase().endsWith('.gltf') ? 'gltf' : 'glb',
        source,
        vendor,
        license,
        commercialOk,
        redistributeOk,
        notes,
        file,
      })
      toast.push('Asset criado como draft (não é fato do veículo)', 'success')
      setCode('')
      setDisplayName('')
      setFile(null)
      await reload()
      setSelectedId(row.id)
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao criar asset'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(id: string, status: AdminVisualAssetRow['status']) {
    try {
      await adminSetVisualAssetStatus(id, status)
      toast.push(`Status → ${status}`, 'success')
      await reload()
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao alterar status'), 'error')
    }
  }

  async function onAddCompat(e: FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    try {
      await adminAddVisualCompat({
        assetId: selectedId,
        manufacturerId: compatMakerId || null,
        modelId: compatModelId || null,
        yearFrom: yearFrom ? Number(yearFrom) : null,
        yearTo: yearTo ? Number(yearTo) : null,
        generation: compatGeneration || null,
        bodyStyle: compatBodyStyle || null,
        facelift: compatFacelift || null,
        status: compatPending ? 'pending' : 'approved',
      })
      toast.push(compatPending ? 'Compat pendente de review' : 'Compat adicionada (aprovada)', 'success')
      setCompat(await adminListCompatForAsset(selectedId))
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao adicionar compat'), 'error')
    }
  }

  if (loading) return <Loading label="Carregando biblioteca 3D…" />

  const selected = assets.find((a) => a.id === selectedId) ?? null
  const modelsForMaker = compatMakerId
    ? models.filter((m) => m.manufacturerId === compatMakerId)
    : models

  return (
    <div className="space-y-6">
      <div>
        <h1 className="m-0 text-2xl font-extrabold text-fal-fg">Modelos 3D (Camada 2)</h1>
        <p className="mt-1 text-sm text-fal-muted">
          Biblioteca GLB/glTF separada de evidências. Aprovar asset ≠ instalar peça ≠ fato 2A.
          Procedência e licença são obrigatórias para uso comercial.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="grid gap-2 rounded-fal border border-fal-line bg-fal-surface p-4 text-fal-fg sm:grid-cols-2"
      >
        <h2 className="m-0 sm:col-span-2 text-sm font-extrabold">Novo asset (draft)</h2>
        <Input label="Código" value={code} onChange={(ev) => setCode(ev.target.value)} required />
        <Input
          label="Nome de exibição"
          value={displayName}
          onChange={(ev) => setDisplayName(ev.target.value)}
          required
        />
        <label className="block text-sm font-semibold">
          Fonte
          <select
            className="mt-1 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm"
            value={source}
            onChange={(ev) => setSource(ev.target.value as typeof source)}
          >
            <option value="first_party">Próprio (FAL)</option>
            <option value="acquired">Adquirido</option>
            <option value="ai">IA</option>
          </select>
        </label>
        <Input label="Fornecedor / criador" value={vendor} onChange={(ev) => setVendor(ev.target.value)} />
        <Input label="Licença" value={license} onChange={(ev) => setLicense(ev.target.value)} />
        <Input label="Notas" value={notes} onChange={(ev) => setNotes(ev.target.value)} />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={commercialOk}
            onChange={(ev) => setCommercialOk(ev.target.checked)}
          />
          Uso comercial OK
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={redistributeOk}
            onChange={(ev) => setRedistributeOk(ev.target.checked)}
          />
          Redistribuição OK
        </label>
        <label className="block text-sm font-semibold sm:col-span-2">
          Arquivo .glb / .gltf (máx. 50MB)
          <input
            type="file"
            accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
            className="mt-1 block w-full text-sm"
            onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
          />
        </label>
        {source === 'ai' && !commercialOk ? (
          <p className="m-0 sm:col-span-2 text-xs font-semibold text-fal-danger">
            Asset IA sem commercial_ok não entra no viewer público mesmo se aprovado.
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={saving}>
            Upload draft
          </Button>
        </div>
      </form>

      <section className="space-y-2">
        <h2 className="m-0 text-sm font-extrabold">Assets</h2>
        {!assets.length ? (
          <EmptyState title="Nenhum asset" description="Faça upload de um GLB para começar." />
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {assets.map((a) => (
              <li
                key={a.id}
                className={`rounded-fal border p-3 ${
                  selectedId === a.id
                    ? 'border-fal-accent bg-fal-accent/5'
                    : 'border-fal-line bg-fal-surface'
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelectedId(a.id)}
                >
                  <p className="m-0 text-sm font-extrabold">
                    {a.displayName}{' '}
                    <span className="font-semibold text-fal-muted">({a.code})</span>
                  </p>
                  <p className="m-0 text-xs text-fal-muted">
                    {a.status} · {a.source} · {a.format} · comercial={a.commercialOk ? 'sim' : 'não'}
                    {a.license ? ` · ${a.license}` : ''}
                  </p>
                </button>
                <div className="mt-2 flex flex-wrap gap-2">
                  {a.status === 'draft' || a.status === 'rejected' ? (
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => void setStatus(a.id, 'review')}
                    >
                      Enviar p/ review
                    </Button>
                  ) : null}
                  {a.status === 'draft' || a.status === 'rejected' || a.status === 'review' ? (
                    <Button size="sm" type="button" onClick={() => void setStatus(a.id, 'approved')}>
                      Aprovar
                    </Button>
                  ) : null}
                  {a.status === 'draft' || a.status === 'approved' || a.status === 'review' ? (
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => void setStatus(a.id, 'rejected')}
                    >
                      Rejeitar
                    </Button>
                  ) : null}
                  {a.status === 'approved' ? (
                    <>
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => void setStatus(a.id, 'retired')}
                      >
                        Arquivar
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => void setStatus(a.id, 'revoked')}
                      >
                        Revogar
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected ? (
        <section className="space-y-3 rounded-fal border border-fal-line bg-fal-surface p-4 text-fal-fg">
          <h2 className="m-0 text-sm font-extrabold">Compat · {selected.code}</h2>
          <form onSubmit={onAddCompat} className="grid gap-2 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Montadora
              <select
                className="mt-1 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm"
                value={compatMakerId}
                onChange={(ev) => {
                  setCompatMakerId(ev.target.value)
                  setCompatModelId('')
                }}
              >
                <option value="">(qualquer)</option>
                {makers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Modelo
              <select
                className="mt-1 w-full rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm"
                value={compatModelId}
                onChange={(ev) => setCompatModelId(ev.target.value)}
              >
                <option value="">(qualquer)</option>
                {modelsForMaker.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Ano de"
              value={yearFrom}
              onChange={(ev) => setYearFrom(ev.target.value)}
            />
            <Input label="Ano até" value={yearTo} onChange={(ev) => setYearTo(ev.target.value)} />
            <Input
              label="Geração"
              value={compatGeneration}
              onChange={(ev) => setCompatGeneration(ev.target.value)}
            />
            <Input
              label="Carroceria"
              value={compatBodyStyle}
              onChange={(ev) => setCompatBodyStyle(ev.target.value)}
            />
            <Input
              label="Facelift"
              value={compatFacelift}
              onChange={(ev) => setCompatFacelift(ev.target.value)}
            />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={compatPending}
                onChange={(ev) => setCompatPending(ev.target.checked)}
              />
              Salvar como pending (review)
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm">
                {compatPending ? 'Adicionar compat (pending)' : 'Adicionar compat (aprovada)'}
              </Button>
            </div>
          </form>
          <div className="rounded-fal border border-dashed border-fal-line bg-fal-bg/40 p-3">
            <p className="m-0 text-xs font-extrabold text-fal-fg">Importar candidato externo</p>
            <p className="mt-1 m-0 text-[11px] text-fal-muted">
              Fonte externa (Tripo / outro): registre a origem nas notas, faça upload do GLB como
              draft e envie para review. Não publica automaticamente.
            </p>
            <Input
              label="Nota de importação (candidato)"
              value={importNote}
              onChange={(ev) => setImportNote(ev.target.value)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                if (!importNote.trim()) {
                  toast.push('Descreva make/model/year/fonte do candidato', 'error')
                  return
                }
                setNotes((prev) =>
                  [prev, `IMPORT_CANDIDATE: ${importNote.trim()}`].filter(Boolean).join('\n'),
                )
                setSource('acquired')
                setVendor((v) => v || 'external')
                toast.push('Nota de candidato aplicada ao formulário de draft — faça o upload', 'success')
              }}
            >
              Preparar draft a partir da nota
            </Button>
          </div>
          {!compat.length ? (
            <p className="m-0 text-xs text-fal-muted">Nenhuma associação ainda.</p>
          ) : (
            <ul className="m-0 list-none space-y-1 p-0">
              {compat.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-fal-line px-2 py-1 text-xs"
                >
                  <span>
                    {c.status} · mfr={c.manufacturerId?.slice(0, 8) ?? '*'} · model=
                    {c.modelId?.slice(0, 8) ?? '*'} · {c.yearFrom ?? '…'}–{c.yearTo ?? '…'}
                    {c.generation ? ` · gen=${c.generation}` : ''}
                    {c.bodyStyle ? ` · body=${c.bodyStyle}` : ''}
                    {c.facelift ? ` · face=${c.facelift}` : ''}
                  </span>
                  {c.status === 'pending' ? (
                    <Button
                      size="sm"
                      type="button"
                      onClick={() =>
                        void adminSetCompatStatus(c.id, 'approved').then(async () => {
                          toast.push('Compat aprovada', 'success')
                          setCompat(await adminListCompatForAsset(selected.id))
                        })
                      }
                    >
                      Aprovar compat
                    </Button>
                  ) : null}
                  {c.status !== 'revoked' ? (
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() =>
                        void adminSetCompatStatus(c.id, 'revoked').then(async () => {
                          if (selectedId) setCompat(await adminListCompatForAsset(selectedId))
                          toast.push('Compat revogada (histórico preservado)', 'success')
                        })
                      }
                    >
                      Revogar
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  )
}
