import { expect, test, type Page } from '@playwright/test';

const screens = 'test-results/screens';

async function switchTo(page: Page, name: '高橋 葵' | '中村 健太') {
  await page.locator('.segmented').getByRole('button', { name: new RegExp(name) }).click();
}

async function ask(page: Page, prompt: RegExp) {
  await page.getByRole('button', { name: prompt }).click();
  await expect(page.getByText('のAIに問い合わせています')).toHaveCount(0, { timeout: 5_000 });
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  test.info().attach('errors', { body: '' });
  await page.goto('./');
  // テストの最後に、コンソールエラーがないことを確認する。
  (page as Page & { errors?: string[] }).errors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as Page & { errors?: string[] }).errors).toEqual([]);
});

test('MVPのデモの流れを通して操作できる', async ({ page }) => {
  const log = page.getByRole('log');
  await page.screenshot({ path: `${screens}/01-start.png` });

  // 1. 根拠ありの自動回答
  await ask(page, /C社の請求書の発行日/);
  await expect(log.getByText('C社の請求書は、11月6日（金）に発行される予定です。')).toBeVisible();
  await expect(log.getByText('中村さんへの確認は不要でした')).toBeVisible();
  await log.getByRole('button', { name: /請求書の発行予定/ }).click();
  await expect(page.locator('.panel mark')).toHaveText('C社：11月6日（金）');
  await page.screenshot({ path: `${screens}/02-answered-doc.png` });

  // 2〜4. 古いドキュメント、権限、根拠なし
  await ask(page, /出張の日当/);
  await expect(log.locator('.chip', { hasText: '旅費規程' })).toContainText('未確認');
  await ask(page, /A社の与信限度額/);
  await expect(log.getByText('確認待ち')).toBeVisible();
  await expect(log.getByText('3,000万円')).toHaveCount(0);
  await ask(page, /締め日が祝日/);
  await expect(log.getByText('回答待ち')).toBeVisible();
  await expect(page.locator('.nav .badge')).toHaveCount(0);
  await page.screenshot({ path: `${screens}/03-takahashi-waiting.png` });

  // 5. 受け手の視点
  await switchTo(page, '中村 健太');
  await expect(page.locator('.nav .badge')).toHaveText('3');
  await expect(page.getByRole('log')).toContainText('判断が必要なものが3件');
  await page.getByRole('link', { name: '代理対応の記録を開く' }).click();
  await expect(page.locator('.pending')).toHaveCount(3);
  await page.screenshot({ path: `${screens}/04-nakamura-record.png`, fullPage: true });

  const travel = page.locator('.pending', { hasText: '出張の日当' });
  await travel.getByRole('button', { name: '訂正する' }).click();
  await travel.getByRole('button', { name: '訂正を送る' }).click();
  await page.locator('.pending', { hasText: '与信限度額' }).getByRole('button', { name: /高橋さんに見せる/ }).click();
  await page.locator('.pending', { hasText: '締め日' }).getByRole('button', { name: '回答する' }).click();
  await expect(page.locator('.pending')).toHaveCount(0);
  await expect(page.locator('.nav .badge')).toHaveCount(0);
  const created = page.locator('.record-row', { hasText: '経費精算の締め日（祝日の場合）' });
  await expect(created).toContainText('公開範囲：高橋さん、中村さん');
  await created.getByRole('button', { name: '全員に公開する' }).click();
  await expect(created).toContainText('公開範囲：全員');
  await page.screenshot({ path: `${screens}/05-nakamura-done.png`, fullPage: true });

  // 質問者の側に、回答者の判断が届く
  await switchTo(page, '高橋 葵');
  await page.getByRole('link', { name: 'AIとの対話' }).click();
  await expect(log.getByText('中村さんが訂正しました')).toBeVisible();
  await expect(log.getByText('出張の日当は、1日2,500円です（2026年4月改定）。')).toBeVisible();
  await expect(log.getByText('中村さんが開示を承認しました')).toBeVisible();
  await expect(log.getByText('A社の与信限度額は、3,000万円です。')).toBeVisible();
  await expect(log.getByText('中村さんが回答しました')).toBeVisible();
  await page.screenshot({ path: `${screens}/06-takahashi-followups.png` });

  // 訂正はドキュメントにも反映される
  await log.locator('.chip', { hasText: '旅費規程' }).last().click();
  await expect(page.locator('.panel mark')).toHaveText('日当：1日 2,500円（2026年4月改定）');

  // 高橋さんは与信限度額の一覧そのものは読めない
  await log.locator('.chip', { hasText: '取引先の与信限度額一覧' }).click();
  await expect(page.locator('.panel')).toContainText('閲覧権限がありません');
  await expect(page.locator('.panel')).not.toContainText('B社：1,500万円');

  // 6. スキル
  await page.getByRole('button', { name: '今日やることを見せて' }).click();
  const panel = page.locator('.panel');
  await expect(panel.getByRole('heading', { name: '今日やること' })).toBeVisible();
  await expect(panel.locator('.card--full')).toHaveCount(6);
  await expect(panel.locator('.card--mini')).toHaveCount(10);
  await page.screenshot({ path: `${screens}/07-dashboard.png` });
  await panel.locator('.card--mini').first().click();
  await expect(page.locator('.popover')).toBeVisible();
  await page.keyboard.press('Escape');
  await panel.locator('.card--full').first().getByRole('button', { name: '完了' }).click();
  await expect(panel.locator('.card--full')).toHaveCount(6);
  await panel.getByRole('button', { name: 'パネルを閉じる' }).click();
  await expect(page.locator('.panel')).toHaveCount(0);

  // すべての入力例を使い終えたら、残るのはスキルだけ
  await expect(page.locator('.composer__chips button')).toHaveCount(1);
});

test('訂正せずに確認した場合と、開示を見送った場合', async ({ page }) => {
  const log = page.getByRole('log');
  await ask(page, /出張の日当/);
  await ask(page, /A社の与信限度額/);
  await switchTo(page, '中村 健太');
  await page.locator('.nav').getByRole('link', { name: /代理対応の記録/ }).click();
  await page.getByRole('button', { name: 'この内容で正しい' }).click();
  await page.getByRole('button', { name: '見せない' }).click();
  await switchTo(page, '高橋 葵');
  await page.getByRole('link', { name: 'AIとの対話' }).click();
  await expect(log.getByText('中村さんが確認しました')).toBeVisible();
  await expect(log.locator('.chip', { hasText: '旅費規程' }).first()).toContainText('確認済み');
  await expect(log.getByText('中村さんが開示を見送りました')).toBeVisible();
  await expect(log.getByText('3,000万円')).toHaveCount(0);
});

test('どの画面サイズでもページ全体はスクロールしない', async ({ page }) => {
  for (const [width, height] of [
    [1920, 1080],
    [1440, 780],
    [1366, 650],
  ]) {
    await page.setViewportSize({ width, height });
    await page.getByRole('button', { name: '今日やることを見せて' }).click();
    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - innerWidth,
      y: document.documentElement.scrollHeight - innerHeight,
      // 入力欄とパネルが、画面の中に収まっていること
      input: document.querySelector('.composer__input')!.getBoundingClientRect().bottom <= innerHeight,
      panel: document.querySelector('.panel')!.getBoundingClientRect().bottom <= innerHeight,
    }));
    expect(overflow, `${width}x${height}`).toEqual({ x: 0, y: 0, input: true, panel: true });
    await page.screenshot({ path: `${screens}/size-${width}x${height}.png` });
  }
});
