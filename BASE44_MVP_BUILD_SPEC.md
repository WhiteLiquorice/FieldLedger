# FieldLedger — Base44 Rough MVP Build Specification

**Purpose:** Build an independent, customer-testable interpretation of FieldLedger in Base44. This is a separate product opinion, not a port of the existing Firebase application and not a production certification.

**Version:** 1.0  
**Initial vertical:** Commercial kitchen exhaust and hood-cleaning service companies  
**Target operator:** Owner or dispatcher of a 2–15 person service company  
**Primary device:** Technician phone; owner/dispatcher desktop or tablet  
**MVP outcome:** One company can create a service location, schedule and assign work, complete it in the field with evidence, and retrieve a defensible service record.

---

## 1. Product thesis

FieldLedger is the operating record for a recurring field-service business. It replaces the operational gap between a calendar, text messages, paper checklists, camera rolls, and manually assembled customer reports.

The MVP must prove this loop:

> Define the asset → schedule the work → assign the technician → capture what happened → produce a durable service record → know what is due next.

It is not a generic CRM, project-management suite, accounting system, route optimizer, or AI assistant. It should feel purpose-built for field proof and recurring service.

### Product promise

“Every service visit, assigned, documented, and ready to prove.”

### Buyer and user

- **Buyer:** Owner/operator who is accountable for completed jobs, customer confidence, and repeat service.
- **Dispatcher/manager:** Schedules jobs, assigns technicians, and reviews exceptions.
- **Technician:** Executes a clear mobile workflow and leaves behind usable proof.

### Customer hypothesis to test

Small hood-cleaning companies will pay to reduce missing photos, inconsistent job documentation, status-checking calls, and manual report assembly.

Do not add another vertical or a vertical selector until real operators complete this workflow repeatedly.

---

## 2. Success criteria

The rough MVP is complete only when all of the following work in the published Base44 app:

1. A new owner can register and create a company workspace.
2. The owner can add at least one technician profile.
3. The owner can create a customer, site, and hood system.
4. The owner can create, schedule, and assign a job.
5. The assigned technician can see the job in **My Work** on a 390 px-wide phone viewport.
6. The technician can start the job, complete required checklist items, attach before-and-after photos, add notes, record an exception, and complete the job.
7. Completion creates an immutable service-record snapshot containing the job, customer, site, system, technician, timestamps, checklist responses, evidence links, and exceptions as they existed at completion.
8. The owner can see the completed record and use a clean print/download view.
9. The next-service date is calculated or explicitly set and appears in the due-work dashboard.
10. Data remains after logout, login, and page reload.
11. A technician cannot read or modify another company’s data or unassigned jobs.
12. Empty, loading, success, offline/network-error, permission-denied, and validation-error states are understandable.

These criteria define a **rough MVP**, not a production-ready SaaS. Payments, contractual readiness, backups, support operations, formal security review, and live customer canaries remain separate gates.

---

## 3. Scope

### Must build

- Authentication and company onboarding
- Company-scoped roles and access rules
- Team member profiles
- Customers and service sites
- Hood-system/service-unit records
- Job creation, scheduling, assignment, and lifecycle
- Mobile technician workflow
- Required checklist
- Before/after photo evidence
- Notes and exception capture
- Completion record and print-friendly report
- Recurring-service due dates
- Owner dashboard and activity trail
- Demo seed workspace isolated from real workspaces

### Explicit non-goals

- Invoicing, estimates, payments, payroll, or accounting sync
- Route optimization or GPS tracking
- Inventory and chemical usage
- Customer portal
- Native iOS/Android app
- Full offline mode
- AI-generated compliance claims or automatic photo interpretation
- Multi-vertical templates
- Public marketplace or lead generation
- SMS automation
- Custom domains and Stripe during the first build pass

Base44 currently produces a mobile-responsive web app/PWA, but its documentation says full offline mode and push notifications are not supported native features. Do not describe this MVP as offline-capable.

---

## 4. Information architecture

