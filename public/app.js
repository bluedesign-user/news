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

function createNewsCard(article) {
  const card = document.createElement('a');
  card.className = 'news-card';
  card.href = article.link;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';

  card.innerHTML = `
    ${article.source ? `<div class="card-source">${escapeHtml(article.source)}</div>` : ''}
    <div class="card-title">${escapeHtml(article.title)}</div>
    ${article.description ? `<div class="card-description">${escapeHtml(article.description)}</div>` : ''}
    <div class="card-meta">
      <span class="card-date">${formatDate(article.pubDate)}</span>
      <span class="read-more">記事を読む &rarr;</span>
    </div>
  `;

  return card;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderNews(categoryKey) {
  newsContainer.innerHTML = '';
  currentCategory = categoryKey;

  // Update active button
  document.querySelectorAll('.cat-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.category === categoryKey);
  });

  if (categoryKey === 'all') {
    // Show all categories
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
    // Show single category
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
  // Clear existing buttons except "all"
  categoryNav.innerHTML = '<button class="cat-btn active" data-category="all">すべて</button>';

  categories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.dataset.category = cat.key;
    btn.textContent = cat.name;
    categoryNav.appendChild(btn);
  });

  // Add click handlers
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
    // Fetch categories and news in parallel
    const [catRes, newsRes] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/news'),
    ]);

    categories = await catRes.json();
    const newsData = await newsRes.json();

    if (!newsData.success) throw new Error('Failed to fetch news');

    allNewsData = newsData.articles;

    setupCategoryNav();
    renderNews('all');

    loadingEl.classList.add('hidden');

    // Show banner if using sample data
    if (!newsData.live) {
      const banner = document.createElement('div');
      banner.className = 'sample-banner';
      banner.textContent = 'ライブフィードに接続できないため、サンプルデータを表示しています。インターネット接続時は最新ニュースが自動取得されます。';
      newsContainer.prepend(banner);
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
