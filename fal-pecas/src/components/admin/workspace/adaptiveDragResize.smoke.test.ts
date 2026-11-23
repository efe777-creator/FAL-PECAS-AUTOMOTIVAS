import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Smoke — Adaptive split in-flow + chrome só Fechar (FAL-UI-LAYOUT v1.6.3).
 */
const root = resolve(__dirname, '../../..')
const read = (...parts: string[]) => readFileSync(resolve(root, ...parts), 'utf8')

describe('Adaptive drag resize smoke', () => {
  const shell = read('components/admin/workspace/AdaptiveWorkspace.tsx')
  const chrome = read('components/admin/workspace/PanelChrome.tsx')
  const guide = read('components/admin/vehicles/AdminVehicleGuidePanel.tsx')
  const dash = read('components/admin/dashboard/DashboardContextualPanel.tsx')

  it('split in-flow sticky + grip; sem spacer/fixed docked', () => {
    expect(shell).toMatch(/role="separator"/)
    expect(shell).toMatch(/onSplitterPointerDown/)
    expect(shell).toMatch(/onSplitterKeyDown/)
    expect(shell).toMatch(/ArrowLeft/)
    expect(shell).toMatch(/cursor-col-resize/)
    expect(shell).toMatch(/clampSplitWidth/)
    expect(shell).toMatch(/WORKSPACE_SPLIT_STEP/)
    expect(shell).toMatch(/data-workspace-panel="docked"/)
    expect(shell).toMatch(/sticky self-start/)
    expect(shell).toMatch(/-mr-3/)
    expect(shell).toMatch(/md:-mr-6/)
    expect(shell).not.toMatch(/data-workspace-spacer/)
    expect(shell).not.toMatch(/mx-0\.5 hidden w-3 shrink-0 cursor-col-resize lg:block/)
  })

  it('PanelChrome só fecha; sem controles de largura/modo', () => {
    expect(chrome).toMatch(/Fechar painel/)
    expect(chrome).toMatch(/onClose/)
    expect(chrome).not.toMatch(/Estreita|Larga|Expandir|Tela cheia|Compacta/)
    expect(chrome).not.toMatch(/onSplitWidth|onGuideDensity|onModeChange/)
    expect(shell).toMatch(/modeApiRef/)
  })

  it('guia veículos: sem Fechar duplicado; situação só salva se mudou', () => {
    expect(guide).toMatch(/Salvar situação/)
    expect(guide).toMatch(/qualityDraft === \(model\.qualityStatus/)
    expect(guide).not.toMatch(/Aplicações[\s\S]{0,200}>\s*Fechar\s*</)
    expect(guide).toMatch(/Aplicações/)
    expect(dash).not.toMatch(/Use Expandir/)
    expect(dash).toMatch(/Arraste a borda/)
  })
})
