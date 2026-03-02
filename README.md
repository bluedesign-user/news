# 建築ニュース ダッシュボード

建設・建築業界のニュースを RSS から自動収集し、Web ダッシュボードで閲覧できるアプリケーション。

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開く。

## 使い方

### Web ダッシュボード

| パス | 説明 |
|------|------|
| `/` | ニュース一覧（検索・ソート・フィルタ付きテーブル） |
| `/sources` | 媒体別の公式窓口一覧 |
| `/admin` | 管理パネル（手動収集ボタン・統計） |

### CLI でニュース収集

```bash
# 直近14日（デフォルト）
npm run scrape

# 直近30日、記事ページのenrich無し（高速）
npm run scrape -- --days 30 --no-enrich
```

### 自動収集

サーバー起動中は **node-cron** により毎日 **9:00 / 18:00** に自動収集が実行されます。

## 技術スタック

- **Express** + **EJS** — サーバー & テンプレート
- **better-sqlite3** — SQLite データベース（news / sources_contacts テーブル）
- **cheerio** — HTML パース（著者名・サマリ・タグ抽出）
- **xml2js** — RSS XML パース
- **node-cron** — 定時収集スケジューラ
- **DataTables** — クライアントサイドのテーブル検索・ソート・ページング

## プライバシーポリシー

- 記者個人の連絡先（メール・電話・SNS等）は **収集しません**。
- 著者名は「記事に明記された author 情報」のみ保存。
- 媒体窓口は公式お問い合わせページ URL のみ。

## ファイル構成

```
server.js          — Express サーバー + cron
scrape.js          — CLI 収集スクリプト
db.js              — SQLite DB 初期化
lib/
  feeds.js         — RSS フィード設定
  parser.js        — HTML パーサー
  collector.js     — 収集ロジック
  seed.js          — サンプルデータ
views/
  index.ejs        — ニュース一覧
  sources.ejs      — 媒体窓口
  admin.ejs        — 管理パネル
public/
  style.css        — スタイル
```
