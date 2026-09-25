/**
 * Technical SEO release audit for FieldLedger's four published pages.
 * Draft articles under seo/review-pending are intentionally excluded.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const WEBSITE = path.join(ROOT, 'apps/website');
const PAGES = [
  { file: 'index.astro', route: '/', vertical: null },
  { file: 'hood-cleaning.astro', route: '/hood-cleaning', vertical: 'hood_cleaning' },
  { file: 'fire-extinguisher.astro', route: '/fire-extinguisher', vertical: 'extinguisher' },
  { file: 'grease-trap.astro', route: '/grease-trap', vertical: 'grease_trap' },
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function check(condition, message, failures) {
  if (condition) console.log(`PASS  ${message}`);
  else {
    console.error(`FAIL  ${message}`);
    failures.push(message);
  }
}

function runAudit() {
  const failures = [];
  const baseLayout = read('apps/website/src/layouts/BaseLayout.astro');
  const sitemap = read('apps/website/src/pages/sitemap.xml.ts');
  const robots = read('apps/website/public/robots.txt');

  check(/rel="canonical"/.test(baseLayout), 'canonical URL is emitted', failures);
  check(/name="description"/.test(baseLayout), 'meta description is emitted', failures);
  check(/property="og:title"/.test(baseLayout), 'Open Graph metadata is emitted', failures);
  check(/name="twitter:card"/.test(baseLayout), 'Twitter card metadata is emitted', failures);
  check(/SchemaMarkup/.test(baseLayout), 'structured data is emitted', failures);
  check(/Sitemap:\s*https:\/\/fieldledger\.bridgewayapps\.com\/sitemap\.xml/i.test(robots), 'robots.txt advertises the sitemap', failures);

  for (const page of PAGES) {
    const pagePath = path.join(WEBSITE, 'src/pages', page.file);
    check(fs.existsSync(pagePath), `${page.route} source exists`, failures);
    if (!fs.existsSync(pagePath)) continue;
    const source = fs.readFileSync(pagePath, 'utf8');
    check(/title="[^"]*FieldLedger[^"]*"/.test(source), `${page.route} has a focused title`, failures);
    check(/description="[^"]{80,175}"/.test(source), `${page.route} has a useful meta description`, failures);
    check(page.route === '/' ? /<h1\b/.test(source) : /headline="[^"]+"/.test(source), `${page.route} defines a primary heading`, failures);
    check(sitemap.includes(`'${page.route === '/' ? '' : page.route}'`), `${page.route} is included in the sitemap`, failures);
    if (page.vertical) {
      check(source.includes(`vertical="${page.vertical}"`), `${page.route} preselects the correct onboarding workflow`, failures);
    }
  }

  const publishedSource = PAGES.map((page) => fs.readFileSync(path.join(WEBSITE, 'src/pages', page.file), 'utf8')).join('\n');
  check(!/guarantee(?:s|d)? compliance|certif(?:y|ies|ied) compliance/i.test(publishedSource), 'published pages avoid certification guarantees', failures);
  check(fs.existsSync(path.join(WEBSITE, 'public/llms.txt')), 'llms.txt exists', failures);
  check(fs.existsSync(path.join(WEBSITE, 'public/llms-full.txt')), 'llms-full.txt exists', failures);

  console.log(`\nTechnical SEO audit: ${failures.length ? `${failures.length} failure(s)` : 'all checks passed'}.`);
  if (failures.length) process.exitCode = 1;
  return { failures };
}

if (require.main === module) runAudit();

module.exports = { runAudit };
