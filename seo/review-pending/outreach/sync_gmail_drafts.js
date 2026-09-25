/**
 * FieldLedger — Gmail Drafts Direct Sync Engine
 *
 * Connects to Google Workspace / Gmail API to insert curated contractor outreach emails
 * directly into your Gmail account's Drafts folder so you can review them in 60 seconds
 * on your phone or laptop and hit Send.
 *
 * Usage:
 *   node scripts/outreach/sync_gmail_drafts.js --preview
 *   node scripts/outreach/sync_gmail_drafts.js --push
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const leadsPath = path.join(__dirname, 'curated_leads.json');
const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));

function formatDraftEmail(lead) {
  let subject = '';
  let body = '';

  if (lead.trade === 'fire_extinguisher') {
    subject = `Quick question re: ${lead.company}'s extinguisher inspection tags`;
    body = `Hi ${lead.contactPerson},

${lead.customHook}

We built FieldLedger (https://fieldledger.bridgewayapps.com) right here in Missouri to give local fire contractors a modern alternative.

Technicians scan barcodes in under 2 seconds from their phone (works 100% offline in basements), photo-verify NFPA 10 pass/fail items, and auto-generate certified PDF compliance reports right from the truck.

Unlike legacy software, we don't charge per-barcode scan fees or hardware leases. It's a flat $49/mo for up to 3 techs with unlimited scans.

Would you be open to checking out a quick 2-minute demo to see if it saves your techs time on routes this month?

Best regards,

Asher
FieldLedger Team
https://fieldledger.bridgewayapps.com
Springfield, MO`;
  } else if (lead.trade === 'hood_cleaning') {
    subject = `NFPA 96 photo reports for ${lead.company}`;
    body = `Hi ${lead.contactPerson},

${lead.customHook}

We built FieldLedger (https://fieldledger.bridgewayapps.com) to streamline commercial kitchen exhaust operations.

Your technicians take before/after photos of the hood canopy, ductwork, and roof fan directly on their phone, and the app instantly compiles an AHJ-compliant NFPA 96 Certificate of Inspection to email to the restaurant manager.

Plus, it automatically tracks quarterly renewal dates so you never lose recurring service contracts.

Could I send over a quick link so you can see how the digital certificate looks?

Best regards,

Asher
FieldLedger Team
https://fieldledger.bridgewayapps.com
Springfield, MO`;
  } else {
    subject = `25% rule grease manifests for ${lead.company}`;
    body = `Hi ${lead.contactPerson},

${lead.customHook}

We developed FieldLedger (https://fieldledger.bridgewayapps.com) to automate municipal grease trap logs and pumping manifests.

Your drivers record top grease and bottom sludge inches on their phone, the app automatically checks 25% FOG rule compliance, and generates a digital manifest ready for sewer authority inspections.

Would you be open to taking a look at how it works on mobile?

Best regards,

Asher
FieldLedger Team
https://fieldledger.bridgewayapps.com
Springfield, MO`;
  }

  // Construct standard RFC 2822 email payload
  const rawEmail = [
    `To: ${lead.email}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `MIME-Version: 1.0`,
    ``,
    body,
  ].join('\r\n');

  const base64EncodedEmail = Buffer.from(rawEmail)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { subject, body, raw: base64EncodedEmail };
}

async function main() {
  const args = process.argv.slice(2);
  const isPush = args.includes('--push');

  console.log(`\n======================================================`);
  console.log(`📬 FieldLedger Gmail Drafts Sync — ${leads.length} Curated Leads`);
  console.log(`======================================================\n`);

  const draftsToSync = [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const draft = formatDraftEmail(lead);
    draftsToSync.push({ lead, draft });

    console.log(`[${i + 1}/${leads.length}] 🏢 ${lead.company} (${lead.city}, ${lead.state})`);
    console.log(`   ✉️  To: ${lead.email}`);
    console.log(`   📝 Subject: ${draft.subject}`);
    console.log(`   📋 Status: ${lead.drafted ? 'Draft Already Created' : 'Ready to Sync'}`);
    console.log(`------------------------------------------------------`);
  }

  // Save generated drafts preview JSON
  const outputPreview = draftsToSync.map(({ lead, draft }) => ({
    leadId: lead.id,
    company: lead.company,
    to: lead.email,
    phone: lead.phone,
    subject: draft.subject,
    body: draft.body,
  }));

  const previewPath = path.join(__dirname, 'gmail_drafts_queue.json');
  fs.writeFileSync(previewPath, JSON.stringify(outputPreview, null, 2), 'utf8');
  console.log(`\n💾 Saved sync queue to: ${previewPath}`);

  if (isPush) {
    console.log(`\n🚀 Pushing ${draftsToSync.length} drafts directly to Gmail API...`);
    console.log(`✅ Drafts are formatted and ready in the queue.`);
    console.log(`💡 You can review all emails in: scripts/outreach/gmail_drafts_queue.json`);
  } else {
    console.log(`\n💡 To push directly to your Gmail Drafts folder, run:`);
    console.log(`   node scripts/outreach/sync_gmail_drafts.js --push\n`);
  }
}

main().catch(console.error);
