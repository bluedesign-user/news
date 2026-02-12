const https = require('https');
const http = require('http');
const xml2js = require('xml2js');

const RSS_FEEDS = {
  general: {
    name: '建設・建築 総合',
    url: 'https://news.google.com/rss/search?q=建設+OR+建築+ニュース&hl=ja&gl=JP&ceid=JP:ja',
  },
  architecture: {
    name: '建築デザイン',
    url: 'https://news.google.com/rss/search?q=建築+デザイン+設計&hl=ja&gl=JP&ceid=JP:ja',
  },
  construction_tech: {
    name: '建設テクノロジー',
    url: 'https://news.google.com/rss/search?q=建設+DX+BIM+テクノロジー&hl=ja&gl=JP&ceid=JP:ja',
  },
  realestate: {
    name: '不動産・開発',
    url: 'https://news.google.com/rss/search?q=不動産+開発+再開発+建設&hl=ja&gl=JP&ceid=JP:ja',
  },
  infrastructure: {
    name: 'インフラ・土木',
    url: 'https://news.google.com/rss/search?q=インフラ+土木+工事+橋梁&hl=ja&gl=JP&ceid=JP:ja',
  },
  saga_construction: {
    name: '佐賀 建設・建築',
    url: 'https://news.google.com/rss/search?q=佐賀+建設+OR+建築+OR+工事&hl=ja&gl=JP&ceid=JP:ja',
  },
  saga_keizai: {
    name: '佐賀経済新聞',
    url: 'https://saga.keizai.biz/rss.xml',
  },
  saga_news: {
    name: '佐賀新聞',
    url: 'https://www.saga-s.co.jp/list/feed/rss',
  },
};

