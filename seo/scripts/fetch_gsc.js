/**
 * fetch_gsc.js — Google Search Console Query Miner for FieldLedger
 *
 * Reads cached OAuth tokens from .gsc_token_cache.json or environment,
 * queries GSC API for impressions/queries related to FieldLedger,
 * or injects seed keywords from target_clusters.json if GSC data is sparse.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config();

const TOKEN_CACHE_PATH = path.resolve(__dirname, '../../SEO/.gsc_token_cache.json');
const LOCAL_TOKEN_PATH = path.resolve(__dirname, '../.gsc_token_cache.json');
const TARGET_CLUSTERS_PATH = path.resolve(__dirname, '../config/target_clusters.json');
const OUTPUT_FILE = path.resolve(__dirname, '../temp/gsc_opportunities.json');

async function getAuthClient() {
  const tokenPath = fs.existsSync(LOCAL_TOKEN_PATH) ? LOCAL_TOKEN_PATH : TOKEN_CACHE_PATH;
  if (!fs.existsSync(tokenPath)) {
    console.log('⚠️ No cached OAuth token found. Using seed keywords mode.');
    return null;
  }

  const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  const oauth2Client = new google.auth.OAuth2(
    process.env.GSC_CLIENT_ID,
    process.env.GSC_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
  );

  oauth2Client.setCredentials(tokenData);
  return oauth2Client;
}

async function main() {
  console.log('🔍 [FieldLedger SEO] Mining GSC & Target Keyword Opportunities...');
  
  const targetClusters = JSON.parse(fs.readFileSync(TARGET_CLUSTERS_PATH, 'utf8'));
  const opportunities = [];

  const auth = await getAuthClient();
  let gscFound = false;

  if (auth && process.env.GSC_SITE_URL) {
    try {
      const searchconsole = google.searchconsole({ version: 'v1', auth });
      const res = await searchconsole.searchanalytics.query({
        siteUrl: process.env.GSC_SITE_URL,
        requestBody: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dimensions: ['query'],
          rowLimit: 50,
        },
      });

      if (res.data.rows && res.data.rows.length > 0) {
        gscFound = true;
        for (const row of res.data.rows) {
          opportunities.push({
            keyword: row.keys[0],
            impressions: row.impressions,
            clicks: row.clicks,
            ctr: row.ctr,
            position: row.position,
            source: 'gsc_live',
            vertical: detectVertical(row.keys[0]),
          });
        }
        console.log(`✅ Loaded ${res.data.rows.length} live queries from GSC.`);
      }
    } catch (err) {
      console.log(`ℹ️ GSC live query failed (${err.message}). Falling back to seed clusters.`);
    }
  }

  // If GSC is new or empty, populate with seed keywords
  if (!gscFound || opportunities.length < 5) {
    console.log('🌱 Injecting curated high-intent seed clusters for FieldLedger:');
    for (const cluster of targetClusters.clusters) {
      for (const kw of cluster.seed_keywords) {
        opportunities.push({
          keyword: kw,
          impressions: 150,
          clicks: 2,
          ctr: 0.013,
          position: 18.5,
          source: 'seed_cluster',
          vertical: cluster.vertical,
          clusterName: cluster.name,
        });
      }
    }
    console.log(`✅ Seeded ${opportunities.length} target keyword opportunities across all 3 verticals.`);
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ timestamp: new Date().toISOString(), opportunities }, null, 2));
  console.log(`📁 Saved opportunities to: ${OUTPUT_FILE}`);
}

function detectVertical(query) {
  const q = query.toLowerCase();
  if (q.includes('extinguisher') || q.includes('nfpa 10') || q.includes('fire')) return 'fire-extinguisher';
  if (q.includes('hood') || q.includes('nfpa 96') || q.includes('exhaust') || q.includes('kitchen')) return 'hood-cleaning';
  if (q.includes('grease') || q.includes('fog') || q.includes('interceptor') || q.includes('pumping')) return 'grease-trap';
  return 'general-compliance';
}

main().catch(console.error);
