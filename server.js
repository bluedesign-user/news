const express = require('express');
const path = require('path');
const { RSS_FEEDS, SAMPLE_DATA, fetchRSS } = require('./lib/news');

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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`建築ニュースアプリ起動: http://localhost:${PORT}`);
});
