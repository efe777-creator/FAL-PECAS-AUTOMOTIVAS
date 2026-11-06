import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Loading } from '@/components/common/Loading'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminCategoryIntegrityReport,
  adminMergeCategory,
  categoryPath,
} from '@/services/admin/adminCategoryService'
import type { Category } from '@/types'
import { useEffect, useState } from 'react'

type Report = Awaited<ReturnType<typeof adminCategoryIntegrityReport>>

type Props = {
  items: Category[]
  onChanged: () => Promise<void> | void
  onError: (msg: string) => void
  onOk: (msg: string) => void
}

/**
 * O1-B: relatório de integridade + mesclar duplicata A → B (com confirmação).
 */
export function CategoriesIntegrityPanel({ items, onChanged, onError, onOk }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [report, setReport] = useState<Report | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const next = await adminCategoryIntegrityReport()
        if (!cancelled) setReport(next)
      } catch (e) {
        if (!cancelled) {
          onError(toUserMessage(e, 'Falha ao carregar relatório de classificação'))
          setReport(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // items: recarrega após merge/reload da página
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onError/onOk instáveis
  }, [open, items])

  async function refresh() {
    setLoading(true)
    try {
      setReport(await adminCategoryIntegrityReport())
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao carregar relatório de classificação'))
    } finally {
      setLoading(false)
    }
  }

  async function onMerge(
    fromId: string,
    toId: string,
    fromLabel: string,
    toLabel: string,
    fromCount: number,
  ) {
    const { confirmed } = await confirmDialog({
      title: 'Mesclar classificação?',
      message:
        `Mover ${fromCount} produto(s) de "${fromLabel}" para "${toLabel}" e arquivar a origem?\n\n` +
        'Revise as contagens antes de confirmar.',
      confirmLabel: 'Mesclar e arquivar origem',
      danger: true,
    })
    if (!confirmed) return
    setBusyKey(`${fromId}>${toId}`)
    try {
      const r = await adminMergeCategory({ fromId, toId })
      await onChanged()
      await refresh()
      onOk(
        `Mesclado: ${r.movedProducts} produto(s) de "${r.fromName}" → "${r.toName}". Origem arquivada.`,
      )
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao mesclar classificação'))
    } finally {
      setBusyKey(null)
    }
  }

  const dupCount = report?.duplicateNameGroups.length ?? 0
  const archCount = report?.archivedWithProducts.length ?? 0

  return (
    <section className="rounded-[12px] border border-fal-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="m-0 text-sm font-extrabold text-fal-navy">Integridade da classificação</h2>
          <p className="mb-0 mt-1 text-xs text-fal-muted">
            Duplicatas por nome (mesmo pai) e arquivados que ainda têm produto.
          </p>
        </div>
        <Button type="button" variant="light" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Ocultar relatório' : 'Ver relatório'}
        </Button>
      </div>

      {open ? (
        <div className="mt-4 space-y-4">
          {loading && !report ? <Loading label="Gerando relatório…" /> : null}
          {report ? (
            <>
              <p className="m-0 text-xs text-fal-muted">
                {dupCount} grupo(s) duplicado(s) · {archCount} arquivado(s) com produto
                <button
                  type="button"
                  className="ml-2 font-bold text-fal-navy underline disabled:opacity-50"
                  onClick={() => void refresh()}
                  disabled={loading}
                >
                  Atualizar
                </button>
              </p>

              <div>
                <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
                  Nomes duplicados (ativos)
                </h3>
                {dupCount === 0 ? (
                  <p className="mb-0 mt-2 text-sm text-fal-muted">
                    Nenhuma duplicata por nome no mesmo pai.
                  </p>
                ) : (
                  <ul className="mt-2 m-0 list-none space-y-3 p-0">
                    {report.duplicateNameGroups.map((g) => (
                      <li
                        key={g.key}
                        className="rounded-[10px] border border-fal-line bg-fal-bg/40 px-3 py-2 text-sm"
                      >
                        <p className="m-0 font-semibold text-fal-navy">
                          {g.names[0]}{' '}
                          <span className="font-normal text-fal-muted">
                            ({g.ids.length} nós · mesmo pai)
                          </span>
                        </p>
                        <ul className="mt-2 m-0 list-none space-y-1.5 p-0">
                          {g.ids.map((id, i) => (
                            <li
                              key={id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-2 py-1.5"
                            >
                              <span className="min-w-0 text-xs">
                                <span className="font-mono text-[10px] text-fal-muted">
                                  {id.slice(0, 8)}…
                                </span>{' '}
                                {categoryPath(items, id) || g.names[i]}
                                <span className="ml-1 font-bold text-fal-navy">
                                  · {g.productCounts[i] ?? 0} prod.
                                </span>
                              </span>
                              <span className="flex flex-wrap gap-1">
                                {g.ids
                                  .filter((toId) => toId !== id)
                                  .map((toId) => {
                                    const toIdx = g.ids.indexOf(toId)
                                    return (
                                      <Button
                                        key={`${id}-${toId}`}
                                        type="button"
                                        variant="light"
                                        size="sm"
                                        disabled={busyKey != null}
                                        onClick={() =>
                                          void onMerge(
                                            id,
                                            toId,
                                            g.names[i] ?? id,
                                            g.names[toIdx] ?? toId,
                                            g.productCounts[i] ?? 0,
                                          )
                                        }
                                      >
                                        {busyKey === `${id}>${toId}`
                                          ? 'Mesclando…'
                                          : `Mesclar → ${g.names[toIdx] ?? 'destino'}`}
                                      </Button>
                                    )
                                  })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
                  Arquivados com produto
                </h3>
                {archCount === 0 ? (
                  <p className="mb-0 mt-2 text-sm text-fal-muted">
                    Nenhum arquivado com produto ligado.
                  </p>
                ) : (
                  <ul className="mt-2 m-0 list-none space-y-1 p-0">
                    {report.archivedWithProducts.map((row) => (
                      <li
                        key={row.id}
                        className="flex justify-between gap-2 rounded-md border border-fal-line bg-fal-bg/40 px-2 py-1.5 text-sm"
                      >
                        <span>{row.name}</span>
                        <span className="font-extrabold tabular-nums text-fal-navy">
                          {row.productCount}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
