'use strict';

const { mineKeywords } = require('./engine/gsc_miner');
const { submitToIndexNow } = require('./engine/indexnow');
const { runAudit } = require('./engine/seo_auditor');

function showHelp() {
  console.log('FieldLedger SEO utilities');
  console.log('  gsc                 Read Google Search Console opportunities');
  console.log('  audit               Audit the currently published website');
  console.log('  indexnow --dry-run  Preview URLs that would be submitted');
  console.log('  indexnow            Submit already-published URLs');
  console.log('Automated content generation and outreach remain disabled pending source and claim review.');
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'gsc') return mineKeywords();
  if (command === 'audit') return runAudit();
  if (command === 'indexnow') return submitToIndexNow(args.includes('--dry-run'));
  showHelp();
}

main().catch((error) => {
  console.error('SEO command failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
