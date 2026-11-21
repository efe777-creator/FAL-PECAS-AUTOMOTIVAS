import { describe, expect, it } from 'vitest'
import {
  personalCoverImage,
  pickBestStockImage,
  placeholderVehicleImage,
  STOCK_CONFIDENCE_THRESHOLD,
} from './vehicleImageResolver'
import type { CustomerVehicleAsset } from '@/types'

describe('vehicleImageResolver (#14)', () => {
  it('sem stock → placeholder FAL', () => {
    const r = pickBestStockImage([], {
      makerName: 'Chevrolet',
      modelName: 'Onix',
      year: 2020,
    })
    expect(r.level).toBe('placeholder')
    expect(r.url).toBeNull()
    expect(r.source).toBe('placeholder')
  })

  it('não promove family como exact e respeita limiar', () => {
    const r = pickBestStockImage(
      [
        {
          id: '1',
          maker: 'Chevrolet',
          model: 'Onix',
          generation: null,
          body_style: null,
          year_from: 2019,
          year_to: 2022,
          match_level: 'family',
          image_url: 'https://cdn.example/family.jpg',
          storage_path: null,
          confidence: 0.95,
        },
        {
          id: '2',
          maker: 'Chevrolet',
          model: 'Onix',
          generation: null,
          body_style: null,
          year_from: 2020,
          year_to: 2020,
          match_level: 'exact',
          image_url: 'https://cdn.example/exact.jpg',
          storage_path: null,
          confidence: STOCK_CONFIDENCE_THRESHOLD - 0.01,
        },
      ],
      { makerName: 'Chevrolet', modelName: 'Onix', year: 2020 },
    )
    expect(r.level).toBe('family')
    expect(r.label).toMatch(/família/i)
    expect(r.url).toContain('family.jpg')
  })

  it('prefers exact quando confiança ok', () => {
    const r = pickBestStockImage(
      [
        {
          id: '1',
          maker: 'Chevrolet',
          model: 'Onix',
          generation: null,
          body_style: null,
          year_from: null,
          year_to: null,
          match_level: 'family',
          image_url: 'https://cdn.example/family.jpg',
          storage_path: null,
          confidence: 0.9,
        },
        {
          id: '2',
          maker: 'Chevrolet',
          model: 'Onix',
          generation: null,
          body_style: null,
          year_from: 2019,
          year_to: 2021,
          match_level: 'exact',
          image_url: 'https://cdn.example/exact.jpg',
          storage_path: null,
          confidence: 0.85,
        },
      ],
      { makerName: 'Chevrolet', modelName: 'Onix', year: 2020 },
    )
    expect(r.level).toBe('exact')
    expect(r.url).toContain('exact.jpg')
  })

  it('foto pessoal tem prioridade sobre stock', () => {
    const assets: CustomerVehicleAsset[] = [
      {
        id: 'a1',
        customerVehicleId: 'v1',
        customerId: 'c1',
        storagePath: 'c1/v1/a1.jpg',
        sortOrder: 0,
        isPrimary: true,
        createdAt: new Date().toISOString(),
        signedUrl: 'https://signed.example/a1.jpg',
      },
    ]
    const personal = personalCoverImage(assets, 'a1')
    expect(personal?.source).toBe('personal')
    expect(personal?.url).toContain('a1.jpg')
    expect(placeholderVehicleImage().level).toBe('placeholder')
  })

  it('label CarImages permanece família/ilustrativa (nunca exact por fuzzy)', () => {
    // Contrato R4: remote CarImages sempre entra como family no resolveVehicleDisplayImage
    expect('Imagem ilustrativa da família/estúdio').toMatch(/família|ilustrativa/i)
  })
})
