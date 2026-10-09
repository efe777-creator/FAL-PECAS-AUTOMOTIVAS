import { describe, expect, it } from 'vitest'
import {
  StoreBackendUnavailableError,
  isStoreBackendUnavailableError,
} from '@/lib/storeBackend'

describe('storeBackend (IMP-19 U1)', () => {
  it('identifica StoreBackendUnavailableError', () => {
    const err = new StoreBackendUnavailableError()
    expect(isStoreBackendUnavailableError(err)).toBe(true)
    expect(isStoreBackendUnavailableError(new Error('x'))).toBe(false)
    expect(err.code).toBe('STORE_BACKEND_UNAVAILABLE')
  })
})