### Owner/dispatcher navigation

1. **Command Center**
2. **Schedule**
3. **Customers**
4. **Service Records**
5. **Team**
6. **Settings**

### Technician navigation

1. **My Work**
2. **Active Job**
3. **History**
4. **Profile**

Technicians must not see company configuration, all-customer lists, team administration, or other technicians’ work.

---

## 5. Data model

Use Base44 entities with explicit IDs, strict field types, required-field validation, timestamps, and row-level/field-level rules. Use references by stable ID, not display name. Every tenant-owned entity must include `companyId`.

### 5.1 Company

- `id`: UUID, primary key
- `name`: string, required
- `phone`: string
- `email`: string
- `timezone`: string, required
- `defaultServiceIntervalDays`: integer, default 180
- `status`: enum `active | suspended`
- `createdAt`, `updatedAt`: datetime

### 5.2 UserProfile

Do not use Base44’s protected built-in Users dataset as the application directory. Create a separate one-to-one profile entity.

- `id`: UUID
- `authUserId`: string, unique, required
- `companyId`: UUID, required
- `fullName`: string, required
- `email`: string, required
- `phone`: string
- `role`: enum `owner | dispatcher | technician`
- `status`: enum `invited | active | disabled`
- `createdAt`, `updatedAt`: datetime

### 5.3 Invitation

- `id`: UUID
- `companyId`: UUID
- `email`: string, normalized, required
- `role`: enum `dispatcher | technician`
- `tokenHash`: string; never expose to clients
- `expiresAt`: datetime
- `acceptedAt`: datetime, nullable
- `status`: enum `pending | accepted | expired | revoked`
- `invitedByProfileId`: UUID
- `createdAt`: datetime

If Base44 invitation automation is unreliable during the rough build, permit an owner to create a technician profile manually, but clearly label this as a temporary MVP constraint.

### 5.4 Customer

- `id`, `companyId`
- `name`: string, required
- `primaryContactName`, `email`, `phone`: string
- `status`: enum `active | inactive`
- `notes`: string
- timestamps

### 5.5 Site

- `id`, `companyId`, `customerId`
- `name`: string, required
- `address1`, `city`, `state`, `postalCode`: strings, required
- `contactName`, `contactPhone`: strings
- `accessInstructions`: string
- `serviceNotes`: string
- `status`: enum `active | inactive`
- timestamps

### 5.6 ServiceUnit

Represents a hood/exhaust system at one site.

- `id`, `companyId`, `customerId`, `siteId`
- `label`: string, required; e.g. `Kitchen Line A`
- `systemType`: enum `hood | exhaust_fan | duct_system | other`
- `manufacturer`, `model`, `serialNumber`: strings
- `locationDescription`: string
- `serviceIntervalDays`: integer, required
- `lastServicedAt`: datetime, nullable
- `nextServiceDueAt`: datetime, nullable
- `status`: enum `active | out_of_service | retired`
- timestamps

### 5.7 Job

- `id`, `companyId`, `customerId`, `siteId`, `serviceUnitId`
- `jobNumber`: human-readable unique company sequence
- `assignedTechnicianId`: UserProfile UUID
- `scheduledStart`, `scheduledEnd`: datetime
- `status`: enum `draft | scheduled | in_progress | blocked | completed | cancelled`
- `serviceType`: enum `routine_cleaning | inspection | callback | other`
- `scopeNotes`: string
- `startedAt`, `completedAt`: datetime, nullable
- `completionRecordId`: UUID, nullable
- `createdByProfileId`, `updatedByProfileId`: UUID
- timestamps

### 5.8 ChecklistTemplate

- `id`, `companyId`
- `name`, `version`: string
- `serviceType`: enum
- `items`: ordered array of `{key, label, responseType, required, evidenceRequired}`
- `active`: boolean
- timestamps

Seed one template with concrete hood-cleaning steps, but allow the owner to edit labels and required flags later.

### 5.9 ChecklistResult

