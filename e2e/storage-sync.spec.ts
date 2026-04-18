import { test, expect } from '@playwright/test';

function mockKV(page: Parameters<Parameters<typeof test>[1]>[0]) {
  return page.route('/api/data/**', (route) => {
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
}

test('save triggers background PUT to /api/data/bakeryos_recipes', async ({ page }) => {
  const puts: string[] = [];
  await page.route('/api/data/**', (route) => {
    if (route.request().method() === 'PUT') {
      puts.push(route.request().url());
      route.fulfill({ status: 204 });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], updatedAt: new Date(0).toISOString() }),
      });
    }
  });

  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.waitForSelector('h1');
  await page.locator('aside').getByRole('button', { name: 'Formula Library', exact: true }).click();
  await page.getByRole('button', { name: '+ New Formula', exact: true }).first().click();
  // Fill recipe name using actual placeholder text from RecipeCalculator
  const nameInput = page.getByPlaceholder(/master formula/i).or(page.getByPlaceholder(/recipe name/i)).first();
  await nameInput.fill('Test Loaf');
  await page.getByRole('button', { name: /save recipe/i }).first().click();
  await page.waitForTimeout(500);
  expect(puts.some(u => u.includes('bakeryos_recipes'))).toBe(true);
});

test('new device: app renders after syncAll resolves', async ({ page }) => {
  await mockKV(page);
  await page.addInitScript(() => {
    ['bakeryos_recipes', 'bakeryos_inventory', 'bakeryos_planner_items', 'bakeryos_work_orders']
      .forEach(k => localStorage.removeItem(k));
  });

  await page.goto('/');
  await page.waitForSelector('h1', { timeout: 5000 });
  const heading = await page.locator('h1').first().textContent();
  expect(heading).toBeTruthy();
});
