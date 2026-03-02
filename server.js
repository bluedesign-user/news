const express = require('express');
const path = require('path');
const cron = require('node-cron');
const { stmts } = require('./db');
const { collectAll } = require('./lib/collector');
const { seedIfEmpty } = require('./lib/seed');

// DB が空ならサンプルデータを投入
seedIfEmpty();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- ページルート ---

app.get('/', (req, res) => {
  const days = parseInt(req.query.days) || 14;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = stmts.getNewsByDays.all({ since: since.toISOString() });
  const sources = [...new Set(rows.map((r) => r.source))].sort();
  const tags = [...new Set(rows.flatMap((r) => r.tags.split(',').map((t) => t.trim())).filter(Boolean))].sort();
  res.render('index', { rows, sources, tags, days });
});

app.get('/sources', (req, res) => {
  const sources = stmts.getSources.all();
  res.render('sources', { sources });
});

app.get('/admin', (req, res) => {
  const stats = stmts.getStats.get();
  res.render('admin', { stats });
});

// --- API ルート ---

app.get('/api/news', (req, res) => {
  const days = parseInt(req.query.days) || 14;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = stmts.getNewsByDays.all({ since: since.toISOString() });
  res.json({ success: true, count: rows.length, data: rows });
});

app.get('/api/sources', (req, res) => {
  const sources = stmts.getSources.all();
  res.json({ success: true, data: sources });
});

let scrapeRunning = false;

app.post('/api/scrape', async (req, res) => {
  if (scrapeRunning) {
    return res.json({ success: false, message: '収集ジョブが実行中です' });
  }
  scrapeRunning = true;
  res.json({ success: true, message: '収集を開始しました' });

  try {
    const stats = await collectAll(14, { enrich: true });
    console.log('手動収集完了:', stats);
  } catch (err) {
    console.error('手動収集エラー:', err);
  } finally {
    scrapeRunning = false;
  }
});

app.get('/api/scrape/status', (req, res) => {
  res.json({ running: scrapeRunning });
});

// --- node-cron: 1日2回 (9:00 / 18:00) ---
cron.schedule('0 9,18 * * *', async () => {
  if (scrapeRunning) return;
  scrapeRunning = true;
  console.log(`[cron] 定時収集開始: ${new Date().toISOString()}`);
  try {
    await collectAll(14, { enrich: true });
  } catch (err) {
    console.error('[cron] 収集エラー:', err);
  } finally {
    scrapeRunning = false;
  }
});

app.listen(PORT, () => {
  console.log(`建築ニュースダッシュボード起動: http://localhost:${PORT}`);
});
