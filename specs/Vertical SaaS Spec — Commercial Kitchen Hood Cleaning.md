# Commercial Kitchen Hood Cleaning SaaS

## Product Concept

A mobile-first job documentation and recurring-service system built specifically for commercial kitchen exhaust/hood cleaning companies.

**Core promise:** A technician finishes the cleaning, documents the job on their phone, and the finished customer report is essentially done.

This is **not** meant to become a generic field-service CRM.

## Target Customer

Primary:

- Independent commercial kitchen exhaust cleaning companies
- Roughly 1–20 technicians
- Owner-operated or small office staff
- Recurring restaurant/commercial kitchen clients

Best initial customer:

- 2–8 technicians
- 50–500 recurring locations
- Currently uses paper, Google Drive, generic field-service software, Word/PDF templates, or an awkward combination
- Owner or office worker manually assembles reports after jobs

## Core Workflow

### Before Job

Technician opens:

**Today's Jobs**

Selects:

**Restaurant → Location → Exhaust System**

System displays:

- Site information
- Contact
- Last cleaning
- Last report
- Known system notes
- Previous deficiencies
- Required photos/checklist
- Scheduled service frequency

### During Job

Technician records:

- Arrival time
- System serviced
- Before photos
- Cleaning checklist
- Areas/components cleaned
- Areas inaccessible
- Deficiencies/problems
- After photos
- Technician notes
- Recommendations

Photos automatically attach to the correct job rather than requiring later organization.

### Job Completion

Technician:

- Reviews job
- Gets customer/manager signature if required
- Marks complete

System automatically:

1. Generates branded PDF service report.
2. Stores report under the restaurant/location.
3. Emails report to configured contacts.
4. Updates last-service date.
5. Calculates next scheduled service.
6. Places the location into the future service queue.

## MVP Features

### Dashboard

Show:

- Jobs today
- Jobs this week
- Overdue service
- Upcoming service
- Incomplete reports
- Open deficiencies

### Customers

Each customer can have multiple locations.

Store:

- Business name
- Location
- Contacts
- Billing contact
- Service contact
- Notes
- Default service interval

### Exhaust Systems

A location can contain multiple systems.

Store:

- Internal system ID
- Hood/location description
- Equipment notes
- Service interval
- Last cleaned
- Next due
- Photos
- Historical service records

### Job Documentation

Configurable checklist with:

- Pass/complete
- Not applicable
- Issue found
- Notes
- Required photo

Allow the company to customize its checklist.

### Photos

Critical feature.

Support:

- Before
- During
- After
- Deficiency
- Equipment/system
- Miscellaneous

Require specific photo categories if company settings demand them.

### Deficiencies

Technician can flag something such as:

- Inaccessible area
- Damaged component
- Heavy buildup
- Access problem
- Equipment issue
- Recommended repair/service

Each deficiency gets:

- Description
- Photos
- Severity
- Open/resolved status
- Resolution notes

### Reports

Automatically generate branded PDFs containing:

- Contractor information
- Customer
- Site
- Service date
- Technician
- Systems serviced
- Checklist results
- Before/after photos
- Deficiencies
- Notes
- Signature
- Recommended next service date

### Recurrence

Support:

- Fixed monthly intervals
- Number-of-month intervals
- Custom next-service date
- Manually assigned schedules

Dashboard should answer:

**Who needs to be serviced soon?**

## Phase 2

After customers start paying:

- Route planning
- QuickBooks integration/export
- SMS/email service reminders
- Customer portal
- QR codes attached to individual systems
- Multi-crew dispatching
- Report customization
- Bulk customer import
- Recurring contracts
- Automated quote generation
- Deficiency follow-up
- Before/after comparison interface

## Do NOT Build Initially

No:

- Payroll
- Full bookkeeping
- AI receptionist
- Generic CRM automations
- Employee time-clock system
- Inventory management
- Marketing automation
- Website builder
- Complicated AI features

Integrate with existing systems instead.

## Suggested Pricing

### Solo — $39/month

- 2 users
- Unlimited customers
- Job reports
- Photos
- Scheduling
- Basic recurring service

### Team — $69/month

- 6 users
- Custom branding
- Automated report delivery
- Advanced recurring-service dashboard
- Deficiency management
- Data export

### Pro — $119/month

- 15 users
- Multiple crews
- Customer portal
- Advanced permissions
- Integrations
- Priority support

Potential additional-user charge after limits.

## Best Sales Questions

Do not open with a software pitch.

Ask:

“How are you guys putting together your service reports right now?”

Then:

“How much work happens after the technician actually finishes cleaning?”

“What do your guys do with all their before-and-after photos?”

“Does someone in the office have to assemble the report afterward?”

“How do you know which restaurants are coming due?”

“What software are you using now?”

“Do you actually like it?”

## Core Demo

Keep the demo under five minutes.

1. Open scheduled restaurant.
2. Take simulated before photos.
3. Complete checklist.
4. Add deficiency.
5. Take after photos.
6. Sign.
7. Press Complete.
8. Show finished PDF.
9. Show next cleaning automatically scheduled.

That is the sale.

## Homepage Positioning

**Finish the hood. Finish the paperwork.**

Mobile service reports, before-and-after documentation, deficiencies, and recurring cleaning schedules built specifically for commercial kitchen exhaust cleaners.

## Validation Threshold

Before aggressively expanding:

- 20+ operator conversations
- 5+ people independently describing the same pain
- 3 paying customers
- At least 2 customers using it repeatedly without you reminding them

The key metric is not signups.

It is:

**completed real-world service reports per week.**