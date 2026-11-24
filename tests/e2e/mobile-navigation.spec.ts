import { test, expect } from '@playwright/test';

test.describe('Mobile Navigation & Android Back Hierarchy', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForSelector('.lf-bottom-nav');
  });

  test('renders 5-item bottom nav and navigates back through view stack', async ({ page }) => {
    const navButtons = page.locator('.lf-bottom-nav .bottom-nav-btn');
    await expect(navButtons).toHaveCount(5);
    await expect(navButtons.nth(0)).toContainText('Inicio');
    await expect(navButtons.nth(1)).toContainText('Personajes');
    await expect(navButtons.nth(2)).toContainText('Escritos');
    await expect(navButtons.nth(3)).toContainText('Mundo');
    await expect(navButtons.nth(4)).toContainText('Menú');

    // Navigate Dashboard -> Personajes -> Mundo
    await navButtons.nth(1).click();
    await expect(navButtons.nth(1)).toHaveClass(/active/);

    await navButtons.nth(3).click();
    await expect(navButtons.nth(3)).toHaveClass(/active/);

    // Simulate Android Back: Mundo -> Personajes
    await page.evaluate(() => (window as any).__lfMobile.handleBack());
    await expect(navButtons.nth(1)).toHaveClass(/active/);

    // Simulate Android Back: Personajes -> Inicio
    await page.evaluate(() => (window as any).__lfMobile.handleBack());
    await expect(navButtons.nth(0)).toHaveClass(/active/);

    // Clear any backup dirty state and verify double-back toast on root Dashboard
    await page.evaluate(() => (window as any).__lfMobile.markBackupExported());
    await page.evaluate(() => (window as any).__lfMobile.handleBack());
    await expect(page.locator('#lf-toast')).toContainText('Presiona Atrás otra vez para salir');
  });

  test('Android Back closes mobile drawer and command palette before popping views', async ({ page }) => {
    const navButtons = page.locator('.lf-bottom-nav .bottom-nav-btn');
    await navButtons.nth(3).click(); // Go to Mundo
    await expect(navButtons.nth(3)).toHaveClass(/active/);

    // Open mobile drawer
    await navButtons.nth(4).click();
    await expect(page.locator('.lf-sidebar')).toHaveClass(/open/);

    // Back closes drawer, stays in Mundo
    await page.evaluate(() => (window as any).__lfMobile.handleBack());
    await expect(page.locator('.lf-sidebar')).not.toHaveClass(/open/);
    await expect(navButtons.nth(3)).toHaveClass(/active/);

    // Open Command Palette via Ctrl+K
    await page.keyboard.press('Control+k');
    await expect(page.locator('#lf-command-palette')).toBeVisible();

    // Back closes Command Palette, stays in Mundo
    await page.evaluate(() => (window as any).__lfMobile.handleBack());
    await expect(page.locator('#lf-command-palette')).toHaveCount(0);
    await expect(navButtons.nth(3)).toHaveClass(/active/);
  });

  test('font scale cycles Normal -> Grande -> Extra and persists', async ({ page }) => {
    const fontBtn = page.locator('button[aria-label="Cambiar tamaño de letra"]');
    await expect(fontBtn).toContainText('A Normal');

    await fontBtn.click();
    await expect(fontBtn).toContainText('A+ Grande');
    await expect(page.locator('.lf-workspace')).toHaveAttribute('data-font-scale', 'large');

    await fontBtn.click();
    await expect(fontBtn).toContainText('A++ Extra');
    await expect(page.locator('.lf-workspace')).toHaveAttribute('data-font-scale', 'extra');
    await expect(page.locator('.lf-workspace')).toHaveAttribute('data-a11y', 'senior');

    await page.reload();
    await expect(page.locator('button[aria-label="Cambiar tamaño de letra"]')).toContainText('A++ Extra');
  });
});
