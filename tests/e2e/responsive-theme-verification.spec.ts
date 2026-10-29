import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: '320px (極小型手機)', width: 320, height: 568 },
  { name: '375px (一般手機)', width: 375, height: 667 },
  { name: '390px (主流手機)', width: 390, height: 844 },
  { name: '430px (大型手機)', width: 430, height: 932 },
  { name: '768px (平板直向)', width: 768, height: 1024 },
  { name: '1024px (平板橫向)', width: 1024, height: 768 },
  { name: '1280px (筆電)', width: 1280, height: 800 },
  { name: '1440px (桌面)', width: 1440, height: 900 },
  { name: '1920px (大型螢幕)', width: 1920, height: 1080 },
];

/**
 * Checks if two bounding boxes intersect (with 1px tolerance for subpixel rounding).
 */
function isOverlapping(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    a.x + a.width <= b.x + 1 ||
    b.x + b.width <= a.x + 1 ||
    a.y + a.height <= b.y + 1 ||
    b.y + b.height <= a.y + 1
  );
}

test.describe('Mandatory 9-Viewport RWD, Dual-Theme & Zero-Overlap Verification', () => {
  for (const vp of VIEWPORTS) {
    test(`strictly zero overflow, zero overlap, and dual-theme on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto('/');
      await expect(page.locator('h1').filter({ hasText: 'Geo Data Explorer' })).toBeVisible({ timeout: 15000 });

      // 1. Strict zero horizontal page overflow
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(isOverflowing, `Expected no horizontal scrollbar on ${vp.name}`).toBe(false);

      // 2. Header bounds
      const header = page.locator('header');
      await expect(header).toBeVisible();
      const headerBox = await header.boundingBox();
      expect(headerBox).not.toBeNull();
      if (headerBox) {
        expect(headerBox.width).toBeLessThanOrEqual(vp.width + 1);
      }

      // 3. ZERO-OVERLAP: Header vs FilterBar
      const filterBar = page.getByTestId('filter-bar-container');
      await expect(filterBar).toBeVisible();
      const filterBarBox = await filterBar.boundingBox();
      expect(filterBarBox).not.toBeNull();

      if (headerBox && filterBarBox) {
        expect(
          headerBox.y + headerBox.height <= filterBarBox.y + 1,
          'Header must not overlap floating FilterBar'
        ).toBe(true);
      }

      // 4. ZERO-OVERLAP: FilterBar vs Map Controls
      const mapControls = page.getByTestId('map-controls-container');
      await expect(mapControls).toBeVisible();
      const mapControlsBox = await mapControls.boundingBox();
      expect(mapControlsBox).not.toBeNull();

      if (filterBarBox && mapControlsBox) {
        const overlap = isOverlapping(filterBarBox, mapControlsBox);
        expect(overlap, `FilterBar and Map Controls must not overlap on ${vp.name}`).toBe(false);
      }

      // 5. ZERO-OVERLAP: TimeSlider vs Legend
      const timeSlider = page.getByTestId('timeslider-container');
      const legend = page.getByTestId('legend-container');
      if (await timeSlider.isVisible() && await legend.isVisible()) {
        const timeBox = await timeSlider.boundingBox();
        const legBox = await legend.boundingBox();
        if (timeBox && legBox) {
          const overlap = isOverlapping(timeBox, legBox);
          expect(overlap, `TimeSlider and Legend must not overlap on ${vp.name}`).toBe(false);
        }
      }

      // 6. Desktop Right Dock & ECharts 5-Tier Document Flow Architecture
      if (vp.width >= 1024) {
        const rightDock = page.getByTestId('desktop-right-dock');
        await expect(rightDock).toBeVisible();
        const rightDockBox = await rightDock.boundingBox();
        expect(rightDockBox).not.toBeNull();

        // Zero overlap between FilterBar and Right Dock
        if (filterBarBox && rightDockBox) {
          const overlap = isOverlapping(filterBarBox, rightDockBox);
          expect(overlap, 'FilterBar and Right Dock must not overlap').toBe(false);
        }

        // Verify ECharts 5-Tier Architecture
        const tier1 = page.getByTestId('echarts-tier-1-header');
        const tier2 = page.getByTestId('echarts-tier-2-desc');
        const tier3 = page.getByTestId('echarts-tier-3-stats');
        const tier4 = page.getByTestId('echarts-tier-4-chart');
        const tier5 = page.getByTestId('echarts-tier-5-footer');

        await expect(tier1).toBeVisible();
        await expect(tier2).toBeVisible();
        await expect(tier3).toBeVisible();
        await expect(tier4).toBeVisible();
        await expect(tier5).toBeVisible();

        const t1Box = await tier1.boundingBox();
        const t2Box = await tier2.boundingBox();
        const t3Box = await tier3.boundingBox();
        const t4Box = await tier4.boundingBox();
        const t5Box = await tier5.boundingBox();

        if (t1Box && t2Box && t3Box && t4Box && t5Box) {
          // Document Flow: Strict top-to-bottom sequence
          expect(t1Box.y + t1Box.height <= t2Box.y + 1, 'Tier 1 must precede Tier 2').toBe(true);
          expect(t2Box.y + t2Box.height <= t3Box.y + 1, 'Tier 2 must precede Tier 3').toBe(true);
          expect(t3Box.y + t3Box.height <= t4Box.y + 1, 'Tier 3 (Stats) must precede Tier 4 (Chart) without overlap').toBe(true);
          expect(t4Box.y + t4Box.height <= t5Box.y + 1, 'Tier 4 must precede Tier 5').toBe(true);
        }
      }

      // 7. Mobile Navigation & Analytics Drawer Verification
      if (vp.width < 640) {
        // Mobile view: click hamburger drawer button
        const hamburgerBtn = page.getByTestId('mobile-hamburger-btn');
        await expect(hamburgerBtn).toBeVisible();
        await hamburgerBtn.click();

        // Verify mobile drawer opened
        await expect(page.getByText('工作台功能選單')).toBeVisible();

        // Check drawer does not cause horizontal page overflow
        const drawerOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(drawerOverflow).toBe(false);

        // Test theme switch to Light mode inside mobile drawer
        const lightModeBtn = page.getByRole('button', { name: '淺色' });
        await expect(lightModeBtn).toBeVisible();
        await lightModeBtn.click();

        // Verify .dark is removed
        const isDarkAfterLight = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(isDarkAfterLight).toBe(false);

        // Test theme switch to Dark mode inside mobile drawer
        const darkModeBtn = page.getByRole('button', { name: '深色' });
        await darkModeBtn.click();
        const isDarkAfterDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(isDarkAfterDark).toBe(true);

        // Close mobile drawer
        const closeDrawerBtn = page.getByTestId('close-mobile-drawer');
        await expect(closeDrawerBtn).toBeVisible();
        await closeDrawerBtn.click();

        // Test mobile analytics toggle button in header
        const mobileAnalyticsBtn = page.getByTestId('header-analytics-btn');
        await expect(mobileAnalyticsBtn).toBeVisible();
        await mobileAnalyticsBtn.click();

        // Verify mobile analytics modal opens
        await expect(page.getByTestId('mobile-analytics-title')).toBeVisible();

        // Switch to ranking list tab
        const rankingTabBtn = page.getByTestId('mobile-tab-ranking');
        await expect(rankingTabBtn).toBeVisible();
        await rankingTabBtn.click();
        await expect(page.getByTestId('mobile-analytics-modal').getByText('區域排名榜')).toBeVisible();

        // Check no horizontal overflow with analytics drawer open
        const analyticsOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(analyticsOverflow).toBe(false);

        // Close mobile analytics modal
        await page.getByTestId('close-mobile-analytics').click();
      } else {
        // Desktop / Tablet view: Theme toggle dropdown in toolbar
        const themeBtn = page.getByTestId('theme-toggle-btn');
        await expect(themeBtn).toBeVisible();
        await themeBtn.click();

        // Select Light mode
        const lightOption = page.getByRole('button', { name: '淺色模式' });
        await expect(lightOption).toBeVisible();
        await lightOption.click();

        // Verify documentElement does not have .dark
        const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(isDark).toBe(false);

        // Verify zero overflow in light mode
        const lightOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(lightOverflow).toBe(false);

        // Switch back to Dark mode
        await themeBtn.click();
        const darkOption = page.getByRole('button', { name: '深色模式' });
        await darkOption.click();
        const isDarkNow = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(isDarkNow).toBe(true);
      }

      // 8. Test Data Table Modal on larger viewports
      if (vp.width >= 640) {
        await page.getByRole('button', { name: '資料總表' }).click();
        await expect(page.getByText('資料總表與匹配診斷')).toBeVisible();

        const tableModalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(tableModalOverflow).toBe(false);

        await page.getByRole('button', { name: '關閉' }).click();
      }

      // Filter out non-fatal headless WebGL and Worker notices
      const severeErrors = consoleErrors.filter(
        (e) => !e.includes('WebGL') && !e.includes('source-map') && !e.includes('favicon') && !e.includes('Worker')
      );
      expect(severeErrors).toEqual([]);
    });
  }

  test('maintains operable layout and zero overflow under 200% text zoom', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.locator('h1').filter({ hasText: 'Geo Data Explorer' })).toBeVisible({ timeout: 15000 });

    // Emulate 200% zoom
    await page.evaluate(() => {
      document.body.style.zoom = '200%';
    });

    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(isOverflowing, 'Must not cause horizontal overflow at 200% zoom').toBe(false);

    // FilterBar and header remain functional
    await expect(page.getByTestId('filter-bar-container')).toBeVisible();
  });
});