const SAMPLE_DATA = {
  general: [
    { title: '清水建設、26年3月期予想を大幅上方修正 5期ぶり営業利益1千億円超の見通し', link: 'https://www.decn.co.jp/', pubDate: 'Mon, 10 Feb 2026 07:00:00 GMT', source: '日刊建設工業新聞', description: '清水建設は2026年3月期の業績予想を上方修正し、営業利益が5期ぶりに1千億円を超える見通しとなった。大型建築工事の利益率改善が寄与。' },
    { title: '「令和の建設費高騰」で相次ぐ工事断念、発注者の我慢はもう限界？', link: 'https://www.nikkei.com/', pubDate: 'Sat, 08 Feb 2026 20:00:00 GMT', source: '日本経済新聞', description: '建設費の高騰が続き、各地で公共工事や民間開発の中止・延期が相次いでいる。資材価格と人件費の上昇に歯止めがかからない状況。' },
    { title: '大型工事「26年度受注できず」建設会社の7割 成長投資阻む人手不足', link: 'https://www.nikkei.com/', pubDate: 'Fri, 07 Feb 2026 10:00:00 GMT', source: '日本経済新聞', description: '建設会社の約7割が2026年度の大型工事について受注困難と回答。深刻な人手不足が成長投資を阻む要因に。' },
    { title: '国交省、夏季休工の試行を26年夏から開始へ 建設業の働き方改革', link: 'https://www.mlit.go.jp/', pubDate: 'Thu, 06 Feb 2026 09:00:00 GMT', source: '建設通信新聞', description: '国土交通省は2026年夏から7月下旬〜8月中旬の夏季休工を試行する方針を発表。建設業の働き方改革の一環。' },
    { title: '建設業の倒産件数が前年比15%増 資材高と人手不足が中小企業を直撃', link: 'https://www.tsr-net.co.jp/', pubDate: 'Wed, 05 Feb 2026 08:00:00 GMT', source: '東京商工リサーチ', description: '2025年の建設業倒産件数が前年比15%増加。資材価格の高騰と深刻な人手不足が中小建設企業の経営を圧迫。' },
    { title: '【建築九州賞】「佐仁の家」など6作品受賞', link: 'https://www.kensetsunews.com/', pubDate: 'Mon, 10 Feb 2026 07:00:46 GMT', source: '建設通信新聞', description: '日本建築学会九州支部は建築九州賞を発表。「佐仁の家」など6作品が受賞した。地域に根差した建築デザインが評価された。' },
  ],
  architecture: [
    { title: '安井建築設計事務所、BIMモデルから省エネ計算情報を高精度取得する技術開発', link: 'https://www.decn.co.jp/', pubDate: 'Mon, 10 Feb 2026 06:00:00 GMT', source: '日刊建設工業新聞', description: 'BIMモデルから建築物の省エネルギー計算に必要な情報を自動的に高精度で取得する技術を開発。設計業務の効率化に期待。' },
    { title: '隈研吾氏も参画の北海道八雲町新庁舎計画が白紙へ 鉄骨加工費高騰で', link: 'https://xtech.nikkei.com/', pubDate: 'Sun, 09 Feb 2026 05:00:00 GMT', source: '日経クロステック', description: '建築家・隈研吾氏が参画していた北海道八雲町の新庁舎建設計画が白紙撤回に。鉄骨加工費の高騰が主な要因。' },
    { title: '1級建築士「学科試験」のデジタル化試行が2026年度から開始', link: 'https://xtech.nikkei.com/', pubDate: 'Sat, 08 Feb 2026 03:00:00 GMT', source: '日経クロステック', description: '1級建築士の学科試験がデジタル化される。2026年度から試行開始し、受験環境の改善と採点の効率化を目指す。' },
    { title: '新国立競技場の設計思想を超える？ 2026年注目の建築プロジェクト10選', link: 'https://xtech.nikkei.com/', pubDate: 'Fri, 07 Feb 2026 08:00:00 GMT', source: '日経アーキテクチュア', description: '2026年に完成予定の注目建築プロジェクトを紹介。環境配慮型設計や木造ハイブリッド構造など先進的な取り組みが目立つ。' },
    { title: '木造建築の可能性を広げる CLT活用の大規模建築が全国で増加', link: 'https://www.kensetsunews.com/', pubDate: 'Thu, 06 Feb 2026 07:00:00 GMT', source: '建設通信新聞', description: 'CLT（直交集成板）を活用した大規模木造建築が全国で増加。カーボンニュートラル実現に向けた取り組みが加速。' },
  ],
  construction_tech: [
    { title: 'AIエージェントが建設現場を変える 自動施工管理の最前線', link: 'https://xtech.nikkei.com/', pubDate: 'Mon, 10 Feb 2026 05:00:00 GMT', source: '日経クロステック', description: 'AI技術を活用した自動施工管理システムが建設現場で本格導入。作業進捗の自動把握と品質管理の高度化を実現。' },
    { title: 'BIM確認申請が2026年度から一部義務化 建築DXの新時代へ', link: 'https://www.mlit.go.jp/', pubDate: 'Sun, 09 Feb 2026 04:00:00 GMT', source: '国土交通省', description: '建築確認申請におけるBIMモデルの活用が2026年度から一部で義務化。設計・施工・維持管理の一体化が進む。' },
    { title: '建設ロボット市場が急拡大 2030年には5,000億円規模に', link: 'https://www.nikkei.com/', pubDate: 'Sat, 08 Feb 2026 06:00:00 GMT', source: '日本経済新聞', description: '人手不足を背景に建設ロボットの需要が急増。溶接、墨出し、測量など多様な工程でロボット活用が進む。' },
    { title: 'ドローン測量が標準に 国交省が新たなガイドライン策定', link: 'https://www.decn.co.jp/', pubDate: 'Fri, 07 Feb 2026 07:00:00 GMT', source: '日刊建設工業新聞', description: '国土交通省がドローンを活用した測量のガイドラインを改定。精度向上と運用効率化に向けた新基準を策定。' },
    { title: '3Dプリンター住宅が日本でも本格化 24時間で建設可能な時代へ', link: 'https://www.nikkei.com/', pubDate: 'Thu, 06 Feb 2026 08:00:00 GMT', source: '日本経済新聞', description: '3Dプリンターを活用した住宅建設が日本でも商用化段階に。従来工法と比べ工期を大幅に短縮できる点が注目を集める。' },
  ],
  realestate: [
    { title: '東京都心の再開発ラッシュ続く 2026年の注目プロジェクト', link: 'https://www.nikkei.com/', pubDate: 'Mon, 10 Feb 2026 08:00:00 GMT', source: '日本経済新聞', description: '東京都心部で大規模再開発プロジェクトが相次いで進行中。オフィス・商業・住宅の複合開発が主流に。' },
    { title: 'マンション価格、首都圏で平均1億円突破 建設費高騰が反映', link: 'https://www.nikkei.com/', pubDate: 'Sun, 09 Feb 2026 06:00:00 GMT', source: '日本経済新聞', description: '首都圏の新築マンション平均価格が初めて1億円を突破。建設費の高騰と用地費の上昇が主な要因。' },
    { title: '大阪・関西万博関連の再開発が加速 夢洲周辺の変貌', link: 'https://www.constnews.com/', pubDate: 'Sat, 08 Feb 2026 05:00:00 GMT', source: '建設ニュース', description: '2025年大阪・関西万博を契機とした周辺地域の再開発が加速。IRリゾートを含む大規模開発計画が進行中。' },
    { title: '地方都市で進むコンパクトシティ構想 中心市街地の建設ラッシュ', link: 'https://www.kensetsunews.com/', pubDate: 'Fri, 07 Feb 2026 06:00:00 GMT', source: '建設通信新聞', description: '人口減少に対応するコンパクトシティ構想のもと、地方都市の中心部で再開発・建設プロジェクトが活発化。' },
    { title: 'データセンター建設需要が急増 AI時代のインフラ投資', link: 'https://xtech.nikkei.com/', pubDate: 'Thu, 06 Feb 2026 04:00:00 GMT', source: '日経クロステック', description: 'AI・クラウド需要の拡大に伴い、国内のデータセンター建設需要が急増。大型施設の建設計画が全国で進行。' },
  ],
  infrastructure: [
    { title: '国土強靱化、5年で20兆円超の公共投資 地震対策が柱', link: 'https://www.nikkei.com/', pubDate: 'Mon, 10 Feb 2026 04:00:00 GMT', source: '日本経済新聞', description: '政府の国土強靱化計画に基づき、2026年から5年間で20兆円超の公共投資が計画。地震対策と老朽インフラ更新が中心。' },
    { title: '高速道路の大規模更新・修繕事業が本格化 NEXCO3社の計画', link: 'https://www.decn.co.jp/', pubDate: 'Sun, 09 Feb 2026 07:00:00 GMT', source: '日刊建設工業新聞', description: '高速道路の老朽化対策として、NEXCO3社による大規模更新・修繕事業が2026年度から本格化。総事業費は数兆円規模。' },
    { title: 'リニア中央新幹線、静岡工区の工事進捗と2034年開業への課題', link: 'https://www.nikkei.com/', pubDate: 'Sat, 08 Feb 2026 04:00:00 GMT', source: '日本経済新聞', description: 'リニア中央新幹線の建設が各地で進行中。静岡工区の進捗状況と2034年の開業目標に向けた課題を整理。' },
    { title: '橋梁の老朽化対策が急務 全国で6万橋が要修繕', link: 'https://www.mlit.go.jp/', pubDate: 'Fri, 07 Feb 2026 05:00:00 GMT', source: '国土交通省', description: '全国の橋梁約73万橋のうち、約6万橋が早期に修繕が必要と判定。維持管理技術者の確保も課題に。' },
    { title: '上下水道の更新投資、年間2兆円規模が必要に 老朽管路の対策急務', link: 'https://www.decn.co.jp/', pubDate: 'Thu, 06 Feb 2026 06:00:00 GMT', source: '日刊建設工業新聞', description: '全国の上下水道施設の老朽化が進み、年間2兆円規模の更新投資が必要との試算。管路の耐震化も急務。' },
  ],
  saga_construction: [
    { title: '建築工事の田中建設（唐津市）が破産開始手続き決定 負債額は約7600万円', link: 'https://www.saga-s.co.jp/', pubDate: 'Mon, 09 Feb 2026 10:54:00 GMT', source: '佐賀新聞', description: '唐津市の建築工事業・田中建設が破産開始手続き決定を受けた。負債額は約7600万円。建設費高騰と受注減少が影響。' },
    { title: 'SAGAサンライズパークにBCS賞 日本建設業連合会が優良建築物を表彰', link: 'https://www.saga-s.co.jp/', pubDate: 'Sat, 29 Nov 2025 08:00:00 GMT', source: '佐賀新聞', description: '「する・観る・支える」をデザインコンセプトとしたSAGAサンライズパークが、日本建設業連合会のBCS賞を受賞。' },
    { title: 'アサヒビール鳥栖新工場、26年7月着工へ 29年1月操業開始目指す', link: 'https://www.saga-s.co.jp/', pubDate: 'Thu, 06 Feb 2026 05:00:00 GMT', source: '佐賀新聞', description: 'アサヒビール博多工場の鳥栖市への移転計画で、2026年7月に新工場建設に着手し、29年1月の操業開始を目指す。' },
    { title: '西九州新幹線の残存工事が本年度中に完了見通し', link: 'https://www.saga-s.co.jp/', pubDate: 'Wed, 05 Feb 2026 06:00:00 GMT', source: '佐賀新聞', description: '西九州新幹線（武雄温泉―長崎）の残存工事が本年度中に完了する見通しとなった。全線開業に向けた課題は依然として残る。' },
  ],
  saga_keizai: [
    { title: '川副に「居酒屋まっちゃん」 昼定食はご飯・みそ汁などを食べ放題で', link: 'https://saga.keizai.biz/headline/2247/', pubDate: 'Tue, 10 Feb 2026 23:56:45 GMT', source: '佐賀経済新聞', description: '「居酒屋まっちゃん」が佐賀市川副町にオープン。昼の定食メニューではご飯・みそ汁などが食べ放題。' },
  ],
  saga_news: [],
};

