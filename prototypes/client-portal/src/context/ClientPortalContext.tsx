import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  SiteLocation, 
  ExtinguisherAsset,
  HoodSystemAsset,
  GreaseTrapAsset,
  ServiceRequest,
  ContractorMessage,
  DeficiencyQuote
} from '@compliance-saas/backend-core';
import { 
  CLIENT_PROFILE,
  CONTRACTOR_CONTACT,
  CLIENT_SITES,
  CLIENT_EXTINGUISHERS,
  CLIENT_HOODS,
  CLIENT_GREASE_TRAPS,
  CLIENT_DEFICIENCY_QUOTES,
  CLIENT_MESSAGES,
  CLIENT_REQUESTS
} from '../lib/demoData';

export type PortalTab = 'dashboard' | 'equipment' | 'certificates' | 'quotes' | 'messages' | 'request_service';

interface ClientPortalContextType {
  client: typeof CLIENT_PROFILE;
  contractor: typeof CONTRACTOR_CONTACT;
  sites: SiteLocation[];
  extinguishers: ExtinguisherAsset[];
  hoods: HoodSystemAsset[];
  greaseTraps: GreaseTrapAsset[];
  quotes: DeficiencyQuote[];
  messages: ContractorMessage[];
  requests: ServiceRequest[];
  selectedSiteId: string;
  activeTab: PortalTab;
  
