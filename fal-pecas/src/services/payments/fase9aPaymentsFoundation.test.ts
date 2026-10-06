import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const MIGRATION = resolve(
  __dirname,
  '../../../supabase/migrations/20261006200000_fase9a_payments_mp_foundation_prepared.sql',
)

describe('F9-A payments foundation migration', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  it('estende payments e cria payment_events', () => {
    expect(sql).toMatch(/alter table public\.payments/i)
    expect(sql).toMatch(/provider_payment_id/)
    expect(sql).toMatch(/create table if not exists public\.payment_events/i)
    expect(sql).toMatch(/payment_events_provider_event_uidx/)
  })

  it('não reescreve place_order nem confirm_simulated_payment', () => {
    expect(sql).not.toMatch(/create or replace function public\.place_order/i)
    expect(sql).not.toMatch(/create or replace function public\.confirm_simulated_payment/i)
  })

  it('reforça que authenticated não faz write em payments/events', () => {
    expect(sql).toMatch(/revoke insert, update, delete on public\.payments from authenticated/i)
    expect(sql).toMatch(/revoke insert, update, delete on public\.payment_events from authenticated/i)
  })
})
