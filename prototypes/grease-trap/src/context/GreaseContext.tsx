import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Organization, 
  Customer, 
  SiteLocation, 
  GreaseTrapAsset,
  calculateGreaseTrapFOG
} from '@compliance-saas/backend-core';
import { 
  INITIAL_ORG, 
  INITIAL_CUSTOMERS, 
  INITIAL_SITES, 
  INITIAL_GREASE_TRAPS 
} from '../lib/demoData';

export type GreaseAppView = 'dashboard' | 'traps' | 'pumping_job' | 'manifest';

export interface PumpingLogRecord {
  id: string;
  trapId: string;
  siteId: string;
  manifestNumber: string;
  gallonsPumped: number;
  topGreaseInches: number;
  bottomSludgeInches: number;
  totalDepthInches: number;
  fogPercentage: number;
  is25PercentRuleViolated: boolean;
  bafflesIntact: boolean;
  disposalFacility: string;
  truckNumber: string;
  driverName: string;
  facilityRepName: string;
  pumpedAt: string;
}

interface GreaseContextType {
  org: Organization;
  customers: Customer[];
  sites: SiteLocation[];
  traps: GreaseTrapAsset[];
  pumpingLogs: PumpingLogRecord[];
  activeSiteId: string | null;
  activeView: GreaseAppView;
  currentSite: SiteLocation | undefined;
  currentSiteTraps: GreaseTrapAsset[];
  latestManifest: PumpingLogRecord | null;
  
  // Actions
  setActiveView: (view: GreaseAppView) => void;
  setActiveSiteId: (siteId: string | null) => void;
  startPumpingJob: (siteId: string) => void;
  recordPumpingJob: (details: Omit<PumpingLogRecord, 'id' | 'pumpedAt' | 'fogPercentage' | 'is25PercentRuleViolated'>) => void;
  addGreaseTrap: (trapData: Omit<GreaseTrapAsset, 'id' | 'createdAt' | 'updatedAt'>) => void;
  resetDemoData: () => void;
}

const GreaseContext = createContext<GreaseContextType | undefined>(undefined);

export const GreaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [org, setOrg] = useState<Organization>(() => {
    const saved = localStorage.getItem('grease_org');
    return saved ? JSON.parse(saved) : INITIAL_ORG;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('grease_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [sites, setSites] = useState<SiteLocation[]>(() => {
    const saved = localStorage.getItem('grease_sites');
    return saved ? JSON.parse(saved) : INITIAL_SITES;
  });

  const [traps, setTraps] = useState<GreaseTrapAsset[]>(() => {
    const saved = localStorage.getItem('grease_traps');
    return saved ? JSON.parse(saved) : INITIAL_GREASE_TRAPS;
  });

  const [pumpingLogs, setPumpingLogs] = useState<PumpingLogRecord[]>(() => {
    const saved = localStorage.getItem('grease_logs');
    return saved ? JSON.parse(saved) : [
      {
        id: 'log-01',
        trapId: 'trap-gh-01',
        siteId: 'site-grand-horizon-main',
        manifestNumber: 'MWRD-2026-8819',
        gallonsPumped: 1500,
        topGreaseInches: 12,
        bottomSludgeInches: 8,
        totalDepthInches: 72,
        fogPercentage: 27.7,
        is25PercentRuleViolated: true,
        bafflesIntact: true,
        disposalFacility: 'Stickney Water Reclamation & Resource Recovery Plant (MWRD)',
        truckNumber: 'PUMPER-TK-44',
        driverName: 'Jesse Vance (CDL #IL-991204)',
        facilityRepName: 'Carlos Mendez',
        pumpedAt: '2026-05-10T14:30:00Z',
      }
    ];
  });

  const [activeSiteId, setActiveSiteId] = useState<string | null>('site-grand-horizon-main');
  const [activeView, setActiveView] = useState<GreaseAppView>('dashboard');
  const [latestManifest, setLatestManifest] = useState<PumpingLogRecord | null>(pumpingLogs[0] || null);

  useEffect(() => {
    localStorage.setItem('grease_org', JSON.stringify(org));
    localStorage.setItem('grease_customers', JSON.stringify(customers));
    localStorage.setItem('grease_sites', JSON.stringify(sites));
    localStorage.setItem('grease_traps', JSON.stringify(traps));
    localStorage.setItem('grease_logs', JSON.stringify(pumpingLogs));
  }, [org, customers, sites, traps, pumpingLogs]);

  const currentSite = sites.find((s) => s.id === activeSiteId) || sites[0];
  const currentSiteTraps = traps.filter((t) => t.siteId === currentSite?.id);

  const startPumpingJob = (siteId: string) => {
    setActiveSiteId(siteId);
    setActiveView('pumping_job');
  };

  const recordPumpingJob = (details: Omit<PumpingLogRecord, 'id' | 'pumpedAt' | 'fogPercentage' | 'is25PercentRuleViolated'>) => {
    const fogCalc = calculateGreaseTrapFOG(
      details.totalDepthInches,
      details.topGreaseInches,
      details.bottomSludgeInches
    );

    const now = new Date().toISOString();
    const newLog: PumpingLogRecord = {
      ...details,
      id: `log-${Date.now()}`,
      fogPercentage: fogCalc.fogPercentage,
      is25PercentRuleViolated: fogCalc.isViolated,
      pumpedAt: now,
    };

    setTraps((prev) =>
      prev.map((t) => {
        if (t.id === details.trapId) {
          const days = t.serviceIntervalDays || 90;
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + days);
          return {
            ...t,
            lastPumpedAt: now,
            nextPumpDueAt: nextDate.toISOString(),
            lastCondition: 'good',
          };
        }
        return t;
      })
    );

    setPumpingLogs((prev) => [newLog, ...prev]);
    setLatestManifest(newLog);
    setActiveView('manifest');
  };

  const addGreaseTrap = (trapData: Omit<GreaseTrapAsset, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTrap: GreaseTrapAsset = {
      ...trapData,
      id: `trap-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTraps((prev) => [newTrap, ...prev]);
  };

  const resetDemoData = () => {
    setOrg(INITIAL_ORG);
    setCustomers(INITIAL_CUSTOMERS);
    setSites(INITIAL_SITES);
    setTraps(INITIAL_GREASE_TRAPS);
    setActiveSiteId('site-grand-horizon-main');
    localStorage.clear();
  };

  return (
    <GreaseContext.Provider
      value={{
        org,
        customers,
        sites,
        traps,
        pumpingLogs,
        activeSiteId,
        activeView,
        currentSite,
        currentSiteTraps,
        latestManifest,
        setActiveView,
        setActiveSiteId,
        startPumpingJob,
        recordPumpingJob,
        addGreaseTrap,
        resetDemoData,
      }}
    >
      {children}
    </GreaseContext.Provider>
  );
};

export const useGrease = () => {
  const context = useContext(GreaseContext);
  if (!context) throw new Error('useGrease must be used within GreaseProvider');
  return context;
};
