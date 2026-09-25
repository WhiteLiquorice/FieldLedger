import React, { useState } from 'react';

type Trade = 'extinguisher' | 'hood' | 'grease';
type Tab = 'inspection' | 'report' | 'schedule';

const TRADE_DATA = {
  extinguisher: {
    title: 'Fire Extinguishers (NFPA 10)',
    assetName: 'Amerex 10lb ABC Dry Chemical',
    assetCode: 'EXT-1049',
    location: 'Building B · Kitchen Prep Line',
    interval: 'Annual Inspection · 12-Month Cycle',
    nextDue: 'April 2027',
    checklist: [
      { label: 'Pressure Gauge in Green Operating Zone', status: 'PASS', color: 'text-emerald-400' },
      { label: 'Pull Pin & Plastic Tamper Seal Intact', status: 'PASS', color: 'text-emerald-400' },
      { label: 'Hose & Nozzle Free from Obstructions', status: 'PASS', color: 'text-emerald-400' },
      { label: '6-Yr Maintenance & 12-Yr Hydro Valid', status: 'OK (2029)', color: 'text-cyan-400' },
    ],
    reportSummary: 'Complies with NFPA 10 standards. Tagged and logged for municipal AHJ inspection.',
  },
  hood: {
    title: 'Kitchen Exhaust Hood (NFPA 96)',
    assetName: '16-Foot Cookline Hood & Upblast Fan #2',
    assetCode: 'HOOD-8802',
    location: 'Main Commercial Kitchen · Line A',
    interval: 'Quarterly Cleaning · High-Volume Kitchen',
    nextDue: 'July 2026',
    checklist: [
      { label: 'Duct Bare Metal Degreasing (Before/After)', status: 'VERIFIED', color: 'text-emerald-400' },
      { label: 'Exhaust Fan Hinge Kit & Belt Tension', status: 'PASS', color: 'text-emerald-400' },
      { label: 'UL 300 Fire Suppression Nozzle Clearance', status: 'PASS', color: 'text-emerald-400' },
      { label: 'Access Panel Seals & Latches Replaced', status: 'COMPLETE', color: 'text-cyan-400' },
    ],
    reportSummary: 'NFPA 96 Certificate of Cleaning issued. Pre-wash & post-wash photo proof attached.',
  },
  grease: {
    title: 'Grease Trap & Interceptors (25% Rule)',
    assetName: '1,000 Gallon Outdoor Gravity Interceptor',
    assetCode: 'TRAP-4011',
    location: 'South Parking Lot Vault',
    interval: '90-Day Pumping · City FOG Ordinance',
    nextDue: 'May 2026',
    checklist: [
      { label: 'Sludge + Grease Depth < 25% of Total Volume', status: 'PUMPED 100%', color: 'text-emerald-400' },
      { label: 'Inlet & Outlet Baffle Tees Inspected', status: 'INTACT', color: 'text-emerald-400' },
      { label: 'Gallons Pumped Logged for City Manifest', status: '950 GAL', color: 'text-cyan-400' },
      { label: 'Discharge Manifest Timestamped to City Utility', status: 'SUBMITTED', color: 'text-emerald-400' },
    ],
    reportSummary: 'FOG ordinance compliance certificate generated. 950 gallons pumped and manifested.',
  },
};

