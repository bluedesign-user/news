const express = require('express');
const path = require('path');
const { RSS_FEEDS, SAMPLE_DATA, fetchRSS, fetchReporterInfo } = require('./lib/news');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/categories', (req, res) => {
  const categories = Object.entries(RSS_FEEDS).map(([key, feed]) => ({
    key,
    name: feed.name,
  }));
  res.json(categories);
});

app.get('/api/news/:category', async (req, res) => {
  try {
    const { articles, live } = await fetchRSS(req.params.category);
    res.json({ success: true, articles, live });
  } catch (err) {
    console.error(`Error fetching ${req.params.category}:`, err.message);
    res.status(500).json({ success: false, error: 'ニュースの取得に失敗しました' });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const allArticles = {};
    let anyLive = false;
    const promises = Object.keys(RSS_FEEDS).map(async (key) => {
      try {
        const { articles, live } = await fetchRSS(key);
        allArticles[key] = articles;
        if (live) anyLive = true;
      } catch (err) {
        console.error(`Error fetching ${key}:`, err.message);
        allArticles[key] = SAMPLE_DATA[key] || [];
      }
    });
    await Promise.all(promises);
    res.json({ success: true, categories: RSS_FEEDS, articles: allArticles, live: anyLive });
  } catch (err) {
    res.status(500).json({ success: false, error: 'ニュースの取得に失敗しました' });
  }
});

// 記者情報取得API（単一）
app.get('/api/reporter', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, error: 'url parameter required' });
  }
  try {
    const info = await fetchReporterInfo(url);
    res.json({ success: true, ...info });
  } catch (err) {
    console.error('Reporter fetch error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch reporter info' });
  }
});

// 記者情報取得API（バッチ）
app.post('/api/reporters', express.json(), async (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ success: false, error: 'urls array required' });
  }
  const limited = urls.slice(0, 10);
  const results = await Promise.allSettled(
    limited.map((url) => fetchReporterInfo(url))
  );
  const data = limited.map((url, i) => ({
    url,
    ...(results[i].status === 'fulfilled' ? results[i].value : { name: '', email: '', resolvedUrl: null }),
  }));
  res.json({ success: true, reporters: data });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`建築ニュースアプリ起動: http://localhost:${PORT}`);
});
