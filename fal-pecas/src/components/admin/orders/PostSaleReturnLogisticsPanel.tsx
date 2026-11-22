import { formatDateTime } from '@/lib/datetime'
import type { PostSaleReturnOpsSummary } from '@/lib/postSaleReturnOpsSummary'

type Props = {
  summary: PostSaleReturnOpsSummary
  /** Situação da etiqueta de ida (texto curto). */
  outboundLabelState?: string | null
}

/** Ops: contexto ida × devolução (peso visual abaixo das ações do caso). */
export function PostSaleReturnLogisticsPanel({ summary, outboundLabelState }: Props) {
  return (
    <section
      className="rounded-fal border border-fal-line bg-fal-bg/50 px-2.5 py-2"
      aria-label="Contexto ida e devolução"
    >
      <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
        Ida × devolução
      </p>
      <p className="mt-1 mb-0 text-xs text-fal-muted">
        Etiqueta da venda e situação da devolução neste pedido.
      </p>

      <div className="mt-2 grid gap-2 md:grid-cols-2">
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
          {summary.outboundCartItemId ? (
            <p className="mb-0 mt-1 text-xs text-fal-muted" title="Referência do envio Melhor Envio">
              Ref. envio:{' '}
              {summary.outboundSynthetic
                ? `${summary.outboundCartItemId.slice(0, 8)}… (teste)`
                : summary.outboundCartItemId.slice(0, 12) +
                  (summary.outboundCartItemId.length > 12 ? '…' : '')}
            </p>
          ) : null}
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
