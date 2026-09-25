/**
 * publish_seo.js — Automatic Blog Post Publisher for FieldLedger
 *
 * Reads generated articles from temp/generated_articles.json,
 * builds frontmatter, and writes the Markdown files directly to
 * `apps/website/src/content/blog/`.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.resolve(__dirname, '../temp/generated_articles.json');
const BLOG_DIR = path.resolve(__dirname, '../../apps/website/src/content/blog');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

async function main() {
  console.log('🚀 [FieldLedger Publisher] Publishing articles to website content catalog...');

  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Generated articles file missing at: ${INPUT_FILE}. Run generate_content.js first.`);
  }

  const { articles } = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  fs.mkdirSync(BLOG_DIR, { recursive: true });

  const published = [];
  const dateStr = new Date().toISOString().split('T')[0];

  for (const article of articles) {
    const slug = slugify(article.keyword || article.title);
    const filename = `${slug}.md`;
    const targetPath = path.join(BLOG_DIR, filename);

    const frontmatter = `---
title: "${article.title.replace(/"/g, '\\"')}"
description: "${article.description.replace(/"/g, '\\"')}"
pubDate: ${dateStr}
author: "${article.author || 'FieldLedger Compliance Team'}"
authorRole: "${article.authorRole || 'Compliance Specialist'}"
vertical: "${article.vertical || 'general-compliance'}"
tags: ${JSON.stringify(article.tags || ['Compliance', 'FieldLedger'])}
featured: false
schemaType: "TechArticle"
faqs:
${(article.faqs || []).map(f => `  - question: "${f.question.replace(/"/g, '\\"')}"\n    answer: "${f.answer.replace(/"/g, '\\"')}"`).join('\n')}
---

${article.markdown_content}
`;

    fs.writeFileSync(targetPath, frontmatter, 'utf8');
    published.push(filename);
    console.log(`✅ Published: ${filename}`);
  }

  console.log(`\n🎉 Successfully published ${published.length} articles to: ${BLOG_DIR}`);
}

main().catch(console.error);
