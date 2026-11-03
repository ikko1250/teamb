import { expect, test, type Page } from '@playwright/test';

const screens = 'test-results/screens';

async function switchTo(page: Page, name: '高橋 葵' | '中村 健太') {
  await page.locator('.segmented').getByRole('button', { name: new RegExp(name) }).click();
}

async function ask(page: Page, prompt: RegExp) {
  await page.getByRole('button', { name: prompt }).click();
  await expect(page.getByText('ドキュメントを探しています')).toHaveCount(0, { timeout: 5_000 });
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

  // 1. 高橋さんのAIが、高橋さんの読めるドキュメントから答える
  await ask(page, /C社の請求書の発行日/);
  await expect(log.getByText('C社の請求書は、11月6日（金）に発行される予定です。')).toBeVisible();
  await expect(log.getByText('中村さんへの確認は不要でした')).toBeVisible();
  await log.getByRole('button', { name: /請求書の発行予定/ }).click();
  await expect(page.locator('.panel mark')).toHaveText('C社：11月6日（金）');
  await page.screenshot({ path: `${screens}/02-answered-doc.png` });

  // 2. 古いドキュメント：推定で答え、中村さんに確認する
  await ask(page, /出張の日当/);
  await expect(log.locator('.chip', { hasText: '旅費規程' })).toContainText('未確認');
  await expect(log.getByText('ドキュメントが古いため、中村さんに確認します。')).toBeVisible();

  // 3〜5. 中村さんだけのドキュメント、中村さんのメモ、根拠なし：高橋さんの画面ではどれも同じ表示
  await ask(page, /A社の与信限度額/);
  await ask(page, /B社の請求書を2回に分けられるか/);
  await ask(page, /締め日が祝日/);
  const asking = log.locator('.bubble', { has: page.locator('.bubble__head', { hasText: '中村さんに確認します' }) });
  await expect(asking).toHaveCount(3);
  const texts = await asking.evaluateAll((bubbles) =>
    bubbles.map((bubble) =>
      [...bubble.querySelectorAll('p:not(.bubble__label)')].map((element) => element.textContent).join('\n'),
    ),
  );
  expect(new Set(texts).size).toBe(1);
  expect(texts[0]).toContain('返事の目安：今日中');
  // 送った質問は、そのまま見せる
  await expect(asking.locator('.quote')).toHaveText([
    'A社の与信限度額はいくらですか',
    'B社の請求書を2回に分けて発行できますか',
    '経費精算の締め日が祝日の場合、締め日はいつになりますか',
  ]);
  // 中村さんだけが読めるものの中身も、あることも、題名も出さない
  await expect(log).not.toContainText('3,000万円');
  await expect(log).not.toContainText('2回までなら');
  await expect(log).not.toContainText('取引先の与信限度額一覧');
  await expect(log).not.toContainText('電話メモ');
  await expect(log).not.toContainText('しか読めない');
  // 画面に出てくるAIは自分のAIだけ
  await expect(log).not.toContainText('中村さんのAI');
  await expect(page.locator('.nav .badge')).toHaveCount(0);
  await page.screenshot({ path: `${screens}/03-takahashi-waiting.png` });

  // 6. 受け手の視点
  await switchTo(page, '中村 健太');
  await expect(page.locator('.nav .badge')).toHaveText('4');
  await expect(page.getByRole('log')).toContainText('あなたのドキュメントで4件の質問が解決しました');
  await expect(page.getByRole('log')).toContainText('あなたへの確認が4件');
  await expect(page.getByRole('log')).toContainText('うち2件は、あなたのドキュメントやメモから回答案を用意しました');
  await page.getByRole('link', { name: '確認の記録を開く' }).click();
  await expect(page.locator('.pending')).toHaveCount(4);
  await expect(page.locator('.record-row', { hasText: 'C社の請求書の発行日' })).toContainText('「請求書の発行予定（2026年11月）」で解決しました');
  await page.screenshot({ path: `${screens}/04-nakamura-record.png`, fullPage: true });

  // 古いドキュメントを訂正する
  const travel = page.locator('.pending', { hasText: '出張の日当' });
  await travel.getByRole('button', { name: '訂正する' }).click();
  await expect(travel.getByRole('button', { name: '訂正を送る' })).toBeDisabled();
  await travel.getByRole('button', { name: 'デモ用の例文を入れる' }).click();
  await travel.getByRole('button', { name: '訂正を送る' }).click();

  // 中村さんだけのドキュメントから用意した回答案を、そのまま答える
  const credit = page.locator('.pending', { hasText: '与信限度額' });
  await expect(credit).toContainText('根拠：あなたのドキュメント「取引先の与信限度額一覧」');
  await expect(credit.locator('mark')).toHaveText('A社：3,000万円');
  await expect(credit.locator('.quote--draft')).toHaveText('A社の与信限度額は、3,000万円です。');
  await credit.getByRole('button', { name: 'このまま答える' }).click();

  // 中村さんのメモから用意した回答案を、直して答える
  const split = page.locator('.pending', { hasText: 'B社の請求書' });
  await expect(split).toContainText('根拠：あなたのメモ「B社 請求の分割（電話メモ）」');
  await split.getByRole('button', { name: '直して答える' }).click();
  await split.getByRole('textbox').fill('2回までなら分けて発行できます。分ける場合は、発行日の1週間前までに私に連絡してください。');
  await split.getByRole('button', { name: '回答を送る' }).click();

  // 根拠のない質問に答える
  const closing = page.locator('.pending', { hasText: '締め日' });
  await expect(closing.getByRole('button', { name: '回答する' })).toBeDisabled();
  await closing.getByRole('button', { name: 'デモ用の例文を入れる' }).click();
  await closing.getByRole('button', { name: '回答する' }).click();

  await expect(page.locator('.pending')).toHaveCount(0);
  await expect(page.locator('.nav .badge')).toHaveCount(0);
  await expect(page.locator('.record-row', { hasText: 'A社の与信限度額' })).toContainText('回答案のまま回答しました');
  await expect(page.locator('.record-row', { hasText: 'B社の請求書を2回に分けて' })).toContainText('回答案を直して回答しました');
  const created = page.locator('.record-row', { hasText: '経費精算の締め日（祝日の場合）' });
  await expect(created).toContainText('公開範囲：高橋さん、中村さん');
  await created.getByRole('button', { name: '全員に公開する' }).click();
  await expect(created).toContainText('公開範囲：全員');
  await page.screenshot({ path: `${screens}/05-nakamura-done.png`, fullPage: true });

  // 質問者の側に、回答者の回答が届く
  await switchTo(page, '高橋 葵');
  await page.getByRole('link', { name: 'AIとの対話' }).click();
  await expect(log.getByText('中村さんが訂正しました')).toBeVisible();
  await expect(log.getByText('出張の日当は、1日2,500円です（2026年4月改定）。')).toBeVisible();
  await expect(log.getByText('中村さんが回答しました')).toHaveCount(3);
  await expect(log.getByText('A社の与信限度額は、3,000万円です。')).toBeVisible();
  await expect(log.getByText('発行日の1週間前までに私に連絡してください。')).toBeVisible();
  await expect(log.getByText('祝日の場合は、その前の営業日が締め日になります。')).toBeVisible();
  await expect(log.locator('.pill', { hasText: '回答済み' })).toHaveCount(3);
  await page.screenshot({ path: `${screens}/06-takahashi-followups.png` });

  // 訂正はドキュメントにも反映される
  await log.locator('.chip', { hasText: '旅費規程' }).last().click();
  await expect(page.locator('.panel mark')).toHaveText('日当：1日 2,500円（2026年4月改定）');

  // 根拠として見せるのは、中村さんの回答から作ったドキュメント。元の一覧やメモは出さない
  const creditChip = log.locator('.chip', { hasText: 'A社の与信限度額' });
  await expect(creditChip).toContainText('閲覧 高橋さん、中村さん');
  await expect(creditChip).toContainText('担当者が回答');
  await creditChip.click();
  await expect(page.locator('.panel mark')).toHaveText('回答：A社の与信限度額は、3,000万円です。');
  await expect(log).not.toContainText('取引先の与信限度額一覧');
  await expect(log).not.toContainText('電話メモ');
  await expect(log).not.toContainText('中村さんのAI');

  // 7. スキル
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

test('訂正せずに確認した場合と、回答を見送った場合', async ({ page }) => {
  const log = page.getByRole('log');
  await ask(page, /出張の日当/);
  await ask(page, /A社の与信限度額/);
  await switchTo(page, '中村 健太');
  await page.locator('.nav').getByRole('link', { name: /確認の記録/ }).click();
  await page.getByRole('button', { name: 'この内容で正しい' }).click();
  await page.getByRole('button', { name: '答えない' }).click();
  await expect(page.locator('.record-row', { hasText: '与信限度額' })).toContainText('回答を見送りました');
  await switchTo(page, '高橋 葵');
  await page.getByRole('link', { name: 'AIとの対話' }).click();
  await expect(log.getByText('中村さんが確認しました')).toBeVisible();
  await expect(log.locator('.chip', { hasText: '旅費規程' }).first()).toContainText('確認済み');
  await expect(log.getByText('中村さんが回答を見送りました')).toBeVisible();
  await expect(log.getByText('必要なら、中村さんに直接相談してください。')).toBeVisible();
  await expect(log).not.toContainText('3,000万円');
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
