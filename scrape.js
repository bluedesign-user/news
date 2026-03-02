#!/usr/bin/env node
// CLI スクレイパー: npm run scrape -- --days 14

const { collectAll } = require('./lib/collector');

async function main() {
  const args = process.argv.slice(2);
  let days = 14;
  let enrich = true;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) {
      days = parseInt(args[i + 1], 10) || 14;
      i++;
    }
    if (args[i] === '--no-enrich') {
      enrich = false;
    }
  }

  console.log(`建築ニュース収集 (直近${days}日, enrich=${enrich})`);
  const startTime = Date.now();

  try {
    const stats = await collectAll(days, { enrich });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n所要時間: ${elapsed}秒`);
    console.log(JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error('収集エラー:', err);
    process.exit(1);
  }
}

main();
