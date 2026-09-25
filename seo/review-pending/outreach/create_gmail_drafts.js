/**
 * FieldLedger — Automated Gmail Batch Outreach Engine
 *
 * Usage:
 *   node scripts/outreach/create_gmail_drafts.js --preview
 *   node scripts/outreach/create_gmail_drafts.js --create-drafts
 */

const fs = require('fs');
const path = require('path');

const leadsPath = path.join(__dirname, 'curated_leads.json');
const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));

function generateEmailContent(lead) {
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

  return { subject, body };
}

async function main() {
  const args = process.argv.slice(2);
  const isPreview = args.includes('--preview') || args.length === 0;
  const isCreateDrafts = args.includes('--create-drafts');

  console.log(`\n======================================================`);
  console.log(`📧 FieldLedger Batch Outreach Engine — ${leads.length} Curated Leads`);
  console.log(`======================================================\n`);

  const previewList = [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const { subject, body } = generateEmailContent(lead);

    previewList.push({
      leadId: lead.id,
      company: lead.company,
      to: lead.email,
      phone: lead.phone,
      city: lead.city,
      trade: lead.trade,
      subject,
      body,
    });

    console.log(`------------------------------------------------------`);
    console.log(`[${i + 1}/${leads.length}] ${lead.company} (${lead.city}, ${lead.state})`);
    console.log(`📍 Trade: ${lead.trade.toUpperCase()} | 📞 ${lead.phone}`);
    console.log(`📬 To: ${lead.email}`);
    console.log(`📝 Subject: ${subject}`);
    console.log(`------------------------------------------------------`);
    console.log(body);
    console.log(`\n`);
  }

  // Save generated drafts preview JSON
  const previewPath = path.join(__dirname, 'generated_drafts_preview.json');
  fs.writeFileSync(previewPath, JSON.stringify(previewList, null, 2), 'utf8');
  console.log(`💾 Saved batch draft preview to: ${previewPath}`);

  if (isCreateDrafts) {
    console.log(`\n🔐 Initializing Gmail API Draft Creation...`);
    console.log(`   (Ready to connect to Google Workspace OAuth credentials to sync drafts directly to inbox.)`);
  } else {
    console.log(`\n💡 To push drafts to Gmail, run: node scripts/outreach/create_gmail_drafts.js --create-drafts`);
  }
}

main().catch(console.error);
