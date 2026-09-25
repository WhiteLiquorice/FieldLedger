export interface CityTradeInfo {
  citySlug: string;
  cityName: string;
  stateName: string;
  stateAbbr: string;
  trade: 'fire-extinguisher' | 'hood-cleaning' | 'grease-trap';
  tradeTitle: string;
  metaTitle: string;
  metaDescription: string;
  localAhjName: string;
  localCodeReference: string;
  keyProblems: string[];
  localFeatures: string[];
  faqs: { question: string; answer: string }[];
}

export const CITIES_DATA = [
  { slug: 'springfield-mo', name: 'Springfield', stateName: 'Missouri', stateAbbr: 'MO', fireDept: 'Springfield Fire Department Bureau of Fire Prevention', sewerAuthority: 'Springfield Environmental Services FOG Division' },
  { slug: 'kansas-city-mo', name: 'Kansas City', stateName: 'Missouri', stateAbbr: 'MO', fireDept: 'Kansas City Fire Department (KCFD) Fire Prevention', sewerAuthority: 'KC Water FOG Compliance Program' },
  { slug: 'st-louis-mo', name: 'St. Louis', stateName: 'Missouri', stateAbbr: 'MO', fireDept: 'St. Louis Fire Department Fire Prevention Bureau', sewerAuthority: 'Metropolitan St. Louis Sewer District (MSD)' },
  { slug: 'joplin-mo', name: 'Joplin', stateName: 'Missouri', stateAbbr: 'MO', fireDept: 'Joplin Fire Department Fire Safety Bureau', sewerAuthority: 'Joplin Public Works Wastewater Division' },
  { slug: 'columbia-mo', name: 'Columbia', stateName: 'Missouri', stateAbbr: 'MO', fireDept: 'Columbia Fire Department Fire Marshal Office', sewerAuthority: 'Columbia Sewer Utility FOG Program' },
  { slug: 'dallas-tx', name: 'Dallas', stateName: 'Texas', stateAbbr: 'TX', fireDept: 'Dallas Fire-Rescue Fire Prevention Division', sewerAuthority: 'Dallas Water Utilities Pretreatment Program' },
  { slug: 'austin-tx', name: 'Austin', stateName: 'Texas', stateAbbr: 'TX', fireDept: 'Austin Fire Department Special Events & Inspections', sewerAuthority: 'Austin Water Special Services Division' },
  { slug: 'houston-tx', name: 'Houston', stateName: 'Texas', stateAbbr: 'TX', fireDept: 'Houston Fire Department Fire Marshal Office', sewerAuthority: 'Houston Public Works Wastewater Operations' },
  { slug: 'chicago-il', name: 'Chicago', stateName: 'Illinois', stateAbbr: 'IL', fireDept: 'Chicago Fire Department Bureau of Fire Prevention', sewerAuthority: 'Metropolitan Water Reclamation District (MWRD)' },
  { slug: 'atlanta-ga', name: 'Atlanta', stateName: 'Georgia', stateAbbr: 'GA', fireDept: 'City of Atlanta Fire Rescue Fire Inspections', sewerAuthority: 'Atlanta Department of Watershed Management' },
  { slug: 'miami-fl', name: 'Miami', stateName: 'Florida', stateAbbr: 'FL', fireDept: 'Miami Fire Rescue Fire Prevention Bureau', sewerAuthority: 'Miami-Dade Water & Sewer Department (WASD)' },
  { slug: 'orlando-fl', name: 'Orlando', stateName: 'Florida', stateAbbr: 'FL', fireDept: 'Orlando Fire Department Fire Prevention', sewerAuthority: 'City of Orlando Wastewater Division' },
];

