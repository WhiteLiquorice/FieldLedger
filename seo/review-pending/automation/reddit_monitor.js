/**
 * reddit_monitor.js — Community & Lead Listening Agent for FieldLedger
 *
 * Scrapes target subreddits for high-intent discussions around:
 * - Fire extinguisher inspection & NFPA 10
 * - Commercial kitchen exhaust & hood cleaning NFPA 96
 * - Grease trap pumping, FOG compliance, 25% rule
 *
 * Usage:
 *   node scripts/reddit_monitor.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_SUBREDDITS = [
  'CommercialKitchens',
  'KitchenConfidential',
  'Firefighting',
  'HVAC',
  'smallbusiness',
  'facilitiesmanagement'
];

const SEARCH_TERMS = [
  'fire extinguisher inspection',
  'hood cleaning',
  'grease trap',
  'NFPA 96',
  'NFPA 10',
  'grease interceptor',
  'inspection tag'
];

const OUTPUT_FILE = path.resolve(__dirname, '../temp/reddit_leads.json');

async function fetchSubredditJson(sub, query) {
  const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=5`;
  
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            const posts = (json.data?.children || []).map(c => ({
              id: c.data.id,
              subreddit: sub,
              title: c.data.title,
              url: `https://reddit.com${c.data.permalink}`,
              author: c.data.author,
              selftext: (c.data.selftext || '').slice(0, 300),
              num_comments: c.data.num_comments,
              created_utc: new Date(c.data.created_utc * 1000).toISOString()
            }));
            resolve(posts);
          } catch (_) {
            resolve([]);
          }
        } else {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

function generateReplyDraft(lead) {
  let vertical = 'compliance';
  let tip = 'Make sure to maintain digital records with timestamped evidence to satisfy local AHJ requirements.';

  if (lead.title.toLowerCase().includes('extinguisher') || lead.title.toLowerCase().includes('nfpa 10')) {
    vertical = 'fire extinguisher';
    tip = 'Under NFPA 10 Section 7.2.4, electronic recordkeeping and barcode scanning are fully recognized alternatives to physical cardboard collar punch tags, as long as 12-month records can be reproduced for the fire marshal.';
  } else if (lead.title.toLowerCase().includes('hood') || lead.title.toLowerCase().includes('exhaust')) {
    vertical = 'hood cleaning';
    tip = 'For NFPA 96 compliance, always document mandatory before/after photo evidence of the canopy, vertical riser duct, and rooftop exhaust fan blades to protect yourself from insurer liability.';
  } else if (lead.title.toLowerCase().includes('grease') || lead.title.toLowerCase().includes('trap')) {
    vertical = 'grease trap';
    tip = 'Keep a strict core sampler log of the 25% rule (grease + sludge depth vs total liquid depth) to avoid municipal wastewater utility fines.';
  }

  return {
    strategy: `Value-first expert answer on ${vertical}`,
    suggested_reply: `Great question regarding ${vertical}. ${tip} We run into this constantly with commercial facility teams—having an offline mobile tool or customer portal (like FieldLedger or similar PWA platforms) eliminates almost all the audit friction. Hope that helps!`
  };
}

async function main() {
  console.log('📡 [FieldLedger Reddit Agent] Monitoring community discussions...');
  const leads = [];

  for (const sub of TARGET_SUBREDDITS) {
    for (const term of SEARCH_TERMS) {
      console.log(`  Scanning r/${sub} for "${term}"...`);
      const results = await fetchSubredditJson(sub, term);
      for (const res of results) {
        if (!leads.find(l => l.url === res.url)) {
          const draft = generateReplyDraft(res);
          leads.push({ ...res, response_draft: draft });
        }
      }
      // Small delay to be polite to Reddit rate limits
      await new Promise(r => setTimeout(r, 400));
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ timestamp: new Date().toISOString(), total_leads: leads.length, leads }, null, 2));

  console.log(`\n🎯 Found ${leads.length} relevant discussions.`);
  console.log(`📁 Saved leads and response drafts to: ${OUTPUT_FILE}`);
}

main().catch(console.error);
