# Service records and corrections

FieldLedger records work and observations entered by the contractor. It does not certify code compliance or guarantee acceptance by an inspector, insurer or customer.

Completion captures the company, customer, site, technician, equipment, checklist labels, service intervals and observations. Later customer/equipment edits do not rewrite that snapshot. The report number uses the existing SR-<vertical>-<year>-<sequence> format. Report creation, counter advancement and recurrence changes commit in one transaction.

The Service records screen downloads a PDF with embedded evidence images. Failed image retrieval stops the export. Reports with no finalized snapshot require support review; the application does not invent historical identities.

Owners and managers can add a correction or clarification to the latest revision. This creates another immutable report with an R2/R3 suffix, attribution, timestamp and reason. Original results and photos remain available. A correction adds context; it does not replace photographs or silently change the technician's original observations.

Data export downloads a paginated JSON archive. It includes evidence references, not image bytes. Download the individual PDFs to retain their embedded evidence, especially before requesting deletion. No automatic customer email delivery is configured.