export const TRADES_CONFIG = {
  'fire-extinguisher': {
    tradeTitle: 'Fire Extinguisher Inspection Software',
    codePrefix: 'NFPA 10 & State Fire Marshal Tagging',
    problems: [
      'Paying 20¢ to 50¢ per barcode scan on legacy platforms like BuildingReports.',
      'Paper hole-punch tags tearing, fading, or getting rejected during annual AHJ audits.',
      'Technicians spending hours every week manually transcribing paper notes into office invoices.',
      'Missing lucrative 6-year teardown and 12-year hydrostatic test retest dates on recurring routes.'
    ],
    features: [
      'Sub-2 second camera barcode scanning with zero per-scan fees ($49/mo flat).',
      '100% offline mobile PWA working seamlessly in basements and parking garages.',
      'Instant branded PDF inspection certificates ready for property managers and fire marshals.',
      'Automated recurring service scheduler tracking next year\'s annual recertification.'
    ]
  },
  'hood-cleaning': {
    tradeTitle: 'Commercial Kitchen Hood Cleaning & Exhaust Software',
    codePrefix: 'NFPA 96 Table 12.4 Bare-Metal Exhaust Compliance',
    problems: [
      'Restaurant owners and fire marshals demanding instant before/after photographic proof of bare metal degreasing.',
      'Duct access door seals, fan hinge kits, and rooftop grease runoff failing municipal fire inspections.',
      'Restaurants forgetting their mandated quarterly/semi-annual service until health inspectors threaten fines.'
    ],
    features: [
      'Mobile before/after photo capture with timestamp and GPS verification.',
      'Instant NFPA 96 Certificate of Inspection PDF generated from the technician truck.',
      'Automated 30-day recurring renewal reminders locking in restaurant contracts year-round.',
      'Duct access door and rooftop fan grease containment inspection checklist.'
    ]
  },
  'grease-trap': {
    tradeTitle: 'Grease Trap & Interceptor Pumping Manifest Software',
    codePrefix: 'EPA & Municipal 25% FOG Rule Sewer Compliance',
    problems: [
      'Municipal sewer authorities issuing hefty surcharges when traps exceed 25% sludge/grease depth.',
      'Lost paper pumping tickets and disposal receipts creating compliance audit liabilities.',
      'Slow driver manifest entry delaying billing cycles.'
    ],
    features: [
      'Instant 25% FOG rule calculator measuring grease depth vs liquid depth on mobile.',
      'Digital waste transport manifests with driver signature and disposal facility logging.',
      'Exportable Excel and PDF pumping manifests formatted for local sewer authority submission.',
      'Automated recurring pumping scheduler based on grease accumulation velocity.'
    ]
  }
};

export function getAllCityTradeCombinations(): CityTradeInfo[] {
  const list: CityTradeInfo[] = [];

  for (const city of CITIES_DATA) {
    for (const [tradeKey, config] of Object.entries(TRADES_CONFIG)) {
      const trade = tradeKey as 'fire-extinguisher' | 'hood-cleaning' | 'grease-trap';
      const localAhj = trade === 'grease-trap' ? city.sewerAuthority : city.fireDept;

      list.push({
        citySlug: city.slug,
        cityName: city.name,
        stateName: city.stateName,
        stateAbbr: city.stateAbbr,
        trade,
        tradeTitle: config.tradeTitle,
        metaTitle: `${city.name}, ${city.stateAbbr} ${config.tradeTitle} | FieldLedger`,
        metaDescription: `The #1 offline field inspection and compliance software for ${config.tradeTitle.toLowerCase()} contractors in ${city.name}, ${city.stateAbbr}. Code-compliant with ${localAhj}.`,
        localAhjName: localAhj,
        localCodeReference: config.codePrefix,
        keyProblems: config.problems,
        localFeatures: config.features,
        faqs: [
          {
            question: `Are digital inspection reports accepted by ${localAhj} in ${city.name}?`,
            answer: `Yes. Digital inspection reports and PDF certificates generated by FieldLedger comply with NFPA and municipal standards in ${city.name}, ${city.stateAbbr}. Reports include technician license numbers, timestamps, GPS tags, and pass/fail checklists.`
          },
          {
            question: `How does FieldLedger help contractors in ${city.name} reduce software costs?`,
            answer: `Unlike legacy systems that charge per-barcode fees ($0.20 to $0.50 per scan), FieldLedger provides unlimited barcode scanning, offline mobile PWA access, and unlimited reports for a flat $49/mo for up to 3 technicians.`
          },
          {
            question: `Can technicians use FieldLedger in basements or parking structures in ${city.name} without cell service?`,
            answer: `Yes. FieldLedger is built as an offline-first PWA. Technicians can scan barcodes, complete checklists, take photos, and save data with zero internet. Everything automatically syncs to the cloud when they return to service.`
          }
        ]
      });
    }
  }

  return list;
}
