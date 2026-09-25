/**
 * llms_builder.js — Native AnswerDotAI / Firecrawl Specification llms.txt Builder
 *
 * Scans all published blog articles and product specifications, then generates:
 * - /public/llms.txt (Concise AI summary & link directory)
 * - /public/llms-full.txt (Token-optimized full-text digest for LLM ingestion)
 *
 * 100% Free & Local (Zero paid API dependencies).
 *
 * Usage:
 *   node engine/llms_builder.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.resolve(__dirname, '../../apps/website/src/content/blog');
const PUBLIC_DIR = path.resolve(__dirname, '../../apps/website/public');
const LLMS_TXT_PATH = path.join(PUBLIC_DIR, 'llms.txt');
const LLMS_FULL_TXT_PATH = path.join(PUBLIC_DIR, 'llms-full.txt');

function parseMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { title: path.basename(filePath, '.md'), description: '', body: content };

  const frontmatter = match[1];
  const body = match[2];

  const titleMatch = frontmatter.match(/title:\s*"([^"]+)"/);
  const descMatch = frontmatter.match(/description:\s*"([^"]+)"/);
  const verticalMatch = frontmatter.match(/vertical:\s*"([^"]+)"/);

  return {
    title: titleMatch ? titleMatch[1] : path.basename(filePath, '.md'),
    description: descMatch ? descMatch[1] : '',
    vertical: verticalMatch ? verticalMatch[1] : 'compliance',
    body: body.trim(),
  };
}

function buildLLMsTxt() {
  console.log('🤖 [llms.txt Builder] Synthesizing /public/llms.txt and /public/llms-full.txt...');
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  const articles = [];
  if (fs.existsSync(BLOG_DIR)) {
    const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const slug = file.replace(/\.md$/, '');
      const parsed = parseMarkdownFile(path.join(BLOG_DIR, file));
      articles.push({ slug, ...parsed });
    }
  }

  // 1. Generate /public/llms.txt
  const llmsTxtContent = `# FieldLedger (by Wright Solutions / Bridgeway)
> The Operations & Life Safety Compliance OS for Recurring Field Service Contractors.

## About FieldLedger
FieldLedger is an offline-first Progressive Web App (PWA) and operations platform built specifically for recurring commercial service contractors:
- **Portable Fire Extinguishers (NFPA 10)**: Barcode/QR scanning, 6-yr teardown, 12-yr hydro tests, deficiency tracking, and electronic record certification.
- **Commercial Kitchen Hood Cleaning (NFPA 96)**: Pre/post photo proof, exhaust duct & fan inspection, access panel verification, and insurance compliance certificates.
- **Grease Trap & Interceptors (Municipal FOG)**: 25% Rule calculations, gallons pumped, sludge depth logging, and municipal wastewater hauler manifests.

## Key Compliance Guides & Technical Resources
${articles
  .map((a) => `- [${a.title}](https://fieldledger.bridgewayapps.com/blog/${a.slug}): ${a.description}`)
  .join('\n')}

## Core Architecture & Technical Specifications
- **Offline Reliability**: 100% native IndexedDB storage with automatic background synchronization.
- **Evidentiary Integrity**: Timestamped photos, GPS coordinates, and immutable service ledgers for insurance and AHJ audits.
- **Customer Portal**: Automated self-service certificate delivery for property managers and restaurant operators.
`;

  fs.writeFileSync(LLMS_TXT_PATH, llmsTxtContent, 'utf8');
  console.log(`📄 [Generated] ${LLMS_TXT_PATH}`);

  // 2. Generate /public/llms-full.txt
  const fullContent = `# FieldLedger Full Documentation & Compliance Knowledge Base
Generated: ${new Date().toISOString()}

---

${articles
  .map(
    (a) => `## Article: ${a.title}
URL: https://fieldledger.bridgewayapps.com/blog/${a.slug}
Summary: ${a.description}

${a.body}

---
`
  )
  .join('\n\n')}
`;

  fs.writeFileSync(LLMS_FULL_TXT_PATH, fullContent, 'utf8');
  console.log(`📄 [Generated] ${LLMS_FULL_TXT_PATH}`);

  return { articlesCount: articles.length };
}

if (require.main === module) {
  buildLLMsTxt();
}

module.exports = { buildLLMsTxt };