- `id`, `companyId`, `jobId`, `templateId`, `templateVersion`
- `responses`: ordered array of `{itemKey, labelSnapshot, value, note, completedAt, completedByProfileId}`
- `isComplete`: boolean
- timestamps

### 5.10 Evidence

- `id`, `companyId`, `jobId`, `serviceUnitId`
- `kind`: enum `before_photo | after_photo | issue_photo | document`
- `fileUrl`: string, required
- `caption`: string
- `capturedAt`: datetime
- `uploadedByProfileId`: UUID
- `uploadStatus`: enum `pending | uploaded | failed`
- timestamps

Use private or access-controlled file handling where available. Never make job evidence publicly enumerable.

### 5.11 Exception

- `id`, `companyId`, `jobId`, `serviceUnitId`
- `category`: enum `access | damage | unsafe_condition | incomplete_scope | customer_request | other`
- `severity`: enum `info | needs_followup | blocks_completion`
- `description`: string, required
- `resolution`: string
- `status`: enum `open | resolved | accepted`
- `reportedByProfileId`: UUID
- timestamps

### 5.12 ServiceRecord

This is the durable completion snapshot. It should not reconstruct old reports from mutable customer or job data.

- `id`, `companyId`, `jobId`
- `recordNumber`: string, unique per company
- `completedAt`, `completedByProfileId`
- `customerSnapshot`: object
- `siteSnapshot`: object
- `serviceUnitSnapshot`: object
- `jobSnapshot`: object
- `checklistSnapshot`: object/array
- `evidenceSnapshot`: object/array of IDs, URLs, kinds, captions, timestamps
- `exceptionSnapshot`: object/array
- `nextServiceDueAt`: datetime
- `recordHash`: optional string generated by backend function
- `createdAt`: datetime

Disallow normal client update/delete after creation. Corrections should create an activity event and a new revision later; revision UI is outside this MVP.

### 5.13 ActivityEvent

- `id`, `companyId`
- `entityType`, `entityId`
- `eventType`: string
- `actorProfileId`: UUID
- `summary`: string
- `metadata`: object containing no secrets
- `occurredAt`: datetime

---

## 6. Authorization and tenant isolation

This is a hard requirement, not polish.

### Universal rules

- Require login for the app.
- Every tenant record is readable only when its `companyId` equals the authenticated user profile’s `companyId`.
- Never accept `companyId`, role, actor ID, completion timestamps, or record numbers as trusted client authority.
- Backend functions must derive identity and company from the authenticated session/profile.
- Owner can manage all company records and team roles.
- Dispatcher can manage customers, sites, systems, jobs, assignments, and view records; cannot change owner or billing fields.
- Technician can read their profile, assigned jobs, required related customer/site/system details, their checklist results/evidence/exceptions, and completed records for their own jobs.
- Technician can update a job only through allowed lifecycle actions on an assigned job.
- Completed ServiceRecords cannot be edited or deleted through the normal UI.
- Invitation token hashes and internal audit metadata must be field-level protected.

### Required adversarial checks

- Change a record ID in the browser URL and verify cross-company access is denied.
- Attempt to assign a job to a profile in another company.
- Attempt to send another company ID in a create request.
- Attempt to complete an unassigned job.
- Attempt to change role or company from the client.
- Attempt to edit or delete a ServiceRecord.
- Run Base44’s security scan and manually review each entity’s RLS/FLS settings on desktop.

---

## 7. Core workflows

### 7.1 Owner onboarding

1. Register/login.
2. Enter company name, timezone, contact details, and default service interval.
3. Create Company and owner UserProfile atomically through backend logic.
4. Land on an empty Command Center with a guided setup checklist.
5. Never silently seed demo data into a real workspace.

### 7.2 Add team member

1. Owner enters name, email, and role.
2. Create invitation or clearly marked pending profile.
3. Invitee authenticates and is attached to the correct company only after token validation.
4. Owner can disable access; disabled users cannot read company data.

### 7.3 Create service structure

