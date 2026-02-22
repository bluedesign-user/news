// RSS Feed configuration — 佐賀カテゴリを先頭に配置
const RSS_FEEDS = {
  saga_construction: {
    name: '佐賀 建設・建築',
    url: 'https://news.google.com/rss/search?q=佐賀+建設+OR+建築+OR+工事&hl=ja&gl=JP&ceid=JP:ja',
  },
  saga_keizai: {
    name: '佐賀経済新聞（建築・住宅）',
    url: 'https://saga.keizai.biz/rss.xml',
    filter: ['建築', '住宅', '建設', '工事', '施工', '設計', '不動産', '再開発', 'マンション', 'ビル', '店舗', '開業', '着工', '竣工', '改装', '新築', '増築', '解体', 'リフォーム', 'リノベ'],
  },
  saga_news: {
    name: '佐賀新聞',
    url: 'https://www.saga-s.co.jp/list/feed/rss',
  },
  general: {
    name: '建設・建築 総合',
    url: 'https://news.google.com/rss/search?q=建設+OR+建築+ニュース&hl=ja&gl=JP&ceid=JP:ja',
  },
  architecture: {
    name: '建築デザイン',
    url: 'https://news.google.com/rss/search?q=建築+デザイン+設計&hl=ja&gl=JP&ceid=JP:ja',
  },
  construction_tech: {
    name: '建設テクノロジー',
    url: 'https://news.google.com/rss/search?q=建設+DX+BIM+テクノロジー&hl=ja&gl=JP&ceid=JP:ja',
  },
  realestate: {
    name: '不動産・開発',
    url: 'https://news.google.com/rss/search?q=不動産+開発+再開発+建設&hl=ja&gl=JP&ceid=JP:ja',
  },
  infrastructure: {
    name: 'インフラ・土木',
    url: 'https://news.google.com/rss/search?q=インフラ+土木+工事+橋梁&hl=ja&gl=JP&ceid=JP:ja',
  },
};

// CORS proxy for client-side RSS fetching
const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

let allNewsData = {};
let categories = [];
let currentCategory = 'all';

const newsContainer = document.getElementById('news-container');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const categoryNav = document.getElementById('category-nav').querySelector('.nav-inner');

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return '数分前';
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function buildAuthorHtml(article) {
  if (article.reporterName || article.reporterEmail) {
    const parts = [];
    if (article.reporterName) parts.push(`<span class="author-name">${escapeHtml(article.reporterName)}</span>`);
    if (article.reporterEmail) parts.push(`<span class="author-email">${escapeHtml(article.reporterEmail)}</span>`);
    return `<div class="card-author"><span class="author-label">記者:</span> ${parts.join(' / ')}</div>`;
  }
  if (article.authorName || article.authorEmail) {
    const parts = [];
    if (article.authorName) parts.push(`<span class="author-name">${escapeHtml(article.authorName)}</span>`);
    if (article.authorEmail) parts.push(`<span class="author-email">${escapeHtml(article.authorEmail)}</span>`);
    return `<div class="card-author"><span class="author-label">著者:</span> ${parts.join(' / ')}</div>`;
  }
  if (article.source) {
    return `<div class="card-author"><span class="author-label">編集:</span> <span class="author-name">${escapeHtml(article.source)}</span></div>`;
  }
  return '';
}

function createNewsCard(article, cardId) {
  const card = document.createElement('a');
  card.className = 'news-card';
  card.href = article.link;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';
  if (cardId) card.dataset.cardId = cardId;

  card.innerHTML = `
    ${article.source ? `<div class="card-source">${escapeHtml(article.source)}</div>` : ''}
    <div class="card-title">${escapeHtml(article.title)}</div>
    ${article.description ? `<div class="card-summary">${escapeHtml(article.description)}</div>` : ''}
    <div class="card-author-area">${buildAuthorHtml(article)}</div>
    <div class="card-meta">
      <span class="card-date">${formatDate(article.pubDate)}</span>
      <span class="read-more">記事を読む &rarr;</span>
    </div>
  `;

  return card;
}

function extractSourceFromTitle(title) {
  const match = title.match(/\s*-\s*([^-]+)$/);
  return match ? match[1].trim() : '';
}

function cleanTitle(title) {
  return title.replace(/\s*-\s*[^-]+$/, '').trim();
}

function parseAuthor(raw) {
  if (!raw) return { name: '', email: '' };
  const str = raw.trim();
  const match = str.match(/^([^\s@]+@[^\s@]+)\s*\((.+)\)$/);
  if (match) return { email: match[1], name: match[2] };
  if (str.includes('@')) return { email: str, name: '' };
  return { name: str, email: '' };
}

function getElementText(parent, tagName) {
  const el = parent.querySelector(tagName);
  return el?.textContent?.trim() || '';
}

