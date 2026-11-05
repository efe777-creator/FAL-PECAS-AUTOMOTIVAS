import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminDeleteSearchSynonym,
  adminGetSearchPrepSettings,
  adminListSearchSynonyms,
  adminRebuildSearchDocuments,
  adminUpsertSearchPrepSettings,
  adminUpsertSearchSynonym,
  type SearchPrepSettings,
  type SearchSynonymRow,
} from '@/services/search/searchPrepService'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

export function AdminSearchPrepPage() {
  const { push } = useToast()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<SearchPrepSettings | null>(null)
  const [synonyms, setSynonyms] = useState<SearchSynonymRow[]>([])
  const [term, setTerm] = useState('')
  const [expandsTo, setExpandsTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [rebuildBusy, setRebuildBusy] = useState(false)

  async function reload() {
    setLoading(true)
    try {
      const [s, list] = await Promise.all([
        adminGetSearchPrepSettings(),
        adminListSearchSynonyms(),
      ])
      setSettings(s)
      setSynonyms(list)
    } catch (err) {
      push(toUserMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function onToggleExpansion(enabled: boolean) {
    setBusy(true)
    try {
      const saved = await adminUpsertSearchPrepSettings({
        id: settings?.id,
        synonymExpansionEnabled: enabled,
        notes: settings?.notes,
      })
      setSettings(saved)
      push(
        enabled
          ? 'Expansão de sinônimos ligada na busca'
          : 'Expansão desligada (documento ainda inclui apelidos)',
        'success',
      )
    } catch (err) {
      push(toUserMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onAddSynonym(e: FormEvent) {
    e.preventDefault()
    if (!term.trim() || !expandsTo.trim()) return
    setBusy(true)
    try {
      await adminUpsertSearchSynonym({ term, expandsTo, active: true })
      setTerm('')
      setExpandsTo('')
      setSynonyms(await adminListSearchSynonyms())
      push('Sinônimo salvo — rode o rebuild para atualizar documentos', 'success')
    } catch (err) {
      push(toUserMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onRebuild() {
    setRebuildBusy(true)
    try {
      const n = await adminRebuildSearchDocuments()
      push(`Documentos de busca atualizados: ${n} produto(s)`, 'success')
    } catch (err) {
      push(toUserMessage(err), 'error')
    } finally {
      setRebuildBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="m-0 text-2xl font-extrabold text-fal-navy">Busca — prep IA</h1>
        <p className="mt-1 max-w-2xl text-sm text-fal-muted">
          Prepara o catálogo para busca melhor (e IA depois): documento unificado + sinônimos.
          Sem modelo vetorial nesta etapa.
        </p>
        <p className="mt-2 text-sm">
          <Link className="font-semibold text-fal-navy hover:underline" to="/admin">
            ← Painel
          </Link>
        </p>
      </div>

      {loading ? <p className="text-sm text-fal-muted">Carregando…</p> : null}

      {!loading ? (
        <>
          <div className="space-y-3 rounded-fal border border-fal-line bg-white p-4">
            <h2 className="m-0 text-lg font-bold text-fal-navy">Documento de busca</h2>
            <p className="m-0 text-sm text-fal-muted">
              Inclui nome, SKU, código referência, marca, categoria, refs e apelidos dos sinônimos.
            </p>
            <Button type="button" variant="primary" disabled={rebuildBusy} onClick={() => void onRebuild()}>
              {rebuildBusy ? 'Atualizando…' : 'Reconstruir documentos agora'}
            </Button>
          </div>

          <div className="space-y-3 rounded-fal border border-fal-line bg-white p-4">
            <h2 className="m-0 text-lg font-bold text-fal-navy">Expansão na digitação</h2>
            <p className="m-0 text-sm text-fal-muted">
              Se ligado, “shock” vira “amortecedor” antes da RPC. Mesmo com off, os apelidos já
              entram no documento após o rebuild.
            </p>
            <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy">
              <input
                type="checkbox"
                checked={Boolean(settings?.synonymExpansionEnabled)}
                disabled={busy}
                onChange={(e) => void onToggleExpansion(e.target.checked)}
              />
              Expandir sinônimos na query
            </label>
          </div>

          <div className="space-y-3 rounded-fal border border-fal-line bg-white p-4">
            <h2 className="m-0 text-lg font-bold text-fal-navy">Sinônimos</h2>
            <form onSubmit={(e) => void onAddSynonym(e)} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[140px] flex-1">
                <Input label="Cliente digita" value={term} onChange={(e) => setTerm(e.target.value)} />
              </div>
              <div className="min-w-[140px] flex-1">
                <Input
                  label="Busca como"
                  value={expandsTo}
                  onChange={(e) => setExpandsTo(e.target.value)}
                />
              </div>
              <Button type="submit" variant="outline" disabled={busy}>
                Adicionar
              </Button>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-fal-line text-xs uppercase text-fal-muted">
                  <tr>
                    <th className="px-2 py-2">Termo</th>
                    <th className="px-2 py-2">Expande para</th>
                    <th className="px-2 py-2">Ativo</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {synonyms.map((s) => (
                    <tr key={s.id} className="border-b border-fal-line/50">
                      <td className="px-2 py-2 font-mono text-xs">{s.term}</td>
                      <td className="px-2 py-2 font-mono text-xs">{s.expandsTo}</td>
                      <td className="px-2 py-2">{s.active ? 'sim' : 'não'}</td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="text-xs font-semibold text-fal-danger"
                          onClick={() => {
                            void confirmDialog({
                              title: 'Excluir sinônimo?',
                              message: `${s.term} → ${s.expandsTo}`,
                              confirmLabel: 'Excluir',
                              danger: true,
                            }).then(async ({ confirmed }) => {
                              if (!confirmed) return
                              try {
                                await adminDeleteSearchSynonym(s.id)
                                setSynonyms(await adminListSearchSynonyms())
                                push('Sinônimo removido', 'success')
                              } catch (err) {
                                push(toUserMessage(err), 'error')
                              }
                            })
                          }}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!synonyms.length ? (
                <p className="text-sm text-fal-muted">Nenhum sinônimo cadastrado.</p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
