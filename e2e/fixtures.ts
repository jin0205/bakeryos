import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('/api/data/**', (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({ status: 204 });
        return;
      }

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], updatedAt: new Date(0).toISOString() }),
      });
    });

    await use(page);
  },
});

export { expect };
