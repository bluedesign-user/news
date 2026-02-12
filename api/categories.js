const { RSS_FEEDS } = require('../lib/news');

module.exports = (req, res) => {
  const categories = Object.entries(RSS_FEEDS).map(([key, feed]) => ({
    key,
    name: feed.name,
  }));
  res.json(categories);
};
