import React, { useState } from 'react';
import { HoodProvider, useHood } from './context/HoodContext';
import { 
  Layers3, 
  Building2, 
  ClipboardCheck, 
  Camera, 
  FileBadge, 
  AlertTriangle, 
  Plus, 
  Printer, 
  MapPin, 
  PenTool 
} from 'lucide-react';

const DashboardView: React.FC = () => {
  const { hoods, sites, startCleaningJob } = useHood();

  const overdueHoods = hoods.filter((h) => {
    if (!h.nextCleaningDueAt) return false;
    return new Date(h.nextCleaningDueAt) < new Date();
  });
  const solidFuelHoods = hoods.filter((h) => h.cookingVolume === 'solid_fuel');

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-dark-900 border border-white/5 space-y-1">
          <span className="text-xs font-semibold text-slate-400">Total Hood Systems</span>
          <p className="text-3xl font-black text-white">{hoods.length}</p>
          <span className="text-[11px] text-brand-300 font-medium">Across {sites.length} commercial kitchens</span>
        </div>

        <div className="p-5 rounded-3xl bg-dark-900 border border-rose-500/20 bg-rose-950/10 space-y-1">
          <span className="text-xs font-semibold text-rose-300">Overdue Cleanings</span>
          <p className="text-3xl font-black text-rose-400">{overdueHoods.length}</p>
          <span className="text-[11px] text-rose-300/80 font-medium">Past NFPA 96 service window</span>
        </div>

        <div className="p-5 rounded-3xl bg-dark-900 border border-amber-500/20 bg-amber-950/10 space-y-1">
          <span className="text-xs font-semibold text-amber-300">Solid Fuel Systems</span>
          <p className="text-3xl font-black text-amber-400">{solidFuelHoods.length}</p>
          <span className="text-[11px] text-amber-300/80 font-medium">Requires monthly cleanings</span>
        </div>

        <div className="p-5 rounded-3xl bg-dark-900 border border-emerald-500/20 bg-emerald-950/10 space-y-1">
          <span className="text-xs font-semibold text-emerald-300">NFPA 96 Compliance</span>
          <p className="text-3xl font-black text-emerald-400">
            {Math.round(((hoods.length - overdueHoods.length) / (hoods.length || 1)) * 100)}%
          </p>
          <span className="text-[11px] text-emerald-300/80 font-medium">Certified active systems</span>
        </div>
      </div>

      {/* Commercial Kitchens Queue */}
      <div className="p-6 rounded-3xl bg-dark-900 border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-400" />
              Commercial Kitchen Accounts
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a facility to inspect hood canopies, duct risers, and rooftop exhaust fans
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sites.map((site) => {
            const siteHoods = hoods.filter((h) => h.siteId === site.id);
            const hasOverdue = siteHoods.some((h) => h.nextCleaningDueAt && new Date(h.nextCleaningDueAt) < new Date());

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
                        Cleaning Due
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
                    {siteHoods.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 truncate max-w-xs">{h.systemName}</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {h.hoodLengthFeet || 16}ft · {h.cookingVolume} volume
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => startCleaningJob(site.id)}
                  className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition-all cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Launch Hood Cleaning Walk
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const HoodRegistryView: React.FC = () => {
  const { hoods, sites, addHoodSystem, org } = useHood();
  const [open, setOpen] = useState(false);
  const [systemName, setSystemName] = useState('');
  const [siteId, setSiteId] = useState(sites[0]?.id || '');
  const [hoodLengthFeet, setHoodLengthFeet] = useState(16);
  const [accessPanelsCount, setAccessPanelsCount] = useState(3);
  const [cookingVolume, setCookingVolume] = useState<'low' | 'medium' | 'high' | 'solid_fuel'>('high');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!systemName || !siteId) return;

    addHoodSystem({
      orgId: org.id,
      customerId: sites.find((s) => s.id === siteId)?.customerId || '',
      siteId,
      systemName,
      locationDescription: 'Main Cooking Line',
      hoodLengthFeet,
      ductType: 'welded_steel',
      fanType: 'upblast_roof',
      fanHingesInstalled: true,
      accessPanelsCount,
      cookingVolume,
      serviceIntervalMonths: cookingVolume === 'solid_fuel' ? 1 : cookingVolume === 'high' ? 3 : 6,
      lastCondition: 'cleaned_to_bare_metal',
    });

    setOpen(false);
    setSystemName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers3 className="w-5 h-5 text-brand-400" />
            Kitchen Hood & Exhaust Duct Registry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete inventory of commercial kitchen exhaust canopies, duct risers, and rooftop fans
          </p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-brand-500/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Kitchen Hood System
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {hoods.map((hood) => {
          const site = sites.find((s) => s.id === hood.siteId);
          return (
            <div key={hood.id} className="p-5 rounded-2xl bg-dark-900 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white truncate">{hood.systemName}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-brand-500/10 text-brand-300 border border-brand-500/20">
                  {hood.cookingVolume} volume
                </span>
              </div>

              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-brand-400" />
                {site?.siteName}
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-500 block">Canopy Length</span>
                  <span className="font-semibold">{hood.hoodLengthFeet} Feet</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Access Panels</span>
                  <span className="font-semibold">{hood.accessPanelsCount} Panels</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Fan Type</span>
                  <span className="font-semibold capitalize">{hood.fanType.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Interval</span>
                  <span className="font-semibold">{hood.serviceIntervalMonths} Months</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-white/10 rounded-3xl p-6 max-w-lg w-full space-y-4">
            <h3 className="text-base font-bold text-white">Register Commercial Hood System</h3>

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
                <label className="block text-xs font-semibold text-slate-300 mb-1">System / Line Name</label>
                <input
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  placeholder="e.g. Main Banquet Cooking Line Hood #1"
                  className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hood Length (ft)</label>
                  <input
                    type="number"
                    value={hoodLengthFeet}
                    onChange={(e) => setHoodLengthFeet(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cooking Fuel / Volume</label>
                  <select
                    value={cookingVolume}
                    onChange={(e) => setCookingVolume(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white text-xs"
                  >
                    <option value="solid_fuel">Solid Fuel / Mesquite (Monthly)</option>
                    <option value="high">High Volume / 24-hr (Quarterly)</option>
                    <option value="medium">Moderate Volume (Semi-Annual)</option>
                    <option value="low">Low Volume / Baking (Annual)</option>
                  </select>
                </div>
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
                  className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-xs"
                >
                  Save System
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const CleaningJobView: React.FC = () => {
  const { currentSite, currentSiteHoods, finishCleaningAndIssueCertificate } = useHood();

  const [greaseDepthMicrons, setGreaseDepthMicrons] = useState(50);
  const [techName, setTechName] = useState('Brandon Scott (Cert #NFPA96-4412)');
  const [chefName, setChefName] = useState('Executive Chef Robert Chen');

  if (!currentSite) return <div>No site selected</div>;

  const handleFinish = () => {
    finishCleaningAndIssueCertificate({
      techSignatureUrl: 'sig-tech-verified',
      managerSignatureUrl: 'sig-manager-verified',
      managerName: chefName,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="p-6 rounded-3xl bg-gradient-to-r from-dark-900 via-dark-850 to-slate-900 border border-white/10 flex items-center justify-between shadow-xl">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-brand-400">
            Active NFPA 96 Service Job
          </span>
          <h1 className="text-xl font-extrabold text-white tracking-tight">{currentSite.siteName}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{currentSite.address.street}, {currentSite.address.city}</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold font-mono">
          {currentSiteHoods.length} Hood Systems
        </span>
      </div>

      {/* Step 1: Cleaned Sections & Photo Evidence */}
      <div className="p-6 rounded-3xl bg-dark-900 border border-white/5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Camera className="w-5 h-5 text-brand-400" />
          NFPA 96 Section 11.6 Component Cleaning Checklist & Photos
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-dark-850 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Hood Plenum & Baffle Filters</span>
              <span className="text-xs text-emerald-400 font-bold">Bare Metal Clean</span>
            </div>
            <p className="text-[11px] text-slate-400">Degreased and pressure-washed to bare metallic surface</p>
            <div className="flex gap-2 pt-1">
              <span className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300">Photo: Before.jpg ✓</span>
              <span className="px-2 py-1 rounded bg-slate-800 text-[10px] text-emerald-300">Photo: After.jpg ✓</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-dark-850 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Horizontal & Vertical Ductwork</span>
              <span className="text-xs text-emerald-400 font-bold">Access Panel Verified</span>
            </div>
            <p className="text-[11px] text-slate-400">Scraped and steamed through all NFPA listed access doors</p>
            <div className="flex gap-2 pt-1">
              <span className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300">Photo: Riser.jpg ✓</span>
              <span className="px-2 py-1 rounded bg-slate-800 text-[10px] text-emerald-300">Photo: Duct_Clean.jpg ✓</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-dark-850 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Rooftop Upblast Exhaust Fan</span>
              <span className="text-xs text-emerald-400 font-bold">Clean & Hinge Checked</span>
            </div>
            <p className="text-[11px] text-slate-400">Impeller blades, scroll housing, and grease containment box</p>
            <div className="flex gap-2 pt-1">
              <span className="px-2 py-1 rounded bg-slate-800 text-[10px] text-emerald-300">Photo: Rooftop_Fan.jpg ✓</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-dark-850 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Post-Clean Grease Depth</span>
              <span className="text-xs text-emerald-400 font-bold">&lt; 50 Microns (Passed)</span>
            </div>
            <p className="text-[11px] text-slate-400">Combustible grease residue measurement complies with Table 11.6.2</p>
            <input
              type="number"
              value={greaseDepthMicrons}
              onChange={(e) => setGreaseDepthMicrons(Number(e.target.value))}
              className="w-full p-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono"
            />
          </div>
        </div>
      </div>

      {/* Step 2: Signatures & Certification Issue */}
      <div className="p-6 rounded-3xl bg-dark-900 border border-white/5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <PenTool className="w-5 h-5 text-brand-400" />
          Technician Certification & Kitchen Management Signoff
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Certified Technician</label>
            <input
              type="text"
              value={techName}
              onChange={(e) => setTechName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Facility / Kitchen Representative</label>
            <input
              type="text"
              value={chefName}
              onChange={(e) => setChefName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white text-xs font-mono"
            />
          </div>
        </div>

        <button
          onClick={handleFinish}
          className="w-full py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-400 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-brand-500/25 transition-all cursor-pointer mt-4"
        >
          <FileBadge className="w-4 h-4" />
          Complete Job & Generate NFPA 96 Certificate Packet
        </button>
      </div>
    </div>
  );
};

const CertificateView: React.FC = () => {
  const { org, currentSite, currentSiteHoods, setActiveView } = useHood();

  const handlePrint = () => window.print();

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
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-xs shadow-lg shadow-brand-500/25 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Print / PDF Export
        </button>
      </div>

      {/* NFPA 96 Certificate Document */}
      <div className="bg-white text-slate-900 p-8 rounded-3xl border border-slate-300 shadow-2xl space-y-6">
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
              {org.branding.companyName}
            </h1>
            <p className="text-xs font-semibold text-slate-600">
              Commercial Kitchen Exhaust Cleaning & Fire Prevention Services
            </p>
            <p className="text-xs font-mono text-slate-500 mt-1">State Lic: {org.branding.licenseNumber}</p>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-emerald-700 text-white font-black text-xs uppercase rounded-md tracking-wider">
              NFPA 96 CERTIFIED
            </span>
            <p className="text-xs font-mono text-slate-500 mt-1">
              Date: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Facility Info */}
        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="font-bold text-slate-500 block uppercase text-[10px]">Client Facility</span>
            <p className="font-black text-sm text-slate-900">{currentSite?.siteName}</p>
            <p className="text-slate-600">{currentSite?.address.street}, {currentSite?.address.city}</p>
          </div>
          <div>
            <span className="font-bold text-slate-500 block uppercase text-[10px]">Next Service Due</span>
            <p className="font-black text-sm text-emerald-800">
              {new Date(Date.now() + 90 * 86400000).toLocaleDateString()}
            </p>
            <p className="text-slate-600">Standard 3-Month Commercial Schedule</p>
          </div>
        </div>

        {/* Systems Cleaned Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Certified Exhaust System Breakdown
          </h3>
          <table className="w-full text-left text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 font-bold border-b border-slate-300">
                <th className="p-2">System Name</th>
                <th className="p-2">Hood Length</th>
                <th className="p-2">Fan Type</th>
                <th className="p-2">Fuel Type</th>
                <th className="p-2 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currentSiteHoods.map((hood) => (
                <tr key={hood.id}>
                  <td className="p-2 font-semibold">{hood.systemName}</td>
                  <td className="p-2">{hood.hoodLengthFeet || 16} ft</td>
                  <td className="p-2 capitalize">{hood.fanType.replace(/_/g, ' ')}</td>
                  <td className="p-2 uppercase text-[11px]">{hood.cookingVolume}</td>
                  <td className="p-2 text-right font-black text-emerald-700">CLEANED TO BARE METAL</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Inaccessible Duct Notice / NFPA 96 Section 7.4.1 Disclaimer */}
        <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 text-xs space-y-1">
          <p className="font-bold text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            NFPA 96 Section 11.6.1 Service Affidavit & Access Notice
          </p>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            All accessible components of the commercial exhaust system have been cleaned to bare metal. Any duct sections lacking building access panels are documented on file and noted to the owner.
          </p>
        </div>

        {/* Dual Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300 text-xs">
          <div className="space-y-1">
            <div className="h-10 border-b border-slate-900 font-serif italic text-slate-800 pt-2 text-sm">
              Brandon Scott, Certified NFPA 96 Technician
            </div>
            <p className="font-bold text-slate-600 text-[10px] uppercase">Technician Signature</p>
          </div>
          <div className="space-y-1">
            <div className="h-10 border-b border-slate-900 font-serif italic text-slate-800 pt-2 text-sm">
              Chef Robert Chen, Banquet Director
            </div>
            <p className="font-bold text-slate-600 text-[10px] uppercase">Facility Representative Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'hoods' | 'job' | 'cert'>('dashboard');

  return (
    <HoodProvider>
      <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col font-sans">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-dark-900/80 backdrop-blur-md border-b border-white/5 px-6 py-4 no-print flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 p-0.5 shadow-lg shadow-brand-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center">
                <Layers3 className="w-5 h-5 text-brand-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">HoodCleanOps</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  NFPA 96
                </span>
              </div>
              <p className="text-xs text-slate-400">Commercial Kitchen Exhaust & Duct Cleaning OS</p>
            </div>
          </div>

          <nav className="flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'dashboard' ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('hoods')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'hoods' ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hood Systems
            </button>
            <button
              onClick={() => setActiveTab('job')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'job' ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active Job
            </button>
            <button
              onClick={() => setActiveTab('cert')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'cert' ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              NFPA 96 Certificate
            </button>
          </nav>
        </header>

        {/* Main Body */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'hoods' && <HoodRegistryView />}
          {activeTab === 'job' && <CleaningJobView />}
          {activeTab === 'cert' && <CertificateView />}
        </main>
      </div>
    </HoodProvider>
  );
};

export default App;
