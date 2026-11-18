import { expect, type Page } from '@playwright/test'

export function selectInLabeledGroup(page: Page, label: string) {
  return page
    .locator('div')
    .filter({ has: page.locator('label', { hasText: new RegExp(`^${label}$`) }) })
    .locator('select')
}

export async function selectFirstRealOption(page: Page, label: string): Promise<string> {
  const select = selectInLabeledGroup(page, label)
  await expect(select).toBeEnabled({ timeout: 30_000 })
  const values = await select.locator('option').evaluateAll((opts) =>
    opts
      .map((o) => (o as HTMLOptionElement).value)
      .filter((v) => Boolean(v)),
  )
  if (values.length === 0) {
    throw new Error(`Select "${label}" sem opções reais`)
  }
  await select.selectOption(values[0])
  return values[0]
}

export async function openManualAddForm(page: Page) {
  await page.goto('/conta/veiculos')
  await expect(page.getByRole('heading', { name: /Minha [Gg]aragem|Meus carros|Garagem/i }).or(page.getByText('Adicionar veículo'))).toBeVisible({
    timeout: 30_000,
  })
  const addBtn = page.getByRole('button', { name: 'Adicionar veículo' })
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click()
  }
  await expect(page.getByRole('heading', { name: 'Adicionar manualmente' })).toBeVisible()
}
