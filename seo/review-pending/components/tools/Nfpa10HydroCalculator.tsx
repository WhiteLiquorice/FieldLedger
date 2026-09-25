import React, { useState } from 'react';
import { Calendar, CheckCircle2, AlertTriangle, ShieldCheck, Info } from 'lucide-react';

interface ExtinguisherSpec {
  name: string;
  hydroIntervalYears: number;
  sixYearRequired: boolean;
  notes: string;
}

const EXTINGUISHER_SPECS: Record<string, ExtinguisherSpec> = {
  dry_chem_stored_pressure: {
    name: 'Stored Pressure Dry Chemical (ABC, Regular, Purple-K)',
    hydroIntervalYears: 12,
    sixYearRequired: true,
    notes: 'Requires 6-year internal teardown and 12-year hydrostatic pressure retest (NFPA 10 § 7.3.3 & § 8.3).',
  },
  co2: {
    name: 'Carbon Dioxide (CO2)',
    hydroIntervalYears: 5,
    sixYearRequired: false,
    notes: 'DOT 3AL / 3A high-pressure cylinder. Hydro test required every 5 years (NFPA 10 § 8.3). No 6-year internal needed.',
  },
  wet_chem_k: {
    name: 'Wet Chemical (Class K - Kitchen)',
    hydroIntervalYears: 5,
    sixYearRequired: false,
    notes: 'Stainless steel cylinder with low-pH potassium agent. Hydro test required every 5 years (NFPA 10 § 8.3).',
  },
  clean_agent: {
    name: 'Clean Agent (Halon 1211, FE-36, Halotron)',
    hydroIntervalYears: 12,
    sixYearRequired: true,
    notes: 'Stored pressure clean agents require 6-year internal recovery/exam and 12-year hydro test (NFPA 10 § 7.3.3).',
  },
  water_afff: {
    name: 'Water / AFFF / FFFP Foam',
    hydroIntervalYears: 5,
    sixYearRequired: false,
    notes: 'Water and foam cylinders require hydrostatic pressure test every 5 years (NFPA 10 § 8.3).',
  },
};

export const Nfpa10HydroCalculator: React.FC = () => {
  const [extType, setExtType] = useState<string>('dry_chem_stored_pressure');
  const [mfgYear, setMfgYear] = useState<number>(2018);
  const [lastHydroYear, setLastHydroYear] = useState<number>(2018);
  const [lastSixYear, setLastSixYear] = useState<number>(2024);

  const currentYear = new Date().getFullYear();
  const spec = EXTINGUISHER_SPECS[extType];

  // Calculate Next Hydro
  const nextHydroYear = (lastHydroYear || mfgYear) + spec.hydroIntervalYears;
  const isHydroOverdue = currentYear >= nextHydroYear;
  const isHydroDueSoon = nextHydroYear - currentYear === 1;

  // Calculate Next 6-Year
  let nextSixYear = null;
  let isSixYearOverdue = false;
  let isSixYearDueSoon = false;

  if (spec.sixYearRequired) {
    const baseYear = lastSixYear || mfgYear;
    nextSixYear = baseYear + 6;
    isSixYearOverdue = currentYear >= nextSixYear;
    isSixYearDueSoon = nextSixYear - currentYear === 1;
  }

  return (
    <div className="rounded-3xl border border-carbon-700 bg-carbon-900/90 p-6 sm:p-10 shadow-2xl backdrop-blur-xl text-left">
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-carbon-800">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/30 grid place-items-center font-bold text-xl">
          🧯
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">NFPA 10 Hydro & 6-Year Date Calculator</h2>
          <p className="text-xs sm:text-sm text-slate-400">Instant code-compliant maintenance milestone calculation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inputs Column */}
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Extinguisher Agent & Cylinder Type
            </label>
            <select
              value={extType}
              onChange={(e) => setExtType(e.target.value)}
              className="w-full rounded-xl border border-carbon-700 bg-carbon-950 px-4 py-3 text-sm text-white focus:border-orange-400 outline-none"
            >
              {Object.entries(EXTINGUISHER_SPECS).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Mfg Year
              </label>
              <input
                type="number"
                min="1980"
                max={currentYear}
                value={mfgYear}
                onChange={(e) => setMfgYear(parseInt(e.target.value) || currentYear)}
                className="w-full rounded-xl border border-carbon-700 bg-carbon-950 px-4 py-3 text-sm text-white focus:border-orange-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Last Hydro Year
              </label>
              <input
                type="number"
                min="1980"
                max={currentYear + 20}
                value={lastHydroYear}
                onChange={(e) => setLastHydroYear(parseInt(e.target.value) || mfgYear)}
                className="w-full rounded-xl border border-carbon-700 bg-carbon-950 px-4 py-3 text-sm text-white focus:border-orange-400 outline-none"
              />
            </div>

            {spec.sixYearRequired && (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Last 6-Yr Teardown
                </label>
                <input
                  type="number"
                  min="1980"
                  max={currentYear + 10}
                  value={lastSixYear}
                  onChange={(e) => setLastSixYear(parseInt(e.target.value) || mfgYear)}
                  className="w-full rounded-xl border border-carbon-700 bg-carbon-950 px-4 py-3 text-sm text-white focus:border-orange-400 outline-none"
                />
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-carbon-950 p-4 border border-carbon-800 flex items-start gap-3 text-xs text-slate-400">
            <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <p>{spec.notes}</p>
          </div>
        </div>

        {/* Results Output Column */}
        <div className="rounded-2xl border border-carbon-700 bg-carbon-950/80 p-6 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Hydro Milestone Card */}
            <div className="p-4 rounded-xl border border-carbon-800 bg-carbon-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Hydrostatic Test ({spec.hydroIntervalYears}-Year)</span>
                {isHydroOverdue ? (
                  <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> OVERDUE
                  </span>
                ) : isHydroDueSoon ? (
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    DUE SOON
                  </span>
                ) : (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> COMPLIANT
                  </span>
                )}
              </div>
              <p className="text-2xl font-black text-white">Due in {nextHydroYear}</p>
              <p className="text-xs text-slate-400 mt-1">
                {isHydroOverdue
                  ? `Overdue by ${currentYear - nextHydroYear} year(s). Cylinder must be hydrostatically tested before recertification.`
                  : `Next pressure test required by December 31, ${nextHydroYear}.`}
              </p>
            </div>

            {/* 6-Year Milestone Card */}
            {spec.sixYearRequired && nextSixYear && (
              <div className="p-4 rounded-xl border border-carbon-800 bg-carbon-900">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">6-Year Internal Maintenance</span>
                  {isSixYearOverdue ? (
                    <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> OVERDUE
                    </span>
                  ) : isSixYearDueSoon ? (
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      DUE SOON
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> COMPLIANT
                    </span>
                  )}
                </div>
                <p className="text-2xl font-black text-white">Due in {nextSixYear}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {isSixYearOverdue
                    ? `Overdue by ${currentYear - nextSixYear} year(s). Complete internal teardown and collar attachment required.`
                    : `Next internal inspection required by December 31, ${nextSixYear}.`}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Action */}
          <div className="mt-6 pt-4 border-t border-carbon-800 text-center">
            <p className="text-xs text-slate-400 mb-3">
              Want to auto-track hydro dates with 1-click barcode scans in the field?
            </p>
            <a
              href="/app?plan=pro"
              className="w-full block rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 text-xs shadow-lg shadow-orange-500/20 transition-all text-center"
            >
              Automate Hydro Tracking on FieldLedger →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
