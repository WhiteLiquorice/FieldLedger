import React, { useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, FileText, CheckCircle2, Clock, Upload, 
  Download, Sparkles, Building2, ChevronRight, Check
} from 'lucide-react';
import { 
  ComplianceRequirement, 
  ExtractedDocumentData, 
  ComplianceItemState,
  classifyAndExtractComplianceDocument,
  evaluateOrganizationCompliance,
  generateExportableComplianceReport
} from '@compliance-saas/backend-core';

const DEFAULT_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'req-wc-01',
    category: 'WORKERS_COMP',
    title: 'Workers\' Compensation Policy',
    description: 'Active statutory coverage policy for all field service technicians and operators.',
    frequency: 'ANNUAL',
    jurisdiction: 'State Regulatory Board',
    mandatoryForRoles: ['TECHNICIAN', 'LEAD_INSPECTOR'],
    requiredEvidenceTypes: ['ACORD 25 Certificate of Insurance'],
    expirationWarningDays: 30,
  },
  {
    id: 'req-gl-01',
    category: 'COMMERCIAL_GENERAL_LIABILITY',
    title: 'Commercial General Liability ($2M Aggregate)',
    description: 'Comprehensive commercial liability certificate naming facility property managers as additional insured.',
    frequency: 'ANNUAL',
    jurisdiction: 'Commercial Underwriters',
    mandatoryForRoles: ['ALL'],
    requiredEvidenceTypes: ['ACORD 25 Certificate of Insurance'],
    expirationWarningDays: 30,
  },
  {
    id: 'req-nfpa-01',
    category: 'NFPA_CERTIFICATION',
    title: 'NFPA 96 / NFPA 10 Certified Technician Credentials',
    description: 'Verified fire protection and kitchen exhaust system certification licenses.',
    frequency: 'BIENNIAL',
    jurisdiction: 'National Fire Protection Association',
    mandatoryForRoles: ['HOOD_CLEANER', 'EXTINGUISHER_TECH'],
    requiredEvidenceTypes: ['NFPA Certified Inspector Badge / ID'],
    expirationWarningDays: 45,
  },
  {
    id: 'req-epa-01',
    category: 'EPA_ENVIRONMENTAL',
    title: 'Municipal Grease Haulage & Disposal Permit',
    description: 'Certified waste hauler discharge authorization for grease trap liquid waste processing.',
    frequency: 'ANNUAL',
    jurisdiction: 'Municipal Environmental Services',
    mandatoryForRoles: ['GREASE_PUMPER'],
    requiredEvidenceTypes: ['Discharge Manifest / Environmental Permit'],
    expirationWarningDays: 30,
  }
];

const SEED_DOCUMENTS: ExtractedDocumentData[] = [
  {
    documentId: 'doc-wc-2026',
    fileName: 'Travelers_WorkersComp_2026.pdf',
    detectedCategory: 'WORKERS_COMP',
    issuerName: 'Travelers Property Casualty',
    policyOrCertNumber: 'WC-982410-TX',
    effectiveDate: '2026-01-01T00:00:00.000Z',
    expirationDate: '2027-01-01T00:00:00.000Z',
    coverageAmount: 1000000,
    coveredEntities: ['Wright Solutions LLC', 'Active Field Technicians'],
    confidenceScore: 0.98,
    verifiedByHuman: true,
  },
  {
    documentId: 'doc-gl-2026',
    fileName: 'Hartford_GeneralLiability_COI.pdf',
    detectedCategory: 'COMMERCIAL_GENERAL_LIABILITY',
    issuerName: 'Hartford Underwriters Insurance',
    policyOrCertNumber: 'GL-449102-COMM',
    effectiveDate: '2026-02-15T00:00:00.000Z',
    expirationDate: '2026-09-15T00:00:00.000Z', // Expiring in < 30 days
    coverageAmount: 2000000,
    coveredEntities: ['Wright Solutions LLC'],
    confidenceScore: 0.97,
    verifiedByHuman: true,
  }
];

