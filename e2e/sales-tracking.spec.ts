import { test, expect } from '@playwright/test';

test.describe('Sales Tracking', () => {
  test.beforeEach(async ({ page }) => {
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
    await page.route('/api/square/credentials', (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({ status: 204 });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { location_id: 'food1', square_location_id: '', configured: false },
            { location_id: 'food2', square_location_id: '', configured: false },
            { location_id: 'bread', square_location_id: '', configured: false },
          ]),
        });
      }
    });
    await page.route('/api/square/catalog', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: ['Country Sourdough'] }),
      });
    });
    await page.route('/api/square/sync', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ last_synced_at: new Date().toISOString(), sales: [], sync_errors: [] }),
      });
    });
    await page.addInitScript(() => {
      localStorage.removeItem('bakeryos_distributions');
      localStorage.removeItem('bakeryos_square_credentials');
      localStorage.removeItem('bakeryos_square_item_map');
      localStorage.removeItem('bakeryos_square_sales_cache');
    });
    await page.goto('/');
    await page.locator('aside').getByRole('button', { name: 'Sales Tracking' }).click();
  });

  test('shows Sales Tracking heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sales Tracking' })).toBeVisible();
  });

  test('shows Distribution Log and Settings sub-tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Distribution Log' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  });

  test('shows empty state message when no distributions logged', async ({ page }) => {
    await expect(page.getByText(/no distributions logged yet/i)).toBeVisible();
  });

  test('shows sync bar with Never synced status', async ({ page }) => {
    await expect(page.getByText('Never synced')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sync Square' })).toBeVisible();
  });

  test('Log Distribution button opens modal', async ({ page }) => {
    await page.getByRole('button', { name: '+ Log Distribution' }).click();
    await expect(page.getByRole('heading', { name: 'Log Distribution' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('can log a distribution entry', async ({ page }) => {
    await page.getByRole('button', { name: '+ Log Distribution' }).click();

    // Fill the form
    await page.getByRole('spinbutton').fill('12'); // quantity field
    const itemInput = page.getByPlaceholder('e.g. Country Sourdough');
    if (await itemInput.isVisible()) {
      await itemInput.fill('Country Sourdough');
    } else {
      // Item may render as a select/combobox when recipes are present
      const combobox = page.getByRole('combobox').first();
      if (await combobox.isVisible()) {
        await combobox.selectOption({ index: 1 });
      }
    }

    await page.getByRole('button', { name: 'Log Distribution', exact: true }).click();

    // Modal should close and table row should appear
    await expect(page.getByRole('heading', { name: 'Log Distribution' })).not.toBeVisible();
    await expect(page.getByText('12')).toBeVisible();
  });

  test('navigates to Settings sub-tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Square Credentials' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Item Mapping' })).toBeVisible();
  });

  test('Settings shows credential inputs for all 3 locations', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('Food 1')).toBeVisible();
    await expect(page.getByText('Food 2')).toBeVisible();
    await expect(page.getByText('Bread Hall')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fetch Square Catalog' })).toBeVisible();
  });

  test('can add and remove item mapping', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: '+ Add Mapping' }).click();
    // A new row should appear with a remove button
    await expect(page.getByRole('button', { name: 'Remove mapping' })).toBeVisible();
    await page.getByRole('button', { name: 'Remove mapping' }).click();
    await expect(page.getByRole('button', { name: 'Remove mapping' })).not.toBeVisible();
  });

  test('Cancel closes log distribution modal without saving', async ({ page }) => {
    await page.getByRole('button', { name: '+ Log Distribution' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Log Distribution' })).not.toBeVisible();
    await expect(page.getByText(/no distributions logged yet/i)).toBeVisible();
  });

  test('removes legacy Square credentials from localStorage on load', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('bakeryos_square_credentials', JSON.stringify({
        data: [{ location_id: 'food1', access_token: 'secret-token', square_location_id: 'LOC1' }],
        updatedAt: new Date().toISOString(),
      }));
    });
    await page.reload();
    await page.locator('aside').getByRole('button', { name: 'Sales Tracking' }).click();
    const legacyCredentials = await page.evaluate(() => localStorage.getItem('bakeryos_square_credentials'));
    expect(legacyCredentials).toBeNull();
  });

  test('saves Square credentials through Worker without persisting tokens locally', async ({ page }) => {
    let squareCredentialPayload: unknown = null;
    await page.route('/api/square/credentials', async (route) => {
      if (route.request().method() === 'PUT') {
        squareCredentialPayload = route.request().postDataJSON();
        await route.fulfill({ status: 204 });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { location_id: 'food1', square_location_id: '', configured: false },
            { location_id: 'food2', square_location_id: '', configured: false },
            { location_id: 'bread', square_location_id: '', configured: false },
          ]),
        });
      }
    });

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByPlaceholder('EAAAl...').first().fill('secret-square-token');
    await page.getByPlaceholder('LXXXXXXXXX').first().fill('LOC123');
    await page.getByRole('button', { name: 'Save Square Credentials' }).click();

    expect(squareCredentialPayload).toEqual({
      credentials: [
        { location_id: 'food1', access_token: 'secret-square-token', square_location_id: 'LOC123' },
        { location_id: 'food2', access_token: '', square_location_id: '' },
        { location_id: 'bread', access_token: '', square_location_id: '' },
      ],
    });
    const legacyCredentials = await page.evaluate(() => localStorage.getItem('bakeryos_square_credentials'));
    expect(legacyCredentials).toBeNull();
  });

  test('fetches catalog through Worker instead of direct Square browser calls', async ({ page }) => {
    let squareProxyCalled = false;
    let directSquareCalled = false;
    await page.route('/api/square/catalog', async (route) => {
      squareProxyCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: ['Country Sourdough'] }),
      });
    });
    await page.route('https://connect.squareup.com/**', async (route) => {
      directSquareCalled = true;
      await route.abort();
    });

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Fetch Square Catalog' }).click();
    await expect(page.getByText('Catalog loaded')).toBeVisible();

    expect(squareProxyCalled).toBe(true);
    expect(directSquareCalled).toBe(false);
  });
});
