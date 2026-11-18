import { test, expect } from '@playwright/test'
import { e2eCredentials, loginAsE2EUser } from './helpers/auth'
import { openManualAddForm, selectFirstRealOption } from './helpers/garage'

const hasCreds = Boolean(e2eCredentials())

test.describe('R5 #11 — Edição de incompletos', () => {
  test.skip(!hasCreds, 'Defina E2E_USER_EMAIL e E2E_USER_PASSWORD para rodar este e2e')

  test('atualiza apelido/placa no detalhe e persiste', async ({ page }) => {
    await loginAsE2EUser(page)
    await openManualAddForm(page)
    await selectFirstRealOption(page, 'Montadora')
    await selectFirstRealOption(page, 'Modelo')
    const seedNick = `EditSeed ${Date.now().toString(36)}`
    await page
      .locator('div')
      .filter({ has: page.locator('label', { hasText: /^Apelido/ }) })
      .locator('input')
      .fill(seedNick)
    await page.getByRole('button', { name: 'Salvar na garagem' }).click()
    await expect(page.getByText(seedNick)).toBeVisible({ timeout: 30_000 })

    const detailLink = page.locator('a[href*="/conta/veiculos/"]').first()
    await expect(detailLink).toBeVisible({ timeout: 30_000 })
    const href = await detailLink.getAttribute('href')
    if (!href) throw new Error('Link do detalhe ausente')
    await page.goto(href.includes('?') ? `${href}&edit=1` : `${href}?edit=1`)

    await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeVisible({
      timeout: 30_000,
    })

    const newNick = `EditOk ${Date.now().toString(36)}`
    await page
      .locator('div')
      .filter({ has: page.locator('label', { hasText: /^Apelido$/ }) })
      .locator('input')
      .fill(newNick)
    await page
      .locator('div')
      .filter({ has: page.locator('label', { hasText: /^Placa$/ }) })
      .locator('input')
      .fill('E2E1A23')

    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText(newNick)).toBeVisible({ timeout: 30_000 })

    await page.reload()
    await expect(page.getByText(newNick)).toBeVisible({ timeout: 30_000 })
  })
})
