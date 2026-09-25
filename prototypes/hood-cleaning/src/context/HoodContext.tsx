import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Organization, 
  Customer, 
  SiteLocation, 
  HoodSystemAsset, 
  HoodCleaningServiceResult,
  ComplianceReportMetadata
} from '@compliance-saas/backend-core';
import { 
  INITIAL_ORG, 
  INITIAL_CUSTOMERS, 
  INITIAL_SITES, 
  INITIAL_HOOD_SYSTEMS 
} from '../lib/demoData';

export type HoodAppView = 'dashboard' | 'sites' | 'hoods' | 'cleaning_job' | 'certificate' | 'waivers';

export interface DuctAccessWaiver {
  id: string;
  hoodId: string;
  siteId: string;
  ductSection: string;
  reason: string;
  recommendedFix: string;
  photoUrl?: string;
  notifiedCustomerAt: string;
  customerAcknowledged: boolean;
}

interface HoodContextType {
  org: Organization;
  customers: Customer[];
  sites: SiteLocation[];
  hoods: HoodSystemAsset[];
  waivers: DuctAccessWaiver[];
  activeSiteId: string | null;
  activeView: HoodAppView;
  completedReports: ComplianceReportMetadata[];
  currentSite: SiteLocation | undefined;
  currentSiteHoods: HoodSystemAsset[];
  
