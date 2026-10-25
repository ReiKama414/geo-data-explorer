import { test, expect } from '@playwright/test';

test.describe('Geo Data Explorer E2E Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for initial application header to be visible
    await expect(page.locator('h1').filter({ hasText: 'Geo Data Explorer' })).toBeVisible({ timeout: 15000 });
  });

  test('loads initial Taiwan dataset and renders core workbench panels', async ({ page }) => {
    // 1. Verify page title
    await expect(page).toHaveTitle(/Geo Data Explorer/);

    // 2. Verify header elements
    await expect(page.locator('h1').filter({ hasText: 'Geo Data Explorer' })).toBeVisible();
    await expect(page.getByText('台灣各縣市發展指標')).toBeVisible();

    // 3. Verify spatial match counter
    await expect(page.getByText('空間匹配:')).toBeVisible();

    // 4. Verify Legend is present
    await expect(page.getByText('分級設色圖例')).toBeVisible();
  });

  test('switches analysis metrics and filters by search text', async ({ page }) => {
    // Select metric dropdown
    const metricSelect = page.locator('select').first();
    await expect(metricSelect).toBeVisible();

    // Change to population
    await metricSelect.selectOption('population');

    // Verify legend metric title updates
    const legendHeader = page.locator('span.text-xs.font-bold.text-slate-100');
    await expect(legendHeader).toHaveText('population');

    // Search for Taipei
    const searchInput = page.getByPlaceholder('搜尋地區名稱或代碼...');
    await searchInput.fill('臺北');
    await expect(searchInput).toHaveValue('臺北');

    // Reset filter button appears and works
    const resetBtn = page.getByRole('button', { name: '重設篩選' });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    await expect(searchInput).toHaveValue('');
  });

  test('interacts with timeline slider and controls', async ({ page }) => {
    // Timeline slider should be visible for multi-year data
    const timeLabel = page.getByText('year:');
    await expect(timeLabel).toBeVisible();

    // Check year buttons with exact matching
    const btn2020 = page.getByRole('button', { name: '2020', exact: true });
    await expect(btn2020).toBeVisible();

    // Click 2020
    await btn2020.click();

    // Verify current year badge reflects 2020
    const timeBadge = page.locator('span.font-mono.text-sm.font-bold');
    await expect(timeBadge).toHaveText('2020');
  });

  test('opens data table and verifies unmatched records with no fake coordinates', async ({ page }) => {
    // Click data table button
    await page.getByRole('button', { name: '資料總表' }).click();

    // Verify modal header
    await expect(page.getByText('資料總表與匹配診斷')).toBeVisible();

    // Verify merged data tab
    await expect(page.getByRole('button', { name: /已合併空間資料/ })).toBeVisible();

    // Switch to unmatched CSV records tab
    const unmatchedTab = page.getByRole('button', { name: /未匹配 CSV 資料/ });
    await expect(unmatchedTab).toBeVisible();
    await unmatchedTab.click();

    // Verify strict handling statement: "絕不捏造或隨機填補經緯度"
    await expect(page.getByText('未匹配記錄絕不捏造或隨機填補經緯度')).toBeVisible();

    // Check the 2 intentionally unmatched records (99999, 88888)
    await expect(page.getByText('未匹配鍵值: 99999')).toBeVisible();
    await expect(page.getByText('未匹配鍵值: 88888')).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: '關閉' }).click();
    await expect(page.getByText('資料總表與匹配診斷')).not.toBeVisible();
  });

  test('opens unmatched banner and alias mapper modal', async ({ page }) => {
    // Click unmatched banner button
    const bannerBtn = page.getByRole('button', { name: '檢視與關聯' });
    if (await bannerBtn.isVisible()) {
      await bannerBtn.click();
      await expect(page.getByText('未匹配地區資料處理')).toBeVisible();
      await expect(page.getByText('絕不捏造或隨意推測經緯度座標')).toBeVisible();
      await page.getByRole('button', { name: '完成關閉' }).click();
    }
  });

  test('switches between ECharts analytics and ranking list', async ({ page }) => {
    // ECharts tab button is visible
    const echartsBtn = page.getByRole('button', { name: 'ECharts 分析圖' });
    await expect(echartsBtn).toBeVisible();
    await expect(page.getByText('ECharts 統計圖表')).toBeVisible();

    // Switch to ranking list tab
    const rankingBtn = page.getByRole('button', { name: '排行清單' });
    await rankingBtn.click();
    await expect(page.getByText('區域排名榜')).toBeVisible();

    // Switch back to ECharts
    await echartsBtn.click();
    await expect(page.getByText('ECharts 統計圖表')).toBeVisible();
  });

  test('opens project manager modal (IndexedDB persistence)', async ({ page }) => {
    await page.getByRole('button', { name: '專案存檔' }).click();
    await expect(page.getByText('專案儲存與 IndexedDB 資料持久化')).toBeVisible();
    await expect(page.getByText('本機 IndexedDB 專案清單')).toBeVisible();
    await page.getByRole('button', { name: '關閉' }).click();
  });
});