1. Create Customer.
2. Add Site to Customer.
3. Add ServiceUnit to Site.
4. Set service interval and optional last-service date.
5. Show next due date on the unit and dashboard.

### 7.4 Schedule and assign

1. Owner/dispatcher selects customer → site → service unit.
2. Sets service type, date/time, technician, and scope notes.
3. Save as scheduled.
4. Assigned technician sees it in My Work.
5. Record an activity event.

### 7.5 Technician execution

Use a mobile stepper with one dominant action per screen:

1. **Job brief:** site, access instructions, scope, contact, scheduled time.
2. **Start job:** server records `startedAt`, moves `scheduled → in_progress`.
3. **Before evidence:** require at least one before photo.
4. **Checklist:** large touch targets; show progress and required items.
5. **After evidence:** require at least one after photo.
6. **Exceptions and notes:** allow issue photo and severity; blocking exceptions prevent completion unless manager resolves/accepts them.
7. **Review:** show missing requirements and explicit validation.
8. **Complete:** authenticated backend function validates assignment and requirements, creates immutable ServiceRecord, updates unit dates, and marks job completed.

The completion function must be idempotent: double taps or retries must return the same record, not create duplicates.

### 7.6 Review service record

Show:

- FieldLedger and company identity
- Record and job numbers
- Customer, site, and service-unit snapshot
- Assigned/completing technician
- Started/completed times
- Checklist and results
- Before/after/issue evidence with captions
- Exceptions and resolutions
- Next service due date
- Clear disclaimer: “Operational service record; not a government-issued inspection certificate.”

Provide a print-optimized view. If Base44 PDF generation is fragile, browser print-to-PDF is acceptable for the rough MVP.

---

## 8. Command Center

Avoid vanity analytics. Show operational decisions:

- **Today:** scheduled, in progress, blocked, completed
- **Needs attention:** overdue jobs, blocking exceptions, failed evidence uploads
- **Coming due:** service units due in 30/60/90 days
- **Recent completion records**
- **Unassigned scheduled jobs**

Each card must link to the filtered working list. Empty states should contain a relevant action.

---

## 9. Automations and backend functions

Base44 supports authenticated Deno/TypeScript backend functions plus scheduled and entity-event automations. Keep this MVP small and make business-critical transitions server-authoritative.

### Required backend functions

1. `initializeCompanyWorkspace`
2. `createOrAcceptInvitation`
3. `transitionJobStatus`
4. `completeJobAndCreateRecord`
5. `disableTeamMember`

### Optional MVP automations

- On scheduled assignment: send an email or in-app notice to the technician.
- Daily: identify due/overdue units and refresh notification records.
- On blocking exception: notify owner/dispatcher.

Automations are convenience, not the source of truth. The dashboard must derive current status from persisted records even if a notification run fails. Base44 documents that automations require Builder or higher, consume integration credits per run, have a three-minute maximum, and do not run in local development; verify them in the deployed app and inspect logs.

---

## 10. Visual and interaction direction

Create an independent FieldLedger interpretation with a practical industrial tone.

- **Typography:** one sturdy sans-serif for interface text; tabular numerals for dates/job numbers.
- **Palette:** near-black/navy structure, warm white working surfaces, safety amber/orange primary accent, green only for verified completion, red only for blocking conditions.
- **Desktop:** compact left navigation and dense-but-readable operational tables.
- **Mobile:** bottom navigation, sticky primary action, 44 px minimum targets, single-column forms.
- **Status:** never communicate state by color alone; use icon + label.
- **Motion:** limited to brief state transitions and upload/progress feedback.
- **Avoid:** generic gradient heroes, excessive glass cards, decorative charts, fake AI language, and marketing copy inside operational screens.

The technician experience should work with dirty hands, poor attention, and bright environments: short labels, explicit progress, large controls, save feedback, and no hidden required fields.

---

## 11. Demo data

Create a separately labeled **FieldLedger Demo Company** only for demonstration:

