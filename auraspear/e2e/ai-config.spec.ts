import { test, expect } from '@playwright/test'

test.describe('AI Configuration Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'platform-admin@auraspear.io')
    await page.fill('input[name="password"]', 'Admin@123!Secure')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
  })

  test('should load AI Config page with tabs', async ({ page }) => {
    await page.goto('/ai-config')
    await expect(page).toHaveURL(/ai-config/)

    // Should have tab navigation
    const agentsTab = page.getByRole('tab', { name: /agents/i })
    await expect(agentsTab).toBeVisible({ timeout: 5_000 })

    const schedulesTab = page.getByRole('tab', { name: /schedules/i })
    await expect(schedulesTab).toBeVisible()

    const findingsTab = page.getByRole('tab', { name: /findings/i })
    await expect(findingsTab).toBeVisible()
  })

  test('should show agent config cards', async ({ page }) => {
    await page.goto('/ai-config')
    // Agent cards should render
    const cards = page.locator('[class*="card"], [class*="Card"]')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
  })

  test('should switch to Findings tab and show results', async ({ page }) => {
    await page.goto('/ai-config')
    const findingsTab = page.getByRole('tab', { name: /findings/i })
    await findingsTab.click()
    // Should show finding rows or empty state
    await expect(
      page.locator('[class*="finding"], [class*="Finding"], [class*="empty"]').first()
    ).toBeVisible({ timeout: 10_000 })
  })
})
