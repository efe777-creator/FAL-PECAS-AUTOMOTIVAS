import { describe, expect, it } from 'vitest'
import {
  SUPPORT_SUBJECTS,
  findSupportSubject,
  resolveSupportSubjectLabel,
} from './supportSubjects'
import { motiveRequiresPolicyAck } from './postSaleMotives'

describe('supportSubjects', () => {
  it('marca pós-venda com pedido obrigatório e motivo', () => {
    const post = SUPPORT_SUBJECTS.filter((s) => s.kind === 'post_sale')
    expect(post.length).toBeGreaterThanOrEqual(5)
    for (const s of post) {
      expect(s.requiresOrder).toBe(true)
      expect(s.motivoCode).toBeTruthy()
    }
  })

  it('assuntos gerais não exigem pedido', () => {
    const general = SUPPORT_SUBJECTS.filter((s) => s.kind === 'general')
    expect(general.length).toBeGreaterThanOrEqual(3)
    for (const s of general) {
      expect(s.requiresOrder).toBe(false)
      expect(s.motivoCode).toBeUndefined()
    }
  })

  it('resolve label custom em Outro', () => {
    const outro = findSupportSubject('outro')
    expect(outro?.needsCustomLabel).toBe(true)
    expect(resolveSupportSubjectLabel(outro!, 'Dúvida X')).toBe('Dúvida X')
    expect(resolveSupportSubjectLabel(outro!, '  ')).toBe(outro!.label)
  })

  it('motivos de devolução/incompat exigem ack', () => {
    const arrependimento = findSupportSubject('arrependimento')
    expect(arrependimento?.motivoCode).toBe('arrependimento')
    expect(motiveRequiresPolicyAck(arrependimento!.motivoCode!)).toBe(true)

    const atraso = findSupportSubject('atraso')
    expect(motiveRequiresPolicyAck(atraso!.motivoCode!)).toBe(false)
  })
})
