const { RSS_FEEDS, SAMPLE_DATA, fetchRSS } = require('../../lib/news');

module.exports = async (req, res) => {
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
};
