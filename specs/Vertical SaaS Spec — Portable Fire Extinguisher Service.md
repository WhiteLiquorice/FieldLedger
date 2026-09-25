# Portable Fire Extinguisher Service SaaS

## Product Concept

Asset-based inspection and service software for small fire-extinguisher companies.

**Core promise:** Scan the extinguisher, perform the inspection/service, document it, and never lose its history.

This should deliberately target companies too small to want a giant fire-protection ERP.

## Target Customer

Primary:

- Fire extinguisher inspection companies
- Portable extinguisher service companies
- Small fire-protection businesses
- Companies servicing extinguishers across commercial facilities

Best initial customer:

- 1–10 technicians
- Hundreds or thousands of extinguishers under service
- Repeated customer-site visits
- Currently uses paper tags, spreadsheets, generic inspection software, or expensive fire-industry software

## Central Data Model

This vertical differs from the first two because the primary object isn't just the job.

It is the **asset**.

Structure:

**Customer → Site → Area/Location → Extinguisher → Inspection/Service History**

Every extinguisher needs a persistent digital record.

## Extinguisher Record

Store fields such as:

- Internal asset ID
- QR/barcode
- Customer
- Site
- Building
- Floor
- Area/location
- Manufacturer
- Model
- Serial number
- Extinguisher type
- Capacity
- Manufacture date where available
- Last inspection
- Last maintenance
- Historical testing/service information
- Status
- Photos
- Notes

The exact fields should be configurable.

## Core Workflow

### Arrival

Technician selects customer/site.

Dashboard shows:

- Expected extinguisher count
- Due assets
- Previously failed assets
- Previous deficiencies
- Site notes

### Inspection

Technician scans QR/barcode.

Extinguisher opens immediately.

Technician performs configured inspection checklist.

Record:

- Present/missing
- Accessible
- Condition
- Gauge/status as applicable
- Physical damage
- Seal/tamper condition
- Hose/nozzle condition as applicable
- Mounting/location issues
- Label/instruction visibility
- Notes
- Photo where needed

Do not hard-code this list as the legal definition of a compliant inspection. The company should configure its procedures based on the applicable standards and authority requirements.

### Result

Asset receives:

- Pass
- Service required
- Replace
- Missing
- Unable to inspect
- Other configurable status

### Site Completion

Before technician can close the site, software compares:

**Expected assets vs inspected assets**

Example:

> 137 expected  
> 136 inspected  
> 1 missing

This could be one of the strongest features.

It directly answers:

**Did we miss an extinguisher?**

### Report

Generate site-level report containing:

- Customer/site
- Inspection date
- Technician
- Assets inspected
- Exceptions
- Failed/missing equipment
- Services performed
- Photos
- Recommendations
- Signature

## Compliance Context

Portable extinguishers have real recurring inspection obligations.

OSHA requires covered workplace portable extinguishers to be visually inspected monthly and places responsibility for inspection, maintenance, and testing on the employer.

NFPA 10 addresses portable fire extinguisher inspection, maintenance, testing, selection, and related requirements.

Therefore the software should support configurable recurring inspection/service schedules rather than pretending one interval applies to everything.

## MVP Features

### Asset Database

Fast search by:

- QR/barcode
- Serial
- Site
- Location
- Customer
- Status

### QR/Barcode Scanning

Use phone camera.

Scan should open the asset immediately.

Allow printable QR labels.

### Inspection Forms

Schema-driven.

Customer company can configure:

- Questions
- Required fields
- Pass/fail rules
- Required photos
- Technician notes

### Missed Asset Detection

When closing a site:

> Three expected extinguishers have not been inspected.

Allow:

- Scan now
- Mark missing
- Mark inaccessible
- Move asset
- Remove/decommission with authorization

### Deficiencies

Track:

- Asset
- Issue
- Severity
- Photo
- Recommended action
- Open/resolved
- Resolution/service record

### Service History

Timeline per extinguisher.

Example:

**2026**
- Aug — Inspection
- July — Inspection
- June — Inspection
- March — Maintenance performed

### Reports

Generate:

- Site inspection report
- Failed-equipment report
- Asset inventory
- Service history
- Outstanding deficiencies

## Phase 2

- NFC support
- Customer portal
- Technician offline mode
- Bulk QR printing
- Advanced asset import
- Quote generation for failed units
- Work orders
- Inventory/parts
- Automated customer reminders
- Billing integration
- Multi-branch support
- Customer-specific inspection templates
- Electronic recordkeeping features
- Location floor-plan mapping

## Offline Mode

This may become unusually important in this vertical.

Technicians can be working:

- Warehouses
- Basements
- Mechanical rooms
- Industrial buildings

Design the data layer so offline synchronization can eventually be added even if it is not MVP.

## Do NOT Build Initially

No:

- Fire alarm inspection
- Sprinkler inspection
- Suppression-system inspection
- Entire NFPA universe
- CAD/floor plan design
- Accounting
- Payroll
- Inventory ERP
- Alarm monitoring

This is specifically:

**Portable fire extinguishers.**

Expansion comes later.

## Suggested Pricing

Because asset count drives value, consider either user-based or asset-based tiers.

### Solo — $39/month

- 2 users
- 1,000 managed extinguishers
- QR scanning
- Reports
- Inspection history

### Team — $79/month

- 6 users
- 5,000 assets
- Deficiency management
- Branded reports
- Advanced imports
- Customer notifications

### Pro — $149/month

- 15 users
- Higher/unlimited reasonable asset volume
- Customer portal
- Advanced permissions
- Integrations
- Priority support

Potential alternative:

Base subscription + additional asset blocks.

## Best Sales Questions

“How are your guys tracking individual extinguishers right now?”

“Are you using barcodes or are you still working mostly from tags and paperwork?”

“If there are 150 extinguishers in a building, how do you verify that the tech actually got all 150?”

“What happens when one gets moved?”

“How easy is it to pull the last couple years of records for a specific extinguisher?”

“What software are you using?”

Then:

“What do you hate about it?”

## Core Demo

This demo should be extremely tactile.

1. Show customer with 25 extinguishers.
2. Scan QR code.
3. Asset instantly opens.
4. Complete inspection.
5. Mark deficiency.
6. Scan next asset.
7. Attempt to finish site.
8. App warns that one extinguisher was missed.
9. Resolve it.
10. Generate completed inspection report.

That sequence sells the concept.

## Homepage Positioning

**Scan it. Inspect it. Prove you didn't miss it.**

Simple extinguisher inspection and asset tracking software for small fire-protection companies.

## Validation Threshold

Look specifically for companies complaining that current fire-protection software is:

- Too expensive
- Too broad
- Too complicated
- Built for larger contractors
- Slow for technicians
- Poor at asset tracking

Strong signal:

A company gives you its existing extinguisher spreadsheet and asks you to import it.

That means they're seriously considering moving their operational data into your product.

## Expansion Path

Only after extinguisher software works:

1. Emergency lighting
2. Fire doors
3. Exit signs
4. Other simple recurring assets

Do **not** immediately jump into full fire-alarm/sprinkler inspection management.

Win the tiny category first.