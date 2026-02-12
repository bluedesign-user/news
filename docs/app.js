// RSS Feed configuration
const RSS_FEEDS = {
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

function createNewsCard(article) {
  const card = document.createElement('a');
  card.className = 'news-card';
  card.href = article.link;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';

  // Build author/editor info HTML
  let authorHtml = '';
  if (article.authorName || article.authorEmail) {
    const parts = [];
    if (article.authorName) parts.push(`<span class="author-name">${escapeHtml(article.authorName)}</span>`);
    if (article.authorEmail) parts.push(`<span class="author-email">${escapeHtml(article.authorEmail)}</span>`);
    authorHtml = `<div class="card-author"><span class="author-label">著者:</span> ${parts.join(' / ')}</div>`;
  } else if (article.source) {
    authorHtml = `<div class="card-author"><span class="author-label">編集:</span> <span class="author-name">${escapeHtml(article.source)}</span></div>`;
  }

  card.innerHTML = `
    ${article.source ? `<div class="card-source">${escapeHtml(article.source)}</div>` : ''}
    <div class="card-title">${escapeHtml(article.title)}</div>
    ${article.description ? `<div class="card-summary">${escapeHtml(article.description)}</div>` : ''}
    ${authorHtml}
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

// Parse author string "email (name)" or just "name" or "email"
function parseAuthor(raw) {
  if (!raw) return { name: '', email: '' };
  const str = raw.trim();
  // RSS spec format: "email (Name)"
  const match = str.match(/^([^\s@]+@[^\s@]+)\s*\((.+)\)$/);
  if (match) return { email: match[1], name: match[2] };
  // Just email
  if (str.includes('@')) return { email: str, name: '' };
  // Just name
  return { name: str, email: '' };
}

function getElementText(parent, tagName) {
  const el = parent.querySelector(tagName);
  return el?.textContent?.trim() || '';
}

function getElementTextNS(parent, nsPrefix, localName) {
  // Try namespace-aware lookup for dc:creator etc.
  const el = parent.getElementsByTagName(nsPrefix + ':' + localName)[0];
  return el?.textContent?.trim() || '';
}

function parseRSSXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const items = doc.querySelectorAll('item');

  // Channel-level author info as fallback
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

    // Author: try <author>, <dc:creator>, then channel-level fallback
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
    });
  });

  return articles.slice(0, 20);
}

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

    // Keyword filtering (e.g. saga_keizai: only construction/housing related)
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

function renderNews(categoryKey) {
  newsContainer.innerHTML = '';
  currentCategory = categoryKey;

  document.querySelectorAll('.cat-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.category === categoryKey);
  });

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
        grid.appendChild(createNewsCard(article));
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
      grid.appendChild(createNewsCard(article));
    });

    section.appendChild(grid);
    newsContainer.appendChild(section);
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

    // Fetch all feeds in parallel
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