function getElementTextNS(parent, nsPrefix, localName) {
  const el = parent.getElementsByTagName(nsPrefix + ':' + localName)[0];
  return el?.textContent?.trim() || '';
}

function parseRSSXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const items = doc.querySelectorAll('item');

  const channel = doc.querySelector('channel');
  const channelEditor = getElementText(channel, 'managingEditor');
  const channelAuthor = getElementTextNS(channel, 'dc', 'creator');
  const channelFallback = parseAuthor(channelEditor || channelAuthor);

  const articles = [];

  items.forEach((item) => {
    const fullTitle = item.querySelector('title')?.textContent || '';
    const sourceEl = item.querySelector('source');
    const source = sourceEl?.textContent || extractSourceFromTitle(fullTitle);
    const descriptionRaw = item.querySelector('description')?.textContent || '';

    const authorRaw = getElementText(item, 'author')
      || getElementTextNS(item, 'dc', 'creator')
      || '';
    const author = authorRaw ? parseAuthor(authorRaw) : channelFallback;

    articles.push({
      title: cleanTitle(fullTitle),
      link: item.querySelector('link')?.textContent || '',
      pubDate: item.querySelector('pubDate')?.textContent || '',
      source: source,
      description: descriptionRaw.replace(/<[^>]*>/g, '').substring(0, 300),
      authorName: author.name,
      authorEmail: author.email,
      reporterName: '',
      reporterEmail: '',
    });
  });

  return articles.slice(0, 20);
}

// ------------------------------------------------------------------
// サーバーAPI検出（Express/Vercel環境で有効）
// ------------------------------------------------------------------

let serverApiAvailable = null;

async function checkServerApi() {
  if (serverApiAvailable !== null) return serverApiAvailable;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('/api/categories', { signal: controller.signal });
    clearTimeout(tid);
    serverApiAvailable = res.ok;
  } catch {
    serverApiAvailable = false;
  }
  return serverApiAvailable;
}

// サーバーAPI経由で記者情報をバッチ取得
async function fetchReporterBatchFromServer(urls) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 30000);
  const res = await fetch('/api/reporters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
    signal: controller.signal,
  });
  clearTimeout(tid);
  if (!res.ok) throw new Error('Batch API failed');
  const data = await res.json();
  if (!data.success) throw new Error('Batch API error');
  return data.reporters;
}

// ------------------------------------------------------------------
// クライアントサイドフォールバック: Google News URL → 実記事URL
// ------------------------------------------------------------------

function decodeGoogleNewsUrl(gnewsUrl) {
  try {
    const match = gnewsUrl.match(/\/articles\/([A-Za-z0-9_-]+)/);
    if (!match) return null;

    let b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';

    const raw = atob(b64);

    // Strategy 1: 直接 http を検索
    const urlStart = raw.indexOf('http');
    if (urlStart !== -1) {
      let url = '';
      for (let i = urlStart; i < raw.length; i++) {
        const code = raw.charCodeAt(i);
        if (code < 0x20 || code > 0x7e) break;
        url += raw[i];
      }
      if (url.match(/^https?:\/\/.+\..+/)) return url;
    }

    // Strategy 2: protobuf length-prefix scan
    for (let i = 0; i < raw.length - 10; i++) {
      const len = raw.charCodeAt(i);
      if (len > 10 && len < 250 && i + 1 + len <= raw.length) {
        const candidate = raw.substring(i + 1, i + 1 + len);
        if (candidate.match(/^https?:\/\/[^\s]+\.[^\s]+/)) {
          let valid = true;
          for (let j = 0; j < candidate.length; j++) {
            const c = candidate.charCodeAt(j);
            if (c < 0x20 || c > 0x7e) { valid = false; break; }
          }
          if (valid) return candidate;
        }
      }
    }
  } catch { /* decode error */ }
  return null;
}

async function resolveGoogleNewsUrl(gnewsUrl) {
  const decoded = decodeGoogleNewsUrl(gnewsUrl);
  if (decoded) return decoded;

  try {
    const html = await fetchWithProxy(gnewsUrl);
    const linkMatch = html.match(/<a[^>]+href="(https?:\/\/(?!news\.google\.com)[^"]+)"/);
    if (linkMatch) return linkMatch[1];
    const dataMatch = html.match(/data-url="(https?:\/\/[^"]+)"/);
    if (dataMatch) return dataMatch[1];
  } catch { /* fetch error */ }
  return null;
}

// ------------------------------------------------------------------
// クライアントサイド記者情報スクレイピング（GitHub Pages用フォールバック）
// ------------------------------------------------------------------

