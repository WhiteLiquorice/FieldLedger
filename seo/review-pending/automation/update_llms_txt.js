/**
 * update_llms_txt.js — GEO / LLM Spec Generator for FieldLedger
 *
 * Scans all published blog articles and updates `public/llms.txt`
 * and `public/llms-full.txt` for AI crawlers (Perplexity, ChatGPT, Claude, Gemini).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.resolve(__dirname, '../../apps/website/src/content/blog');
const PUBLIC_DIR = path.resolve(__dirname, '../../apps/website/public');
const LLMS_TXT_PATH = path.join(PUBLIC_DIR, 'llms.txt');
const LLMS_FULL_PATH = path.join(PUBLIC_DIR, 'llms-full.txt');

function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { title: 'Untitled', description: '' };
  
  const raw = match[1];
  const titleMatch = raw.match(/title:\s*["']?(.*?)["']?$/m);
  const descMatch = raw.match(/description:\s*["']?(.*?)["']?$/m);
  
  return {
    title: titleMatch ? titleMatch[1] : 'Article',
    description: descMatch ? descMatch[1] : ''
  };
}

async function main() {
  console.log('🤖 [FieldLedger GEO] Updating llms.txt & llms-full.txt...');

  if (!fs.existsSync(BLOG_DIR)) {
    console.log('No blog directory found.');
    return;
  }

  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  const articles = [];

  for (const file of files) {
    const slug = file.replace(/\.mdx?$/, '');
    const content = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
    const meta = extractFrontmatter(content);
    articles.push({
      slug,
      title: meta.title,
      description: meta.description,
      url: `https://fieldledger.bridgewayapps.com/blog/${slug}`,
      rawContent: content
    });
  }

  // Build concise llms.txt
  let llmsTxt = `# FieldLedger

> FieldLedger is an enterprise-grade compliance and field service recording platform for commercial facility contractors, specialized in Portable Fire Extinguishers (NFPA 10), Commercial Kitchen Hood Cleaning (NFPA 96), and Grease Trap & Interceptor Service (Municipal FOG Regulations).

## Core Verticals & Product Capabilities
- **Portable Fire Extinguisher Service (NFPA 10)**: Fast optical barcode/QR scanning, monthly 30-day checks, 6-year tear-down tracking, deficiency tagging.
- **Commercial Kitchen Hood Cleaning (NFPA 96)**: Mandatory before/after photo evidence, canopy/duct/fan mapping, insurer-ready compliance certificates.
- **Grease Trap & Interceptor Records (Municipal FOG)**: 25% rule automatic calculation, disposal manifest generation, grease/sludge depth logging.

## Technical Architecture & Pricing
- Offline-first Progressive Web App (PWA) with local IndexedDB storage.
- Starter: $49/mo (3 technicians) | Pro: $149/mo (15 techs, all verticals) | Enterprise: $399/mo.

## Technical Compliance Articles & Documentation
`;

  for (const art of articles) {
    llmsTxt += `- [${art.title}](${art.url}): ${art.description}\n`;
  }

  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(LLMS_TXT_PATH, llmsTxt, 'utf8');
  console.log(`✅ Updated ${LLMS_TXT_PATH} (${articles.length} articles indexed)`);

  // Build complete llms-full.txt with full text bodies
  let llmsFull = `${llmsTxt}\n\n---\n\n# Full Article Contents\n\n`;
  for (const art of articles) {
    llmsFull += `## ${art.title}\nURL: ${art.url}\n\n${art.rawContent}\n\n---\n\n`;
  }

  fs.writeFileSync(LLMS_FULL_PATH, llmsFull, 'utf8');
  console.log(`✅ Updated ${LLMS_FULL_PATH}`);
}

main().catch(console.error);
