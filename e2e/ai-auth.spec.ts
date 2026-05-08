import { test, expect } from '@playwright/test';

test('frontend AI requests include Bakery token when configured', async ({ page }) => {
  let bakeryToken = '';
  await page.route('/api/data/**', (route) => {
    if (route.request().method() === 'PUT') {
      route.fulfill({ status: 204 });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], updatedAt: new Date(0).toISOString() }),
      });
    }
  });
  await page.route('/api/messages', async (route) => {
    bakeryToken = route.request().headers()['x-bakery-token'] ?? '';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: [{ type: 'text', text: 'Token received.' }] }),
    });
  });

  await page.goto('/');
  await page.locator('aside').getByRole('button', { name: 'R&D Lab' }).click();
  await page.getByPlaceholder('Ask about your recipes, inventory, or baking...').fill('Hello');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByText('Token received.')).toBeVisible();
  expect(bakeryToken).toBe('playwright-token');
});
