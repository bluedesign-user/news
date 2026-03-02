const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'news.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS news (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source      TEXT NOT NULL,
    title       TEXT NOT NULL,
    url         TEXT NOT NULL UNIQUE,
    published_at TEXT,
    author      TEXT DEFAULT '',
    summary     TEXT DEFAULT '',
    tags        TEXT DEFAULT '',
    fetched_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sources_contacts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    source           TEXT NOT NULL UNIQUE,
    contact_page_url TEXT DEFAULT '',
    general_contact  TEXT DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_news_source ON news(source);
`);

const stmts = {
  upsertNews: db.prepare(`
    INSERT INTO news (source, title, url, published_at, author, summary, tags, fetched_at)
    VALUES (@source, @title, @url, @published_at, @author, @summary, @tags, @fetched_at)
    ON CONFLICT(url) DO UPDATE SET
      title = excluded.title,
      author = CASE WHEN excluded.author != '' THEN excluded.author ELSE news.author END,
      summary = CASE WHEN excluded.summary != '' THEN excluded.summary ELSE news.summary END,
      tags = CASE WHEN excluded.tags != '' THEN excluded.tags ELSE news.tags END,
      fetched_at = excluded.fetched_at
  `),

  upsertSource: db.prepare(`
    INSERT INTO sources_contacts (source, contact_page_url, general_contact)
    VALUES (@source, @contact_page_url, @general_contact)
    ON CONFLICT(source) DO UPDATE SET
      contact_page_url = CASE WHEN excluded.contact_page_url != '' THEN excluded.contact_page_url ELSE sources_contacts.contact_page_url END,
      general_contact = CASE WHEN excluded.general_contact != '' THEN excluded.general_contact ELSE sources_contacts.general_contact END
  `),

  getNews: db.prepare(`
    SELECT n.*, sc.contact_page_url
    FROM news n
    LEFT JOIN sources_contacts sc ON n.source = sc.source
    ORDER BY n.published_at DESC
  `),

  getNewsByDays: db.prepare(`
    SELECT n.*, sc.contact_page_url
    FROM news n
    LEFT JOIN sources_contacts sc ON n.source = sc.source
    WHERE n.published_at >= @since
    ORDER BY n.published_at DESC
  `),

  getSources: db.prepare(`SELECT * FROM sources_contacts ORDER BY source`),

  getStats: db.prepare(`
    SELECT COUNT(*) as total,
           COUNT(DISTINCT source) as sources,
           MIN(published_at) as oldest,
           MAX(published_at) as newest
    FROM news
  `),
};

module.exports = { db, stmts, DB_PATH };
