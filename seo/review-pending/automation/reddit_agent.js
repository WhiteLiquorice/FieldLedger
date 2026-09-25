/**
 * reddit_agent.js — Multi-Subreddit Organic Community & Lead Listening Agent
 *
 * Scrapes target Reddit communities for life safety, kitchen exhaust, and grease trap discussions.
 * Scores posts on buyer / compliance intent (0-100) and drafts value-first, non-spam replies
 * providing immediate technical answers.
 *
 * 100% Free & Local (Uses native Reddit JSON endpoints).
 *
 * Usage:
 *   node engine/reddit_agent.js [--limit 20]
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
  'facilitiesmanagement',
  'RestaurantOwners',
  'plumbing',
  'SafetyProfessionals',
];

const SEARCH_TERMS = [
  'fire extinguisher inspection',
  'hood cleaning',
  'kitchen exhaust inspection',
  'grease trap',
  'grease interceptor',
  'NFPA 96',
  'NFPA 10',
  'fire marshal inspection',
  'inspection tags',
  '25 percent rule grease',
];

const LEADS_FILE = path.resolve(__dirname, '../temp/reddit_leads.json');

async function fetchSubredditPosts(sub, query) {
  const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=10`;

  return new Promise((resolve) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 FieldLedgerAgent/1.0',
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const json = JSON.parse(data);
                const posts = (json.data?.children || []).map((c) => ({
                  id: c.data.id,
                  subreddit: sub,
                  title: c.data.title,
                  url: `https://reddit.com${c.data.permalink}`,
                  author: c.data.author,
                  selftext: (c.data.selftext || '').slice(0, 400),
                  score: c.data.score,
                  num_comments: c.data.num_comments,
                  created_utc: new Date(c.data.created_utc * 1000).toISOString(),
                }));
                resolve(posts);
              } catch (_) {
                resolve([]);
              }
            } else {
              resolve([]);
            }
          });
        }
      )
      .on('error', () => resolve([]));
  });
}

function calculateIntentScore(post) {
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  let score = 30;
  let category = 'GENERAL_DISCUSSION';
  let painPoints = [];

  // Urgent pain signals
  if (/fail(ed)?|violat(ion|ed)|fine|fire marshal|audit|inspector|deadline|warning/i.test(text)) {
    score += 35;
    category = 'IMMEDIATE_COMPLIANCE_PAIN';
    painPoints.push('Inspection Failure / Regulatory Pressure');
  }

  // Tool / software intent signals
  if (/software|app|tool|recommend(ation)?|alternative|digital|tracking|system/i.test(text)) {
    score += 25;
    if (category !== 'IMMEDIATE_COMPLIANCE_PAIN') category = 'SOFTWARE_RECOMMENDATION';
    painPoints.push('Searching for Digital Workflow Tool');
  }

  // How-to / technical questions
  if (/how often|how to|requirement|standard|schedule|rule|depth|frequency/i.test(text)) {
    score += 15;
    painPoints.push('Technical Code Uncertainty');
  }

  return {
    score: Math.min(100, score),
    category,
    painPoints,
  };
}

function generateValueFirstDraft(post, intent) {
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  let topic = 'Life Safety Compliance';
  let codeCitation = '';
  let technicalAdvice = '';

  if (text.includes('extinguisher') || text.includes('nfpa 10')) {
    topic = 'Portable Fire Extinguishers';
    codeCitation = 'NFPA 10 § 7.2.1.2 & § 7.2.4';
    technicalAdvice =
      'For monthly checks, you need to verify pressure gauge in operable range, pull pin intact, clear mounting access, and no physical damage. If you are tired of physical cardboard collar punch tags getting torn off, NFPA 10 Section 7.2.4 explicitly permits digital electronic recordkeeping and barcode scanning as long as 12-month records can be produced for the fire marshal.';
  } else if (text.includes('hood') || text.includes('exhaust') || text.includes('nfpa 96')) {
    topic = 'Commercial Kitchen Exhaust Cleaning';
    codeCitation = 'NFPA 96 Table 12.4';
    technicalAdvice =
      'Cleaning frequency depends entirely on cooking volume and fuel type under NFPA 96 (monthly for solid fuel wood/charcoal, quarterly for high-volume 24hr or wok/charbroil, semi-annually for standard dining). Always ensure the cleaning company takes before & after photos of the entire horizontal/vertical duct run and fan blades—insurers and fire marshals require this proof during claims.';
  } else if (text.includes('grease') || text.includes('trap') || text.includes('interceptor') || text.includes('fog')) {
    topic = 'Grease Trap / Interceptor Maintenance';
    codeCitation = 'Municipal FOG Codes & 25% Rule';
    technicalAdvice =
      'Most wastewater utilities enforce the strict 25% Rule (total top grease layer + bottom sludge layer cannot exceed 25% of total liquid depth). Make sure the hauler gives you a complete manifest detailing pumped gallons and disposal facility, because cities audit these records during routine FOG inspections.';
  } else {
    codeCitation = 'Local AHJ Life Safety Ordinances';
    technicalAdvice =
      'Maintaining timestamped digital service logs with photo evidence is the single most reliable way to avoid fines during routine municipal audits.';
  }

  const reply = `Regarding ${topic} (${codeCitation}):

${technicalAdvice}

In our experience with commercial facilities and field crews, having an offline digital checklist or customer portal (like FieldLedger or similar PWA tools) eliminates 90% of the audit scramble when the inspector arrives.

Hope this helps clear up the requirement!`;

  return {
    strategy: `Helpful technical answer on ${topic}`,
    suggested_reply: reply,
  };
}

async function runRedditAgent(limit = 25) {
  console.log('📡 [Reddit Lead Agent] Scanning community discussions...\n');

  // Load existing leads for deduplication
  let existingLeads = [];
  if (fs.existsSync(LEADS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
      existingLeads = data.leads || [];
    } catch (_) {}
  }

  const existingUrls = new Set(existingLeads.map((l) => l.url));
  const newLeads = [];

  for (const sub of TARGET_SUBREDDITS) {
    for (const term of SEARCH_TERMS) {
      process.stdout.write(`  Scanning r/${sub} for "${term}"...\r`);
      const results = await fetchSubredditPosts(sub, term);

      for (const res of results) {
        if (!existingUrls.has(res.url)) {
          existingUrls.add(res.url);
          const intent = calculateIntentScore(res);
          const draft = generateValueFirstDraft(res, intent);

          const lead = {
            id: res.id,
            subreddit: res.subreddit,
            title: res.title,
            url: res.url,
            author: res.author,
            selftext: res.selftext,
            created_utc: res.created_utc,
            intent_score: intent.score,
            intent_category: intent.category,
            pain_points: intent.painPoints,
            response_draft: draft,
            status: 'new', // new | approved | posted | archived
            discovered_at: new Date().toISOString(),
          };

          newLeads.push(lead);
        }
      }

      // Small respectful delay
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  const combined = [...newLeads, ...existingLeads]
    .sort((a, b) => b.intent_score - a.intent_score)
    .slice(0, limit * 2);

  fs.mkdirSync(path.dirname(LEADS_FILE), { recursive: true });
  fs.writeFileSync(
    LEADS_FILE,
    JSON.stringify(
      {
        last_updated: new Date().toISOString(),
        total_leads: combined.length,
        new_leads_this_run: newLeads.length,
        leads: combined,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`\n🎯 [Reddit Lead Agent] Found ${newLeads.length} new discussions (${combined.length} total in database).`);
  console.log(`📁 Leads database updated at: ${LEADS_FILE}`);
  console.log(`💡 Run 'npm run leads' to review and copy reply drafts.\n`);

  return { newCount: newLeads.length, totalCount: combined.length };
}

if (require.main === module) {
  runRedditAgent().catch(console.error);
}

module.exports = { runRedditAgent, calculateIntentScore, generateValueFirstDraft };
