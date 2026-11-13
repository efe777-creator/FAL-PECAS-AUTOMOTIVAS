import type { AdminOrderDetail } from '@/services/admin/adminOrderService'

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function addressLine(order: AdminOrderDetail): string {
  const addr = order.addressSnapshot
  if (!addr) return '—'
  return [
    addr.street,
    addr.number,
    addr.complement,
    addr.district,
    addr.city,
    addr.state,
    addr.cep ?? addr.zip,
  ]
    .filter(Boolean)
    .join(', ')
}

function openHtmlPrint(html: string): boolean {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank', 'width=800,height=900')
  if (!w) {
    URL.revokeObjectURL(url)
    return false
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return true
}

const PRINT_CSS = `
  @page { size: A4; margin: 12mm; }
  body { font-family: system-ui, sans-serif; color: #0f172a; font-size: 13px; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; }
  td, th { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; }
  .meta { margin: 0; line-height: 1.45; }
  .hint { margin-top: 20px; font-size: 11px; color: #64748b; }
  .check { width: 28px; text-align: center; }
`

/** Lista de separação (fase confirmado / em_separacao) — AJUSTE-015/031. */
export function openSeparationList(order: AdminOrderDetail): boolean {
  const shortId = escapeHtml(order.id.slice(0, 8))
  const itemsHtml = order.items
    .map((it) => {
      const unavailable = it.availability === 'indisponivel'
      const mark = unavailable ? '—' : it.separated ? '☑' : '☐'
      const note = unavailable ? 'Não separar / fora do envio' : ''
      return `<tr${unavailable ? ' style="background:#fef2f2;color:#991b1b"' : ''}>
        <td class="check">${mark}</td>
        <td>${escapeHtml(it.sku)}</td>
        <td>${escapeHtml(it.nameSnapshot)}${unavailable ? ' <em>(indisponível)</em>' : ''}</td>
        <td>${escapeHtml(it.quantity)}</td>
        <td>${escapeHtml(note)}</td>
      </tr>`
    })
    .join('')
  const printedAt = new Date().toLocaleString('pt-BR')
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
    <title>Lista de separação ${shortId}</title>
    <style>${PRINT_CSS}</style></head><body>
    <h1>Lista de separação — FAL</h1>
    <p class="meta">
      <strong>Pedido:</strong> ${escapeHtml(order.id)}<br/>
      <strong>Cliente:</strong> ${escapeHtml(order.customerName ?? '—')}<br/>
      <strong>Endereço:</strong> ${escapeHtml(addressLine(order))}<br/>
      <strong>Impresso em:</strong> ${escapeHtml(printedAt)}
    </p>
    <table>
      <thead>
        <tr>
          <th class="check">OK</th>
          <th>Código</th>
          <th>Produto</th>
          <th>Qtd</th>
          <th>Conferência</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <p class="hint">Documento interno de separação. Sem preços. Itens indisponíveis não entram no envio. Após separar os itens disponíveis, conclua a separação no painel.</p>
    <script>window.print()</script>
    </body></html>`
  return openHtmlPrint(html)
}

/** Romaneio interno (fase expedição) — sem preços. */
export function openRomaneio(order: AdminOrderDetail): boolean {
  const shipItems = order.items.filter((it) => it.availability !== 'indisponivel')
  const skipped = order.items.filter((it) => it.availability === 'indisponivel')
  const itemsHtml = shipItems
    .map(
      (it) =>
        `<tr><td>${escapeHtml(it.sku)}</td><td>${escapeHtml(it.nameSnapshot)}</td><td>${escapeHtml(it.quantity)}</td></tr>`,
    )
    .join('')
  const skippedHtml =
    skipped.length === 0
      ? ''
      : `<p class="meta" style="margin-top:12px"><strong>Fora do envio (indisponível):</strong> ${skipped
          .map((it) => escapeHtml(it.sku))
          .join(', ')}</p>`
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
    <title>Romaneio ${escapeHtml(order.id.slice(0, 8))}</title>
    <style>${PRINT_CSS}</style></head><body>
    <h1>Romaneio interno FAL</h1>
    <p class="meta">
      <strong>Pedido:</strong> ${escapeHtml(order.id)}<br/>
      <strong>Cliente:</strong> ${escapeHtml(order.customerName ?? '—')}<br/>
      <strong>Endereço:</strong> ${escapeHtml(addressLine(order))}<br/>
      <strong>Frete cobrado:</strong> R$ ${order.shippingAmount.toFixed(2)}
    </p>
    <table>
      <thead><tr><th>Código</th><th>Produto</th><th>Qtd</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    ${skippedHtml}
    <p class="hint">Etiqueta Melhor Envio é separada deste romaneio. Postagem física = Registrar entrega à transportadora.</p>
    <script>window.print()</script>
    </body></html>`
  return openHtmlPrint(html)
}
