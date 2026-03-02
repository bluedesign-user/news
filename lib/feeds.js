// RSS Feed 設定
// Google News RSS + 専門メディア RSS
const FEEDS = [
  {
    key: 'architecture_design',
    name: '建築・設計',
    url: 'https://news.google.com/rss/search?q=%E5%BB%BA%E7%AF%89+%E8%A8%AD%E8%A8%88&hl=ja&gl=JP&ceid=JP:ja',
  },
  {
    key: 'housing_design',
    name: '住宅・設計',
    url: 'https://news.google.com/rss/search?q=%E4%BD%8F%E5%AE%85+%E8%A8%AD%E8%A8%88&hl=ja&gl=JP&ceid=JP:ja',
  },
  {
    key: 'construction_dx',
    name: '建設DX',
    url: 'https://news.google.com/rss/search?q=%E5%BB%BA%E8%A8%ADDX+OR+BIM&hl=ja&gl=JP&ceid=JP:ja',
  },
  {
    key: 'building_materials',
    name: '建材・資材',
    url: 'https://news.google.com/rss/search?q=%E5%BB%BA%E6%9D%90+OR+%E8%B3%87%E6%9D%90+%E5%BB%BA%E8%A8%AD&hl=ja&gl=JP&ceid=JP:ja',
  },
  {
    key: 'general_contractor',
    name: 'ゼネコン',
    url: 'https://news.google.com/rss/search?q=%E3%82%BC%E3%83%8D%E3%82%B3%E3%83%B3+OR+%E5%BB%BA%E8%A8%AD%E4%BC%9A%E7%A4%BE&hl=ja&gl=JP&ceid=JP:ja',
  },
  {
    key: 'construction_general',
    name: '建設総合',
    url: 'https://news.google.com/rss/search?q=%E5%BB%BA%E8%A8%AD+OR+%E5%BB%BA%E7%AF%89+%E3%83%8B%E3%83%A5%E3%83%BC%E3%82%B9&hl=ja&gl=JP&ceid=JP:ja',
  },
  {
    key: 'realestate_dev',
    name: '不動産・開発',
    url: 'https://news.google.com/rss/search?q=%E4%B8%8D%E5%8B%95%E7%94%A3+%E9%96%8B%E7%99%BA+%E5%86%8D%E9%96%8B%E7%99%BA&hl=ja&gl=JP&ceid=JP:ja',
  },
  {
    key: 'infrastructure',
    name: 'インフラ・土木',
    url: 'https://news.google.com/rss/search?q=%E3%82%A4%E3%83%B3%E3%83%95%E3%83%A9+%E5%9C%9F%E6%9C%A8+%E5%B7%A5%E4%BA%8B&hl=ja&gl=JP&ceid=JP:ja',
  },
  {
    key: 'saga_construction',
    name: '佐賀・建設',
    url: 'https://news.google.com/rss/search?q=%E4%BD%90%E8%B3%80+%E5%BB%BA%E8%A8%AD+OR+%E5%BB%BA%E7%AF%89&hl=ja&gl=JP&ceid=JP:ja',
  },
  {
    key: 'saga_keizai',
    name: '佐賀経済新聞',
    url: 'https://saga.keizai.biz/rss.xml',
    filter: ['建築', '住宅', '建設', '工事', '施工', '設計', '不動産', '再開発',
             'マンション', 'ビル', '店舗', '開業', '着工', '竣工', '改装', '新築',
             '増築', '解体', 'リフォーム', 'リノベ'],
  },
];

// 媒体名 → 既知の問い合わせページ URL のマッピング
const KNOWN_CONTACTS = {
  '日刊建設工業新聞': 'https://www.decn.co.jp/?page_id=84',
  '建設通信新聞': 'https://www.kensetsunews.com/company',
  '日経クロステック': 'https://support.nikkei.com/app/ask',
  '日経アーキテクチュア': 'https://support.nikkei.com/app/ask',
  '日本経済新聞': 'https://support.nikkei.com/app/ask',
  '国土交通省': 'https://www.mlit.go.jp/contact/index.html',
  '佐賀新聞': 'https://www.saga-s.co.jp/contact',
  '佐賀経済新聞': 'https://saga.keizai.biz/contact/',
  '東京商工リサーチ': 'https://www.tsr-net.co.jp/inquiry/',
  '朝日新聞デジタル': 'https://digital.asahi.com/info/inquiry/',
  '読売新聞オンライン': 'https://www.yomiuri.co.jp/policy/contact/',
  '毎日新聞': 'https://www.mainichi.co.jp/contact/',
  '時事通信': 'https://www.jiji.com/jc/c?g=info_contact',
  'NHKニュース': 'https://www.nhk.or.jp/css/contact/',
};

module.exports = { FEEDS, KNOWN_CONTACTS };
