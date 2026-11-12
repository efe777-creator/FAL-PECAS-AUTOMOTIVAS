import { describe, expect, it } from 'vitest'
import {
  deriveOccurrences,
  isOccurrenceOpenForQueue,
  validateOccurrenceAction,
} from './orderOccurrences'

const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

describe('deriveOccurrences (Marcha 7 ciclo de vida)', () => {
  it('estado = último evento do occurrence_id', () => {
    const list = deriveOccurrences([
      {
        id: '1',
        eventType: 'occurrence_opened',
        payload: {
          occurrence_id: id,
          tipo: 'falta',
          gravidade: 'alta',
          prioridade: 'alta',
          acao_necessaria: 'Repos SKU X',
          note: 'SKU X',
        },
        visibility: 'internal',
        createdAt: '2026-11-11T10:00:00Z',
      },
      {
        id: '2',
        eventType: 'order_received',
        payload: {},
        visibility: 'customer',
        createdAt: '2026-11-11T10:01:00Z',
      },
      {
        id: '3',
        eventType: 'occurrence_updated',
        payload: { occurrence_id: id, note: 'conferido', gravidade: 'media' },
        visibility: 'internal',
        createdAt: '2026-11-11T11:00:00Z',
      },
      {
        id: '4',
        eventType: 'occurrence_resolved',
        payload: { occurrence_id: id, solucao: 'reenviado', motivo_encerramento: 'reenviado' },
        visibility: 'customer',
        createdAt: '2026-11-11T12:00:00Z',
      },
    ])
    expect(list).toHaveLength(1)
    expect(list[0]?.status).toBe('resolved')
    expect(list[0]?.tipo).toBe('falta')
    expect(list[0]?.gravidade).toBe('media')
    expect(list[0]?.solucao).toBe('reenviado')
    expect(list[0]?.eventCount).toBe(3)
    expect(isOccurrenceOpenForQueue(list[0]!)).toBe(false)
  })

  it('reabertura com motivo volta para fila (último ≠ resolved)', () => {
    const list = deriveOccurrences([
      {
        id: '1',
        eventType: 'occurrence_opened',
        payload: { occurrence_id: id, tipo: 'atraso', prioridade: 'media', acao_necessaria: 'ligar' },
        visibility: 'internal',
        createdAt: '2026-11-11T10:00:00Z',
      },
      {
        id: '2',
        eventType: 'occurrence_resolved',
        payload: { occurrence_id: id, solucao: 'ok', motivo_encerramento: 'ok' },
        visibility: 'internal',
        createdAt: '2026-11-11T11:00:00Z',
      },
      {
        id: '3',
        eventType: 'occurrence_reopened',
        payload: { occurrence_id: id, motivo_reabertura: 'cliente reclamou de novo' },
        visibility: 'internal',
        createdAt: '2026-11-11T12:00:00Z',
      },
    ])
    expect(list[0]?.status).toBe('reopened')
    expect(list[0]?.motivoReabertura).toBe('cliente reclamou de novo')
    expect(isOccurrenceOpenForQueue(list[0]!)).toBe(true)
  })

  it('assign/start → em_andamento', () => {
    const list = deriveOccurrences([
      {
        id: '1',
        eventType: 'occurrence_opened',
        payload: { occurrence_id: id, tipo: 'dano', prioridade: 'alta', acao_necessaria: 'fotos' },
        visibility: 'internal',
        createdAt: '2026-11-11T10:00:00Z',
      },
      {
        id: '2',
        eventType: 'occurrence_assigned',
        payload: { occurrence_id: id, assignee_id: 'user-2', acao_necessaria: 'fotos' },
        visibility: 'internal',
        createdAt: '2026-11-11T10:30:00Z',
      },
      {
        id: '3',
        eventType: 'occurrence_started',
        payload: { occurrence_id: id },
        visibility: 'internal',
        createdAt: '2026-11-11T11:00:00Z',
      },
    ])
    expect(list[0]?.status).toBe('in_progress')
    expect(list[0]?.assigneeId).toBe('user-2')
    expect(isOccurrenceOpenForQueue(list[0]!)).toBe(true)
  })

  it('validate: reopen exige motivo; resolve exige solução', () => {
    expect(
      validateOccurrenceAction({ action: 'reopen', reopenReason: '' }).ok,
    ).toBe(false)
    expect(
      validateOccurrenceAction({
        action: 'reopen',
        reopenReason: 'cliente voltou',
      }).ok,
    ).toBe(true)
    expect(validateOccurrenceAction({ action: 'resolve', solucao: '' }).ok).toBe(false)
    expect(
      validateOccurrenceAction({ action: 'open', tipo: 'falta', acaoNecessaria: 'separar' }).ok,
    ).toBe(true)
  })
})
