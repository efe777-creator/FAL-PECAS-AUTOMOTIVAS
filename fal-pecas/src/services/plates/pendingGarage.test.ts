import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearAskGaragePrompt,
  readAskGaragePrompt,
  saveAskGaragePrompt,
} from './pendingGarage'

const memory = new Map<string, string>()

beforeEach(() => {
  memory.clear()
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v)
      },
      removeItem: (k: string) => {
        memory.delete(k)
      },
    },
  })
})

describe('ask garage prompt (session)', () => {
  it('persiste e permite ler várias vezes sem consumir', () => {
    saveAskGaragePrompt({
      maker: 'Chevrolet',
      model: 'Onix',
      year: 2016,
      engine: '1.4',
      version: 'LT',
      plate: 'GAF7032',
    })
    expect(readAskGaragePrompt()?.maker).toBe('Chevrolet')
    expect(readAskGaragePrompt()?.plate).toBe('GAF7032')
    clearAskGaragePrompt()
    expect(readAskGaragePrompt()).toBeNull()
  })
})