  // Actions
  setActiveView: (view: HoodAppView) => void;
  setActiveSiteId: (siteId: string | null) => void;
  startCleaningJob: (siteId: string) => void;
  finishCleaningAndIssueCertificate: (signatures: { techSignatureUrl: string; managerSignatureUrl?: string; managerName?: string }) => void;
  addHoodSystem: (hoodData: Omit<HoodSystemAsset, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addDuctAccessWaiver: (waiver: Omit<DuctAccessWaiver, 'id' | 'notifiedCustomerAt'>) => void;
  resetDemoData: () => void;
}

const HoodContext = createContext<HoodContextType | undefined>(undefined);

export const HoodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [org, setOrg] = useState<Organization>(() => {
    const saved = localStorage.getItem('hood_org');
    return saved ? JSON.parse(saved) : INITIAL_ORG;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('hood_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [sites, setSites] = useState<SiteLocation[]>(() => {
    const saved = localStorage.getItem('hood_sites');
    return saved ? JSON.parse(saved) : INITIAL_SITES;
  });

  const [hoods, setHoods] = useState<HoodSystemAsset[]>(() => {
    const saved = localStorage.getItem('hood_systems');
    return saved ? JSON.parse(saved) : INITIAL_HOOD_SYSTEMS;
  });

  const [waivers, setWaivers] = useState<DuctAccessWaiver[]>(() => {
    const saved = localStorage.getItem('hood_waivers');
    return saved ? JSON.parse(saved) : [
      {
        id: 'waiver-01',
        hoodId: 'hood-gh-01',
        siteId: 'site-grand-horizon-kitchen',
        ductSection: 'Vertical Riser 4th Floor Shaft',
        reason: 'No access panel installed in drywalled hotel guest corridor shaft (NFPA 96 Section 7.4.1 violation by building construction).',
        recommendedFix: 'Install 20"x20" UL-listed fire-rated duct access door on 4th floor.',
        notifiedCustomerAt: '2026-05-15T00:00:00Z',
        customerAcknowledged: true,
      }
    ];
  });

  const [activeSiteId, setActiveSiteId] = useState<string | null>('site-grand-horizon-kitchen');
  const [activeView, setActiveView] = useState<HoodAppView>('dashboard');
  const [completedReports, setCompletedReports] = useState<ComplianceReportMetadata[]>([]);

  useEffect(() => {
    localStorage.setItem('hood_org', JSON.stringify(org));
    localStorage.setItem('hood_customers', JSON.stringify(customers));
    localStorage.setItem('hood_sites', JSON.stringify(sites));
    localStorage.setItem('hood_systems', JSON.stringify(hoods));
    localStorage.setItem('hood_waivers', JSON.stringify(waivers));
  }, [org, customers, sites, hoods, waivers]);

  const currentSite = sites.find((s) => s.id === activeSiteId) || sites[0];
  const currentSiteHoods = hoods.filter((h) => h.siteId === currentSite?.id);

  const startCleaningJob = (siteId: string) => {
    setActiveSiteId(siteId);
    setActiveView('cleaning_job');
  };

  const finishCleaningAndIssueCertificate = (signatures: {
    techSignatureUrl: string;
    managerSignatureUrl?: string;
    managerName?: string;
  }) => {
    if (!currentSite) return;

    const now = new Date().toISOString();
    setHoods((prev) =>
      prev.map((h) => {
        if (h.siteId === currentSite.id) {
          const intervalMonths = h.serviceIntervalMonths || 3;
          const nextDate = new Date();
          nextDate.setMonth(nextDate.getMonth() + intervalMonths);
          return {
            ...h,
            lastCleanedAt: now,
            nextCleaningDueAt: nextDate.toISOString(),
            lastCondition: 'cleaned_to_bare_metal',
          };
        }
        return h;
      })
    );

    const nextRecDate = new Date();
    nextRecDate.setMonth(nextRecDate.getMonth() + 3);

    const newReport: ComplianceReportMetadata = {
      id: `rep-nfpa96-${Date.now()}`,
      orgId: org.id,
      customerId: currentSite.customerId,
      siteId: currentSite.id,
      jobId: `job-${Date.now()}`,
      vertical: 'hood_cleaning',
      reportNumber: `NFPA96-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `NFPA 96 Commercial Kitchen Exhaust Certificate — ${currentSite.siteName}`,
      generatedAt: now,
      complianceStandard: 'NFPA_96',
      complianceStatus: 'compliant',
      summary: {
        totalUnitsServiced: currentSiteHoods.length,
        passedUnitsCount: currentSiteHoods.length,
        failedUnitsCount: 0,
        openDeficienciesCount: waivers.filter((w) => w.siteId === currentSite.id).length,
        nextServiceRecommendedDate: nextRecDate.toISOString(),
      },
      emailDelivery: {
        recipients: ['elena@grandhorizon.com'],
        deliveryStatus: 'sent',
        sentAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    setCompletedReports((prev) => [newReport, ...prev]);
    setActiveView('certificate');
  };

  const addHoodSystem = (hoodData: Omit<HoodSystemAsset, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newHood: HoodSystemAsset = {
      ...hoodData,
      id: `hood-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setHoods((prev) => [newHood, ...prev]);
  };

  const addDuctAccessWaiver = (waiverData: Omit<DuctAccessWaiver, 'id' | 'notifiedCustomerAt'>) => {
    const newWaiver: DuctAccessWaiver = {
      ...waiverData,
      id: `waiver-${Date.now().toString(36)}`,
      notifiedCustomerAt: new Date().toISOString(),
    };
    setWaivers((prev) => [newWaiver, ...prev]);
  };

  const resetDemoData = () => {
    setOrg(INITIAL_ORG);
    setCustomers(INITIAL_CUSTOMERS);
    setSites(INITIAL_SITES);
    setHoods(INITIAL_HOOD_SYSTEMS);
    setActiveSiteId('site-grand-horizon-kitchen');
    setCompletedReports([]);
    localStorage.clear();
  };

  return (
    <HoodContext.Provider
      value={{
        org,
        customers,
        sites,
        hoods,
        waivers,
        activeSiteId,
        activeView,
        completedReports,
        currentSite,
        currentSiteHoods,
        setActiveView,
        setActiveSiteId,
        startCleaningJob,
        finishCleaningAndIssueCertificate,
        addHoodSystem,
        addDuctAccessWaiver,
        resetDemoData,
      }}
    >
      {children}
    </HoodContext.Provider>
  );
};

export const useHood = () => {
  const context = useContext(HoodContext);
  if (!context) throw new Error('useHood must be used within HoodProvider');
  return context;
};
