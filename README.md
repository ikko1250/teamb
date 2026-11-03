# teamb

社内の人と人のやり取りを、一人ひとりのAIが代わりに担うコミュニケーションアプリのモックです。フロントエンドのみで、AIの応答とデータはすべて用意したダミーです。

- 設計書: Jira NNJT-5
- 公開ページ: https://ikko1250.github.io/teamb/

## 起動

```sh
npm install
npm run dev
```

ヘッダーの「表示する人」で、質問する高橋さんと、回答する中村さんの画面を切り替えられます。

## テスト

```sh
npx playwright install chromium   # 初回のみ
npm run test:e2e
```

ビルドしたアプリをブラウザで操作し、デモの流れを確認します。スクリーンショットは `test-results/screens/` に保存されます。

## ビルド

```sh
npm run build
```

`main` にプッシュすると、GitHub Actions（`.github/workflows/deploy.yml`）がビルドして GitHub Pages に公開します。パスを相対にしているので、リポジトリ名に合わせた設定は不要です。

## デモのデータ

`src/data/demo.json` を編集します。公開ページには誰でもアクセスできるので、実在の社内情報は入れないでください。
