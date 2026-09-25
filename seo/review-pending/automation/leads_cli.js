/**
 * leads_cli.js — Interactive Terminal Outreach & Lead Review CRM
 *
 * Lets operators browse high-intent community leads, inspect suggested response drafts,
 * and manage outreach workflows.
 *
 * Usage:
 *   node engine/leads_cli.js [--top 10]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const LEADS_FILE = path.resolve(__dirname, '../temp/reddit_leads.json');

function displayLeadsList(leads) {
  console.log('\n📋 [FieldLedger Community Lead Pipeline]');
  console.log('═'.repeat(95));
  console.log(' # │ Score │ Category              │ Subreddit          │ Title');
  console.log('─'.repeat(95));

  leads.forEach((l, idx) => {
    const num = `${idx + 1}`.padStart(2);
    const score = `${l.intent_score}/100`.padStart(5);
    const cat = (l.intent_category || 'GENERAL').padEnd(21).slice(0, 21);
    const sub = `r/${l.subreddit}`.padEnd(18).slice(0, 18);
    const title = (l.title || '').slice(0, 42);
    console.log(` ${num}│ ${score} │ ${cat} │ ${sub} │ ${title}`);
  });
  console.log('═'.repeat(95));
}

function displayLeadDetails(lead) {
  console.log('\n' + '─'.repeat(80));
  console.log(`📌 Title:     ${lead.title}`);
  console.log(`🌐 Subreddit: r/${lead.subreddit} | Author: u/${lead.author}`);
  console.log(`🔗 URL:       ${lead.url}`);
  console.log(`🎯 Intent:    ${lead.intent_score}/100 (${lead.intent_category})`);
  if (lead.pain_points?.length) {
    console.log(`⚠️  Pain:      ${lead.pain_points.join(', ')}`);
  }
  console.log('\n📝 Post Snippet:');
  console.log(`   ${(lead.selftext || '[Link/Image post]').replace(/\n/g, '\n   ')}`);

  console.log('\n💡 Suggested Value-First Reply:');
  console.log('┌' + '─'.repeat(78) + '┐');
  lead.response_draft?.suggested_reply?.split('\n').forEach((line) => {
    console.log(`│ ${line.padEnd(76)} │`);
  });
  console.log('└' + '─'.repeat(78) + '┘');
  console.log('─'.repeat(80));
}

async function runInteractiveCLI() {
  if (!fs.existsSync(LEADS_FILE)) {
    console.log('⚠️  No leads file found. Run "npm run reddit" first to populate leads.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  const leads = data.leads || [];

  if (leads.length === 0) {
    console.log('ℹ️  No leads recorded yet. Run "npm run reddit".');
    return;
  }

  displayLeadsList(leads.slice(0, 15));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptUser = () => {
    rl.question('\nEnter lead number to inspect (or "q" to exit): ', (input) => {
      const trimmed = input.trim().toLowerCase();
      if (trimmed === 'q' || trimmed === 'exit') {
        rl.close();
        return;
      }

      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= leads.length) {
        const selected = leads[num - 1];
        displayLeadDetails(selected);
        promptUser();
      } else {
        console.log('Invalid option. Enter a number or "q".');
        promptUser();
      }
    });
  };

  promptUser();
}

if (require.main === module) {
  runInteractiveCLI();
}

module.exports = { runInteractiveCLI };
