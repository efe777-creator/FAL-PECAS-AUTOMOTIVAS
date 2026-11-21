import { describe, expect, it } from 'vitest'
import { parseProductGuideSectionParam } from './ProductWorkSurface'

describe('parseProductGuideSectionParam', () => {
  it('aceita menus canônicos e aliases de preço', () => {
    expect(parseProductGuideSectionParam('identidade')).toBe('identidade')
    expect(parseProductGuideSectionParam('categoria')).toBe('categoria')
    expect(parseProductGuideSectionParam('precos')).toBe('precos')
    expect(parseProductGuideSectionParam('preco')).toBe('precos')
    expect(parseProductGuideSectionParam('Preço')).toBe('precos')
    expect(parseProductGuideSectionParam('aplicacoes')).toBe('aplicacoes')
  })

  it('rejeita vazio / desconhecido', () => {
    expect(parseProductGuideSectionParam(null)).toBeNull()
    expect(parseProductGuideSectionParam('')).toBeNull()
    expect(parseProductGuideSectionParam('foobar')).toBeNull()
  })
})
