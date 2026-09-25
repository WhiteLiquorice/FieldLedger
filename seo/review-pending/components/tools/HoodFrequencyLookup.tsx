import React, { useState } from 'react';
import { Layers3, CheckCircle2, Flame, ShieldAlert, Info } from 'lucide-react';

interface CookingProfile {
  title: string;
  description: string;
  fuelType: string;
  frequency: 'Monthly' | 'Quarterly' | 'Semi-Annually' | 'Annually';
  frequencyDays: number;
  nfpaSection: string;
  hazardLevel: 'High / Critical' | 'Moderate / High' | 'Moderate' | 'Low';
  inspectionFocus: string[];
}

const COOKING_PROFILES: Record<string, CookingProfile> = {
  solid_fuel: {
    title: 'Solid Fuel Cooking (Wood, Charcoal, Briquettes, Wood Pellets)',
    description: 'Commercial pizza ovens, wood-fired grills, mesquite barbecue pits, open charcoal broilers.',
    fuelType: 'Solid Fuel (Wood / Coal)',
    frequency: 'Monthly',
    frequencyDays: 30,
    nfpaSection: 'NFPA 96 Table 12.4 (Monthly Requirement)',
    hazardLevel: 'High / Critical',
    inspectionFocus: [
      'Creosote accumulation in horizontal duct runs',
      'Spark arrestor filter integrity and clean grease drains',
      'Exhaust fan housing and hinge kit grease accumulation',
      'Access panels within 10 feet of horizontal turns'
    ]
  },
  high_volume: {
    title: 'High-Volume Commercial Cooking (24-Hour, Wok, Charbroiling, Fast Food)',
    description: '24-hour diners, heavy wok Asian restaurants, high-throughput fryers, charbroiler burger chains.',
    fuelType: 'Gas / Heavy Grease Vapor',
    frequency: 'Quarterly',
    frequencyDays: 90,
    nfpaSection: 'NFPA 96 Table 12.4 (Quarterly Requirement)',
    hazardLevel: 'Moderate / High',
    inspectionFocus: [
      'Grease buildup behind baffle filters in plenum',
      'Fan belt tension and fan grease containment catch basin',
      'Vertical riser duct degreasing to bare metal',
      'Duct access door fire wrap / gasket seal integrity'
    ]
  },
  moderate_volume: {
    title: 'Moderate-Volume Cooking (Standard Full-Service Dining, Hotel Kitchens)',
    description: 'Casual sit-down restaurants, hotel banquets, school cafeterias, corporate dining halls.',
    fuelType: 'Standard Gas / Electric Appliances',
    frequency: 'Semi-Annually',
    frequencyDays: 180,
    nfpaSection: 'NFPA 96 Table 12.4 (Semi-Annual Requirement)',
    hazardLevel: 'Moderate',
    inspectionFocus: [
      'Canopy hood filter tracks and gutter drainage',
      'Exhaust fan rooftop runoff containment',
      'Semi-annual fire suppression link inspection correlation',
      'Pre-cleaning grease depth measurement with comb gauge'
    ]
  },
  low_volume: {
    title: 'Low-Volume Cooking (Churches, Day Camps, Seasonal Kiosks, Senior Centers)',
    description: 'Churches, community event centers, seasonal sports stadiums, senior living satellite pantries.',
    fuelType: 'Low-Output Cooking',
    frequency: 'Annually',
    frequencyDays: 365,
    nfpaSection: 'NFPA 96 Table 12.4 (Annual Requirement)',
    hazardLevel: 'Low',
    inspectionFocus: [
      'Annual bare metal exhaust degreasing certification sticker',
      'Electrical connection inspection for roof blower',
      'Annual fire marshal compliance report logging'
    ]
  }
};

export const HoodFrequencyLookup: React.FC = () => {
  const [profileKey, setProfileKey] = useState<string>('high_volume');
  const profile = COOKING_PROFILES[profileKey];

  return (
    <div className="rounded-3xl border border-carbon-700 bg-carbon-900/90 p-6 sm:p-10 shadow-2xl backdrop-blur-xl text-left">
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-carbon-800">
        <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/30 grid place-items-center font-bold text-xl">
          💨
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">NFPA 96 Hood Cleaning Frequency Matrix</h2>
          <p className="text-xs sm:text-sm text-slate-400">Official Table 12.4 Inspection & Degreasing Interval Lookup</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Selection */}
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Kitchen Type & Cooking Volume
            </label>
            <div className="space-y-2.5">
              {Object.entries(COOKING_PROFILES).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setProfileKey(key)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 ${
                    profileKey === key
                      ? 'border-violet-500 bg-violet-500/10 text-white'
                      : 'border-carbon-800 bg-carbon-950 text-slate-300 hover:border-carbon-700'
                  }`}
                >
                  <div>
                    <p className="font-bold text-sm text-white">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded shrink-0 ${
                    item.frequency === 'Monthly' ? 'bg-red-500/20 text-red-400' :
                    item.frequency === 'Quarterly' ? 'bg-orange-500/20 text-orange-400' :
                    item.frequency === 'Semi-Annually' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {item.frequency}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Output Details Column */}
        <div className="rounded-2xl border border-carbon-700 bg-carbon-950/80 p-6 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Frequency Banner */}
            <div className="p-5 rounded-xl border border-carbon-800 bg-carbon-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Mandated Cleaning Frequency</span>
                <span className="text-xs font-mono font-bold text-violet-400">{profile.nfpaSection}</span>
              </div>
              <p className="text-3xl font-black text-white">{profile.frequency} Service</p>
              <p className="text-xs text-slate-300 mt-1">
                Every <strong className="text-white">{profile.frequencyDays} days</strong>, the exhaust system (hood, ductwork, filters, and fan) must be inspected by certified personnel and cleaned to bare metal.
              </p>
            </div>

            {/* Inspection Checklist Requirements */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Mandatory Inspection Checklist (NFPA 96 § 12.7):
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                {profile.inspectionFocus.map((point, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-violet-400 font-bold">✓</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Action */}
          <div className="mt-6 pt-4 border-t border-carbon-800 text-center">
            <a
              href="/app?plan=pro"
              className="w-full block rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold py-3 text-xs shadow-lg shadow-violet-500/20 transition-all text-center"
            >
              Generate NFPA 96 Hood Reports on FieldLedger →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
