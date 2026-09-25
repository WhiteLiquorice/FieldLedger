import React, { useState } from 'react';
import { Droplets, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export const GreaseTrapFogCalculator: React.FC = () => {
  const [totalDepthInches, setTotalDepthInches] = useState<number>(36);
  const [greaseInches, setGreaseInches] = useState<number>(6);
  const [sludgeInches, setSludgeInches] = useState<number>(4);
  const [capacityGallons, setCapacityGallons] = useState<number>(500);

  const totalFogInches = greaseInches + sludgeInches;
  const fogPercentage = totalDepthInches > 0 ? (totalFogInches / totalDepthInches) * 100 : 0;
  const maxAllowedFogInches = totalDepthInches * 0.25;
  const remainingInches = Math.max(0, maxAllowedFogInches - totalFogInches);

  const isFailing = fogPercentage >= 25;
  const isWarning = fogPercentage >= 20 && fogPercentage < 25;

  const estimatedWasteGallons = (fogPercentage / 100) * capacityGallons;

  return (
    <div className="rounded-3xl border border-carbon-700 bg-carbon-900/90 p-6 sm:p-10 shadow-2xl backdrop-blur-xl text-left">
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-carbon-800">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 grid place-items-center font-bold text-xl">
          🛢️
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">25% FOG Rule Grease Trap Calculator</h2>
          <p className="text-xs sm:text-sm text-slate-400">EPA & Municipal Sewer Compliance Sizing & Pumping Calculator</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Total Liquid Depth (Inches)
              </label>
              <input
                type="number"
                min="6"
                max="120"
                value={totalDepthInches}
                onChange={(e) => setTotalDepthInches(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-carbon-700 bg-carbon-950 px-4 py-3 text-sm text-white focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Trap Capacity (Gallons)
              </label>
              <input
                type="number"
                min="10"
                max="10000"
                value={capacityGallons}
                onChange={(e) => setCapacityGallons(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-carbon-700 bg-carbon-950 px-4 py-3 text-sm text-white focus:border-cyan-400 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Top Grease Layer (Inches)
              </label>
              <input
                type="number"
                min="0"
                max={totalDepthInches}
                step="0.5"
                value={greaseInches}
                onChange={(e) => setGreaseInches(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-carbon-700 bg-carbon-950 px-4 py-3 text-sm text-white focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Bottom Sludge Layer (Inches)
              </label>
              <input
                type="number"
                min="0"
                max={totalDepthInches}
                step="0.5"
                value={sludgeInches}
                onChange={(e) => setSludgeInches(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-carbon-700 bg-carbon-950 px-4 py-3 text-sm text-white focus:border-cyan-400 outline-none"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-carbon-950 p-4 border border-carbon-800 flex items-start gap-3 text-xs text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>
              <strong>The 25% Rule:</strong> Environmental regulators require immediate pump-out when combined floating grease and settled sludge occupy 25% or more of total liquid capacity.
            </p>
          </div>
        </div>

        {/* Visual Gauge & Calculation Output */}
        <div className="rounded-2xl border border-carbon-700 bg-carbon-950/80 p-6 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Compliance Status Banner */}
            <div className="p-4 rounded-xl border border-carbon-800 bg-carbon-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Compliance Status</span>
                {isFailing ? (
                  <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> VIOLATION: PUMP REQUIRED
                  </span>
                ) : isWarning ? (
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> WARNING (NEAR LIMIT)
                  </span>
                ) : (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> COMPLIANT
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2 mt-2">
                <span className={`text-4xl font-black ${isFailing ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-cyan-400'}`}>
                  {fogPercentage.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400">Total FOG Depth (Max 25.0%)</span>
              </div>

              {/* Visual Capacity Progress Bar */}
              <div className="w-full bg-carbon-950 rounded-full h-3.5 my-3 p-0.5 border border-carbon-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isFailing ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-cyan-400'}`}
                  style={{ width: `${Math.min(100, fogPercentage * 4)}%` }}
                ></div>
              </div>

              <p className="text-xs text-slate-400 mt-2">
                {isFailing
                  ? `Exceeds 25% threshold by ${(fogPercentage - 25).toFixed(1)}%. Trap is discharging excess fats and oils into municipal sewer lines.`
                  : `Currently ${remainingInches.toFixed(1)}" (${(25 - fogPercentage).toFixed(1)}%) beneath mandatory pump-out threshold.`}
              </p>
            </div>

            {/* Volume Metrics */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-carbon-900 border border-carbon-800">
                <p className="text-[11px] text-slate-400 uppercase">Total Grease/Sludge</p>
                <p className="text-lg font-bold text-white mt-1">{totalFogInches.toFixed(1)}"</p>
              </div>
              <div className="p-3 rounded-xl bg-carbon-900 border border-carbon-800">
                <p className="text-[11px] text-slate-400 uppercase">Estimated Waste Vol</p>
                <p className="text-lg font-bold text-white mt-1">~{Math.round(estimatedWasteGallons)} Gal</p>
              </div>
            </div>
          </div>

          {/* Bottom Action */}
          <div className="mt-6 pt-4 border-t border-carbon-800 text-center">
            <a
              href="/app?plan=pro"
              className="w-full block rounded-xl bg-cyan-500 hover:bg-cyan-400 text-carbon-950 font-bold py-3 text-xs shadow-lg shadow-cyan-500/20 transition-all text-center"
            >
              Generate Digital Pumping Manifests on FieldLedger →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