function extractReporterFromHtml(html) {
  const name = [];
  const email = [];

  const ldMatches = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (ldMatches) {
    for (const block of ldMatches) {
      try {
        const jsonStr = block.replace(/<\/?script[^>]*>/gi, '');
        const ld = JSON.parse(jsonStr);
        const items = Array.isArray(ld) ? ld : [ld];
        for (const item of items) {
          if (item['@type'] === 'NewsArticle' || item['@type'] === 'Article') {
            const authors = Array.isArray(item.author) ? item.author : item.author ? [item.author] : [];
            for (const a of authors) {
              if (typeof a === 'string') { name.push(a); }
              else if (a.name) { name.push(a.name); }
              if (a.email) { email.push(a.email); }
            }
          }
        }
      } catch { /* ignore */ }
    }
  }

  const metaAuthor = html.match(/<meta[^>]+name\s*=\s*["']author["'][^>]+content\s*=\s*["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+name\s*=\s*["']author["']/i);
  if (metaAuthor && metaAuthor[1]) name.push(metaAuthor[1]);

  const metaAA = html.match(/<meta[^>]+property\s*=\s*["']article:author["'][^>]+content\s*=\s*["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+property\s*=\s*["']article:author["']/i);
  if (metaAA && metaAA[1]) name.push(metaAA[1]);

  const bylinePatterns = [
    /class\s*=\s*["'][^"']*(?:byline|author-name|writer|journalist|reporter)[^"']*["'][^>]*>([^<]{2,40})/ig,
    /(?:記者|執筆|文)[：:]?\s*([^\s<]{2,20})/g,
  ];
  for (const re of bylinePatterns) {
    let m;
    while ((m = re.exec(html)) !== null) {
      const candidate = m[1].replace(/<[^>]*>/g, '').trim();
      if (candidate && candidate.length >= 2 && candidate.length <= 30) {
        name.push(candidate);
      }
    }
  }

  const emailRe = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
  let em;
  while ((em = emailRe.exec(html)) !== null) {
    const addr = em[1].toLowerCase();
    if (!/noreply|webmaster|info@|support@|admin@|example\.com/.test(addr)) {
      email.push(em[1]);
    }
  }

  const uniqueNames = [...new Set(name.map((n) => n.trim()).filter(Boolean))];
  const uniqueEmails = [...new Set(email.map((e) => e.trim()).filter(Boolean))];

  return {
    name: uniqueNames.slice(0, 2).join('\u3001') || '',
    email: uniqueEmails.slice(0, 1).join('') || '',
  };
}

// クライアントサイドで1記事ずつ記者情報を取得（CORSプロキシ経由）
async function enrichArticleClientSide(article, cardId) {
  if (!article.link) return;
  try {
    let url = article.link;
    if (url.includes('news.google.com')) {
      const realUrl = await resolveGoogleNewsUrl(url);
      if (!realUrl) return;
      url = realUrl;
      article.resolvedLink = realUrl;
      const cardEl = document.querySelector(`[data-card-id="${cardId}"]`);
      if (cardEl) cardEl.href = realUrl;
    }
    const html = await fetchWithProxy(url);
    const reporter = extractReporterFromHtml(html);
    if (reporter.name || reporter.email) {
      article.reporterName = reporter.name;
      article.reporterEmail = reporter.email;
    }
  } catch { /* ignore */ }
}

// ------------------------------------------------------------------
// カード記者情報の表示更新
// ------------------------------------------------------------------

function showLoadingOnCard(cardId) {
  const cardEl = document.querySelector(`[data-card-id="${cardId}"]`);
  if (cardEl) {
    const authorArea = cardEl.querySelector('.card-author-area');
    if (authorArea) {
      authorArea.innerHTML = '<div class="card-author reporter-loading"><span class="author-label">記者情報を取得中...</span></div>';
    }
  }
}

function updateCardAuthor(cardId, article) {
  const cardEl = document.querySelector(`[data-card-id="${cardId}"]`);
  if (cardEl) {
    const authorArea = cardEl.querySelector('.card-author-area');
    if (authorArea) authorArea.innerHTML = buildAuthorHtml(article);
  }
}

// ------------------------------------------------------------------

async function fetchWithProxy(url) {
  for (const makeProxy of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxy(url);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) continue;
      return await res.text();
    } catch {
      continue;
    }
  }
  throw new Error('All proxies failed');
}

async function fetchFeed(feedKey) {
  const feed = RSS_FEEDS[feedKey];
  if (!feed) return [];

  try {
    const xml = await fetchWithProxy(feed.url);
    let articles = parseRSSXml(xml);

    if (feed.filter && feed.filter.length > 0) {
      articles = articles.filter((a) => {
        const text = (a.title + ' ' + a.description).toLowerCase();
        return feed.filter.some((kw) => text.includes(kw));
      });
    }

    return articles;
  } catch (err) {
    console.warn(`Failed to fetch ${feedKey}:`, err.message);
    return [];
  }
}

// Global card ID counter for DOM updates
let cardIdCounter = 0;

function renderNews(categoryKey) {
  newsContainer.innerHTML = '';
  currentCategory = categoryKey;

  document.querySelectorAll('.cat-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.category === categoryKey);
  });

  const enrichQueue = [];

  if (categoryKey === 'all') {
    for (const cat of categories) {
      const articles = allNewsData[cat.key] || [];
      if (articles.length === 0) continue;

      const section = document.createElement('div');
      section.className = 'category-section';

      const title = document.createElement('h2');
      title.className = 'category-title';
      title.textContent = cat.name;
      section.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'news-grid';

      articles.slice(0, 6).forEach((article) => {
        const cid = 'card-' + (cardIdCounter++);
        grid.appendChild(createNewsCard(article, cid));
        if (!article.reporterName) enrichQueue.push({ article, cid });
      });

      section.appendChild(grid);
      newsContainer.appendChild(section);
    }
  } else {
    const cat = categories.find((c) => c.key === categoryKey);
    const articles = allNewsData[categoryKey] || [];

    if (articles.length === 0) {
      newsContainer.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:2rem;">この分野のニュースはありません</p>';
      return;
    }

    const section = document.createElement('div');
    section.className = 'category-section';

    const title = document.createElement('h2');
    title.className = 'category-title';
    title.textContent = cat ? cat.name : categoryKey;
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'news-grid';

    articles.forEach((article) => {
      const cid = 'card-' + (cardIdCounter++);
      grid.appendChild(createNewsCard(article, cid));
      if (!article.reporterName) enrichQueue.push({ article, cid });
    });

    section.appendChild(grid);
    newsContainer.appendChild(section);
  }

  // Enrich cards with reporter info in background (3 at a time)
  enrichCardsInBackground(enrichQueue);
}

async function enrichCardsInBackground(queue) {
  if (queue.length === 0) return;

  // ローディング表示を全カードに出す
  for (const { cid } of queue) {
    showLoadingOnCard(cid);
  }

  const hasServer = await checkServerApi();

  if (hasServer) {
    // サーバーAPI経由: バッチ10件ずつ
    const BATCH = 10;
    for (let i = 0; i < queue.length; i += BATCH) {
      const batch = queue.slice(i, i + BATCH);
      try {
        const urls = batch.map(({ article }) => article.link);
        const reporters = await fetchReporterBatchFromServer(urls);
        reporters.forEach((info, idx) => {
          const { article, cid } = batch[idx];
          if (info.name || info.email) {
            article.reporterName = info.name;
            article.reporterEmail = info.email;
          }
          if (info.resolvedUrl) {
            article.resolvedLink = info.resolvedUrl;
            const cardEl = document.querySelector(`[data-card-id="${cid}"]`);
            if (cardEl) cardEl.href = info.resolvedUrl;
          }
          updateCardAuthor(cid, article);
        });
      } catch {
        // サーバー失敗 → クライアントサイドフォールバック
        for (const { article, cid } of batch) {
          await enrichArticleClientSide(article, cid);
          updateCardAuthor(cid, article);
        }
      }
    }
  } else {
    // GitHub Pages等: CORSプロキシ経由で3件ずつ
    const BATCH = 3;
    for (let i = 0; i < queue.length; i += BATCH) {
      const batch = queue.slice(i, i + BATCH);
      await Promise.all(batch.map(async ({ article, cid }) => {
        await enrichArticleClientSide(article, cid);
        updateCardAuthor(cid, article);
      }));
    }
  }
}

function setupCategoryNav() {
  categoryNav.innerHTML = '<button class="cat-btn active" data-category="all">すべて</button>';

  categories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.dataset.category = cat.key;
    btn.textContent = cat.name;
    categoryNav.appendChild(btn);
  });

  categoryNav.querySelectorAll('.cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      renderNews(btn.dataset.category);
    });
  });
}

async function loadAllNews() {
  loadingEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  newsContainer.innerHTML = '';

  try {
    categories = Object.entries(RSS_FEEDS).map(([key, feed]) => ({
      key,
      name: feed.name,
    }));

    setupCategoryNav();

    const feedKeys = Object.keys(RSS_FEEDS);
    const results = await Promise.all(feedKeys.map((key) => fetchFeed(key)));

    feedKeys.forEach((key, i) => {
      allNewsData[key] = results[i];
    });

    const totalArticles = Object.values(allNewsData).reduce((sum, arr) => sum + arr.length, 0);

    renderNews('all');
    loadingEl.classList.add('hidden');

    if (totalArticles === 0) {
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error loading news:', err);
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
  }
}

// Auto-refresh every 10 minutes
setInterval(loadAllNews, 10 * 60 * 1000);

// Initial load
loadAllNews();