- Customer: `Northstar Grill Group`
- Site: `Northstar Grill — Oak Street`
- Service unit: `Main Kitchen Hood Line A`
- Technician: `Jordan Lee`
- One scheduled job, one in-progress job, one completed record, and one open follow-up exception

Demo mode must never activate because production configuration is missing. Demo data must carry an `isSample` flag or reside in a dedicated demo company and must not appear in a real customer workspace.

---

## 12. Base44 build sequence

Do not ask Base44 to build everything in one unreviewed generation. Use the following passes and test after each one.

### Pass 1 — Foundation

Paste the master prompt in Section 13. Require Base44 to create the navigation, entities, authentication, UserProfile relationship, company onboarding, and role-aware shells. Then inspect every entity and permission.

**Gate:** Two test users in two companies cannot see each other’s records.

### Pass 2 — Owner operating workspace

Build Customers, Sites, ServiceUnits, Schedule, job creation, assignment, filters, and Command Center derived from real entity queries.

**Gate:** An owner can build the full service hierarchy and assign a persistent job.

### Pass 3 — Technician mobile workflow

Build My Work and the execution stepper at 390 px. Add required checklist behavior and UploadFile evidence with visible upload states.

**Gate:** A technician completes every pre-completion step on a real phone-sized viewport after a reload.

### Pass 4 — Server-authoritative completion

Implement job state validation, idempotent completion, the immutable ServiceRecord snapshot, next-due update, activity events, and report view.

**Gate:** Double completion produces one record, incomplete jobs are rejected, and later customer edits do not change old records.

### Pass 5 — Security and failure states

Tighten RLS/FLS, run security scan, test role boundaries, remove public access, protect sensitive fields, and add empty/loading/error/permission states.

**Gate:** Complete the adversarial checks in Section 6 with evidence.

### Pass 6 — Customer-test polish

Add the isolated demo company, responsive QA, print styles, accessibility labels, confirmation dialogs, and a short in-product setup checklist.

**Gate:** Run the acceptance script in Section 15 without manually changing database rows.

---

## 13. Master prompt for Base44

Paste this into a new Base44 app:

```text
Build a private multi-tenant web application named FieldLedger for commercial kitchen exhaust and hood-cleaning service companies with 2–15 employees.

The product is an operating record for recurring field service. Its core loop is: define a customer site and hood system, schedule and assign a job, guide the technician through required work and photo evidence, complete the job through server-authoritative validation, create an immutable service-record snapshot, and show what service is due next.

Do not build a generic CRM, invoicing, estimates, accounting, route optimization, payroll, inventory, a customer portal, AI features, multiple industry templates, or a public marketing marketplace. Do not invent compliance certifications or claim that a record is government-issued.

Users and access:
- Require authentication.
- Roles are owner, dispatcher, and technician.
- Use the built-in authenticated User only for authentication and create a separate one-to-one UserProfile entity for application data.
- Every tenant-owned record must have companyId.
- Apply row-level and field-level security so users can only access records where record.companyId equals their authenticated UserProfile.companyId.
- Owners manage the company and team. Dispatchers manage customers, sites, systems, jobs, assignments, and records. Technicians can see only jobs assigned to them and the minimum related data needed to perform those jobs.
- Never trust companyId, role, actor ID, record number, or completion timestamp submitted by the client. Derive them in authenticated backend functions.
- Completed ServiceRecords cannot be edited or deleted through the normal UI.

Create these entities with typed required fields, UUID references, timestamps, enumerated states, and validation: Company, UserProfile, Invitation, Customer, Site, ServiceUnit, Job, ChecklistTemplate, ChecklistResult, Evidence, Exception, ServiceRecord, and ActivityEvent.

Use the exact field definitions and relationships from the attached BASE44_MVP_BUILD_SPEC.md. If the file is not attached, stop and ask me to attach it rather than inventing a different schema.

Owner/dispatcher pages: Command Center, Schedule, Customers, Service Records, Team, Settings. Technician pages: My Work, Active Job, History, Profile. Navigation and available actions must change by role.

The technician workflow must be mobile-first at 390 px and use these steps: Job Brief, Start Job, Before Evidence, Checklist, After Evidence, Exceptions and Notes, Review, Complete. Require at least one before photo, one after photo, and every required checklist response. Show upload progress and errors. A blocking exception prevents completion until accepted or resolved by an owner/dispatcher.

Implement authenticated backend functions for initializeCompanyWorkspace, createOrAcceptInvitation, transitionJobStatus, completeJobAndCreateRecord, and disableTeamMember. Completion must validate authentication, company, assignment, legal state transition, required evidence, checklist completion, and blocking exceptions. It must be idempotent and atomically create one immutable ServiceRecord snapshot, mark the job completed, update lastServicedAt and nextServiceDueAt, and create ActivityEvents.

The ServiceRecord report must display record/job number, customer/site/system snapshots, technician, timestamps, checklist, evidence, exceptions, and next due date. Add a print-friendly view and the disclaimer: “Operational service record; not a government-issued inspection certificate.”

Design direction: practical industrial operating software. Use near-black/navy structure, warm-white work surfaces, safety amber/orange as the primary accent, green only for verified completion, and red only for blocking states. Use readable sans-serif typography, tabular numbers, explicit status labels, restrained motion, 44 px mobile targets, and a sticky primary action in field workflows. Avoid generic gradients, glassmorphism, decorative charts, and fake AI language.

Build this in stages. Start only with the data model, authentication, tenant isolation, onboarding, role-aware navigation, and empty page shells. Before implementing the workflows, explain the security rules created for each entity and identify any rule that still permits public or cross-company access.
```

