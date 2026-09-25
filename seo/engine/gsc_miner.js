/**
 * gsc_miner.js — Google Search Console & Seed Keyword Opportunity Miner
 *
 * Scans Google Search Console for "striking distance" queries (positions 4-25 with high impressions)
 * and falls back/merges with curated topical compliance keyword clusters.
 *
 * Usage:
 *   node engine/gsc_miner.js [--limit 10]
 */

'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CLUSTERS_PATH = path.resolve(__dirname, '../config/target_clusters.json');
const OUTPUT_FILE = path.resolve(__dirname, '../temp/gsc_opportunities.json');

async function getGSCOpportunities(siteUrl, credentialsPath) {
  try {
    const { google } = require('googleapis');
    if (!fs.existsSync(credentialsPath)) {
      console.log('ℹ️  No GSC credentials file found. Using seed compliance clusters.');
      return null;
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    const searchconsole = google.searchconsole({ version: 'v1', auth });
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dimensions: ['query'],
        rowLimit: 100,
      },
    });

    const rows = response.data.rows || [];
    // Filter for "striking distance" queries: position between 4 and 25
    return rows
      .filter((row) => row.position >= 4 && row.position <= 25 && row.impressions > 10)
      .map((row) => ({
        keyword: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: (row.ctr * 100).toFixed(1) + '%',
        position: row.position.toFixed(1),
        source: 'gsc_striking_distance',
        opportunity_score: Math.round(row.impressions * (1 / row.position) * 10),
      }))
      .sort((a, b) => b.opportunity_score - a.opportunity_score);
  } catch (err) {
    console.log(`⚠️  GSC query failed (${err.message}). Defaulting to cluster matrix.`);
    return null;
  }
}

function getSeedClusterOpportunities() {
  if (!fs.existsSync(CLUSTERS_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(CLUSTERS_PATH, 'utf8'));
  const list = [];

  for (const cluster of raw.clusters || []) {
    for (const kw of cluster.seed_keywords || []) {
      list.push({
        keyword: kw,
        cluster: cluster.name,
        vertical: cluster.vertical,
        priority: cluster.priority,
        source: 'seed_cluster_matrix',
        opportunity_score: cluster.priority === 'P1' ? 85 : 60,
      });
    }
  }

  return list;
}

async function mineKeywords(limit = 15) {
  console.log('🔍 [Keyword Miner] Mining search opportunities...');
  const gscSiteUrl = process.env.GSC_SITE_URL || 'https://fieldledger.bridgewayapps.com';
  const gscKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve(__dirname, '../../service-account.json');

  let opportunities = await getGSCOpportunities(gscSiteUrl, gscKeyPath);

  if (!opportunities || opportunities.length === 0) {
    opportunities = getSeedClusterOpportunities();
  } else {
    // Merge GSC with seed clusters
    const seeds = getSeedClusterOpportunities();
    for (const seed of seeds) {
      if (!opportunities.some((o) => o.keyword.toLowerCase() === seed.keyword.toLowerCase())) {
        opportunities.push(seed);
      }
    }
  }

  const selected = opportunities.slice(0, limit);
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(selected, null, 2), 'utf8');

  console.log(`✅ [Keyword Miner] Generated ${selected.length} target keyword opportunities.`);
  console.log(`📁 Saved to: ${OUTPUT_FILE}`);
  return selected;
}

if (require.main === module) {
  const limitArg = process.argv.indexOf('--limit');
  const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : 15;
  mineKeywords(limit).catch(console.error);
}

module.exports = { mineKeywords };
