import { test, expect } from '@playwright/test'
import { e2eCredentials, loginAsE2EUser } from './helpers/auth'
import { openManualAddForm, selectFirstRealOption } from './helpers/garage'

const hasCreds = Boolean(e2eCredentials())

test.describe('R5 #6 — Cadastro manual na conta', () => {
  test.skip(!hasCreds, 'Defina E2E_USER_EMAIL e E2E_USER_PASSWORD para rodar este e2e')

  test('salva veículo mínimo (montadora + modelo) na garagem', async ({ page }) => {
    await loginAsE2EUser(page)
    await openManualAddForm(page)

    const maker = await selectFirstRealOption(page, 'Montadora')
    const model = await selectFirstRealOption(page, 'Modelo')
    const nick = `E2E ${Date.now().toString(36)}`

    await page
      .locator('div')
      .filter({ has: page.locator('label', { hasText: /^Apelido/ }) })
      .locator('input')
      .fill(nick)

    await page.getByRole('button', { name: 'Salvar na garagem' }).click()

    await expect(page.getByText(nick).or(page.getByText(model))).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText(maker).first()).toBeVisible()
  })
})
