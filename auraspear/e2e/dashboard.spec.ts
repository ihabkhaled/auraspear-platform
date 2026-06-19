import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'platform-admin@auraspear.io')
    await page.fill('input[name="password"]', 'Admin@123!Secure')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
  })

  test('should render dashboard with KPI cards', async ({ page }) => {
    await expect(page.locator('h1, [data-testid="page-title"]').first()).toBeVisible()
    // Dashboard should have cards/stats
    const cards = page.locator('[class*="card"], [class*="Card"]')
    await expect(cards.first()).toBeVisible({ timeout: 5_000 })
  })

  test('should have sidebar navigation visible', async ({ page }) => {
    const sidebar = page.locator('nav, [class*="sidebar"], [class*="Sidebar"]')
    await expect(sidebar.first()).toBeVisible()
  })
})
