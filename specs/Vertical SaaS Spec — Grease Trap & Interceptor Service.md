# Grease Trap & Interceptor Service SaaS

## Product Concept

A recurring-service, route, documentation, and disposal-record platform specifically for grease trap/interceptor pumping and cleaning companies.

**Core promise:** Never lose track of which restaurant needs service, what was pumped, what condition the interceptor was in, or where the waste went.

Of the three concepts, this may have the strongest opportunity to become extremely simple and extremely sticky.

## Target Customer

Primary:

- Grease trap cleaning companies
- Grease interceptor pumping companies
- Small FOG service businesses
- Waste haulers with substantial grease-service operations

Ideal initial profile:

- 1–10 trucks
- 50–1,000 recurring restaurant accounts
- Different customers on different service intervals
- Owner manually coordinates schedules/routes
- Uses calendar + spreadsheet + accounting software
- Needs service records or manifests

## Central Object Model

The product revolves around:

**Customer → Location → Interceptor/Trap → Service Events**

A restaurant chain may have many locations.

A location may have multiple traps/interceptors.

Each unit has its own service history.

## Core Workflow

### Scheduling

System determines which units are:

- Due today
- Due this week
- Due this month
- Overdue
- Approaching service date

Dispatcher assigns stops to truck/technician.

### At Site

Driver opens location.

System shows:

- Trap/interceptor
- Capacity
- Physical location
- Access instructions
- Last service
- Previous amount removed
- Previous condition
- Previous photos
- Customer-specific notes

### Service

Driver records:

- Arrival
- Equipment serviced
- Pump-out/cleaning performed
- Estimated or measured quantity removed
- Condition
- Problems discovered
- Before/after photos
- Notes
- Disposal destination if applicable
- Customer acknowledgement/signature

### Completion

System:

1. Generates proof-of-service/service record.
2. Updates equipment history.
3. Calculates next due date.
4. Stores disposal information.
5. Emails documentation.
6. Places account into future recurrence queue.

## MVP Features

### Recurring Service Dashboard

This is the killer feature.

Filters:

- Due next 7 days
- Due next 14 days
- Due next 30 days
- Overdue
- Unscheduled
- Recurring interval
- Geographic area

The owner should be able to wake up and immediately answer:

**What needs pumping?**

### Customer/Location Management

Store:

- Customer/company
- Restaurant/location
- Contacts
- Billing information
- Access instructions
- Service window
- Special notes

### Trap/Interceptor Records

Store:

- Type
- Capacity
- Location description
- Service frequency
- Installation/asset notes
- Last serviced
- Next due
- Historical service quantity
- Photos

### Service Record

Capture:

- Date/time
- Technician/driver
- Truck
- Unit
- Work performed
- Quantity
- Condition
- Waste type if relevant
- Photos
- Deficiencies
- Customer signature
- Disposal details

### Service Intervals

Support things like:

- Every 30 days
- Every 60 days
- Every 90 days
- Every X months
- Custom frequency
- Manually selected next date

Do not assume one nationwide regulatory interval.

### Documentation

Generate:

- Service receipt
- Detailed service report
- Customer history
- Pumping record
- Configurable waste/disposal manifest where appropriate

Allow fields/templates to vary because local wastewater authorities can impose different requirements.

EPA materials specifically note that required grease-interceptor/trap maintenance frequency can vary according to FOG generation and management practices, reinforcing why this should be configurable rather than hard-coded.

## Phase 2

- Route optimization
- Interactive map
- Disposal facility records
- Driver GPS
- Customer portal
- Automated “service due” outreach
- QuickBooks integration
- Recurring contracts
- Automated invoices
- Online customer scheduling
- QR codes
- Digital manifests
- Municipal reporting exports
- Bulk imports
- Tank-volume analytics
- Revenue-per-route dashboard

## Potential Killer Feature

### Smart Route Queue

Not some ridiculous LLM agent.

Take:

- Due dates
- Location
- Truck availability
- Customer service windows

Then propose:

**Tuesday Route**

1. Restaurant A
2. Restaurant B
3. Hotel C
4. Restaurant D
5. Disposal facility

Allow manual drag-and-drop.

This is an optimization problem, not an AI product.

## Do NOT Build Initially

No:

- Full fleet telematics
- Payroll
- General waste-management ERP
- Fuel-card management
- Accounting replacement
- AI receptionist
- Consumer booking marketplace
- Complex dispatch optimization

Start with:

**Recurring jobs + records + proof of service.**

## Suggested Pricing

### Solo — $39/month

- 1 truck
- Up to 2 users
- Recurring accounts
- Service history
- Reports

### Team — $79/month

- Up to 5 trucks/users
- Routing
- Automated reminders
- Branded reports
- Disposal records
- Exports

### Pro — $129/month

- Larger fleet
- Customer portal
- Advanced reporting
- Integrations
- Multiple dispatchers
- API/export features

I would seriously consider pricing this one by trucks rather than purely by users.

## Best Sales Questions

“How are you keeping track of which customers are due?”

“Do you have everybody on the same interval or are they all different?”

“What happens when you've got 100 or 200 recurring locations?”

“What does the driver have to document after pumping?”

“How are you keeping those service records?”

“Do you have to submit anything to the city or wastewater authority?”

“What are you using right now?”

Then the important one:

“What part of that process is the biggest pain in the ass?”

## Core Demo

1. Show 100 hypothetical restaurant accounts.
2. Dashboard identifies seven due this week.
3. Assign four to Tuesday route.
4. Open restaurant on driver's phone.
5. Record pump-out.
6. Add photo and quantity.
7. Customer signs.
8. Finish job.
9. Show documentation.
10. Show next service automatically scheduled.

## Homepage Positioning

**Know what needs pumped before your customers call you.**

Recurring grease-trap service, pumping records, route planning, and customer documentation in one simple system.

## Validation Threshold

Look for:

- Operators using spreadsheets/calendars
- Lots of different service intervals
- Manual paperwork
- Trouble coordinating recurring customers
- Municipal/disposal documentation burdens

Strong validation:

- 20 conversations
- 5 common-pain confirmations
- 3 paying companies
- At least one company imports a substantial existing customer list

That last one matters.

If a company trusts the system with 200 recurring accounts, you've built something sticky.