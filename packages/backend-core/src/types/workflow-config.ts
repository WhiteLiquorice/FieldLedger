import type { ComplianceVertical } from './auth';

export type ChecklistFieldType = 'boolean' | 'select' | 'number' | 'text' | 'photo';

export interface ChecklistFieldDefinition {
  id: string;
  label: string;
  type: ChecklistFieldType;
  required: boolean;
  helpText?: string;
  options?: string[];
  exceptionValues?: Array<string | number | boolean>;
}

export interface ServiceSchedule {
  unit: 'days' | 'months' | 'years';
  interval: number;
}

export interface VerticalWorkflowConfig {
  version: 1;
  vertical: ComplianceVertical;
  displayName: string;
  assetLabel: string;
  assetLabelPlural: string;
  jobLabel: string;
  coreQuestion: string;
  checklist: ChecklistFieldDefinition[];
  schedule: ServiceSchedule & {
    allowTechnicianOverride: true;
    source: 'company_default';
  };
  report: {
    title: string;
    claimMode: 'service_record';
    standardReference?: string;
    disclaimer: string;
  };
}

export const DEFAULT_VERTICAL_CONFIGS: Record<ComplianceVertical, VerticalWorkflowConfig> = {
  extinguisher: {
    version: 1,
    vertical: 'extinguisher',
    displayName: 'Portable Extinguisher Service',
    assetLabel: 'extinguisher',
    assetLabelPlural: 'extinguishers',
    jobLabel: 'site inspection',
    coreQuestion: 'Did the technician account for every expected extinguisher?',
    checklist: [
      { id: 'present', label: 'Unit present at recorded location', type: 'boolean', required: true, exceptionValues: [false] },
      { id: 'accessible', label: 'Unit is accessible', type: 'boolean', required: true, exceptionValues: [false] },
      { id: 'pressure', label: 'Pressure or status indicator', type: 'select', required: true, options: ['acceptable', 'service_required', 'not_applicable'], exceptionValues: ['service_required'] },
      { id: 'condition', label: 'Physical condition', type: 'select', required: true, options: ['acceptable', 'service_required'], exceptionValues: ['service_required'] },
      { id: 'seal', label: 'Seal and tamper indicator condition', type: 'select', required: true, options: ['acceptable', 'service_required', 'not_applicable'], exceptionValues: ['service_required'] },
      { id: 'photo', label: 'Exception photo', type: 'photo', required: false },
      { id: 'notes', label: 'Technician notes', type: 'text', required: false },
    ],
    schedule: { unit: 'months', interval: 12, allowTechnicianOverride: true, source: 'company_default' },
    report: {
      title: 'Portable Extinguisher Service Record',
      claimMode: 'service_record',
      standardReference: 'Company-configured procedure; verify applicable requirements with the authority having jurisdiction.',
      disclaimer: 'This record documents work performed and observations recorded. It does not independently certify legal or regulatory compliance.',
    },
  },
  hood_cleaning: {
    version: 1,
    vertical: 'hood_cleaning',
    displayName: 'Commercial Kitchen Hood Cleaning',
    assetLabel: 'exhaust system',
    assetLabelPlural: 'exhaust systems',
    jobLabel: 'cleaning service',
    coreQuestion: 'Is the service record complete before the crew leaves?',
    checklist: [
      { id: 'before_photos', label: 'Required before photos captured', type: 'boolean', required: true, exceptionValues: [false] },
      { id: 'areas_cleaned', label: 'Areas and components cleaned', type: 'text', required: true },
      { id: 'inaccessible_areas', label: 'Inaccessible areas documented', type: 'text', required: false },
      { id: 'after_photos', label: 'Required after photos captured', type: 'boolean', required: true, exceptionValues: [false] },
      { id: 'deficiencies', label: 'Observed deficiencies', type: 'text', required: false },
      { id: 'customer_acknowledgement', label: 'Customer acknowledgement captured', type: 'boolean', required: false },
    ],
    schedule: { unit: 'months', interval: 3, allowTechnicianOverride: true, source: 'company_default' },
    report: {
      title: 'Kitchen Exhaust Cleaning Service Record',
      claimMode: 'service_record',
      standardReference: 'Company-configured procedure; frequency must reflect the applicable jurisdiction and operating conditions.',
      disclaimer: 'This record documents cleaning work and observed conditions. It does not independently certify legal or regulatory compliance.',
    },
  },
  grease_trap: {
    version: 1,
    vertical: 'grease_trap',
    displayName: 'Grease Trap & Interceptor Service',
    assetLabel: 'trap or interceptor',
    assetLabelPlural: 'traps and interceptors',
    jobLabel: 'pump-out service',
    coreQuestion: 'What needs pumping next, and is every disposal record complete?',
    checklist: [
      { id: 'quantity', label: 'Quantity removed', type: 'number', required: true },
      { id: 'condition', label: 'Condition after service', type: 'select', required: true, options: ['good', 'service_required', 'unable_to_complete'], exceptionValues: ['service_required', 'unable_to_complete'] },
      { id: 'before_photo', label: 'Before photo captured', type: 'boolean', required: true, exceptionValues: [false] },
      { id: 'after_photo', label: 'After photo captured', type: 'boolean', required: true, exceptionValues: [false] },
      { id: 'disposal_destination', label: 'Disposal destination recorded', type: 'text', required: true },
      { id: 'manifest_number', label: 'Manifest or ticket number', type: 'text', required: false },
    ],
    schedule: { unit: 'days', interval: 90, allowTechnicianOverride: true, source: 'company_default' },
    report: {
      title: 'Grease Trap Pumping Service Record',
      claimMode: 'service_record',
      standardReference: 'Company-configured procedure; local wastewater and disposal requirements may vary.',
      disclaimer: 'This record documents service and disposal information entered by the operator. It is not a substitute for jurisdiction-specific manifests.',
    },
  },
};

