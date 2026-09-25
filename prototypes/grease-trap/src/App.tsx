import React, { useState } from 'react';
import { GreaseProvider, useGrease } from './context/GreaseContext';
import { 
  Droplets, 
  Building2, 
  FileText, 
  Plus, 
  Truck, 
  Printer, 
  MapPin, 
  Calculator 
} from 'lucide-react';
import { calculateGreaseTrapFOG } from '@compliance-saas/backend-core';

const DashboardView: React.FC = () => {
  const { traps, sites, pumpingLogs, startPumpingJob } = useGrease();

  const overdueTraps = traps.filter((t) => {
    if (!t.nextPumpDueAt) return false;
    return new Date(t.nextPumpDueAt) < new Date();
  });
  const violations = pumpingLogs.filter((l) => l.is25PercentRuleViolated);
  const totalGallonsPumped = pumpingLogs.reduce((acc, l) => acc + l.gallonsPumped, 0);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-dark-900 border border-white/5 space-y-1">
          <span className="text-xs font-semibold text-slate-400">Total Interceptors</span>
          <p className="text-3xl font-black text-white">{traps.length}</p>
          <span className="text-[11px] text-brand-300 font-medium">Across {sites.length} commercial food facilities</span>
        </div>

        <div className="p-5 rounded-3xl bg-dark-900 border border-rose-500/20 bg-rose-950/10 space-y-1">
          <span className="text-xs font-semibold text-rose-300">Overdue Pumping</span>
          <p className="text-3xl font-black text-rose-400">{overdueTraps.length}</p>
          <span className="text-[11px] text-rose-300/80 font-medium">Exceeds municipal schedule</span>
        </div>

        <div className="p-5 rounded-3xl bg-dark-900 border border-amber-500/20 bg-amber-950/10 space-y-1">
          <span className="text-xs font-semibold text-amber-300">25% Rule Violations</span>
          <p className="text-3xl font-black text-amber-400">{violations.length}</p>
          <span className="text-[11px] text-amber-300/80 font-medium">FOG accumulation &gt; 25% total capacity</span>
        </div>

        <div className="p-5 rounded-3xl bg-dark-900 border border-cyan-500/20 bg-cyan-950/10 space-y-1">
          <span className="text-xs font-semibold text-cyan-300">Total Gallons Pumped</span>
          <p className="text-3xl font-black text-cyan-400">{totalGallonsPumped.toLocaleString()} gal</p>
          <span className="text-[11px] text-cyan-300/80 font-medium">Manifested & hauled to reclamation</span>
        </div>
      </div>

      {/* Facilities Queue */}
      <div className="p-6 rounded-3xl bg-dark-900 border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-400" />
              Grease Producing Food Service Facilities
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a restaurant, resort, or banquet kitchen to pump interceptors and generate FOG disposal manifests
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sites.map((site) => {
            const siteTraps = traps.filter((t) => t.siteId === site.id);
            const hasOverdue = siteTraps.some((t) => t.nextPumpDueAt && new Date(t.nextPumpDueAt) < new Date());

            return (
              <div
                key={site.id}
                className="p-5 rounded-2xl bg-dark-850 border border-white/5 hover:border-brand-500/30 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-300 uppercase tracking-wider">
                      {site.siteName}
                    </span>
                    {hasOverdue ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Pump Due
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Compliant
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 mt-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {site.address.street}, {site.address.city}
                  </p>

                  <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                    {siteTraps.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-mono">{t.internalId || 'GT-UNIT'}</span>
                        <span className="text-slate-400 text-[11px]">
                          {t.capacityGallons} gal · {t.trapType.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => startPumpingJob(site.id)}
                  className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 active:scale-95 text-dark-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition-all cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  Dispatch Pumping & Sludge Measurement
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TrapRegistryView: React.FC = () => {
  const { traps, sites, addGreaseTrap, org } = useGrease();
  const [open, setOpen] = useState(false);
  const [internalId, setInternalId] = useState('');
  const [siteId, setSiteId] = useState(sites[0]?.id || '');
  const [trapType, setTrapType] = useState<any>('gravity');
  const [capacityGallons, setCapacityGallons] = useState(1500);
  const [locationDescription, setLocationDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalId || !siteId) return;

    addGreaseTrap({
      orgId: org.id,
      customerId: sites.find((s) => s.id === siteId)?.customerId || '',
      siteId,
      internalId,
      trapType,
      capacityGallons,
      flowRateGpm: capacityGallons > 500 ? 100 : 25,
      locationDescription: locationDescription || 'Kitchen Utility Area',
      serviceIntervalDays: capacityGallons > 500 ? 90 : 30,
      lastCondition: 'good',
    });

    setOpen(false);
    setInternalId('');
    setLocationDescription('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Droplets className="w-5 h-5 text-brand-400" />
            Grease Interceptor & Trap Asset Registry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Physical dimensions, liquid capacity, and municipal maintenance schedules for all grease equipment
          </p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-brand-500/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Grease Trap / Interceptor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {traps.map((trap) => {
          const site = sites.find((s) => s.id === trap.siteId);
          return (
            <div key={trap.id} className="p-5 rounded-2xl bg-dark-900 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm font-mono text-white">{trap.internalId || 'GT-ASSET'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-brand-500/10 text-brand-300 border border-brand-500/20">
                  {trap.capacityGallons} gal
                </span>
              </div>

              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-brand-400" />
                {site?.siteName}
              </p>
              <p className="text-[11px] text-slate-300 truncate">{trap.locationDescription}</p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-500 block">Unit Type</span>
                  <span className="font-semibold capitalize">{trap.trapType.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Capacity</span>
                  <span className="font-semibold">{trap.capacityGallons} Gal</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Flow Rating</span>
                  <span className="font-semibold">{trap.flowRateGpm || 50} GPM</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Interval</span>
                  <span className="font-semibold">{trap.serviceIntervalDays} Days</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-white/10 rounded-3xl p-6 max-w-lg w-full space-y-4">
            <h3 className="text-base font-bold text-white">Register Grease Interceptor</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Facility</label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white text-xs"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.siteName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Trap Identifier / Tag #</label>
                <input
                  type="text"
                  value={internalId}
                  onChange={(e) => setInternalId(e.target.value.toUpperCase())}
                  placeholder="e.g. GT-OUTDOOR-1500"
                  className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white text-xs font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Type</label>
                  <select
                    value={trapType}
                    onChange={(e) => setTrapType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white text-xs"
                  >
                    <option value="gravity">Outdoor Gravity Interceptor</option>
                    <option value="indoor_interceptor">Indoor Hydromechanical Trap</option>
                    <option value="outdoor_vault">Sub-Grade Vault</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Capacity (Gallons)</label>
                  <input
                    type="number"
                    value={capacityGallons}
                    onChange={(e) => setCapacityGallons(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Location Description</label>
                <input
                  type="text"
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  placeholder="e.g. East Loading Bay Outside Asphalt Vault"
                  className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-950 font-bold text-xs"
                >
                  Save Interceptor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const PumpingJobView: React.FC = () => {
  const { currentSite, currentSiteTraps, recordPumpingJob } = useGrease();

  const activeTrap = currentSiteTraps[0];
  const [totalDepthInches, setTotalDepthInches] = useState(72);
  const [topGreaseInches, setTopGreaseInches] = useState(12);
  const [bottomSludgeInches, setBottomSludgeInches] = useState(8);
  const [gallonsPumped, setGallonsPumped] = useState(activeTrap?.capacityGallons || 1500);
  const [bafflesIntact, setBafflesIntact] = useState(true);
  const [disposalFacility, setDisposalFacility] = useState('Stickney Water Reclamation & Resource Recovery Plant (MWRD Permit #4410)');
  const [truckNumber, setTruckNumber] = useState('PUMPER-TK-44');
  const [driverName, setDriverName] = useState('Jesse Vance (CDL #IL-991204)');
  const [facilityRepName, setFacilityRepName] = useState(currentSite?.siteContact.name || 'Carlos Mendez');

  if (!currentSite || !activeTrap) return <div>No interceptor selected</div>;

  const fogCalc = calculateGreaseTrapFOG(totalDepthInches, topGreaseInches, bottomSludgeInches);

  const handleComplete = () => {
    recordPumpingJob({
      trapId: activeTrap.id,
      siteId: currentSite.id,
      manifestNumber: `MWRD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      gallonsPumped,
      topGreaseInches,
      bottomSludgeInches,
      totalDepthInches,
      bafflesIntact,
      disposalFacility,
      truckNumber,
      driverName,
      facilityRepName,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="p-6 rounded-3xl bg-gradient-to-r from-dark-900 via-dark-850 to-slate-900 border border-white/10 flex items-center justify-between shadow-xl">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-brand-400">
            Active Grease Pumping & Sludge Judge Walk
          </span>
          <h1 className="text-xl font-extrabold text-white tracking-tight">{currentSite.siteName}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{activeTrap.internalId || 'GT-ASSET'} ({activeTrap.capacityGallons} Gallons)</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold font-mono">
          {activeTrap.locationDescription}
        </span>
      </div>

      {/* Step 1: Sludge Judge & 25% Rule Calculator */}
      <div className="p-6 rounded-3xl bg-dark-900 border border-white/5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-brand-400" />
          Pre-Service Core Sampling (Sludge Judge FOG 25% Calculation)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Total Liquid Depth (in)</label>
            <input
              type="number"
              value={totalDepthInches}
              onChange={(e) => setTotalDepthInches(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Top Grease Layer (in)</label>
            <input
              type="number"
              value={topGreaseInches}
              onChange={(e) => setTopGreaseInches(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Bottom Sludge Layer (in)</label>
            <input
              type="number"
              value={bottomSludgeInches}
              onChange={(e) => setBottomSludgeInches(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white font-mono text-xs"
            />
          </div>
        </div>

        {/* Live Calculation Banner */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          fogCalc.isViolated
            ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
            : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
        }`}>
          <div className="space-y-0.5">
            <span className="text-xs font-bold uppercase tracking-wider">
              {fogCalc.isViolated ? '25% Rule Violated (Critical FOG Overload)' : '25% Rule Compliant'}
            </span>
            <p className="text-[11px] opacity-80">
              Total FOG Accumulation: {topGreaseInches + bottomSludgeInches} inches out of {totalDepthInches} inches
            </p>
          </div>
          <span className="text-2xl font-black font-mono">{fogCalc.fogPercentage.toFixed(1)}%</span>
        </div>
      </div>

      {/* Step 2: Pump Out & Manifest Details */}
      <div className="p-6 rounded-3xl bg-dark-900 border border-white/5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Truck className="w-5 h-5 text-brand-400" />
          Pumping Volume & EPA / Municipal Reclamation Route
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Gallons Evacuated / Pumped</label>
            <input
              type="number"
              value={gallonsPumped}
              onChange={(e) => setGallonsPumped(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Vacuum Pumper Truck #</label>
            <input
              type="text"
              value={truckNumber}
              onChange={(e) => setTruckNumber(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white font-mono text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">Licensed Receiving / Disposal Facility</label>
            <input
              type="text"
              value={disposalFacility}
              onChange={(e) => setDisposalFacility(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white text-xs"
            />
          </div>
        </div>

        <button
          onClick={handleComplete}
          className="w-full py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-400 active:scale-95 text-dark-950 font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-brand-500/25 transition-all cursor-pointer mt-4"
        >
          <FileText className="w-4 h-4" />
          Generate & Sign Municipal Waste Manifest Slip
        </button>
      </div>
    </div>
  );
};

const ManifestView: React.FC = () => {
  const { org, currentSite, latestManifest, setActiveView } = useGrease();

  const handlePrint = () => window.print();

  if (!latestManifest) return <div>No manifest recorded yet</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between no-print">
        <button
          onClick={() => setActiveView('dashboard')}
          className="text-xs text-slate-400 hover:text-white"
        >
          ← Return to Dashboard
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-500 hover:bg-brand-400 text-dark-950 font-bold text-xs shadow-lg shadow-brand-500/25 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Print / PDF Export
        </button>
      </div>

      {/* Official Waste Manifest Slip */}
      <div className="bg-white text-slate-900 p-8 rounded-3xl border border-slate-300 shadow-2xl space-y-6">
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
              {org.branding.companyName}
            </h1>
            <p className="text-xs font-semibold text-slate-600">
              Licensed Non-Hazardous Liquid Waste Hauler & Interceptor Pumping
            </p>
            <p className="text-xs font-mono text-slate-500 mt-1">Hauler Permit: {org.branding.licenseNumber}</p>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-cyan-800 text-white font-black text-xs uppercase rounded-md tracking-wider">
              FOG DISPOSAL MANIFEST
            </span>
            <p className="text-xs font-mono text-slate-500 mt-1">
              Manifest #: {latestManifest.manifestNumber}
            </p>
          </div>
        </div>

        {/* Generator & Hauler Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="font-bold text-slate-500 block uppercase text-[10px]">Generator Facility</span>
            <p className="font-black text-sm text-slate-900">{currentSite?.siteName}</p>
            <p className="text-slate-600">{currentSite?.address.street}, {currentSite?.address.city}</p>
          </div>
          <div>
            <span className="font-bold text-slate-500 block uppercase text-[10px]">Disposal Destination</span>
            <p className="font-black text-sm text-slate-900">{latestManifest.disposalFacility}</p>
            <p className="text-slate-600">Truck: {latestManifest.truckNumber} • Driver: {latestManifest.driverName}</p>
          </div>
        </div>

        {/* Pumping & Sludge Measurement Details */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            FOG Pumping & Depth Measurement Summary
          </h3>
          <table className="w-full text-left text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 font-bold border-b border-slate-300">
                <th className="p-2">Gallons Pumped</th>
                <th className="p-2">Liquid Depth</th>
                <th className="p-2">Top Grease</th>
                <th className="p-2">Bottom Sludge</th>
                <th className="p-2">FOG %</th>
                <th className="p-2 text-right">25% Rule Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 font-black">{latestManifest.gallonsPumped.toLocaleString()} Gallons</td>
                <td className="p-2">{latestManifest.totalDepthInches} in</td>
                <td className="p-2">{latestManifest.topGreaseInches} in</td>
                <td className="p-2">{latestManifest.bottomSludgeInches} in</td>
                <td className="p-2 font-mono font-bold">{latestManifest.fogPercentage.toFixed(1)}%</td>
                <td className="p-2 text-right font-black">
                  {latestManifest.is25PercentRuleViolated ? (
                    <span className="text-rose-700">VIOLATED (&gt;25%)</span>
                  ) : (
                    <span className="text-emerald-700">COMPLIANT</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300 text-xs">
          <div className="space-y-1">
            <div className="h-10 border-b border-slate-900 font-serif italic text-slate-800 pt-2 text-sm">
              {latestManifest.driverName}
            </div>
            <p className="font-bold text-slate-600 text-[10px] uppercase">Hauler Driver Signature</p>
          </div>
          <div className="space-y-1">
            <div className="h-10 border-b border-slate-900 font-serif italic text-slate-800 pt-2 text-sm">
              {latestManifest.facilityRepName}
            </div>
            <p className="font-bold text-slate-600 text-[10px] uppercase">Generator Representative Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'traps' | 'job' | 'manifest'>('dashboard');

  return (
    <GreaseProvider>
      <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col font-sans">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-dark-900/80 backdrop-blur-md border-b border-white/5 px-6 py-4 no-print flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center">
                <Droplets className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">TrapFlow</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  EPA / MWRD FOG
                </span>
              </div>
              <p className="text-xs text-slate-400">Grease Trap & Interceptor Operations OS</p>
            </div>
          </div>

          <nav className="flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'dashboard' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('traps')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'traps' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Interceptors
            </button>
            <button
              onClick={() => setActiveTab('job')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'job' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pumping Walk
            </button>
            <button
              onClick={() => setActiveTab('manifest')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'manifest' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Waste Manifest
            </button>
          </nav>
        </header>

        {/* Main Body */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'traps' && <TrapRegistryView />}
          {activeTab === 'job' && <PumpingJobView />}
          {activeTab === 'manifest' && <ManifestView />}
        </main>
      </div>
    </GreaseProvider>
  );
};

export default App;
