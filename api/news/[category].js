const { fetchRSS } = require('../../lib/news');

module.exports = async (req, res) => {
  const { category } = req.query;
  try {
    const { articles, live } = await fetchRSS(category);
    res.json({ success: true, articles, live });
  } catch (err) {
    console.error(`Error fetching ${category}:`, err.message);
    res.status(500).json({ success: false, error: 'ニュースの取得に失敗しました' });
  }
};
