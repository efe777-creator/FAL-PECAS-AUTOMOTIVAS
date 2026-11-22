/**
 * Antiregress Central /suporte — seções + form tipado (pós-#14).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = readFileSync(resolve(__dirname, 'SupportPage.tsx'), 'utf8')

describe('SupportPage antiregress', () => {
  it('mantém 3 seções com âncoras', () => {
    expect(src).toMatch(/id="suporte-politicas"/)
    expect(src).toMatch(/id="suporte-compromisso"/)
    expect(src).toMatch(/id="suporte-atendimento"/)
    expect(src).toMatch(/Seções da Central/)
  })

  it('gate de login e dual-path pós-venda', () => {
    expect(src).toMatch(/Entrar para abrir atendimento/)
    expect(src).toMatch(/customerReportDeliveryIssue/)
    expect(src).toMatch(/listMyOrders/)
    expect(src).toMatch(/SUPPORT_SUBJECTS/)
    expect(src).toMatch(/activeSupportChannel/)
    expect(src).toMatch(/5 dias úteis/)
  })

  it('pedido condicional e ack de política', () => {
    expect(src).toMatch(/requiresOrder/)
    expect(src).toMatch(/RETURN_POLICY_ACK_LABEL/)
    expect(src).toMatch(/motiveRequiresPolicyAck/)
  })
})
