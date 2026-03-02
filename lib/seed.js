// サンプルデータ（外部ネットワーク不可時のフォールバック）
const { stmts } = require('../db');

const SAMPLE_NEWS = [
  { source: '日刊建設工業新聞', title: '清水建設、26年3月期予想を大幅上方修正 5期ぶり営業利益1千億円超の見通し', url: 'https://www.decn.co.jp/article/1', published_at: '2026-02-28T07:00:00Z', author: '', summary: '清水建設は2026年3月期の業績予想を上方修正し、営業利益が5期ぶりに1千億円を超える見通しとなった。大型建築工事の利益率改善が寄与。', tags: 'general_contractor' },
  { source: '日本経済新聞', title: '「令和の建設費高騰」で相次ぐ工事断念、発注者の我慢はもう限界？', url: 'https://www.nikkei.com/article/2', published_at: '2026-02-27T20:00:00Z', author: '田中太郎', summary: '建設費の高騰が続き、各地で公共工事や民間開発の中止・延期が相次いでいる。資材価格と人件費の上昇に歯止めがかからない状況。', tags: 'construction_general' },
  { source: '日本経済新聞', title: '大型工事「26年度受注できず」建設会社の7割 成長投資阻む人手不足', url: 'https://www.nikkei.com/article/3', published_at: '2026-02-26T10:00:00Z', author: '', summary: '建設会社の約7割が2026年度の大型工事について受注困難と回答。深刻な人手不足が成長投資を阻む要因に。', tags: 'general_contractor' },
  { source: '建設通信新聞', title: '国交省、夏季休工の試行を26年夏から開始へ 建設業の働き方改革', url: 'https://www.kensetsunews.com/article/4', published_at: '2026-02-25T09:00:00Z', author: '', summary: '国土交通省は2026年夏から7月下旬〜8月中旬の夏季休工を試行する方針を発表。建設業の働き方改革の一環。', tags: 'construction_general' },
  { source: '東京商工リサーチ', title: '建設業の倒産件数が前年比15%増 資材高と人手不足が中小企業を直撃', url: 'https://www.tsr-net.co.jp/article/5', published_at: '2026-02-24T08:00:00Z', author: '', summary: '2025年の建設業倒産件数が前年比15%増加。資材価格の高騰と深刻な人手不足が中小建設企業の経営を圧迫。', tags: 'construction_general' },
  { source: '日刊建設工業新聞', title: '安井建築設計事務所、BIMモデルから省エネ計算情報を高精度取得する技術開発', url: 'https://www.decn.co.jp/article/6', published_at: '2026-02-28T06:00:00Z', author: '', summary: 'BIMモデルから建築物の省エネルギー計算に必要な情報を自動的に高精度で取得する技術を開発。設計業務の効率化に期待。', tags: 'construction_dx' },
  { source: '日経クロステック', title: '隈研吾氏も参画の北海道八雲町新庁舎計画が白紙へ 鉄骨加工費高騰で', url: 'https://xtech.nikkei.com/article/7', published_at: '2026-02-27T05:00:00Z', author: '佐藤花子', summary: '建築家・隈研吾氏が参画していた北海道八雲町の新庁舎建設計画が白紙撤回に。鉄骨加工費の高騰が主な要因。', tags: 'architecture_design' },
  { source: '日経クロステック', title: 'AIエージェントが建設現場を変える 自動施工管理の最前線', url: 'https://xtech.nikkei.com/article/8', published_at: '2026-02-26T05:00:00Z', author: '鈴木一郎', summary: 'AI技術を活用した自動施工管理システムが建設現場で本格導入。作業進捗の自動把握と品質管理の高度化を実現。', tags: 'construction_dx' },
  { source: '国土交通省', title: 'BIM確認申請が2026年度から一部義務化 建築DXの新時代へ', url: 'https://www.mlit.go.jp/article/9', published_at: '2026-02-25T04:00:00Z', author: '', summary: '建築確認申請におけるBIMモデルの活用が2026年度から一部で義務化。設計・施工・維持管理の一体化が進む。', tags: 'construction_dx' },
  { source: '日本経済新聞', title: '建設ロボット市場が急拡大 2030年には5,000億円規模に', url: 'https://www.nikkei.com/article/10', published_at: '2026-02-24T06:00:00Z', author: '', summary: '人手不足を背景に建設ロボットの需要が急増。溶接、墨出し、測量など多様な工程でロボット活用が進む。', tags: 'construction_dx' },
  { source: '日本経済新聞', title: '東京都心の再開発ラッシュ続く 2026年の注目プロジェクト', url: 'https://www.nikkei.com/article/11', published_at: '2026-02-28T08:00:00Z', author: '', summary: '東京都心部で大規模再開発プロジェクトが相次いで進行中。オフィス・商業・住宅の複合開発が主流に。', tags: 'realestate_dev' },
  { source: '日本経済新聞', title: 'マンション価格、首都圏で平均1億円突破 建設費高騰が反映', url: 'https://www.nikkei.com/article/12', published_at: '2026-02-27T06:00:00Z', author: '山田次郎', summary: '首都圏の新築マンション平均価格が初めて1億円を突破。建設費の高騰と用地費の上昇が主な要因。', tags: 'realestate_dev,housing_design' },
  { source: '日経クロステック', title: 'データセンター建設需要が急増 AI時代のインフラ投資', url: 'https://xtech.nikkei.com/article/13', published_at: '2026-02-26T04:00:00Z', author: '', summary: 'AI・クラウド需要の拡大に伴い、国内のデータセンター建設需要が急増。大型施設の建設計画が全国で進行。', tags: 'infrastructure' },
  { source: '日本経済新聞', title: '国土強靱化、5年で20兆円超の公共投資 地震対策が柱', url: 'https://www.nikkei.com/article/14', published_at: '2026-02-25T04:00:00Z', author: '', summary: '政府の国土強靱化計画に基づき、2026年から5年間で20兆円超の公共投資が計画。地震対策と老朽インフラ更新が中心。', tags: 'infrastructure' },
  { source: '日刊建設工業新聞', title: '高速道路の大規模更新・修繕事業が本格化 NEXCO3社の計画', url: 'https://www.decn.co.jp/article/15', published_at: '2026-02-24T07:00:00Z', author: '', summary: '高速道路の老朽化対策として、NEXCO3社による大規模更新・修繕事業が2026年度から本格化。総事業費は数兆円規模。', tags: 'infrastructure' },
  { source: '佐賀新聞', title: 'SAGAサンライズパークにBCS賞 日本建設業連合会が優良建築物を表彰', url: 'https://www.saga-s.co.jp/article/16', published_at: '2026-02-27T08:00:00Z', author: '', summary: '「する・観る・支える」をデザインコンセプトとしたSAGAサンライズパークが、日本建設業連合会のBCS賞を受賞。', tags: 'saga_construction' },
  { source: '佐賀新聞', title: 'アサヒビール鳥栖新工場、26年7月着工へ 29年1月操業開始目指す', url: 'https://www.saga-s.co.jp/article/17', published_at: '2026-02-26T05:00:00Z', author: '中村三郎', summary: 'アサヒビール博多工場の鳥栖市への移転計画で、2026年7月に新工場建設に着手し、29年1月の操業開始を目指す。', tags: 'saga_construction' },
  { source: '日経アーキテクチュア', title: '新国立競技場の設計思想を超える？ 2026年注目の建築プロジェクト10選', url: 'https://xtech.nikkei.com/article/18', published_at: '2026-02-25T08:00:00Z', author: '高橋美咲', summary: '2026年に完成予定の注目建築プロジェクトを紹介。環境配慮型設計や木造ハイブリッド構造など先進的な取り組みが目立つ。', tags: 'architecture_design' },
  { source: '建設通信新聞', title: '木造建築の可能性を広げる CLT活用の大規模建築が全国で増加', url: 'https://www.kensetsunews.com/article/19', published_at: '2026-02-24T07:00:00Z', author: '', summary: 'CLT（直交集成板）を活用した大規模木造建築が全国で増加。カーボンニュートラル実現に向けた取り組みが加速。', tags: 'building_materials,architecture_design' },
  { source: '日本経済新聞', title: '3Dプリンター住宅が日本でも本格化 24時間で建設可能な時代へ', url: 'https://www.nikkei.com/article/20', published_at: '2026-02-23T08:00:00Z', author: '', summary: '3Dプリンターを活用した住宅建設が日本でも商用化段階に。従来工法と比べ工期を大幅に短縮できる点が注目を集める。', tags: 'housing_design,construction_dx' },
];

function seedIfEmpty() {
  const stats = require('../db').stmts.getStats.get();
  if (stats.total > 0) return false;

  console.log('データベースが空のためサンプルデータを挿入します...');
  const now = new Date().toISOString();

  for (const article of SAMPLE_NEWS) {
    stmts.upsertNews.run({ ...article, fetched_at: now });
  }

  // 媒体窓口も登録
  const { KNOWN_CONTACTS } = require('./feeds');
  const sources = [...new Set(SAMPLE_NEWS.map((a) => a.source))];
  for (const source of sources) {
    stmts.upsertSource.run({
      source,
      contact_page_url: KNOWN_CONTACTS[source] || '',
      general_contact: '',
    });
  }

  console.log(`サンプルデータ ${SAMPLE_NEWS.length}件を挿入しました`);
  return true;
}

module.exports = { seedIfEmpty };
