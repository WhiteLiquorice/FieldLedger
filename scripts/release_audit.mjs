import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'apps', 'website', 'dist');
const configText = fs.readFileSync(path.join(root, 'apps', 'website', 'astro.config.mjs'), 'utf8');
const siteMatch = configText.match(/site:\s*['"]([^'"]+)['"]/);
const site = new URL(siteMatch?.[1] || 'https://example.invalid');
const failures = [];
const requiredFiles = ['index.html', 'app/index.html', 'robots.txt', 'sitemap.xml', 'llms.txt'];
const bannedCopy = [
  /consumer saas/i,
  /ranked spec/i,
  /viral (?:hook|card|summary)/i,
  /legally owe/i,
  /official (?:dispute|evidence)/i,
  /certified evidence packet/i,
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(dist, file))) failures.push(`Missing release artifact: ${file}`);
}

function htmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'app' ? [] : htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

function routeFor(file) {
  const relative = path.relative(dist, file).replaceAll('\\', '/');
  if (relative === 'index.html') return '/';
  return `/${relative.replace(/\/index\.html$/, '').replace(/\.html$/, '')}`;
}

const pages = htmlFiles(dist);
const sitemap = fs.existsSync(path.join(dist, 'sitemap.xml'))
  ? fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8')
  : '';

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const route = routeFor(file);
  const expectedCanonical = new URL(route, site).href;
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
  if (!/<meta[^>]+name=["']description["'][^>]+content=["'][^"']{50,}/i.test(html)) failures.push(`${route}: missing useful meta description`);
  if (canonical !== expectedCanonical) failures.push(`${route}: canonical is ${canonical || 'missing'}, expected ${expectedCanonical}`);
  if (!/<meta[^>]+property=["']og:image["'][^>]+content=/i.test(html)) failures.push(`${route}: missing og:image`);
  if (!/<meta[^>]+name=["']twitter:image["'][^>]+content=/i.test(html)) failures.push(`${route}: missing twitter:image`);
  const schemas = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (schemas.length === 0) failures.push(`${route}: missing JSON-LD`);
  for (const [, schema] of schemas) {
    try { JSON.parse(schema); } catch { failures.push(`${route}: invalid JSON-LD`); }
  }
  for (const pattern of bannedCopy) {
    if (pattern.test(html)) failures.push(`${route}: customer-facing copy matches ${pattern}`);
  }
  if (route !== '/' && !sitemap.includes(expectedCanonical)) failures.push(`${route}: missing from sitemap`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Release audit passed for ${pages.length} marketing pages and /app/.`);
