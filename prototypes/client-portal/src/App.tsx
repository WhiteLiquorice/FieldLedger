import React, { useState } from 'react';
import { ClientPortalProvider, useClientPortal } from './context/ClientPortalContext';
import { 
  Building2, 
  ShieldCheck, 
  Flame, 
  Layers3, 
  Droplets, 
  FileBadge, 
  DollarSign, 
  Calendar, 
  Plus, 
  MessageSquare, 
  Printer, 
  Check, 
  CheckCircle2, 
  Send, 
  X 
} from 'lucide-react';

const DashboardTab: React.FC = () => {
  const { 
    client, 
    sites, 
    extinguishers, 
    hoods, 
    greaseTraps, 
    quotes, 
    requests, 
    setActiveTab 
  } = useClientPortal();

  const pendingQuotes = quotes.filter((q) => q.status === 'pending');
  const totalAssets = extinguishers.length + hoods.length + greaseTraps.length;
  const overdueAssets = [
    ...extinguishers.filter((e) => e.status === 'service_required' || e.status === 'replace' || e.status === 'missing'),
    ...hoods.filter((h) => h.nextCleaningDueAt && new Date(h.nextCleaningDueAt) < new Date()),
    ...greaseTraps.filter((g) => g.nextPumpDueAt && new Date(g.nextPumpDueAt) < new Date()),
  ];
  const complianceScore = Math.round(((totalAssets - overdueAssets.length) / (totalAssets || 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-dark-900 via-dark-850 to-blue-950/40 border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Facility Compliance Hub
            </span>
            <span className="text-xs text-slate-400">{client.companyName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome back, {client.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            All 3 compliance services across your {sites.length} hospitality properties are tracked in real-time. Fire marshal and municipal health records are up-to-date.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('request_service')}
          className="px-6 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-400 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-brand-500/25 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Request Service Stop
        </button>
      </div>

      {/* Compliance Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-dark-900 border border-white/5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Tracked Equipment</span>
            <Building2 className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-3xl font-black text-white">{totalAssets}</p>
          <span className="text-[11px] text-slate-400">Extinguishers, Hoods, Interceptors</span>
        </div>

        <div className="p-5 rounded-3xl bg-dark-900 border border-white/5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Overall Compliance Score</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400">{complianceScore}%</p>
          <span className="text-[11px] text-emerald-300 font-medium">Audit-Ready for Fire Marshal</span>
        </div>

        <div className="p-5 rounded-3xl bg-dark-900 border border-amber-500/20 bg-amber-950/10 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300">Pending Repair Quotes</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-amber-400">{pendingQuotes.length}</p>
          <span className="text-[11px] text-amber-300/80 font-medium">Awaiting 1-click client approval</span>
        </div>

        <div className="p-5 rounded-3xl bg-dark-900 border border-cyan-500/20 bg-cyan-950/10 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-300">Upcoming Scheduled Stops</span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-3xl font-black text-cyan-400">{requests.length}</p>
          <span className="text-[11px] text-cyan-300/80 font-medium">Confirmed contractor visits</span>
        </div>
      </div>

      {/* 3 Service Vertical Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Extinguishers */}
        <div className="p-6 rounded-3xl bg-dark-900 border border-white/5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-white">Fire Extinguishers</span>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                NFPA 10
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {extinguishers.length} units inspected across all guest floors, kitchens, and mechanical shafts.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('equipment')}
            className="w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            View Extinguisher Ledger →
          </button>
        </div>

        {/* Hood Cleaning */}
        <div className="p-6 rounded-3xl bg-dark-900 border border-white/5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Layers3 className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-white">Kitchen Hood Cleaning</span>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                NFPA 96
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {hoods.length} commercial canopy & duct exhaust systems. Next scheduled cleaning: Aug 24.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('equipment')}
            className="w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            View Kitchen Hoods →
          </button>
        </div>

        {/* Grease Interceptors */}
        <div className="p-6 rounded-3xl bg-dark-900 border border-white/5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Droplets className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-white">Grease Trap & FOG</span>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                EPA / MWRD
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {greaseTraps.length} interceptors (1,550 total gallons). FOG disposal manifests on file.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('equipment')}
            className="w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            View Grease Interceptors →
          </button>
        </div>
      </div>
    </div>
  );
};

