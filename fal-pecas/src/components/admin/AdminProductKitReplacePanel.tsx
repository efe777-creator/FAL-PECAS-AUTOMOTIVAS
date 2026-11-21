import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { productStatusLabel } from '@/lib/adminLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminPreviewKitComponentReplace,
  adminReplaceComponentInKits,
  type AdminKitReplacePreviewRow,
} from '@/services/admin/adminProductKitService'
import { adminListProducts } from '@/services/admin/adminProductService'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  oldComponentProductId: string
  onDone: () => void
  onCancel: () => void
}

/**
 * K8 — substituição assistida: escolhe item novo, preview dos kits, aplica só nos selecionados.
 */
export function AdminProductKitReplacePanel({
  oldComponentProductId,
  onDone,
  onCancel,
}: Props) {
  const toast = useToast()
  const { user } = useAuth()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Array<{ id: string; name: string; sku: string }>>([])
  const [newId, setNewId] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [preview, setPreview] = useState<AdminKitReplacePreviewRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (newId && q === newLabel) {
      setHits([])
      return
    }
    const term = q.trim()
    if (term.length < 2) {
      setHits([])
      return
    }
    let cancelled = false
    const t = window.setTimeout(() => {
      void adminListProducts({ q: term, limit: 8, productKind: 'item' })
        .then((found) => {
          if (cancelled) return
          setHits(
            found
              .filter((p) => p.id !== oldComponentProductId)
              .map((p) => ({ id: p.id, name: p.name, sku: p.sku })),
          )
        })
        .catch(() => {
          if (!cancelled) setHits([])
        })
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [q, newId, newLabel, oldComponentProductId])

  useEffect(() => {
    if (!newId) {
      setPreview([])
      setSelected(new Set())
      return
    }
    let cancelled = false
    setLoadingPreview(true)
    setError(null)
    void adminPreviewKitComponentReplace({
      oldComponentProductId,
      newComponentProductId: newId,
    })
      .then((rows) => {
        if (cancelled) return
        setPreview(rows)
        setSelected(new Set(rows.map((r) => r.kitProductId)))
      })
      .catch((e) => {
        if (!cancelled) setError(toUserMessage(e, 'Falha no preview'))
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false)
      })
    return () => {
      cancelled = true
    }
  }, [newId, oldComponentProductId])

  const selectedCount = selected.size
  const autoCount = useMemo(
    () => preview.filter((r) => selected.has(r.kitProductId) && r.kitPriceMode === 'auto').length,
    [preview, selected],
  )

  function toggle(kitId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(kitId)) next.delete(kitId)
      else next.add(kitId)
      return next
    })
  }

  function toggleAll(on: boolean) {
    setSelected(on ? new Set(preview.map((r) => r.kitProductId)) : new Set())
  }

  async function handleApply() {
    if (!newId || selectedCount === 0) {
      toast.push('Selecione o item novo e ao menos um kit', 'error')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await adminReplaceComponentInKits({
        oldComponentProductId,
        newComponentProductId: newId,
        kitProductIds: [...selected],
        note: note.trim() || null,
        actorId: user?.id ?? null,
      })
      toast.push(
        `Substituição aplicada em ${result.updatedKitIds.length} kit(s). Pedidos antigos intactos.`,
        'success',
      )
      if (result.skipped.length > 0) {
        toast.push(
          `${result.skipped.length} kit(s) ignorado(s) (já sem o componente ou inválido).`,
          'info',
        )
      }
      onDone()
    } catch (e) {
      setError(toUserMessage(e, 'Falha na substituição'))
      toast.push(toUserMessage(e, 'Falha na substituição'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-[12px] border border-fal-accent/40 bg-fal-bg p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="m-0 text-sm font-extrabold text-fal-fg">Substituição assistida</h3>
          <p className="mt-1 mb-0 text-xs text-fal-muted">
            Troca este item pelo novo só nos kits marcados. Preço auto recalcula; manual permanece.
            PVC do kit exige revisão. Snapshots de pedido não mudam.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={busy}>
          Fechar
        </Button>
      </div>

      <div>
        <Input
          label="Item substituto"
          value={q}
          onChange={(e) => {
            const v = e.target.value
            setQ(v)
            if (newId && v !== newLabel) {
              setNewId('')
              setNewLabel('')
            }
          }}
          placeholder="Nome ou SKU do item novo (mín. 2 letras)"
        />
        {newId ? (
          <p className="mt-1 mb-0 text-xs text-emerald-800">
            Selecionado: <strong>{newLabel}</strong>
          </p>
        ) : null}
        {hits.length > 0 ? (
          <ul className="mt-1 max-h-40 list-none overflow-auto rounded-[9px] border border-fal-line bg-white p-0 text-sm">
            {hits.map((h) => (
              <li key={h.id} className="border-b border-fal-line/60 last:border-0">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-fal-bg"
                  onClick={() => {
                    const label = `${h.sku} — ${h.name}`
                    setNewId(h.id)
                    setNewLabel(label)
                    setQ(label)
                    setHits([])
                  }}
                >
                  <span className="font-mono text-xs text-fal-muted">{h.sku}</span>
                  <span className="mt-0.5 block font-semibold text-fal-ink">{h.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? <p className="m-0 text-sm text-fal-danger">{error}</p> : null}

      {newId && loadingPreview ? (
        <p className="m-0 text-sm text-fal-muted">Carregando preview…</p>
      ) : null}

      {newId && !loadingPreview && preview.length === 0 ? (
        <p className="m-0 text-sm text-fal-muted">Nenhum kit usa este componente.</p>
      ) : null}

      {preview.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              className="font-semibold text-fal-fg underline"
              onClick={() => toggleAll(true)}
            >
              Marcar todos
            </button>
            <span className="text-fal-muted">·</span>
            <button
              type="button"
              className="font-semibold text-fal-fg underline"
              onClick={() => toggleAll(false)}
            >
              Desmarcar
            </button>
            <span className="text-fal-muted">
              {selectedCount}/{preview.length} · {autoCount} auto (preço recalcula)
            </span>
          </div>

          <ul className="m-0 max-h-56 list-none space-y-2 overflow-auto p-0">
            {preview.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-start gap-2 rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.has(row.kitProductId)}
                    onChange={() => toggle(row.kitProductId)}
                  />
                  <span className="min-w-0">
                    <Link
                      to={`/admin/produtos/${row.kitProductId}`}
                      className="font-semibold text-fal-fg underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.kitCommercialRef || row.kitSku}
                    </Link>
                    <span className="text-fal-muted"> — {row.kitName}</span>
                    <span className="mt-0.5 block text-xs text-fal-muted">
                      qty {row.quantity} · {row.kitPriceMode} ·{' '}
                      {productStatusLabel(row.kitStatus)}
                      {row.newAlreadyPresent
                        ? ` · merge (já tem qty ${row.newComponentQuantity})`
                        : ''}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <Input
            label="Nota (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motivo da substituição"
          />

          <Button
            type="button"
            variant="primary"
            disabled={busy || selectedCount === 0}
            onClick={() => void handleApply()}
          >
            {busy
              ? 'Aplicando…'
              : `Substituir em ${selectedCount} kit${selectedCount === 1 ? '' : 's'}`}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
