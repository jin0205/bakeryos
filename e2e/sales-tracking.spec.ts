import { test, expect } from '@playwright/test';

test.describe('Sales Tracking', () => {
  test.beforeEach(async ({ page }) => {
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
        await combobox.selectOption({ index: 0 });
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
});
