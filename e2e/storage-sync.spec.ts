import { test, expect, type Page } from '@playwright/test';

function mockKV(page: Page) {
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
    [
      'bakeryos_recipes',
      'bakeryos_inventory',
      'bakeryos_planner_items',
      'bakeryos_work_orders',
      'bakeryos_distributions',
      'bakeryos_square_item_map',
      'bakeryos_square_sales_cache',
    ]
      .forEach(k => localStorage.removeItem(k));
  });

  await page.goto('/');
  await page.waitForSelector('h1', { timeout: 5000 });
  const heading = await page.locator('h1').first().textContent();
  expect(heading).toBeTruthy();
});

test('syncAll retries pending writes on startup when already online', async ({ page }) => {
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
  await page.addInitScript(() => {
    localStorage.setItem('bakeryos_distributions', JSON.stringify({
      data: [{ id: 'dist-1', date: '2026-05-02', location: 'food1', item_name: 'Country Sourdough', quantity_distributed: 4 }],
      updatedAt: new Date().toISOString(),
    }));
    localStorage.setItem('bakeryos_pending_sync', JSON.stringify(['bakeryos_distributions']));
  });

  await page.goto('/');
  await page.waitForSelector('h1', { timeout: 5000 });

  expect(puts.some(u => u.includes('/api/data/bakeryos_distributions'))).toBe(true);
  const pending = await page.evaluate(() => localStorage.getItem('bakeryos_pending_sync'));
  expect(pending).toBe('[]');
});
