import { test, expect, type Page } from '@playwright/test';

async function setupAlertPage(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const searchInput = page.getByTestId('sidebar-search');
  await expect(searchInput).toBeVisible();

  await searchInput.click();
  await searchInput.fill('alert');
  await searchInput.press('Enter');
  const firstResult = page
    .locator('button')
    .filter({ hasText: /Alerts/i })
    .first();
  await firstResult.click();

  await page.waitForLoadState('networkidle');
}

test.describe('Alert Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAlertPage(page);
  });

  test.describe('Smoke Tests', () => {
    test('should render alerts app with heading and button', async ({
      page,
    }) => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('button').first()).toBeVisible();
    });
  });

  test.describe('Alert Interaction Tests', () => {
    test('should show alert dialog when button is clicked', async ({
      page,
    }) => {
      const triggerButton = page.getByRole('button').first();
      await triggerButton.click();
      await page.waitForTimeout(500);

      // Check for dialog by looking for Yes/No/Cancel buttons
      const yesButton = page.getByRole('button', { name: /yes/i });
      await expect(yesButton).toBeVisible();
    });

    test('should display alert with Yes, No, Cancel buttons', async ({
      page,
    }) => {
      const triggerButton = page.getByRole('button').first();
      await triggerButton.click();
      await page.waitForTimeout(500);

      // Check for all three buttons
      await expect(page.getByRole('button', { name: /yes/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /no/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    });

    test('should handle alert button clicks', async ({ page }) => {
      const triggerButton = page.getByRole('button').first();
      await triggerButton.click();
      await page.waitForTimeout(500);

      const yesButton = page.getByRole('button', { name: /yes/i });
      await expect(yesButton).toBeVisible();

      // Click the button
      await yesButton.click();
      await page.waitForTimeout(300);

      // Button should have been clicked
      await expect(yesButton).toBeEnabled();
    });
  });
});
