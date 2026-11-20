import { describe, expect, it } from 'vitest'
import * as errorBoundary from '@/components/common/ErrorBoundary'

describe('route error recovery', () => {
  it('expõe normalização segura para erros de rota', () => {
    expect(errorBoundary).toHaveProperty('getRouteErrorMessage')
    expect(errorBoundary.getRouteErrorMessage(new Error('chunk falhou'))).toBe(
      'chunk falhou',
    )
    expect(errorBoundary.getRouteErrorMessage('falha simples')).toBe(
      'falha simples',
    )
    expect(errorBoundary.getRouteErrorMessage(null)).toBe(
      'Falha inesperada ao carregar a página.',
    )
  })

  it('reconhece falha de import dinâmico que pode ser recuperada com reload', () => {
    expect(
      errorBoundary.isDynamicImportError(
        new TypeError('Failed to fetch dynamically imported module: /chunk.js'),
      ),
    ).toBe(true)
    expect(errorBoundary.isDynamicImportError(new Error('Falha de regra'))).toBe(
      false,
    )
  })
})