export const FieldInspectionSandbox: React.FC = () => {
  const [trade, setTrade] = useState<Trade>('extinguisher');
  const [activeTab, setActiveTab] = useState<Tab>('inspection');
  const [companyName, setCompanyName] = useState('Ozark Fire & Safety');

  const current = TRADE_DATA[trade];
  const launchTrialUrl = `/app?onboarding=true&company=${encodeURIComponent(companyName)}&trade=${trade}`;

  return (
    <div className="rounded-3xl border-2 border-carbon-700 bg-carbon-900/95 p-5 sm:p-7 shadow-2xl shadow-black/80 backdrop-blur-xl relative overflow-hidden text-left">
      {/* Top Header & Trade Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-carbon-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-orange-400">
              Interactive Product Tour
            </span>
          </div>
          <h3 className="text-lg font-black text-white font-sans mt-0.5">
            How FieldLedger Works
          </h3>
        </div>

        {/* Trade Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-carbon-950 border border-carbon-800 text-xs">
          <button
            type="button"
            onClick={() => setTrade('extinguisher')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              trade === 'extinguisher'
                ? 'bg-orange-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🔥 Fire Extinguisher
          </button>
          <button
            type="button"
            onClick={() => setTrade('hood')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              trade === 'hood'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            💨 Kitchen Hood
          </button>
          <button
            type="button"
            onClick={() => setTrade('grease')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              trade === 'grease'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🛢️ Grease Trap
          </button>
        </div>
      </div>

      {/* 3 Step Navigation Tabs */}
      <div className="flex items-center gap-2 pt-4 pb-2 border-b border-carbon-800/80 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('inspection')}
          className={`flex-1 py-2 px-3 rounded-lg text-center transition-all ${
            activeTab === 'inspection'
              ? 'bg-carbon-800 text-orange-400 font-bold border border-carbon-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📱 1. Tech Field Inspection
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('report')}
          className={`flex-1 py-2 px-3 rounded-lg text-center transition-all ${
            activeTab === 'report'
              ? 'bg-carbon-800 text-orange-400 font-bold border border-carbon-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📄 2. Branded PDF Report
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 py-2 px-3 rounded-lg text-center transition-all ${
            activeTab === 'schedule'
              ? 'bg-carbon-800 text-orange-400 font-bold border border-carbon-700 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📅 3. Recurring Schedule
        </button>
      </div>

      {/* Main Interactive Screen Content */}
      <div className="my-5 rounded-2xl border border-carbon-700 bg-carbon-950 p-4 sm:p-5 relative shadow-inner min-h-[220px] flex flex-col justify-between">
        
        {/* TAB 1: TECH FIELD INSPECTION */}
        {activeTab === 'inspection' && (
          <div className="space-y-3">
            <div className="flex items-start justify-between pb-2 border-b border-carbon-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-orange-400">#{current.assetCode}</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                    OFFLINE SYNCED
                  </span>
                </div>
                <div className="text-sm font-bold text-white mt-0.5">{current.assetName}</div>
                <div className="text-xs text-slate-400">{current.location}</div>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-carbon-900 px-2.5 py-1 rounded border border-carbon-800">
                10-Sec Inspection
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {current.checklist.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-carbon-900 border border-carbon-800/90">
                  <span className="text-slate-300 pr-2 truncate">{item.label}</span>
                  <span className={`font-mono font-bold text-[11px] shrink-0 ${item.color}`}>
                    ✓ {item.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1 text-xs text-slate-400 font-mono">
              <span>📷 2 Photos Attached</span>
              <span className="text-emerald-400 font-bold">GPS & Time Stamped</span>
            </div>
          </div>
        )}

        {/* TAB 2: BRANDED PDF REPORT */}
        {activeTab === 'report' && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-carbon-700 bg-carbon-900">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-carbon-800">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Official Service Certificate</div>
                  <div className="text-sm font-black text-orange-400">{companyName}</div>
                </div>
                <div className="text-right font-mono text-[10px] text-slate-400">
                  <div>Cert #FL-2026-9904</div>
                  <div className="text-emerald-400 font-bold">PASSED / CERTIFIED</div>
                </div>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed mb-2 font-medium">
                {current.reportSummary}
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-carbon-800/80 text-[11px] font-mono text-slate-400">
                <div>Customer: Grand Horizon Hotel</div>
                <div>Inspector ID: #TECH-04</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>✓ Auto-emailed to building manager</span>
              <span className="text-orange-400 font-bold font-mono">1-Click PDF Export</span>
            </div>
          </div>
        )}

        {/* TAB 3: RECURRING ROUTE SCHEDULER */}
        {activeTab === 'schedule' && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-carbon-700 bg-carbon-900">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-white uppercase">Automated Recurrence Engine</span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                  {current.interval}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-carbon-950 border border-carbon-800">
                  <span className="text-slate-300">Next Service Due Date:</span>
                  <span className="font-mono font-bold text-orange-400">{current.nextDue}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-carbon-950 border border-carbon-800">
                  <span className="text-slate-300">Customer Renewal Reminder:</span>
                  <span className="font-mono font-bold text-emerald-400">30 Days Prior (Automated)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Zero lost recurring revenue</span>
              <span className="text-emerald-400 font-bold font-mono">100% Audit Proof</span>
            </div>
          </div>
        )}

      </div>

      {/* Action Footer: Launch Free Trial */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="w-full sm:w-auto flex-1">
          <label className="block text-[11px] font-mono text-slate-400 font-bold uppercase mb-1">
            Your Company Name:
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter your contractor company name"
            className="w-full rounded-xl border border-carbon-700 bg-carbon-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-sans"
          />
        </div>

        <a
          href={launchTrialUrl}
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black text-sm px-6 py-3 shadow-xl shadow-orange-500/30 hover:scale-[1.03] transition-all shrink-0 mt-auto border border-orange-400/50"
        >
          Launch Free Trial &rarr;
        </a>
      </div>
    </div>
  );
};