const EquipmentTab: React.FC = () => {
  const { extinguishers, hoods, greaseTraps } = useClientPortal();
  const [filterType, setFilterType] = useState<'all' | 'extinguisher' | 'hood' | 'grease'>('all');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-400" />
            Digital Multi-Service Equipment Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Unified inventory of fire extinguishers, kitchen exhaust hoods, and grease interceptors across all your sites
          </p>
        </div>

        <div className="flex gap-1.5 bg-dark-900 p-1 rounded-2xl border border-white/5 text-xs font-semibold">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${filterType === 'all' ? 'bg-brand-500 text-white' : 'text-slate-400'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('extinguisher')}
            className={`px-3 py-1.5 rounded-xl transition-all ${filterType === 'extinguisher' ? 'bg-orange-500 text-white' : 'text-slate-400'}`}
          >
            Extinguishers
          </button>
          <button
            onClick={() => setFilterType('hood')}
            className={`px-3 py-1.5 rounded-xl transition-all ${filterType === 'hood' ? 'bg-purple-500 text-white' : 'text-slate-400'}`}
          >
            Hoods
          </button>
          <button
            onClick={() => setFilterType('grease')}
            className={`px-3 py-1.5 rounded-xl transition-all ${filterType === 'grease' ? 'bg-cyan-500 text-white' : 'text-slate-400'}`}
          >
            Grease Traps
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-dark-900 border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-850 text-slate-400 uppercase tracking-wider font-bold border-b border-white/5">
              <tr>
                <th className="p-4">Service Type</th>
                <th className="p-4">Tag / Identifier</th>
                <th className="p-4">Facility & Location</th>
                <th className="p-4">Specs / Dimensions</th>
                <th className="p-4">Last Inspected</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {/* Extinguishers */}
              {(filterType === 'all' || filterType === 'extinguisher') &&
                extinguishers.map((ext) => (
                  <tr key={ext.id} className="hover:bg-white/[.02]">
                    <td className="p-4">
                      <span className="flex items-center gap-2 text-orange-400 font-semibold">
                        <Flame className="w-4 h-4" /> Fire Extinguisher
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-white">{ext.qrCode}</td>
                    <td className="p-4">{ext.roomOrArea}</td>
                    <td className="p-4">{ext.capacityLbs}lb {ext.type.replace(/_/g, ' ')}</td>
                    <td className="p-4 text-slate-400">2026-08-18</td>
                    <td className="p-4 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ext.status === 'pass' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {ext.status === 'pass' ? 'CERTIFIED' : 'RECHARGE REQUIRED'}
                      </span>
                    </td>
                  </tr>
                ))}

              {/* Hoods */}
              {(filterType === 'all' || filterType === 'hood') &&
                hoods.map((hood) => (
                  <tr key={hood.id} className="hover:bg-white/[.02]">
                    <td className="p-4">
                      <span className="flex items-center gap-2 text-purple-400 font-semibold">
                        <Layers3 className="w-4 h-4" /> Kitchen Exhaust Hood
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-white">{hood.systemName}</td>
                    <td className="p-4">{hood.locationDescription}</td>
                    <td className="p-4">{hood.hoodLengthFeet}ft Canopy · {hood.cookingVolume} vol</td>
                    <td className="p-4 text-slate-400">{new Date(hood.lastCleanedAt || '').toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300">
                        CLEANED BARE METAL
                      </span>
                    </td>
                  </tr>
                ))}

              {/* Grease Traps */}
              {(filterType === 'all' || filterType === 'grease') &&
                greaseTraps.map((trap) => (
                  <tr key={trap.id} className="hover:bg-white/[.02]">
                    <td className="p-4">
                      <span className="flex items-center gap-2 text-cyan-400 font-semibold">
                        <Droplets className="w-4 h-4" /> Grease Interceptor
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-white">{trap.internalId || 'GT-UNIT'}</td>
                    <td className="p-4">{trap.locationDescription}</td>
                    <td className="p-4">{trap.capacityGallons} Gallons ({trap.trapType.replace(/_/g, ' ')})</td>
                    <td className="p-4 text-slate-400">{new Date(trap.lastPumpedAt || '').toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300">
                        MANIFESTED
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const CertificatesTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FileBadge className="w-5 h-5 text-brand-400" />
          Official Compliance Records & Inspector Vault
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Tamper-evident, signed compliance certificates and waste manifests formatted for City Fire Marshals and Health Inspectors
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* NFPA 10 Extinguisher Certificate */}
        <div className="p-6 rounded-3xl bg-dark-900 border border-white/5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
              NFPA 10 · Fire Extinguishers
            </span>
            <h3 className="font-bold text-base text-white">Annual Fire Extinguisher Inspection Certificate</h3>
            <p className="text-xs text-slate-400">
              18 Units Inspected • State Fire Marshal License #IL-8842 Verified • Full 12-Month Tag Grid
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-dark-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20"
          >
            <Printer className="w-4 h-4" />
            Print / Download PDF Packet
          </button>
        </div>

        {/* NFPA 96 Hood Certificate */}
        <div className="p-6 rounded-3xl bg-dark-900 border border-white/5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              NFPA 96 · Commercial Kitchens
            </span>
            <h3 className="font-bold text-base text-white">Kitchen Exhaust & Duct Cleaning Certificate</h3>
            <p className="text-xs text-slate-400">
              Cleaned to Bare Metal (&lt;50 Microns) • Access Panel Affidavit • Before/After Photo Packet
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-500/20"
          >
            <Printer className="w-4 h-4" />
            Print / Download PDF Packet
          </button>
        </div>

        {/* EPA FOG Manifest */}
        <div className="p-6 rounded-3xl bg-dark-900 border border-white/5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              EPA / MWRD · Liquid Waste
            </span>
            <h3 className="font-bold text-base text-white">FOG Interceptor Waste Disposal Manifest</h3>
            <p className="text-xs text-slate-400">
              1,500 Gallons Pumped • Sludge Judge Core Sample Measurements • Municipal Reclamation Receipt
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-dark-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <Printer className="w-4 h-4" />
            Print / Download PDF Packet
          </button>
        </div>
      </div>
    </div>
  );
};

const QuotesTab: React.FC = () => {
  const { quotes, approveQuote, declineQuote } = useClientPortal();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-brand-400" />
          Deficiency Repair Quotes & Work Orders
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Issues flagged during technician field walks. Review estimated costs and 1-click approve repairs to maintain compliance.
        </p>
      </div>

      <div className="space-y-4">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className="p-6 rounded-3xl bg-dark-900 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  quote.severity === 'critical' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {quote.severity} Deficiency
                </span>
                <span className="font-mono text-xs font-bold text-white">{quote.assetCode}</span>
                <span className="text-xs text-slate-400">({quote.assetLocation})</span>
              </div>

              <p className="font-bold text-sm text-white">{quote.issueDescription}</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="text-brand-300 font-semibold">Recommended Fix:</span> {quote.recommendedAction}
              </p>
            </div>

            <div className="text-right space-y-3 shrink-0">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated Cost</span>
                <span className="text-2xl font-black text-white">${quote.estimatedCost.toFixed(2)}</span>
              </div>

              {quote.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => declineQuote(quote.id)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => approveQuote(quote.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 text-xs font-black flex items-center gap-1 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve Work Order
                  </button>
                </div>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Approved
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MessagesTab: React.FC = () => {
  const { messages, sendMessage } = useClientPortal();
  const [text, setText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(text);
    setText('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-400" />
          Direct Contractor Communication & Dispatch Channel
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time message thread between your facilities team and certified field supervisors
        </p>
      </div>

      <div className="rounded-3xl bg-dark-900 border border-white/5 flex flex-col h-[520px]">
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isClient = msg.senderRole === 'client';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-slate-400">{msg.senderName}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={`p-4 rounded-2xl max-w-lg text-xs leading-relaxed ${
                    isClient
                      ? 'bg-brand-600 text-white rounded-br-none'
                      : 'bg-dark-800 text-slate-200 border border-white/5 rounded-bl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-white/5 flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message or request for your service contractor..."
            className="flex-1 p-3 rounded-xl bg-dark-850 border border-white/10 text-white text-xs"
          />
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-brand-500/25 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

const RequestServiceModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { sites, submitServiceRequest } = useClientPortal();
  const [siteId, setSiteId] = useState(sites[0]?.id || '');
  const [serviceVertical, setServiceVertical] = useState<'extinguisher' | 'hood_cleaning' | 'grease_trap' | 'all'>('extinguisher');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'emergency'>('routine');
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState(new Date().toISOString().slice(0, 10));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    submitServiceRequest({
      siteId,
      serviceVertical,
      priority,
      preferredDate,
      description,
      requestedBy: {
        name: 'Elena Rostova',
        email: 'elena@grandhorizon.com',
        phone: '(555) 234-5678',
      },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-dark-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Request Facility Service Stop</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Property</label>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Service Type</label>
              <select
                value={serviceVertical}
                onChange={(e) => setServiceVertical(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white text-xs"
              >
                <option value="extinguisher">Fire Extinguishers (NFPA 10)</option>
                <option value="hood_cleaning">Kitchen Exhaust Cleaning (NFPA 96)</option>
                <option value="grease_trap">Grease Interceptor Pumping</option>
                <option value="all">Full Comprehensive Walk</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white text-xs"
              >
                <option value="routine">Routine Scheduled Stop</option>
                <option value="urgent">Urgent (Within 48h)</option>
                <option value="emergency">Emergency Discharged / Overflow</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Preferred Date</label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Service Notes & Specific Areas</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Please check the 2nd floor banquet service line and pump the outdoor grease interceptor before the weekend event."
              className="w-full p-2.5 rounded-xl bg-dark-850 border border-white/10 text-white text-xs"
              required
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-xs"
            >
              Dispatch Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { client, activeTab, setActiveTab } = useClientPortal();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  return (
    <ClientPortalProvider>
      <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col font-sans">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-dark-900/80 backdrop-blur-md border-b border-white/5 px-6 py-4 no-print flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-blue-400 p-0.5 shadow-lg shadow-brand-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-brand-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">Facility Hub</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  Client Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">{client.companyName}</p>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'dashboard' ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('equipment')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'equipment' ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Equipment Ledger
            </button>
            <button
              onClick={() => setActiveTab('certificates')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'certificates' ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Certificates & Reports
            </button>
            <button
              onClick={() => setActiveTab('quotes')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'quotes' ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Repair Quotes
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'messages' ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Contractor Messages
            </button>
          </nav>

          {/* User Profile / Quick Contact */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white">{client.name}</p>
              <p className="text-[10px] text-slate-400">{client.role}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-500 to-indigo-500 p-0.5">
              <img
                src={client.avatarUrl}
                alt={client.name}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'equipment' && <EquipmentTab />}
          {activeTab === 'certificates' && <CertificatesTab />}
          {activeTab === 'quotes' && <QuotesTab />}
          {activeTab === 'messages' && <MessagesTab />}
          {(activeTab === 'request_service' || isRequestModalOpen) && (
            <RequestServiceModal onClose={() => setIsRequestModalOpen(false)} />
          )}
        </main>
      </div>
    </ClientPortalProvider>
  );
};

export default App;
