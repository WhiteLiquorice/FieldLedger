import React, { useState } from 'react';

export const InteractiveComplianceWidget: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'grease' | 'fire' | 'hood'>('grease');

  // Grease state
  const [totalDepthInches, setTotalDepthInches] = useState<number>(36);
  const [topGreaseInches, setTopGreaseInches] = useState<number>(5);
  const [bottomSolidsInches, setBottomSolidsInches] = useState<number>(4);

  // Extinguisher state
  const [extinguisherType, setExtinguisherType] = useState<string>('abc-dry-chem');
  const [manufactureYear, setManufactureYear] = useState<number>(2020);
  const [lastHydroYear, setLastHydroYear] = useState<number>(2020);

  // Hood state
  const [cookingVolume, setCookingVolume] = useState<string>('high');

  // Grease calculation
  const totalFogInches = Number(topGreaseInches) + Number(bottomSolidsInches);
  const fogPercentage = totalDepthInches > 0 ? (totalFogInches / totalDepthInches) * 100 : 0;
  const isGreaseViolation = fogPercentage >= 25;

  // Extinguisher calculations
  const currentYear = new Date().getFullYear();
  const yearsSinceHydro = currentYear - Number(lastHydroYear);
  const hydroInterval = extinguisherType === 'co2' ? 5 : 12;
  const isHydroDue = yearsSinceHydro >= hydroInterval;
  const is6YearDue = extinguisherType === 'abc-dry-chem' && currentYear - Number(manufactureYear) >= 6;

  return (
    <div className="rounded-2xl border border-carbon-700 bg-carbon-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-carbon-800">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded bg-safety-amber/10 border border-safety-amber/30 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-safety-amber mb-2">
            Interactive Regulatory Engine
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-sans">
            Live Compliance & Audit Calculator
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Test real-world NFPA 10, NFPA 96, and municipal FOG rules instantly.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center rounded-xl bg-carbon-950 p-1 border border-carbon-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('grease')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'grease'
                ? 'bg-safety-cyan text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            FOG 25% Rule
          </button>
          <button
            onClick={() => setActiveTab('fire')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'fire'
                ? 'bg-safety-orange text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            NFPA 10 Hydro
          </button>
          <button
            onClick={() => setActiveTab('hood')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'hood'
                ? 'bg-safety-amber text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            NFPA 96 Schedule
          </button>
        </div>
      </div>

      {/* Tab 1: Grease Calculator */}
      {activeTab === 'grease' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1">Total Liquid Depth (in)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={totalDepthInches}
                  onChange={(e) => setTotalDepthInches(Number(e.target.value))}
                  className="w-full rounded-lg border border-carbon-700 bg-carbon-950 px-3 py-2 text-white focus:border-safety-cyan focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Top Grease Cap (in)</label>
                <input
                  type="number"
                  min="0"
                  max={totalDepthInches}
                  value={topGreaseInches}
                  onChange={(e) => setTopGreaseInches(Number(e.target.value))}
                  className="w-full rounded-lg border border-carbon-700 bg-carbon-950 px-3 py-2 text-white focus:border-safety-cyan focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Bottom Sludge (in)</label>
                <input
                  type="number"
                  min="0"
                  max={totalDepthInches}
                  value={bottomSolidsInches}
                  onChange={(e) => setBottomSolidsInches(Number(e.target.value))}
                  className="w-full rounded-lg border border-carbon-700 bg-carbon-950 px-3 py-2 text-white focus:border-safety-cyan focus:outline-none"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              <strong className="text-slate-200">Rule of Thumb:</strong> Under EPA and city wastewater ordinances, total grease cap + settled solids must not exceed 25% of the total operating depth. Exceeding 25% triggers immediate municipal citations.
            </p>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-carbon-700 bg-carbon-950 p-5 text-center flex flex-col justify-center">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
              Calculated FOG Capacity
            </div>
            <div
              className={`text-4xl font-extrabold font-mono ${
                isGreaseViolation ? 'text-safety-danger' : 'text-safety-verified'
              }`}
            >
              {fogPercentage.toFixed(1)}%
            </div>
            <div className="mt-2 text-xs font-semibold">
              {isGreaseViolation ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-950/60 border border-red-500/40 px-3 py-1 text-red-400">
                  ⚠️ Service Required (Violation of 25% Rule)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 text-emerald-400">
                  ✓ Compliant (Within 25% Threshold)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: NFPA 10 Extinguisher Checker */}
      {activeTab === 'fire' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4 text-xs font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Extinguisher Agent</label>
                <select
                  value={extinguisherType}
                  onChange={(e) => setExtinguisherType(e.target.value)}
                  className="w-full rounded-lg border border-carbon-700 bg-carbon-950 px-3 py-2 text-white focus:border-safety-orange focus:outline-none"
                >
                  <option value="abc-dry-chem">ABC Dry Chemical</option>
                  <option value="co2">CO2 (Carbon Dioxide)</option>
                  <option value="k-class">Class K Wet Chemical</option>
                  <option value="water">Pressurized Water</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Manufacture Year</label>
                <input
                  type="number"
                  value={manufactureYear}
                  onChange={(e) => setManufactureYear(Number(e.target.value))}
                  className="w-full rounded-lg border border-carbon-700 bg-carbon-950 px-3 py-2 text-white focus:border-safety-orange focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Last Hydro Test</label>
                <input
                  type="number"
                  value={lastHydroYear}
                  onChange={(e) => setLastHydroYear(Number(e.target.value))}
                  className="w-full rounded-lg border border-carbon-700 bg-carbon-950 px-3 py-2 text-white focus:border-safety-orange focus:outline-none"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-sans">
              <strong className="text-slate-200">NFPA 10 Standard:</strong> Dry Chemical units require 6-year internal teardowns and 12-year hydrostatic pressure cylinder testing. CO2 cylinders require 5-year testing.
            </p>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-carbon-700 bg-carbon-950 p-5 text-center flex flex-col justify-center">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
              Inspection Status
            </div>
            <div className="text-2xl font-bold font-sans text-white">
              {isHydroDue ? (
                <span className="text-safety-danger">Hydrostatic Test Overdue</span>
              ) : is6YearDue ? (
                <span className="text-safety-amber">6-Year Teardown Due</span>
              ) : (
                <span className="text-safety-verified">Certified & In Service</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Next Hydro Due: {Number(lastHydroYear) + hydroInterval}
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: NFPA 96 Hood Cleaning */}
      {activeTab === 'hood' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4 text-xs font-mono">
            <div>
              <label className="block text-slate-300 mb-1">Cooking Volume & Fuel Type</label>
              <select
                value={cookingVolume}
                onChange={(e) => setCookingVolume(e.target.value)}
                className="w-full rounded-lg border border-carbon-700 bg-carbon-950 px-3 py-2 text-white focus:border-safety-amber focus:outline-none"
              >
                <option value="solid">Solid Fuel (Wood, Charcoal, Mesquite - Pizza/BBQ)</option>
                <option value="high">High Volume (24-Hour, Wok Cooking, Charbroiling)</option>
                <option value="moderate">Moderate Volume (Standard Restaurant / Diner)</option>
                <option value="low">Low Volume (Churches, Seasonal, Day Camps)</option>
              </select>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              <strong className="text-slate-200">NFPA 96 Table 12.4:</strong> Commercial cooking exhaust systems must be professionally inspected and washed down to bare metal according to fuel volume.
            </p>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-carbon-700 bg-carbon-950 p-5 text-center flex flex-col justify-center">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
              Required Cleaning Frequency
            </div>
            <div className="text-2xl font-extrabold font-mono text-safety-amber">
              {cookingVolume === 'solid'
                ? 'MONTHLY'
                : cookingVolume === 'high'
                ? 'QUARTERLY (3 Mos)'
                : cookingVolume === 'moderate'
                ? 'SEMI-ANNUALLY (6 Mos)'
                : 'ANNUALLY (12 Mos)'}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Mandatory before/after photo documentation required by insurance adjusters.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
