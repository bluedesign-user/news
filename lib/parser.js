const cheerio = require('cheerio');

// 記事ページ HTML から著者名・サマリ・タグを抽出
// 注意: 著者は「ページに明記がある場合のみ」。個人連絡先は収集しない。
function parseArticlePage(html) {
  const result = { author: '', summary: '', tags: '' };
  if (!html) return result;

  const $ = cheerio.load(html);

  // --- 著者 (author) ---
  // 1) JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    if (result.author) return;
    try {
      const ld = JSON.parse($(el).html());
      const items = Array.isArray(ld) ? ld : [ld];
      for (const item of items) {
        if (item['@type'] === 'NewsArticle' || item['@type'] === 'Article') {
          const authors = Array.isArray(item.author) ? item.author : item.author ? [item.author] : [];
          const names = authors
            .map((a) => (typeof a === 'string' ? a : a.name || ''))
            .filter(Boolean);
          if (names.length > 0) {
            result.author = names.slice(0, 2).join('、');
            return;
          }
        }
      }
    } catch { /* ignore */ }
  });

  // 2) <meta name="author">
  if (!result.author) {
    const meta = $('meta[name="author"]').attr('content')
      || $('meta[property="article:author"]').attr('content');
    if (meta && meta.trim()) result.author = meta.trim();
  }

  // 3) byline class
  if (!result.author) {
    const bylineSelectors = [
      '.byline', '.author-name', '.article-author', '.writer',
      '[class*="byline"]', '[class*="author"]',
    ];
    for (const sel of bylineSelectors) {
      const text = $(sel).first().text().trim();
      if (text && text.length >= 2 && text.length <= 40) {
        result.author = text.replace(/^(記者|執筆|文|著者)[：:]\s*/, '');
        break;
      }
    }
  }

  // --- サマリ (summary) ---
  // 1) meta description
  const metaDesc = $('meta[name="description"]').attr('content')
    || $('meta[property="og:description"]').attr('content');
  if (metaDesc && metaDesc.trim()) {
    result.summary = metaDesc.trim().substring(0, 300);
  }

  // 2) JSON-LD description
  if (!result.summary) {
    $('script[type="application/ld+json"]').each((_, el) => {
      if (result.summary) return;
      try {
        const ld = JSON.parse($(el).html());
        const items = Array.isArray(ld) ? ld : [ld];
        for (const item of items) {
          if (item.description) {
            result.summary = item.description.substring(0, 300);
            return;
          }
        }
      } catch { /* ignore */ }
    });
  }

  // --- タグ (tags) ---
  // 1) meta keywords
  const keywords = $('meta[name="keywords"]').attr('content');
  if (keywords && keywords.trim()) {
    result.tags = keywords.trim().substring(0, 200);
  }

  // 2) JSON-LD keywords
  if (!result.tags) {
    $('script[type="application/ld+json"]').each((_, el) => {
      if (result.tags) return;
      try {
        const ld = JSON.parse($(el).html());
        const items = Array.isArray(ld) ? ld : [ld];
        for (const item of items) {
          if (item.keywords) {
            const kw = Array.isArray(item.keywords) ? item.keywords.join(',') : item.keywords;
            result.tags = kw.substring(0, 200);
            return;
          }
        }
      } catch { /* ignore */ }
    });
  }

  return result;
}

// RSS description から plain text サマリを生成
function extractSummaryFromDescription(desc) {
  if (!desc) return '';
  // HTML タグ除去
  const text = desc.replace(/<[^>]*>/g, '').trim();
  return text.substring(0, 300);
}

// タイトルから媒体名を分離（Google News 形式: "タイトル - 媒体名"）
function extractSourceFromTitle(title) {
  const match = title.match(/\s+-\s+([^-]+)$/);
  return match ? match[1].trim() : '';
}

function cleanTitle(title) {
  return title.replace(/\s+-\s+[^-]+$/, '').trim();
}

module.exports = { parseArticlePage, extractSummaryFromDescription, extractSourceFromTitle, cleanTitle };
