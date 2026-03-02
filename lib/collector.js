const https = require('https');
const http = require('http');
const xml2js = require('xml2js');
const { FEEDS, KNOWN_CONTACTS } = require('./feeds');
const { parseArticlePage, extractSummaryFromDescription, extractSourceFromTitle, cleanTitle } = require('./parser');
const { stmts } = require('../db');

const USER_AGENT = 'Mozilla/5.0 (compatible; ConstructionNewsDashboard/2.0; +https://github.com/)';
const REQUEST_TIMEOUT = 10000;
const RATE_LIMIT_MS = 1500; // 1.5秒待機

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchUrl(url, timeout = REQUEST_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const timer = setTimeout(() => reject(new Error('timeout')), timeout);
    const req = client.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      clearTimeout(timer);
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, timeout).then(resolve).catch(reject);
      }
      if (res.statusCode >= 400) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
    req.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

// RSS XML をパースして記事配列を返す
async function parseRSS(xml) {
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xml);
  const items = result.rss?.channel?.item || [];
  return Array.isArray(items) ? items : [items];
}

// 1つの RSS フィードを取得・処理
async function processFeed(feedConfig, cutoffDate) {
  const articles = [];
  console.log(`  [${feedConfig.name}] フィード取得中...`);

  let xml;
  try {
    xml = await fetchUrl(feedConfig.url);
  } catch (err) {
    console.warn(`  [${feedConfig.name}] 取得失敗: ${err.message}`);
    return articles;
  }

  let items;
  try {
    items = await parseRSS(xml);
  } catch (err) {
    console.warn(`  [${feedConfig.name}] パース失敗: ${err.message}`);
    return articles;
  }

  for (const item of items.slice(0, 20)) {
    const fullTitle = item.title || '';
    const link = item.link || '';
    const pubDate = item.pubDate || '';
    const sourceEl = item.source;
    const source = (typeof sourceEl === 'object' ? sourceEl._ : sourceEl)
      || extractSourceFromTitle(fullTitle)
      || feedConfig.name;
    const descRaw = item.description || '';

    // 日付フィルタ
    if (pubDate && cutoffDate) {
      try {
        const d = new Date(pubDate);
        if (d < cutoffDate) continue;
      } catch { /* ignore */ }
    }

    // キーワードフィルタ（佐賀経済新聞等）
    if (feedConfig.filter && feedConfig.filter.length > 0) {
      const text = (fullTitle + ' ' + descRaw).toLowerCase();
      if (!feedConfig.filter.some((kw) => text.includes(kw))) continue;
    }

    let publishedAt = '';
    if (pubDate) {
      try { publishedAt = new Date(pubDate).toISOString(); } catch { publishedAt = pubDate; }
    }

    articles.push({
      source: typeof source === 'string' ? source : String(source),
      title: cleanTitle(fullTitle),
      url: link,
      published_at: publishedAt,
      author: '',
      summary: extractSummaryFromDescription(descRaw),
      tags: feedConfig.key,
      fetched_at: new Date().toISOString(),
    });
  }

  console.log(`  [${feedConfig.name}] ${articles.length}件の記事を取得`);
  return articles;
}

// 記事ページを取得して著者・サマリ・タグを補完
async function enrichArticle(article) {
  if (!article.url) return article;
  // Google News リダイレクト URL はスキップ
  if (article.url.includes('news.google.com')) return article;

  try {
    const html = await fetchUrl(article.url);
    const meta = parseArticlePage(html);
    if (meta.author) article.author = meta.author;
    if (meta.summary && (!article.summary || article.summary.length < 30)) {
      article.summary = meta.summary;
    }
    if (meta.tags) article.tags = meta.tags;
  } catch (err) {
    // 失敗しても記事自体は保存する
    console.warn(`    enrichment失敗 (${article.url.substring(0, 60)}): ${err.message}`);
  }
  return article;
}

// メイン収集関数
async function collectAll(days = 14, options = {}) {
  const { enrich = true, onProgress } = options;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  console.log(`\n=== ニュース収集開始 (直近${days}日) ===`);
  console.log(`カットオフ: ${cutoffDate.toISOString()}\n`);

  let totalInserted = 0;
  let totalSkipped = 0;
  const sourcesFound = new Set();

  for (const feed of FEEDS) {
    const articles = await processFeed(feed, cutoffDate);

    for (const article of articles) {
      if (!article.url) { totalSkipped++; continue; }

      // 記事ページから著者情報等を補完（enrich有効時、レート制限あり）
      if (enrich && !article.url.includes('news.google.com')) {
        await sleep(RATE_LIMIT_MS);
        await enrichArticle(article);
      }

      try {
        stmts.upsertNews.run(article);
        totalInserted++;
        sourcesFound.add(article.source);
      } catch (err) {
        console.warn(`    DB挿入失敗: ${err.message}`);
        totalSkipped++;
      }
    }

    // 媒体の問い合わせ先を登録
    for (const src of sourcesFound) {
      const contactUrl = KNOWN_CONTACTS[src] || '';
      try {
        stmts.upsertSource.run({
          source: src,
          contact_page_url: contactUrl,
          general_contact: '',
        });
      } catch { /* ignore */ }
    }

    if (onProgress) onProgress({ feed: feed.name, articles: articles.length });
    await sleep(RATE_LIMIT_MS);
  }

  const stats = {
    totalInserted,
    totalSkipped,
    sourcesCount: sourcesFound.size,
    timestamp: new Date().toISOString(),
  };

  console.log(`\n=== 収集完了 ===`);
  console.log(`挿入/更新: ${totalInserted}件, スキップ: ${totalSkipped}件, 媒体数: ${sourcesFound.size}`);

  return stats;
}

module.exports = { collectAll, fetchUrl };
