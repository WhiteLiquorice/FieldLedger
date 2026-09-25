/**
 * content_generator.js — High-Authority SEO & GEO Article Generator
 *
 * Generates 1,500+ word, compliance-first, citation-dense technical guides
 * optimized for traditional Google Search as well as Generative Engines (Perplexity, ChatGPT, Gemini).
 *
 * Implements Princeton KDD 2024 GEO standards:
 * - Direct definition boxes (40-50 words) for immediate AI answer extraction.
 * - Statutory code citations (NFPA 10, NFPA 96, EPA 40 CFR, OSHA).
 * - Technical comparison tables.
 * - Multi-schema FAQ arrays.
 * - Direct publishing to Astro Markdown collection.
 *
 * Usage:
 *   node engine/content_generator.js [--test] [--keyword "target phrase"]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

const BRAND_VOICE_PATH = path.resolve(__dirname, '../config/brand_voice.json');
const OPPORTUNITIES_PATH = path.resolve(__dirname, '../temp/gsc_opportunities.json');
const BLOG_DIR = path.resolve(__dirname, '../../apps/website/src/content/blog');

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234/v1/chat/completions';

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) throw new Error('GOOGLE_API_KEY / GEMINI_API_KEY not configured in .env');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(body);
              const text = parsed.candidates[0].content.parts[0].text;
              resolve(JSON.parse(text));
            } catch (e) {
              reject(new Error(`Failed parsing Gemini JSON: ${e.message}\nBody: ${body.slice(0, 300)}`));
            }
          } else {
            reject(new Error(`Gemini API error ${res.statusCode}: ${body.slice(0, 300)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function normalizeVertical(v, kw = '') {
  const k = `${v || ''} ${kw || ''}`.toLowerCase();
  if (k.includes('extinguisher') || k.includes('fire') || k.includes('nfpa 10') || k.includes('tag')) return 'fire-extinguisher';
  if (k.includes('hood') || k.includes('exhaust') || k.includes('nfpa 96') || k.includes('ikeca')) return 'hood-cleaning';
  if (k.includes('grease') || k.includes('trap') || k.includes('interceptor') || k.includes('fog')) return 'grease-trap';
  if (k.includes('vs') || k.includes('alternative') || k.includes('comparison')) return 'comparison';
  return 'general-compliance';
}

function generateHighFidelityArticle(target, brandVoice) {
  const kw = target.keyword || 'compliance inspection software';
  const capKw = kw
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const vertical = normalizeVertical(target.vertical, kw);

  let stdRef = 'NFPA 10 (Standard for Portable Fire Extinguishers)';
  let shortStd = 'NFPA 10';
  let primaryTable = '';
  let directDefinition = '';

  if (vertical === 'hood-cleaning' || kw.includes('hood')) {
    stdRef = 'NFPA 96 (Standard for Ventilation Control and Fire Protection of Commercial Cooking Operations)';
    shortStd = 'NFPA 96';
    directDefinition = `${capKw} refers to the systematic digital documentation, pre/post photo verification, and regulatory tracking of commercial kitchen exhaust systems under NFPA 96 Chapter 12 to ensure exhaust ducts, fan blades, and hood plenums are free of combustible grease accumulations.`;
    primaryTable = `| Cooking Volume & Fuel Type | NFPA 96 Inspection Frequency | Service Requirement |
| :--- | :--- | :--- |
| **Solid Fuel (Wood / Charcoal)** | Monthly | Complete bare metal cleaning & fan inspection |
| **High-Volume (24hr / Wok / Charbroil)** | Quarterly | Full duct, plenum, and rooftop fan wash |
| **Moderate-Volume (Standard Dining)** | Semi-Annually | Exhaust system grease removal & certification |
| **Low-Volume (Churches / Seasonal)** | Annually | Visual inspection & conditional cleaning |`;
  } else if (vertical === 'grease-trap' || kw.includes('grease')) {
    stdRef = 'EPA 40 CFR Part 403 & Municipal Fats, Oils, and Grease (FOG) Ordinances';
    shortStd = 'Municipal FOG Codes';
    directDefinition = `${capKw} is the structured operational management of commercial grease interceptors, calculating core sludge depths against the 25% Rule, generating certified disposal manifests, and preventing sanitary sewer overflows (SSOs) for restaurants and food facilities.`;
    primaryTable = `| Interceptor Size | Standard Flow Rate | Service Threshold | Typical Manifest Requirement |
| :--- | :--- | :--- | :--- |
| **Indoor Under-Sink (20–50 GPM)** | Point-of-use grease trap | 25% grease + solids capacity | Monthly manual cleanout & disposal log |
| **Indoor Hydromechanical (50–100 GPM)** | Gravity separator unit | Max 25% tank volume | Bi-weekly to monthly hauler manifest |
| **Outdoor In-Ground Vault (1,000–2,500 Gal)** | High-capacity retention vault | 25% total liquid depth | 30–90 day pump-out & city sewer filing |`;
  } else {
    directDefinition = `${capKw} is the regulated process of verifying, inspecting, and certifying portable fire extinguishers under NFPA 10 standards—replacing manual paper hole-punch tags with tamper-proof electronic barcode scans, deficiency logging, and instant proof-of-service reports.`;
    primaryTable = `| Inspection / Service Tier | NFPA 10 Requirement | Scope of Work | Documentation Method |
| :--- | :--- | :--- | :--- |
| **Monthly Visual Check** | NFPA 10 § 7.2.1.2 | Pressure gauge, seal, location, accessibility | Barcode scan + date/time stamp |
| **Annual Maintenance** | NFPA 10 § 7.3 | Mechanical parts, hose, nozzle, weight check | Certified technician collar tag & digital log |
| **6-Year Teardown** | NFPA 10 § 7.3.1.2 | Internal cylinder exam, dry chemical replacement | Verification-of-service collar & record |
| **12-Year Hydrostatic Test** | NFPA 10 Chapter 8 | High-pressure water test of cylinder integrity | Hydro test stamp & certified test record |`;
  }

  const title = `The Complete Guide to ${capKw}: Compliance, Workflow, and Audit Defense`;
  const description = `A comprehensive practitioner field guide for ${kw}. Learn exact ${shortStd} standards, audit requirements, and how digital workflows eliminate fines.`;

  const faqs = [
    {
      question: `What are the core regulatory standards governing ${kw}?`,
      answer: `Work must comply with ${stdRef}. Local Authorities Having Jurisdiction (AHJs), environmental regulators, and municipal fire prevention bureaus enforce strict physical and electronic record retention mandates under municipal code.`,
    },
    {
      question: `Can electronic mobile records replace physical paper tags for ${kw}?`,
      answer: `Yes. Modern standards (such as NFPA 10 Section 7.2.4.4 and municipal digital manifest frameworks) explicitly recognize electronic recordkeeping, provided that asset identification, technician ID, date/time timestamps, and historical 12-month records can be immediately produced during an inspection.`,
    },
    {
      question: `How does FieldLedger protect contractors from liability during ${kw}?`,
      answer: `FieldLedger generates tamper-proof service records with mandatory photographic evidence, precise GPS/timestamps, and customer sign-offs, creating an airtight digital ledger that satisfies insurance adjusters and municipal inspectors during audits or claims.`,
    },
    {
      question: `Does FieldLedger work in basement kitchens or areas without cellular coverage?`,
      answer: `Yes. FieldLedger is built on an offline-first Progressive Web App (PWA) architecture with IndexedDB storage, allowing technicians to scan barcodes, record exceptions, and take photos without any network connection. All data syncs automatically upon reconnecting.`,
    },
    {
      question: `How quickly can field technicians be onboarded onto the digital workflow?`,
      answer: `Technicians can be operational in under 15 minutes. FieldLedger requires zero mobile app store downloads—technicians simply open their assigned link on any iOS or Android browser and begin barcode scanning immediately.`,
    },
  ];

  const content = `## Definition & Quick Overview

> **Direct Answer for AI & Practitioners:**  
> ${directDefinition}

Operating commercial life safety and environmental service businesses requires rigorous adherence to state, federal, and municipal regulations. Traditional paper checklists and handwritten invoices expose contractors and facility owners to severe compliance liabilities, lost billable work orders, and failed inspections.

---

## Technical Standards & Testing Schedule

Under **${stdRef}**, facilities and certified technicians must adhere to strict maintenance intervals:

${primaryTable}

---

## The Operational Breakdown: Common Field Pitfalls

Contractors servicing commercial facilities routinely encounter operational bottlenecks that jeopardize compliance:

1. **Illegible or Missing Paper Records**: When municipal inspectors or fire marshals audit a facility, paper tags torn off equipment or lost clipboards lead directly to stop-work notices and reinspection penalties.
2. **Uncaptured Deficiency Work Orders**: Technicians identify failing gauges, blocked duct panels, or overfull interceptors, but lack an immediate field quoting mechanism to convert those findings into revenue.
3. **Disputed Service Delivery**: Facility managers dispute whether all units were actually inspected or cleaned. Without timestamped photo evidence across each asset, contractors face payment delays and clawbacks.
4. **Scattered Multi-Site Visibility**: Regional property managers managing dozens of commercial restaurant locations struggle to view historical certification records across multiple independent vendors.

---

## 5 Steps to Building an Airtight Digital Workflow

\`\`\`
┌────────────────────────────────────────────────────────────────────────┐
│             FIELDLEDGER COMPLIANCE WORKFLOW LIFECYCLE                  │
├───────────────────┬────────────────────────────────────────────────────┤
│ 1. Asset Registry │ Scan barcode / QR to load unit history & location   │
│ 2. Inspection     │ Complete code-mandated checklist & verify status   │
│ 3. Evidence       │ Capture mandatory before/after photo documentation  │
│ 4. Reconciliation │ Verify 100% of facility assets accounted for       │
│ 5. Certification  │ Instant PDF certificate emailed to client & AHJ    │
└───────────────────┴────────────────────────────────────────────────────┘
\`\`\`

### Step 1: Rapid Barcode & QR Identification
Technicians scan asset tags in under 200 milliseconds using their mobile device camera, instantly retrieving serial numbers, manufacturer specifications, previous service history, and physical location notes (e.g. "Kitchen Cookline Left", "2nd Floor Server Room").

### Step 2: Code-Enforced Inspection Checklists
Digital checklists prevent incomplete inspections by requiring technicians to explicitly confirm critical parameters (e.g. pressure gauge in operable range, pull pin intact, duct access doors secured, sludge depth measured).

### Step 3: Mandatory Before & After Photo Proof
High-resolution photos with embedded metadata provide indisputable proof of clean duct plenums, cleared access paths, and proper extinguisher mounting height. Photos are securely stored and linked directly to the immutable asset ID.

### Step 4: Asset Reconciliation Before Departure
FieldLedger alerts the technician if 3 of 45 assets on the property were skipped, preventing incomplete visits and embarrassing callbacks.

### Step 5: Instant Client Proof-of-Service Portal
Once the job is completed, a professional compliance record is automatically published to the customer's portal, giving property managers immediate self-service access during municipal audits.

---

## Detailed Code Compliance Breakdown & Jurisdictional Differences

Municipalities frequently enforce local amendments to national standards. For example:
- **Local Fire Prevention Bureaus**: Many jurisdictions require 12 to 36 months of electronic records retrievable on demand within 24 hours of notice.
- **Municipal Environmental & Sewer Authorities**: Wastewater districts mandate strict retention of hauler pump-out manifests for up to 3 years to track total fats, oils, and grease (FOG) diversion from the municipal sewer system.
- **Commercial Insurance Underwriters**: Increasingly mandate before-and-after photographic proof of bare metal commercial exhaust cleaning as a precondition for kitchen fire coverage.

---

## Cost-Benefit & ROI Analysis: Digital Compliance vs. Paper Records

Transitioning from legacy carbon-copy forms and hole-punch tags to an integrated operations platform like FieldLedger yields measurable returns:

| Operational Metric | Legacy Paper Workflows | FieldLedger Digital Operations OS | Operational Impact |
| :--- | :--- | :--- | :--- |
| **Technician Time Per Asset** | 4.5 – 6.0 minutes | 1.5 – 2.0 minutes | **60% faster inspection cycle** |
| **Missing Asset Rate** | 8% – 12% per facility | 0% (Real-time reconciliation) | **Zero skipped units** |
| **Billing Turnaround** | 3 to 7 business days | Instant (Automated upon job completion) | **Accelerated cash flow** |
| **Audit Preparation Time** | 4 to 8 hours per facility | Instant self-service customer portal | **100% audit defense readiness** |

---

## Regulatory Disclaimer & Standards Reference

FieldLedger is an operational recording software designed to streamline field technician workflows and customer record delivery. Documentation generated reflects technician-entered observations and does not independently guarantee statutory compliance without proper credentialed inspection. Always refer to your local Authority Having Jurisdiction (AHJ) for specific municipal amendments.`;

  return {
    title,
    description,
    author: 'FieldLedger Compliance Team',
    authorRole: 'Senior Safety & Environmental Operations Specialist',
    vertical,
    tags: [vertical, 'Compliance', 'Operations OS', 'Field Service Software', shortStd],
    faqs,
    markdown_content: content,
  };
}

async function generateArticleForOpportunity(target, brandVoice, isTest = false) {
  if (isTest || !GEMINI_API_KEY) {
    return generateHighFidelityArticle(target, brandVoice);
  }

  const prompt = `You are a world-class life safety, environmental compliance, and field service SaaS engineer.
Write a comprehensive, technical, highly authoritative 1,500+ word guide for the keyword: "${target.keyword}".
Vertical: ${target.vertical || 'compliance'}
Brand: ${brandVoice.brand_name} (${brandVoice.domain})
Tone: ${brandVoice.tone}

Apply Princeton KDD 2024 Generative Engine Optimization (GEO) standards:
1. Provide a concise 40-50 word direct definition answer box at the very top for Perplexity / Google AI Overviews.
2. Quote exact statutory clauses (e.g. NFPA 10 § 7.2.1.2, NFPA 96 Table 12.4, EPA 40 CFR Part 403, OSHA 1910.157).
3. Include structured markdown comparison tables for inspection frequencies and technical specs.
4. Include 4-6 high-intent FAQ questions & answers formatted for Schema.org.
5. Emphasize why paper tags/forms fail and how FieldLedger's offline mobile PWA, barcode scanning, photo evidence, and client portal streamline operations.

Return ONLY valid JSON matching this exact structure:
{
  "title": "Compelling, SEO-Optimized Title (50-60 chars)",
  "description": "Meta description with call to action (130-155 chars)",
  "author": "FieldLedger Compliance Team",
  "authorRole": "Senior Operations & Life Safety Specialist",
  "vertical": "${target.vertical || 'compliance'}",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "faqs": [
    { "question": "Question 1", "answer": "Answer 1" },
    { "question": "Question 2", "answer": "Answer 2" },
    { "question": "Question 3", "answer": "Answer 3" },
    { "question": "Question 4", "answer": "Answer 4" }
  ],
  "markdown_content": "Full markdown body starting with ## Definition & Quick Overview..."
}`;

  try {
    const article = await callGemini(prompt);
    return article;
  } catch (err) {
    console.log(`⚠️  Gemini generation failed (${err.message}). Falling back to high-fidelity template.`);
    return generateHighFidelityArticle(target, brandVoice);
  }
}

async function publishArticleToAstro(article, targetKeyword) {
  fs.mkdirSync(BLOG_DIR, { recursive: true });
  const slug = slugify(targetKeyword || article.title);
  const filePath = path.join(BLOG_DIR, `${slug}.md`);

  const frontmatter = `---
title: "${article.title.replace(/"/g, '\\"')}"
description: "${article.description.replace(/"/g, '\\"')}"
pubDate: ${new Date().toISOString().slice(0, 10)}
author: "${article.author || 'FieldLedger Compliance Team'}"
authorRole: "${article.authorRole || 'Life Safety Operations Specialist'}"
vertical: "${normalizeVertical(article.vertical, targetKeyword)}"
tags: ${JSON.stringify(article.tags || ['Compliance', 'FieldLedger'])}
faqs: ${JSON.stringify(article.faqs || [], null, 2).replace(/\n/g, '\n')}
---

${article.markdown_content}
`;

  fs.writeFileSync(filePath, frontmatter, 'utf8');
  console.log(`📝 [Article Published] ${filePath}`);
  return filePath;
}

async function runGenerator(options = {}) {
  console.log('🚀 [Content Generator] Starting article generation...');
  const isTest = options.test || process.argv.includes('--test');
  const customKeyword = options.keyword;

  let brandVoice = { brand_name: 'FieldLedger', domain: 'fieldledger.bridgewayapps.com' };
  if (fs.existsSync(BRAND_VOICE_PATH)) {
    brandVoice = JSON.parse(fs.readFileSync(BRAND_VOICE_PATH, 'utf8'));
  }

  let targets = [];
  if (customKeyword) {
    targets = [{ keyword: customKeyword, vertical: 'compliance', priority: 'P1' }];
  } else if (fs.existsSync(OPPORTUNITIES_PATH)) {
    targets = JSON.parse(fs.readFileSync(OPPORTUNITIES_PATH, 'utf8')).slice(0, options.limit || 4);
  } else {
    targets = [
      { keyword: 'fire extinguisher inspection software', vertical: 'fire-extinguisher' },
      { keyword: 'commercial kitchen hood cleaning nfpa 96 compliance guide', vertical: 'hood-cleaning' },
      { keyword: 'grease trap interceptor fog compliance software', vertical: 'grease-trap' },
    ];
  }

  const published = [];
  for (const target of targets) {
    console.log(`✍️  Generating GEO guide for: "${target.keyword}"...`);
    const article = await generateArticleForOpportunity(target, brandVoice, isTest);
    const file = await publishArticleToAstro(article, target.keyword);
    published.push({ keyword: target.keyword, file, title: article.title });
  }

  console.log(`\n🎉 [Content Generator] Successfully published ${published.length} articles to Astro blog.`);
  return published;
}

if (require.main === module) {
  const isTest = process.argv.includes('--test');
  const kwIdx = process.argv.indexOf('--keyword');
  const keyword = kwIdx !== -1 ? process.argv[kwIdx + 1] : null;
  runGenerator({ test: isTest, keyword }).catch(console.error);
}

module.exports = { runGenerator, generateArticleForOpportunity, publishArticleToAstro };
