const { fetchReporterInfo } = require('../lib/news');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { urls } = req.body || {};
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
    return res.json({ success: true, reporters: data });
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, error: 'url parameter required' });
  }
  try {
    const info = await fetchReporterInfo(url);
    res.json({ success: true, ...info });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch reporter info' });
  }
};