---

## 14. Follow-up prompts

Use these individually after each gate passes.

### Owner workspace

```text
Now implement the owner/dispatcher operating workspace from Sections 7.1–7.4 and 8 of the attached spec. All dashboard counts must come from persisted company-scoped data. Build Customer → Site → ServiceUnit creation, job scheduling, technician assignment, filters, validation, empty states, and ActivityEvents. Do not add new entities or features. Then give me a click-by-click test for this pass.
```

### Technician workflow

```text
Now implement the mobile technician workflow from Section 7.5 at a 390 px viewport. A technician may open only an assigned job. Add explicit save/upload states, required before-and-after evidence, checklist progress, exceptions, review validation, and network failure recovery. Do not mark the job complete from client-side writes. Completion remains disabled until the backend completion function exists.
```

### Completion record

```text
Implement completeJobAndCreateRecord as authenticated server-side logic exactly as specified. Validate company membership, assignment, state, checklist, evidence, and blocking exceptions. Make retries idempotent. Create a historical snapshot rather than a report assembled from mutable current records. Update the service unit and job, add ActivityEvents, and create the print-friendly ServiceRecord page. Add tests or a reproducible test procedure for double submission, incomplete evidence, an unassigned technician, and editing a customer after completion.
```

### Security audit

```text
Audit every entity and backend function for tenant isolation and least privilege. Run the Base44 security scan. Remove all public data access. Verify that client-supplied companyId and role cannot grant access. Test two separate companies, URL/record-ID substitution, cross-company assignment, unassigned completion, client role mutation, and ServiceRecord update/delete. Return a table of each attempted action, expected result, and actual result. Do not call the app secure if any test is skipped.
```

### Polish and demo

```text
Polish the app for a customer-observation session without expanding scope. Add the isolated FieldLedger Demo Company from Section 11, an owner setup checklist, accessible labels, keyboard/focus behavior, clear confirmation dialogs, responsive table/card switching, print styles, and empty/loading/error/permission states. Demo data must never be inserted into a real workspace and must never serve as a fallback after an error.
```

---

## 15. Acceptance test script

Record screen/video or screenshots and results for each step.