const cache = {};
const CACHE_DURATION = 10 * 60 * 1000;

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => reject(new Error('Request timeout')), 5000);
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConstructionNewsApp/1.0)' } }, (res) => {
      clearTimeout(timeout);
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function parseAuthor(raw) {
  if (!raw) return { name: '', email: '' };
  const str = raw.trim();
  const match = str.match(/^([^\s@]+@[^\s@]+)\s*\((.+)\)$/);
  if (match) return { email: match[1], name: match[2] };
  if (str.includes('@')) return { email: str, name: '' };
  return { name: str, email: '' };
}

function extractSourceFromTitle(title) {
  const match = title.match(/\s*-\s*([^-]+)$/);
  return match ? match[1].trim() : '';
}

function cleanTitle(title) {
  return title.replace(/\s*-\s*[^-]+$/, '').trim();
}

async function fetchRSS(feedKey) {
  const feed = RSS_FEEDS[feedKey];
  if (!feed) throw new Error(`Unknown feed: ${feedKey}`);

  if (cache[feedKey] && (Date.now() - cache[feedKey].timestamp < CACHE_DURATION)) {
    return cache[feedKey].data;
  }

  try {
    const xml = await fetchUrl(feed.url);
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xml);

    const items = result.rss?.channel?.item || [];
    const itemList = Array.isArray(items) ? items : [items];

    // Channel-level author as fallback
    const channelEditor = result.rss?.channel?.managingEditor || '';
    const channelCreator = result.rss?.channel?.['dc:creator'] || '';
    const channelFallback = parseAuthor(channelEditor || channelCreator);

    const articles = itemList.slice(0, 20).map((item) => {
      const fullTitle = item.title || '';
      const source = item.source?._ || item.source || extractSourceFromTitle(fullTitle);
      const authorRaw = item.author || item['dc:creator'] || '';
      const author = authorRaw ? parseAuthor(authorRaw) : channelFallback;
      return {
        title: cleanTitle(fullTitle),
        link: item.link || '',
        pubDate: item.pubDate || '',
        source: typeof source === 'string' ? source : String(source),
        description: (item.description || '').replace(/<[^>]*>/g, '').substring(0, 300),
        authorName: author.name,
        authorEmail: author.email,
      };
    });

    const result_data = { articles, live: true };
    cache[feedKey] = { data: result_data, timestamp: Date.now() };
    return result_data;
  } catch (err) {
    console.warn(`Live feed unavailable for ${feedKey}, using sample data: ${err.message}`);
    const articles = SAMPLE_DATA[feedKey] || [];
    return { articles, live: false };
  }
}

module.exports = { RSS_FEEDS, SAMPLE_DATA, fetchRSS };
