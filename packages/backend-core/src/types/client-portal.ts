export type ServiceRequestPriority = 'routine' | 'urgent' | 'emergency';
export type ServiceRequestStatus = 'submitted' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface ServiceRequest {
  id: string;
  orgId: string;
  customerId: string;
  siteId: string;
  serviceVertical: 'extinguisher' | 'hood_cleaning' | 'grease_trap' | 'all';
  requestedBy: {
    name: string;
    email: string;
    phone: string;
  };
  preferredDate?: string;
  priority: ServiceRequestPriority;
  description: string;
  status: ServiceRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContractorMessage {
  id: string;
  orgId: string;
  customerId: string;
  siteId?: string;
  senderId: string;
  senderName: string;
  senderRole: 'client' | 'contractor' | 'technician';
  content: string;
  attachmentUrls?: string[];
  createdAt: string;
}

export type QuoteStatus = 'pending' | 'approved' | 'declined';

export interface DeficiencyQuote {
  id: string;
  orgId: string;
  customerId: string;
  siteId: string;
  serviceVertical: 'extinguisher' | 'hood_cleaning' | 'grease_trap';
  deficiencyId: string;
  assetCode: string;
  assetLocation: string;
  issueDescription: string;
  recommendedAction: string;
  severity: 'minor' | 'major' | 'critical';
  estimatedCost: number;
  status: QuoteStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}
