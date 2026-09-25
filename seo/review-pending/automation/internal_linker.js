/**
 * internal_linker.js — Automated Topical Internal Link Matrix Engine
 *
 * Scans all published blog articles in the Astro content collection,
 * identifies matching topical entities, and automatically injects contextual
 * markdown internal links between related articles to maximize search equity.
 *
 * Usage:
 *   node engine/internal_linker.js [--dry-run]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.resolve(__dirname, '../../apps/website/src/content/blog');

function parseFrontmatterAndBody(fileContent) {
  const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: '', body: fileContent, raw: fileContent };
  return {
    frontmatter: match[1],
    body: match[2],
    raw: fileContent,
  };
}

function extractArticleMetadata() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
  const articles = [];

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const content = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
    const { frontmatter, body } = parseFrontmatterAndBody(content);

    const titleMatch = frontmatter.match(/title:\s*"([^"]+)"/);
    const tagsMatch = frontmatter.match(/tags:\s*(\[[^\]]+\])/);
    const title = titleMatch ? titleMatch[1] : slug.replace(/-/g, ' ');
    let tags = [];
    try {
      if (tagsMatch) tags = JSON.parse(tagsMatch[1]);
    } catch (_) {}

    // Derive target link phrases from title and slug
    const phrases = [title];
    if (slug.includes('nfpa-10')) phrases.push('NFPA 10', 'fire extinguisher inspection', 'fire extinguisher inspection guide');
    if (slug.includes('nfpa-96')) phrases.push('NFPA 96', 'kitchen hood cleaning', 'commercial kitchen exhaust cleaning');
    if (slug.includes('grease-trap') || slug.includes('25-percent')) phrases.push('grease trap', 'grease interceptor', '25% rule', 'FOG compliance');
    if (slug.includes('deficiency')) phrases.push('deficiency tracking', 'cure notice', 'deficiency resolution');

    articles.push({
      file,
      slug,
      title,
      tags,
      phrases: Array.from(new Set(phrases)),
      url: `/blog/${slug}`,
    });
  }

  return articles;
}

function linkArticles(dryRun = false) {
  console.log('🔗 [Internal Linker] Scanning blog catalog for link opportunities...');
  const articles = extractArticleMetadata();
  let totalLinksAdded = 0;

  for (const currentArticle of articles) {
    const filePath = path.join(BLOG_DIR, currentArticle.file);
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const { frontmatter, body } = parseFrontmatterAndBody(rawContent);

    let updatedBody = body;
    let articleLinksAdded = 0;
    const linkedSlugs = new Set();

    for (const targetArticle of articles) {
      // Don't link to self
      if (targetArticle.slug === currentArticle.slug) continue;
      if (linkedSlugs.has(targetArticle.slug)) continue;

      for (const phrase of targetArticle.phrases) {
        // Look for phrase if not already inside a markdown link [text](url) or code block
        const escaped = escapeRegExp(phrase);
        const regex = new RegExp('(?<!\\[|/|#|`)\\b' + escaped + '\\b(?![\\)\\]`])', 'i');

        if (regex.test(updatedBody) && !linkedSlugs.has(targetArticle.slug)) {
          // Replace only the FIRST occurrence
          let replaced = false;
          updatedBody = updatedBody.replace(regex, (match) => {
            if (replaced) return match;
            replaced = true;
            linkedSlugs.add(targetArticle.slug);
            articleLinksAdded++;
            return `[${match}](${targetArticle.url})`;
          });
          if (replaced) break;
        }
      }
    }

    if (articleLinksAdded > 0) {
      totalLinksAdded += articleLinksAdded;
      console.log(`  + Added ${articleLinksAdded} contextual link(s) to: ${currentArticle.slug}`);

      if (!dryRun) {
        const newContent = `---\n${frontmatter}\n---\n${updatedBody}`;
        fs.writeFileSync(filePath, newContent, 'utf8');
      }
    }
  }

  console.log(`\n🎉 [Internal Linker] Completed. Total internal links added: ${totalLinksAdded} ${dryRun ? '(Dry Run)' : ''}`);
  return { totalLinksAdded, articlesProcessed: articles.length };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  linkArticles(isDryRun);
}

module.exports = { linkArticles, extractArticleMetadata };