1. Register as Company A owner and complete onboarding.
2. Add or invite a Company A technician.
3. Create customer, site, and hood system.
4. Schedule and assign a job.
5. Log out; log in as technician at 390 px.
6. Verify only assigned Company A work is visible.
7. Start the job.
8. Try to complete with no evidence; confirm rejection.
9. Add before photo, checklist responses, after photo, and notes.
10. Add a blocking exception; confirm completion is blocked.
11. Resolve/accept the exception as owner/dispatcher.
12. Complete as technician and immediately press complete again; confirm one record exists.
13. Reload and log out/in; confirm state persists.
14. View and print the ServiceRecord.
15. Change the current customer address; confirm historical record remains unchanged.
16. Register Company B and try Company A record IDs/URLs; confirm denial.
17. Try to assign a Company A job to Company B’s profile; confirm denial.
18. Disable the technician; confirm access is removed.
19. Interrupt an evidence upload or simulate a network failure; confirm visible retry/error behavior and no false completion.
20. Run the Base44 security scan and archive the findings/results.

---

## 16. Evaluation scorecard

This build is an independent opinion. Compare it to the existing FieldLedger without assuming either is correct.

Score each category 1–5 after observing real use:

| Category | Question |
|---|---|
| Time to first completed record | Can a new owner and technician finish the loop without help? |
| Technician friction | Does the mobile workflow reduce thinking and missed proof? |
| Owner visibility | Can the owner understand today, problems, and upcoming work immediately? |
| Record credibility | Would an operator confidently send the output to a customer? |
| Workflow specificity | Does it feel built for hood cleaning rather than generic task software? |
| Error recovery | Can users recover from bad input, reloads, and upload failures? |
| Security confidence | Is cross-company and cross-role isolation demonstrated? |
| Change cost | Can the workflow be adjusted after operator feedback without breaking records? |
| Platform dependence | Can data and application logic be extracted or reproduced? |

Keep any Base44 ideas that improve the operator loop, even if the final production product stays on the existing stack. Reject cosmetic differences that do not improve completion, proof, or recurrence.

---

## 17. Base44-specific verification and exit plan

Before putting a paying customer in this MVP:

- Confirm the Base44 plan covers required backend functions, automations, storage, collaborators, and expected integration-credit usage.
- Test automations in the deployed environment because Base44 documents that they do not run locally.
- Inspect execution logs for every completion/notification function.
- Review RLS and FLS manually; AI-generated permissions are not evidence of isolation.
- Export each entity as CSV and store a dated backup. Base44 supports table-level CSV export.
- Save this schema, all prompts, backend-function source, and any manual security configuration outside Base44.
- Test photo access using an unauthorized user and a logged-out browser.
- Measure real mobile performance and uploads on cellular service.
- Do not enable Stripe until the operating workflow has been used successfully; if enabled later, begin in Stripe test mode and verify webhook idempotency and entitlement behavior.
- Do not promise offline use or native push notifications.

### Decision after the experiment

After 3–5 operator walkthroughs and at least 10 completed test/service records, choose one:

1. **Base44 prototype wins:** use it for paid pilots while creating a production-hardening plan.
2. **Existing FieldLedger wins:** port the strongest Base44 workflow/design decisions into the current codebase.
3. **Neither wins:** revise the operating loop from observed failures before adding features.

No option is justified by appearance alone. The decision should come from completion rate, operator comprehension, record usefulness, access-control evidence, and cost of iteration.

---

## 18. Rough MVP versus production

| State | Required evidence |
|---|---|
| Generated prototype | Pages and entities exist |
| Rough MVP | Full acceptance script passes in published app with persistence and role isolation |
| Paid-pilot candidate | Rough MVP passes, terms/privacy/support process exist, backups tested, real mobile workflow observed |
| Production-ready | Formal security/tenant tests, billing lifecycle if applicable, monitoring, incident/restore procedures, data lifecycle, accessibility, cross-browser/mobile tests, and live canary evidence all pass |

Base44 can accelerate the experiment. It does not remove the need to validate the buyer, workflow, security, support, and operational obligations.
