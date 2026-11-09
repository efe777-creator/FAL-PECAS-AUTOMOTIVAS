import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useUnsavedChangesBlocker } from '@/hooks/useUnsavedChangesBlocker'
import {
  fetchMeAdminStatus,
  listMeShippingServices,
  saveMeShippingServicesBatch,
  syncMeCatalogFromEdge,
  syncMeCatalogFromRecentQuotes,
  type MeAdminStatus,
  type MeShippingServiceRow,
} from '@/services/admin/adminMeShippingService'
import { useCallback, useEffect, useMemo, useState } from 'react'

type Draft = MeShippingServiceRow & { dirty?: boolean }

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR')
  } catch {
    return iso
  }
}

export function AdminMelhorEnvioPage() {
  useDocumentTitle('Melhor Envio | Admin FAL')
  const toast = useToast()
  const [rows, setRows] = useState<Draft[]>([])
  const [status, setStatus] = useState<MeAdminStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [list, st] = await Promise.all([
        listMeShippingServices(),
        fetchMeAdminStatus().catch(() => null),
      ])
      setRows(list.map((r) => ({ ...r })))
      setStatus(st)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao carregar Melhor Envio'
      setErr(msg)
      toast.push(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const enabledCount = useMemo(() => rows.filter((r) => r.enabled).length, [rows])
  const dirty = useMemo(() => rows.some((r) => r.dirty), [rows])

  useUnsavedChangesBlocker(dirty, {
    message:
      'Há alterações de nome ou “Exibir no site” ainda não salvas. Sair mesmo assim?',
  })
  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function patchRow(serviceId: number, patch: Partial<Draft>) {
    setRows((prev) =>
      prev.map((r) => (r.serviceId === serviceId ? { ...r, ...patch, dirty: true } : r)),
    )
  }

  async function onSave() {
    setSaving(true)
    setErr(null)
    try {
      await saveMeShippingServicesBatch(
        rows.map((r) => ({
          serviceId: r.serviceId,
          enabled: r.enabled,
          displayName: r.displayName,
        })),
      )
      toast.push(
        'Configuração salva. A loja passa a exibir só os serviços ligados.',
        'success',
      )
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar'
      setErr(msg)
      toast.push(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function onSync() {
    if (dirty) {
      const { confirmed } = await confirmDialog({
        title: 'Descartar edições não salvas?',
        message:
          'Há alterações de nome ou “Exibir no site” ainda não salvas. Atualizar o catálogo recarrega a lista e descarta essas edições. Salve antes se quiser mantê-las.',
        confirmLabel: 'Atualizar e descartar',
        danger: true,
      })
      if (!confirmed) return
    }
    setSyncing(true)
    setErr(null)
    try {
      let fromQuotes = 0
      try {
        fromQuotes = await syncMeCatalogFromRecentQuotes()
      } catch {
        fromQuotes = 0
      }
      const edge = await syncMeCatalogFromEdge()
      toast.push(
        `Catálogo atualizado: ${edge.upserted} via ME` +
          (fromQuotes ? ` · ${fromQuotes} das cotações recentes` : '') +
          '. Novos entram desligados — ligue os que devem aparecer no site.',
        'success',
      )
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao atualizar catálogo'
      setErr(msg)
      toast.push(msg, 'error')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <Loading label="Carregando Melhor Envio…" />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="mt-0 text-[28px] font-extrabold text-fal-navy">Melhor Envio</h1>
        <p className="m-0 text-sm text-fal-muted">
          Status da integração e quais fretes aparecem na loja (nome + logo da transportadora).
          Cotação na loja ativa; compra de etiqueta só na Expedição do pedido.
        </p>
      </div>

      <section className="rounded-[14px] border border-fal-line bg-white p-4 sm:p-5">
        <h2 className="m-0 text-base font-extrabold text-fal-navy">Status da integração</h2>
        {status ? (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-fal-muted">Ambiente da integração</dt>
              <dd className="m-0 font-semibold text-fal-ink break-all">{status.apiBase || '—'}</dd>
            </div>
            <div>
              <dt className="text-fal-muted">Token de acesso</dt>
              <dd className="m-0 font-semibold text-fal-ink">
                {status.tokenConfigured ? 'Configurado' : 'Ausente'}
              </dd>
            </div>
            <div>
              <dt className="text-fal-muted">Origem / remetente</dt>
              <dd className="m-0 font-semibold text-fal-ink">
                {status.originPostalCode
                  ? `${status.originPostalCode}${status.originCity ? ` · ${status.originCity}/${status.originState}` : ''}`
                  : 'Não configurada'}
                {status.senderName ? ` · ${status.senderName}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-fal-muted">Catálogo</dt>
              <dd className="m-0 font-semibold text-fal-ink">
                {status.enabledCount} ligados / {status.catalogCount} no total
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-fal-muted">Última cotação Melhor Envio</dt>
              <dd className="m-0 font-semibold text-fal-ink">
                {formatWhen(status.lastQuoteAt)}
                {status.lastQuotePostal ? ` · CEP ${status.lastQuotePostal}` : ''}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mb-0 mt-2 text-sm text-fal-muted">
            Não foi possível carregar o status da integração agora. O catálogo local ainda pode ser
            editado.
          </p>
        )}
        {status?.disclaimer &&
        !/D-FRETE|VITE_|webhook|mock|sandbox|Edge|secret/i.test(status.disclaimer) ? (
          <p className="mb-0 mt-3 text-xs font-semibold text-fal-muted">{status.disclaimer}</p>
        ) : null}
      </section>

      <section className="rounded-[14px] border border-fal-line bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="m-0 text-base font-extrabold text-fal-navy">Opções disponíveis</h2>
            <p className="mb-0 mt-1 text-sm text-fal-muted">
              Cliente vê só as ligadas ({enabledCount}). Ordem na loja: mais barato → mais caro.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={syncing} onClick={() => void onSync()}>
              {syncing ? 'Atualizando…' : 'Atualizar catálogo'}
            </Button>
            <Button type="button" variant="light" disabled={saving || !dirty} onClick={() => void onSave()}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </div>

        {err ? (
          <p className="mb-0 mt-3 text-sm text-fal-danger" role="alert">
            {err}
          </p>
        ) : null}

        {dirty ? (
          <p
            className="mb-0 mt-3 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950"
            role="status"
          >
            Alterações não salvas. Clique em Salvar antes de atualizar o catálogo, ou confirme o
            descarte no aviso.
          </p>
        ) : null}

        <ul className="mt-4 m-0 list-none space-y-3 p-0">
          {rows.map((r) => (
            <li
              key={r.serviceId}
              className="flex flex-col gap-3 rounded-[12px] border border-fal-line bg-fal-bg p-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-fal-line bg-white">
                  {r.companyPicture ? (
                    <img
                      src={r.companyPicture}
                      alt=""
                      className="max-h-10 max-w-10 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-fal-muted">ME</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-fal-navy">
                    {r.companyName || 'Transportadora'} · {r.serviceName || `ID ${r.serviceId}`}
                  </div>
                  <div className="text-xs text-fal-muted">Código do serviço {r.serviceId}</div>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-72">
                <Input
                  label="Nome no site"
                  name={`display-${r.serviceId}`}
                  placeholder={
                    r.companyName
                      ? `${r.companyName} — ${r.serviceName}`
                      : r.serviceName || 'Nome exibido'
                  }
                  value={r.displayName ?? ''}
                  onChange={(e) => patchRow(r.serviceId, { displayName: e.target.value })}
                />
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-fal-ink">
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) => patchRow(r.serviceId, { enabled: e.target.checked })}
                  />
                  Exibir no site
                </label>
              </div>
            </li>
          ))}
        </ul>
        {!rows.length ? (
          <p className="mb-0 mt-3 text-sm text-fal-muted">
            Catálogo vazio. Clique em Atualizar catálogo. Se continuar vazio, confira a conexão da
            integração.
          </p>
        ) : null}
      </section>
    </div>
  )
}