  // Actions
  setSelectedSiteId: (siteId: string) => void;
  setActiveTab: (tab: PortalTab) => void;
  approveQuote: (quoteId: string) => void;
  declineQuote: (quoteId: string) => void;
  sendMessage: (content: string) => void;
  submitServiceRequest: (data: Omit<ServiceRequest, 'id' | 'orgId' | 'customerId' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  resetDemoData: () => void;
}

const ClientPortalContext = createContext<ClientPortalContextType | undefined>(undefined);

export const ClientPortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sites] = useState<SiteLocation[]>(CLIENT_SITES);
  const [extinguishers, setExtinguishers] = useState<ExtinguisherAsset[]>(() => {
    const saved = localStorage.getItem('portal_extinguishers');
    return saved ? JSON.parse(saved) : CLIENT_EXTINGUISHERS;
  });

  const [hoods, setHoods] = useState<HoodSystemAsset[]>(() => {
    const saved = localStorage.getItem('portal_hoods');
    return saved ? JSON.parse(saved) : CLIENT_HOODS;
  });

  const [greaseTraps, setGreaseTraps] = useState<GreaseTrapAsset[]>(() => {
    const saved = localStorage.getItem('portal_traps');
    return saved ? JSON.parse(saved) : CLIENT_GREASE_TRAPS;
  });

  const [quotes, setQuotes] = useState<DeficiencyQuote[]>(() => {
    const saved = localStorage.getItem('portal_quotes');
    return saved ? JSON.parse(saved) : CLIENT_DEFICIENCY_QUOTES;
  });

  const [messages, setMessages] = useState<ContractorMessage[]>(() => {
    const saved = localStorage.getItem('portal_messages');
    return saved ? JSON.parse(saved) : CLIENT_MESSAGES;
  });

  const [requests, setRequests] = useState<ServiceRequest[]>(() => {
    const saved = localStorage.getItem('portal_requests');
    return saved ? JSON.parse(saved) : CLIENT_REQUESTS;
  });

  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<PortalTab>('dashboard');

  useEffect(() => {
    localStorage.setItem('portal_extinguishers', JSON.stringify(extinguishers));
    localStorage.setItem('portal_hoods', JSON.stringify(hoods));
    localStorage.setItem('portal_traps', JSON.stringify(greaseTraps));
    localStorage.setItem('portal_quotes', JSON.stringify(quotes));
    localStorage.setItem('portal_messages', JSON.stringify(messages));
    localStorage.setItem('portal_requests', JSON.stringify(requests));
  }, [extinguishers, hoods, greaseTraps, quotes, messages, requests]);

  const approveQuote = (quoteId: string) => {
    const now = new Date().toISOString();
    setQuotes((prev) =>
      prev.map((q) =>
        q.id === quoteId
          ? { ...q, status: 'approved', approvedBy: CLIENT_PROFILE.name, approvedAt: now }
          : q
      )
    );

    // Also send an automated confirmation message in the channel
    const targetQuote = quotes.find((q) => q.id === quoteId);
    if (targetQuote) {
      const newMsg: ContractorMessage = {
        id: `msg-${Date.now()}`,
        orgId: 'org-apex',
        customerId: CLIENT_PROFILE.customerId,
        senderId: CLIENT_PROFILE.id,
        senderName: CLIENT_PROFILE.name,
        senderRole: 'client',
        content: `Work Order Approved: Quote #${targetQuote.id.toUpperCase()} ($${targetQuote.estimatedCost.toFixed(2)}) for "${targetQuote.issueDescription}" has been approved by ${CLIENT_PROFILE.name}. Please proceed with repairs.`,
        createdAt: now,
      };
      setMessages((prev) => [...prev, newMsg]);
    }
  };

  const declineQuote = (quoteId: string) => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === quoteId ? { ...q, status: 'declined' } : q))
    );
  };

  const sendMessage = (content: string) => {
    const now = new Date().toISOString();
    const newMsg: ContractorMessage = {
      id: `msg-${Date.now()}`,
      orgId: 'org-apex',
      customerId: CLIENT_PROFILE.customerId,
      senderId: CLIENT_PROFILE.id,
      senderName: CLIENT_PROFILE.name,
      senderRole: 'client',
      content,
      createdAt: now,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const submitServiceRequest = (data: Omit<ServiceRequest, 'id' | 'orgId' | 'customerId' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const now = new Date().toISOString();
    const newReq: ServiceRequest = {
      ...data,
      id: `req-${Date.now().toString(36)}`,
      orgId: 'org-apex',
      customerId: CLIENT_PROFILE.customerId,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    };
    setRequests((prev) => [newReq, ...prev]);

    // Send notification in message channel
    const newMsg: ContractorMessage = {
      id: `msg-${Date.now()}`,
      orgId: 'org-apex',
      customerId: CLIENT_PROFILE.customerId,
      senderId: CLIENT_PROFILE.id,
      senderName: CLIENT_PROFILE.name,
      senderRole: 'client',
      content: `New Service Request Dispatched: [${data.serviceVertical.toUpperCase()}] Priority: ${data.priority.toUpperCase()}. "${data.description}"`,
      createdAt: now,
    };
    setMessages((prev) => [...prev, newMsg]);
    setActiveTab('requests' as any);
  };

  const resetDemoData = () => {
    setExtinguishers(CLIENT_EXTINGUISHERS);
    setHoods(CLIENT_HOODS);
    setGreaseTraps(CLIENT_GREASE_TRAPS);
    setQuotes(CLIENT_DEFICIENCY_QUOTES);
    setMessages(CLIENT_MESSAGES);
    setRequests(CLIENT_REQUESTS);
    localStorage.clear();
  };

  return (
    <ClientPortalContext.Provider
      value={{
        client: CLIENT_PROFILE,
        contractor: CONTRACTOR_CONTACT,
        sites,
        extinguishers,
        hoods,
        greaseTraps,
        quotes,
        messages,
        requests,
        selectedSiteId,
        activeTab,
        setSelectedSiteId,
        setActiveTab,
        approveQuote,
        declineQuote,
        sendMessage,
        submitServiceRequest,
        resetDemoData,
      }}
    >
      {children}
    </ClientPortalContext.Provider>
  );
};

export const useClientPortal = () => {
  const context = useContext(ClientPortalContext);
  if (!context) throw new Error('useClientPortal must be used within ClientPortalProvider');
  return context;
};