export function ComplianceHubView({ orgName = 'Wright Solutions LLC' }: { orgName?: string }) {
  const [documents, setDocuments] = useState<ExtractedDocumentData[]>([]);
  const [isSimulatingOcr, setIsSimulatingOcr] = useState(false);
  const [simulatedFileName, setSimulatedFileName] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const complianceScore = evaluateOrganizationCompliance(
    'demo-document-review',
    DEFAULT_REQUIREMENTS,
    documents
  );

  function handleSimulateUpload(sampleType: 'NFPA' | 'EPA') {
    setIsSimulatingOcr(true);
    setSimulatedFileName(sampleType === 'NFPA' ? 'NFPA_96_Inspector_Card.pdf' : 'EPA_Grease_Disposal_Permit_2026.pdf');

    setTimeout(() => {
      let rawText = '';
      if (sampleType === 'NFPA') {
        rawText = `NFPA Certified Inspector Certificate. Body: National Fire Protection Authority. Cert #: NFPA-96-88392. Expires: 2027-12-31. Inspected Tech: Lead Operator.`;
      } else {
        rawText = `Municipal Environmental Services. Certified Grease Hauler Discharge Permit. Permit #: EPA-MUNI-2026-559. Expiration: 2027-06-30. Coverage: Liquid Waste Processing.`;
      }

      const extracted = classifyAndExtractComplianceDocument({
        documentId: `doc-${Date.now()}`,
        fileName: sampleType === 'NFPA' ? 'NFPA_96_Inspector_Card.pdf' : 'EPA_Grease_Disposal_Permit_2026.pdf',
        rawText,
      });

      setDocuments((prev) => [...prev, extracted]);
      setIsSimulatingOcr(false);
      setSimulatedFileName('');
    }, 1200);
  }

  function handleDownloadReport() {
    const reportText = generateExportableComplianceReport(complianceScore, orgName);
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compliance-audit-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-carbon-800 bg-carbon-900/80 p-6 backdrop-blur flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-safety-orange/10 border border-safety-orange/30 text-safety-orange font-mono text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            DOCUMENT REVIEW WORKSPACE
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Document Coverage Review</h1>
          <p className="text-sm text-slate-400 mt-1">A fictional checklist for reviewing document dates and missing fields for {orgName}. It does not certify compliance.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadReport}
            className="px-4 py-2.5 rounded-xl border border-carbon-700 bg-carbon-800 hover:bg-carbon-700 text-white font-semibold text-xs transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Review Worksheet
          </button>
        </div>
      </div>

      {/* Score Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-carbon-800 bg-carbon-900/60 p-4">
          <span className="text-xs font-mono text-slate-400 uppercase font-semibold">Document coverage</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-white">{complianceScore.overallScorePercentage}%</span>
            <span className="text-xs text-slate-400">Score</span>
          </div>
          <div className="mt-2 text-xs font-medium flex items-center gap-1.5">
            {complianceScore.auditReadinessLevel === 'CERTIFIED_AUDIT_READY' ? (
              <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Human reviewed</span>
            ) : complianceScore.auditReadinessLevel === 'NEEDS_ATTENTION' ? (
              <span className="text-amber-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Renewals Needed</span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Critical Missing</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-carbon-800 bg-carbon-900/60 p-4">
          <span className="text-xs font-mono text-slate-400 uppercase font-semibold">Human reviewed</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-emerald-400">{complianceScore.metRequirements}</span>
            <span className="text-xs text-slate-400">/ {complianceScore.totalRequirements} items</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">User-confirmed source fields</p>
        </div>

        <div className="rounded-xl border border-carbon-800 bg-carbon-900/60 p-4">
          <span className="text-xs font-mono text-slate-400 uppercase font-semibold">Expiring Soon</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-amber-400">{complianceScore.expiringCount}</span>
            <span className="text-xs text-slate-400">within 30 days</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Date-based review flags</p>
        </div>

        <div className="rounded-xl border border-carbon-800 bg-carbon-900/60 p-4">
          <span className="text-xs font-mono text-slate-400 uppercase font-semibold">Deficiencies</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-rose-400">{complianceScore.deficientCount}</span>
            <span className="text-xs text-slate-400">missing certs</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Immediate action required</p>
        </div>
      </div>

      {/* Clearly labelled fictional parser examples */}
      <div className="rounded-xl border border-dashed border-carbon-700 bg-carbon-950/40 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-safety-orange/10 border border-safety-orange/30 flex items-center justify-center text-safety-orange">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Fictional parser preview</h4>
            <p className="text-xs text-slate-400">Load sample text to see a pending-review record. No file is uploaded or verified.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSimulatingOcr}
            onClick={() => handleSimulateUpload('NFPA')}
            className="px-3.5 py-2 rounded-lg bg-carbon-800 hover:bg-carbon-700 border border-carbon-700 text-xs font-medium text-slate-200 transition"
          >
            {isSimulatingOcr ? 'Loading sample...' : '+ Load NFPA sample'}
          </button>
          <button
            type="button"
            disabled={isSimulatingOcr}
            onClick={() => handleSimulateUpload('EPA')}
            className="px-3.5 py-2 rounded-lg bg-carbon-800 hover:bg-carbon-700 border border-carbon-700 text-xs font-medium text-slate-200 transition"
          >
            {isSimulatingOcr ? 'Loading sample...' : '+ Load EPA sample'}
          </button>
        </div>
      </div>

      {/* Requirement Items Table */}
      <div className="rounded-xl border border-carbon-800 bg-carbon-900/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-carbon-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Example document checklist</h3>
          <span className="text-xs text-slate-400">Local fictional state</span>
        </div>

        <div className="divide-y divide-carbon-800">
          {complianceScore.items.map((item: ComplianceItemState) => (
            <div key={item.requirementId} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-carbon-800 text-slate-300 border border-carbon-700">
                    {item.category}
                  </span>
                  <h4 className="text-sm font-bold text-white">{item.requirementTitle}</h4>
                </div>

                {item.evidenceDocument ? (
                  <p className="text-xs text-slate-400">
                    <strong className="text-slate-300">Active Document:</strong> {item.evidenceDocument.issuerName} ({item.evidenceDocument.policyOrCertNumber}) · Expires {new Date(item.evidenceDocument.expirationDate).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-xs text-rose-400/90 font-medium">
                    ⚠️ Missing Evidence: {item.missingItems.join(', ')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {item.status === 'AUDIT_READY' && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Source reviewed
                  </span>
                )}
                {item.status === 'EXPIRING_SOON' && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Expiring ({item.daysUntilExpiration}d)
                  </span>
                )}
                {item.status === 'MISSING_EVIDENCE' && (
                  <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Evidence Required
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
