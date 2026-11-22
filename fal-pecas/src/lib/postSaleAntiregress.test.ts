/**
 * Anti-regressão estática da camada pós-venda (checklist do plano F3→done).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../..')
const repoDocs = resolve(root, '../docs/planejamento')

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('pós-venda anti-regressão (fonte)', () => {
  it('Edge reversa é função separada e usa cart/reverse', () => {
    expect(existsSync(resolve(root, 'supabase/functions/melhorenvio-reverse/index.ts'))).toBe(
      true,
    )
    const rev = read('supabase/functions/melhorenvio-reverse/index.ts')
    expect(rev).toMatch(/\/api\/v2\/me\/cart\/reverse/)
    expect(rev).toMatch(/attach_me_return_code/)
    expect(rev).toMatch(/forceDryRun/)
    expect(rev).not.toMatch(/ship_order/)
    expect(rev).not.toMatch(/deliver_order/)
  })

  it('smoke ME reverse existe e usa forceDryRun', () => {
    const smoke = read('scripts/smoke-me-reverse.mjs')
    expect(smoke).toMatch(/forceDryRun:\s*true/)
    expect(smoke).toMatch(/admin_post_sale_case_action/)
    expect(smoke).toMatch(/melhorenvio-reverse/)
  })

  it('ida Melhor Envio permanece reverse:false', () => {
    const label = read('supabase/functions/melhorenvio-label/index.ts')
    expect(label).toMatch(/reverse:\s*false/)
  })

  it('webhook ME não chama deliver_order', () => {
    const wh = read('supabase/functions/melhorenvio-webhook/index.ts')
    expect(wh).toMatch(/NÃO chama ship_order nem deliver_order/)
    expect(wh).not.toMatch(/\.rpc\(['"]deliver_order['"]/)
    expect(wh).toMatch(/apply_me_tracking_update/)
    expect(wh).toMatch(/tracking-only|trackingOnly/)
  })

  it('rastreio: ida (shipment) ≠ devolução (me_reverse) e UI exibe ambos', () => {
    const panel = read('src/components/admin/orders/PostSaleReturnLogisticsPanel.tsx')
    expect(panel).toMatch(/Ida × devolução/)
    expect(panel).toMatch(/outboundTracking/)
    expect(panel).toMatch(/summary\.trackingCode/)
    expect(panel).toMatch(/Acompanhar postagem de devolução/)

    const account = read('src/pages/Account/AccountOrderDetailPage.tsx')
    expect(account).toMatch(/buildTrackingUrl/)
    expect(account).toMatch(/shipment\?\.trackingCode/)

    const urlLib = read('src/lib/shipmentTrackingUrl.ts')
    expect(urlLib).toMatch(/linkcorreios|melhorrastreio/)

    const attach = read('supabase/migrations/20261121194500_post_sale_report_open_case_gate.sql')
    expect(attach).toMatch(/attach_me_return_code/)
    expect(attach).toMatch(/me_reverse/)
    expect(attach).toMatch(/p_tracking_code/)

    const uso = read('scripts/smoke-pos-venda-uso-completo.mjs')
    expect(uso).toMatch(/outboundTracking/)
    expect(uso).toMatch(/returnTracking/)
    expect(uso).toMatch(/rastreio de devolução colidiu|trackingSeparated/)
    expect(uso).toMatch(/fila revisão não refletiu tracking_code/)
  })

  it('sem rota /admin/pos-venda e legal usa returnPolicyCopy', () => {
    const router = read('src/app/router.tsx')
    expect(router).not.toMatch(/pos-venda|pos_venda/)
    const legalCopy = read('src/lib/legalCopy.ts')
    expect(legalCopy).toMatch(/returnPolicyCopy/)
    expect(legalCopy).toMatch(/RETURN_POLICY_BULLETS/)
    const legalPage = read('src/pages/Legal/LegalDocumentPage.tsx')
    expect(legalPage).toMatch(/LEGAL_COPY/)
  })

  it('cliente só gera código após autorizada (painel dedicado)', () => {
    const panel = read('src/components/account/PostSaleAuthorizedPanel.tsx')
    expect(panel).toMatch(/Gerar código de devolução/)
    const page = read('src/pages/Account/AccountOrderDetailPage.tsx')
    expect(page).toMatch(/PostSaleAuthorizedPanel/)
    expect(page).toMatch(/meReverseGenerate/)
    expect(page).toMatch(/PostSaleCaseStatusPanel/)
    expect(page).toMatch(/PostSaleHelpPanel/)
  })

  it('operador: Revisão no Hub Adaptive + CTAs sob Ida×devolução', () => {
    const hub = read('src/pages/admin/orders/AdminOrdersHubPage.tsx')
    expect(hub).toMatch(/REVISAO_CHIPS/)
    expect(hub).toMatch(/columnMode=\{isRevisaoFila \? 'revisao' : 'default'\}/)
    expect(hub).toMatch(/PostSaleCaseQuickActions|OrderOpsSurface/)

    const ops = read('src/components/admin/orders/OrderOpsSurface.tsx')
    expect(ops).toMatch(/PostSaleCaseQuickActions/)
    expect(ops).toMatch(/PostSaleReturnLogisticsPanel/)

    const view = read('src/pages/admin/orders/AdminOrdersViewPage.tsx')
    expect(view).toMatch(/Navigate/)
    expect(view).toMatch(/fila=revisao|fila: 'revisao'/)

    const queues = read('src/lib/adminLogisticsQueues.ts')
    expect(queues).toMatch(/tab=logistica&fila=revisao/)

    expect(existsSync(resolve(root, 'scripts/smoke-pos-venda-uso-completo.mjs'))).toBe(
      true,
    )
    const uso = read('scripts/smoke-pos-venda-uso-completo.mjs')
    expect(uso).toMatch(/customer_report_delivery_issue/)
    expect(uso).toMatch(/admin_list_revisao_queue_rows/)
    expect(uso).toMatch(/admin_post_sale_case_action/)
    expect(uso).toMatch(/return_mode:\s*'wa'|p_return_mode:\s*'wa'/)
  })

  it('stages RPC e elegibilidade ME existem', () => {
    const mig = read('supabase/migrations/20261121190000_post_sale_case_stages.sql')
    expect(mig).toMatch(/admin_post_sale_case_action/)
    expect(mig).toMatch(/attach_me_return_code/)
    const elig = read('src/lib/meReverseEligibility.ts')
    expect(elig).toMatch(/provider_not_me/)
    expect(elig).toMatch(/multi_volume/)
  })

  it('overload 13-arg admin_occurrence_action versionado', () => {
    const mig = read(
      'supabase/migrations/20261121193000_admin_occurrence_action_full_overload.sql',
    )
    expect(mig).toMatch(/p_acao_necessaria/)
    expect(mig).toMatch(/p_motivo_reabertura/)
    expect(mig).toMatch(/p_prioridade/)
  })
})

describe('pós-venda docs VAL', () => {
  it('plano de impl referencia F1–F3', () => {
    const plan = readFileSync(
      resolve(repoDocs, 'FAL_PLANO_IMPL_POS_VENDA_2026-11-21.md'),
      'utf8',
    )
    expect(plan).toMatch(/F1–F3 implementadas|fase 3|Fase 3/i)
  })
})
