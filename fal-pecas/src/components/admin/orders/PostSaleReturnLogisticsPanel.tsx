import { formatDateTime } from '@/lib/datetime'
import type { PostSaleReturnOpsSummary } from '@/lib/postSaleReturnOpsSummary'

type Props = {
  summary: PostSaleReturnOpsSummary
  /** Situação da etiqueta de ida (texto curto). */
  outboundLabelState?: string | null
}

/** Ops: acompanha venda (ida) e devolução (código/etiqueta reversa) no mesmo bloco. */
export function PostSaleReturnLogisticsPanel({ summary, outboundLabelState }: Props) {
  return (
    <section className="rounded-[14px] border border-fal-accent/40 bg-fal-accent/10 p-4">
      <h2 className="m-0 text-lg font-extrabold text-fal-fg">Ida × devolução</h2>
      <p className="mt-1 mb-0 text-sm text-fal-muted">
        Acompanhe a etiqueta da venda e a situação da devolução no mesmo pedido.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2">
          <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
            Ida (venda)
          </p>
          {outboundLabelState ? (
            <p className="mb-0 mt-1 text-sm font-semibold text-fal-fg">
              Etiqueta: {outboundLabelState}
            </p>
          ) : null}
          <p className="mb-0 mt-1 text-sm text-fal-fg">
            Rastreio:{' '}
            <span className="font-mono font-semibold">
              {summary.outboundTracking || '—'}
            </span>
          </p>
          <p className="mb-0 mt-1 text-xs text-fal-muted">
            cart_item_id:{' '}
            {summary.outboundCartItemId
              ? summary.outboundSynthetic
                ? `${summary.outboundCartItemId.slice(0, 8)}… (sintético)`
                : summary.outboundCartItemId
              : '—'}
            {summary.liveReady ? ' · live-ready' : ''}
          </p>
        </div>

        <div className="rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2">
          <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
            Devolução
          </p>
          <p className="mb-0 mt-1 text-sm font-extrabold text-fal-fg">{summary.statusLine}</p>
          <p className="mb-0 mt-1 text-xs text-fal-muted">
            Caso {summary.occurrenceId.slice(0, 8)}… · {summary.stageLabel}
            {summary.returnModeLabel ? ` · ${summary.returnModeLabel}` : ''}
          </p>
          {summary.trackingCode ? (
            <p className="mb-0 mt-1 text-sm text-fal-fg">
              Código / etiqueta reversa:{' '}
              <span className="font-mono font-semibold">{summary.trackingCode}</span>
              {summary.codeValid ? '' : ' (expirado ou inválido)'}
            </p>
          ) : summary.returnMode === 'me_codigo' ? (
            <p className="mb-0 mt-1 text-sm text-fal-muted">
              Ainda sem código — cliente gera após autorização.
            </p>
          ) : null}
          {summary.expiresAt ? (
            <p className="mb-0 mt-1 text-xs text-fal-muted">
              Validade do código: {formatDateTime(summary.expiresAt)}
            </p>
          ) : null}
          {summary.trackingUrl ? (
            <p className="mb-0 mt-1 text-sm">
              <a
                className="font-semibold text-fal-navy underline"
                href={summary.trackingUrl}
                target="_blank"
                rel="noreferrer"
              >
                Acompanhar postagem de devolução
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
