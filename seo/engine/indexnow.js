/**
 * indexnow.js — Instant Search Engine Indexing Engine
 *
 * Implements the open IndexNow protocol to instantly notify Microsoft Bing,
 * Yandex, Seznam, and Naver whenever articles are published or updated.
 *
 * Usage:
 *   node engine/indexnow.js [--dry-run]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
require('dotenv').config();

const BLOG_DIR = path.resolve(__dirname, '../../apps/website/src/content/blog');
const PUBLIC_DIR = path.resolve(__dirname, '../../apps/website/public');

const HOST = process.env.SITE_HOST || 'fieldledger.bridgewayapps.com';
const KEY_FILE = path.join(PUBLIC_DIR, 'indexnow-key.txt');

function getOrCreateIndexNowKey() {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  if (fs.existsSync(KEY_FILE)) {
    return fs.readFileSync(KEY_FILE, 'utf8').trim();
  }
  const key = crypto.randomBytes(16).toString('hex');
  fs.writeFileSync(KEY_FILE, key, 'utf8');
  console.log(`🔑 [IndexNow] Created new IndexNow verification key: ${key}`);
  return key;
}

function getAllSiteUrls() {
  const urls = [
    `https://${HOST}/`,
    `https://${HOST}/blog`,
    `https://${HOST}/llms.txt`,
  ];

  if (fs.existsSync(BLOG_DIR)) {
    const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const slug = file.replace(/\.md$/, '');
      urls.push(`https://${HOST}/blog/${slug}`);
    }
  }

  return urls;
}

async function submitToIndexNow(dryRun = false) {
  console.log('⚡ [IndexNow] Preparing instant search engine submission...');
  const key = getOrCreateIndexNowKey();
  const urlList = getAllSiteUrls();

  const payload = {
    host: HOST,
    key: key,
    keyLocation: `https://${HOST}/indexnow-key.txt`,
    urlList: urlList,
  };

  if (dryRun) {
    console.log('🔍 [IndexNow Dry Run] Payload ready:');
    console.log(JSON.stringify(payload, null, 2));
    return { success: true, submittedCount: urlList.length, dryRun: true };
  }

  const requestData = JSON.stringify(payload);

  return new Promise((resolve) => {
    const req = https.request(
      'https://api.indexnow.org/indexnow',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(requestData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 202) {
            console.log(`✅ [IndexNow] Successfully submitted ${urlList.length} URLs to search engines (Status ${res.statusCode}).`);
            resolve({ success: true, submittedCount: urlList.length, status: res.statusCode });
          } else {
            console.log(`⚠️  [IndexNow] Submission returned status ${res.statusCode}: ${body || 'Accepted with warnings'}`);
            resolve({ success: false, status: res.statusCode, body });
          }
        });
      }
    );

    req.on('error', (err) => {
      console.log(`⚠️  [IndexNow] Network error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.write(requestData);
    req.end();
  });
}

if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  submitToIndexNow(isDryRun).catch(console.error);
}

module.exports = { submitToIndexNow, getAllSiteUrls };
