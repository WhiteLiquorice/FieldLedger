export interface StateComplianceInfo {
  slug: string;
  stateName: string;
  stateAbbr: string;
  capital: string;
  fireMarshalAuthority: string;
  administrativeCode: string;
  nfpaEdition: string;
  taggingRules: {
    annualTagColor: string;
    collarRequired: boolean;
    digitalTagStatus: 'Accepted Statewide' | 'Accepted by Local AHJs' | 'Fully Compliant';
    specificRules: string[];
  };
  hoodCleaningRules: {
    authority: string;
    photoProofMandate: boolean;
    frequencyReference: string;
    details: string;
  };
  fogGreaseRules: {
    authority: string;
    dischargeLimitMgL: number;
    rule25PercentEnforced: boolean;
    manifestRetentionYears: number;
    details: string;
  };
  topCities: string[];
  faqs: { question: string; answer: string }[];
}

export const STATE_COMPLIANCE_DATA: Record<string, StateComplianceInfo> = {
  missouri: {
    slug: 'missouri',
    stateName: 'Missouri',
    stateAbbr: 'MO',
    capital: 'Jefferson City',
    fireMarshalAuthority: 'Missouri Division of Fire Safety (DFS)',
    administrativeCode: '11 CSR 40-5 (Fire Extinguisher Servicing & Licensing)',
    nfpaEdition: 'NFPA 10 (2018 / 2021 edition based on local municipal adoption)',
    taggingRules: {
      annualTagColor: 'State-approved standard inspection tags (Yellow/White/Green depending on jurisdiction)',
      collarRequired: true,
      digitalTagStatus: 'Accepted Statewide',
      specificRules: [
        'Contractors must hold a valid Missouri Division of Fire Safety operating permit.',
        'Technicians must record their individual DFS certification license number on all inspection records.',
        'Verification of service collar required for all 6-year teardowns and hydrostatic tests.',
        'Digital inspection certificates with GPS coordinates and timestamps are fully accepted by local AHJs across Greene, Jackson, and St. Louis counties.'
      ]
    },
    hoodCleaningRules: {
      authority: 'Missouri Department of Public Safety / Local Municipal Fire Districts',
      photoProofMandate: true,
      frequencyReference: 'NFPA 96 Table 12.4',
      details: 'Commercial exhaust hoods must be cleaned to bare metal. Springfield, Kansas City, and St. Louis fire inspectors require post-service sticker certification and before/after photo documentation upon request.'
    },
    fogGreaseRules: {
      authority: 'Missouri Department of Natural Resources (MDNR) & Local Sewer Districts (e.g. Springfield Environmental Services, MSD)',
      dischargeLimitMgL: 100,
      rule25PercentEnforced: true,
      manifestRetentionYears: 3,
      details: 'Strict enforcement of the 25% Rule. Springfield Environmental Services and St. Louis MSD mandate hauler pumping manifests recording exact grease depth, sludge depth, and gallons removed.'
    },
    topCities: ['Springfield', 'Kansas City', 'St. Louis', 'Columbia', 'Independence', 'Lee\'s Summit', 'O\'Fallon', 'St. Joseph'],
    faqs: [
      {
        question: 'Are digital fire inspection tags legal in Missouri?',
        answer: 'Yes. Missouri Division of Fire Safety and local AHJs accept digital inspection certificates and QR/barcode tracking provided the record contains the technician DFS permit number, date, test results, and signature.'
      },
      {
        question: 'What is required for NFPA 96 hood cleaning compliance in Missouri?',
        answer: 'Kitchen exhaust cleaning contractors must clean ductwork to bare metal, apply an inspection sticker with next service date, and maintain photographic records of fan, plenum, and horizontal duct conditions.'
      },
      {
        question: 'How often must grease traps be pumped in Missouri?',
        answer: 'Under Missouri DNR guidelines and local municipal ordinances, grease traps and interceptors must be pumped whenever total FOG and solids exceed 25% of liquid capacity, or at minimum every 90 days.'
      }
    ]
  },
  texas: {
    slug: 'texas',
    stateName: 'Texas',
    stateAbbr: 'TX',
    capital: 'Austin',
    fireMarshalAuthority: 'Texas State Fire Marshal\'s Office (SFMO) / Texas Dept of Insurance (TDI)',
    administrativeCode: 'Texas Insurance Code Chapter 6001 & 28 TAC § 34.500',
    nfpaEdition: 'NFPA 10 (2018 / 2021 Edition)',
    taggingRules: {
      annualTagColor: 'Standard Blue (Service/New), Yellow (Deficiency), Red (Impaired/Out of Service)',
      collarRequired: true,
      digitalTagStatus: 'Fully Compliant',
      specificRules: [
        'Contractor must possess a valid SFMO Extinguisher Certificate of Registration (Type A, B, or K).',
        'Technicians must hold an active SFMO Extinguisher License (Type PL, FEL-A, FEL-B, or FEL-K).',
        'State-specific color tag hierarchy strictly enforced: Blue tag for compliant, Yellow for non-critical deficiency, Red for immediate life-safety hazard.',
        'Digital documentation systems must store technician license numbers, serial numbers, and 6-year/hydro records for 5 years.'
      ]
    },
    hoodCleaningRules: {
      authority: 'Texas State Fire Marshal & Municipal Fire Departments (Houston, Dallas, Austin, San Antonio)',
      photoProofMandate: true,
      frequencyReference: 'NFPA 96 & 28 TAC § 34.517',
      details: 'Strict enforcement of exhaust hood certification stickers. Technicians must document access panel seals, hinge kit operations, and fan grease containment.'
    },
    fogGreaseRules: {
      authority: 'Texas Commission on Environmental Quality (TCEQ) & Municipal POTWs',
      dischargeLimitMgL: 200,
      rule25PercentEnforced: true,
      manifestRetentionYears: 5,
      details: 'TCEQ mandates liquid waste transport manifests (Form TCEQ-00311). Failure to pump before reaching 25% capacity carries municipal surcharges in major Texas metros.'
    },
    topCities: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso', 'Arlington', 'Plano', 'Lubbock'],
    faqs: [
      {
        question: 'What are the Texas Fire Marshal rules for extinguisher tags?',
        answer: 'Texas requires state-regulated tag colors (Blue for passed, Yellow for deficiency, Red for out of service) along with technician license numbers and strict 5-year record keeping.'
      },
      {
        question: 'Can Texas contractors use barcode scanning for fire inspections?',
        answer: 'Yes. Digital barcode inspection software is widely accepted across Texas municipalities as long as it generates compliant NFPA 10 reports and links to physical state-compliant tagging.'
      }
    ]
  },
  california: {
    slug: 'california',
    stateName: 'California',
    stateAbbr: 'CA',
    capital: 'Sacramento',
    fireMarshalAuthority: 'Office of the State Fire Marshal (OSFM) / CAL FIRE',
    administrativeCode: 'California Code of Regulations (CCR) Title 19, Division 1, Chapter 3',
    nfpaEdition: 'California Fire Code (Title 24) & NFPA 10 (California Edition)',
    taggingRules: {
      annualTagColor: 'State-certified annual inspection tags with holographic / licensed OSFM stamp',
      collarRequired: true,
      digitalTagStatus: 'Accepted by Local AHJs',
      specificRules: [
        'Companies must hold an active OSFM Extinguisher Concern License (Type 1 or Type 2).',
        'Every service technician must carry an OSFM Certificate of Registration.',
        'Verification of service collar required for all maintenance procedures requiring internal valve removal.',
        'Digital customer portals and electronic PDF reports are standard across Los Angeles, Orange County, and Bay Area AHJs.'
      ]
    },
    hoodCleaningRules: {
      authority: 'CAL FIRE / OSFM & California Health and Safety Code',
      photoProofMandate: true,
      frequencyReference: 'NFPA 96 & California Mechanical Code (CMC)',
      details: 'Mandatory photo audit documentation of exhaust ductwork and fan bearings. Commercial kitchens face immediate closure for non-compliant grease accumulation.'
    },
    fogGreaseRules: {
      authority: 'California State Water Resources Control Board & Regional Water Quality Control Boards',
      dischargeLimitMgL: 100,
      rule25PercentEnforced: true,
      manifestRetentionYears: 3,
      details: 'California enforces strict grease waste generator manifests. All food service establishments must log every pump-out with certified grease waste haulers.'
    },
    topCities: ['Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno', 'Sacramento', 'Long Beach', 'Oakland', 'Bakersfield'],
    faqs: [
      {
        question: 'What license is required to inspect fire extinguishers in California?',
        answer: 'Contractors must hold an OSFM Type 1 or Type 2 Concern License, and all inspecting technicians must hold a valid California Certificate of Registration under Title 19.'
      }
    ]
  },
  florida: {
    slug: 'florida',
    stateName: 'Florida',
    stateAbbr: 'FL',
    capital: 'Tallahassee',
    fireMarshalAuthority: 'Florida Division of State Fire Marshal (DFS)',
    administrativeCode: 'Florida Administrative Code (FAC) Chapter 69A-21 & Florida Statutes Chapter 633',
    nfpaEdition: 'Florida Fire Prevention Code (8th Edition) & NFPA 10',
    taggingRules: {
      annualTagColor: 'State-standard inspection tags with Florida contractor permit numbering',
      collarRequired: true,
      digitalTagStatus: 'Accepted Statewide',
      specificRules: [
        'Contractors must be licensed under Florida Statute 633 as a Fire Equipment Dealer (Class A, B, C, or D).',
        'Technicians must be registered permittees with active continuing education credits.',
        'Electronic inspection logging and barcode history are recognized by municipal fire prevention bureaus throughout Miami-Dade, Orange, and Hillsborough counties.'
      ]
    },
    hoodCleaningRules: {
      authority: 'Florida Department of Business and Professional Regulation (DBPR) & State Fire Marshal',
      photoProofMandate: true,
      frequencyReference: 'NFPA 96 & Florida Fire Prevention Code Chapter 50',
      details: 'Commercial kitchen hood exhaust systems must have inspection stickers displaying technician name, permit number, and next scheduled service interval.'
    },
    fogGreaseRules: {
      authority: 'Florida Department of Environmental Protection (FDEP) & Local Utilities',
      dischargeLimitMgL: 100,
      rule25PercentEnforced: true,
      manifestRetentionYears: 3,
      details: 'Mandatory 25% rule enforcement. High water tables in Florida make grease trap maintenance and rapid digital manifest reporting critical for municipal environmental compliance.'
    },
    topCities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'St. Petersburg', 'Hialeah', 'Fort Lauderdale', 'Tallahassee', 'Cape Coral'],
    faqs: [
      {
        question: 'How does Florida regulate fire extinguisher servicing companies?',
        answer: 'Companies must obtain a Class A, B, C, or D Fire Equipment Dealer license from the Florida Division of State Fire Marshal, and technicians must maintain individual permits.'
      }
    ]
  },
  illinois: {
    slug: 'illinois',
    stateName: 'Illinois',
    stateAbbr: 'IL',
    capital: 'Springfield',
    fireMarshalAuthority: 'Illinois Office of the State Fire Marshal (OSFM)',
    administrativeCode: '41 Illinois Administrative Code Part 251',
    nfpaEdition: 'NFPA 10 (2018 / 2021 Edition)',
    taggingRules: {
      annualTagColor: 'State-standard inspection tags',
      collarRequired: true,
      digitalTagStatus: 'Accepted Statewide',
      specificRules: [
        'Contractors must maintain OSFM Fire Equipment Distributor licenses.',
        'Chicago Building Code and suburban fire protection districts require electronic certification records.',
        'Collar required on all recharge and hydro operations.'
      ]
    },
    hoodCleaningRules: {
      authority: 'Illinois OSFM & Chicago Fire Prevention Bureau',
      photoProofMandate: true,
      frequencyReference: 'NFPA 96 & Chicago Municipal Code',
      details: 'Hood systems in restaurants and institutional kitchens require certified exhaust technicians and photo documentation of inaccessible ductwork.'
    },
    fogGreaseRules: {
      authority: 'Illinois EPA & Metropolitan Water Reclamation District of Greater Chicago (MWRD)',
      dischargeLimitMgL: 100,
      rule25PercentEnforced: true,
      manifestRetentionYears: 3,
      details: 'MWRD and municipal sewer districts enforce strict 25% capacity limits with severe fines for unmaintained grease interceptors.'
    },
    topCities: ['Chicago', 'Aurora', 'Naperville', 'Joliet', 'Rockford', 'Springfield', 'Peoria', 'Elgin'],
    faqs: [
      {
        question: 'Are digital fire inspection reports accepted in Chicago and Illinois?',
        answer: 'Yes. The Illinois OSFM and local fire protection districts accept digital PDF compliance reports provided they contain full technician identification and test timestamps.'
      }
    ]
  },
  ohio: {
    slug: 'ohio',
    stateName: 'Ohio',
    stateAbbr: 'OH',
    capital: 'Columbus',
    fireMarshalAuthority: 'Ohio Division of State Fire Marshal (SFM)',
    administrativeCode: 'Ohio Administrative Code (OAC) 1301:7-7 (Ohio Fire Code)',
    nfpaEdition: 'Ohio Fire Code & NFPA 10',
    taggingRules: {
      annualTagColor: 'Standard Ohio SFM certified tags',
      collarRequired: true,
      digitalTagStatus: 'Accepted Statewide',
      specificRules: [
        'Contractors must be certified by the Ohio Division of State Fire Marshal in Portable Fire Extinguishers.',
        'Annual inspection tags must include certification number and exact month/year punched.',
        'Digital certificates accepted across Columbus, Cleveland, and Cincinnati fire prevention bureaus.'
      ]
    },
    hoodCleaningRules: {
      authority: 'Ohio Division of State Fire Marshal',
      photoProofMandate: true,
      frequencyReference: 'NFPA 96 & Ohio Fire Code § 609',
      details: 'All commercial kitchen cooking facilities must maintain clean exhaust hoods, ducts, and fans with certified service records.'
    },
    fogGreaseRules: {
      authority: 'Ohio EPA & Northeast Ohio Regional Sewer District (NEORSD) / Local POTWs',
      dischargeLimitMgL: 100,
      rule25PercentEnforced: true,
      manifestRetentionYears: 3,
      details: 'Municipal sewer utilities enforce the 25% rule and require pumping manifests logged within 30 days of service.'
    },
    topCities: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma', 'Canton'],
    faqs: [
      {
        question: 'What certification is required to inspect extinguishers in Ohio?',
        answer: 'Technicians must hold an individual certification from the Ohio Division of State Fire Marshal Bureau of Licensing and Certification.'
      }
    ]
  },
  georgia: {
    slug: 'georgia',
    stateName: 'Georgia',
    stateAbbr: 'GA',
    capital: 'Atlanta',
    fireMarshalAuthority: 'Georgia Safety Fire Commissioner / State Fire Marshal\'s Office',
    administrativeCode: 'Rules and Regulations of the Safety Fire Commissioner Chapter 120-3-3',
    nfpaEdition: 'Georgia State Minimum Fire Safety Standards & NFPA 10',
    taggingRules: {
      annualTagColor: 'State-standard inspection tags with Georgia permit number',
      collarRequired: true,
      digitalTagStatus: 'Accepted Statewide',
      specificRules: [
        'Contractors must hold a Certificate of Competency from the Georgia State Fire Marshal.',
        'Technicians must be licensed inspectors with individual identification numbers.',
        'Full acceptance of digital inspection documentation in Atlanta, Savannah, and Augusta jurisdictions.'
      ]
    },
    hoodCleaningRules: {
      authority: 'Georgia State Fire Marshal & City of Atlanta Fire Rescue',
      photoProofMandate: true,
      frequencyReference: 'NFPA 96 & Chapter 120-3-3',
      details: 'Commercial kitchen exhaust cleaning stickers and photo verification must be maintained on site for annual fire marshal audits.'
    },
    fogGreaseRules: {
      authority: 'Georgia Environmental Protection Division (EPD) & City of Atlanta Watershed Management',
      dischargeLimitMgL: 100,
      rule25PercentEnforced: true,
      manifestRetentionYears: 3,
      details: 'Atlanta Watershed Management mandates digital grease waste manifests and quarterly pumping certification.'
    },
    topCities: ['Atlanta', 'Columbus', 'Augusta', 'Macon', 'Savannah', 'Athens', 'Sandy Springs', 'Roswell'],
    faqs: [
      {
        question: 'Is digital inspection tagging permitted in Georgia?',
        answer: 'Yes. Georgia fire authorities allow barcode and electronic inspection tracking to supplement physical tags and generate AHJ-ready compliance certificates.'
      }
    ]
  },
  north_carolina: {
    slug: 'north_carolina',
    stateName: 'North Carolina',
    stateAbbr: 'NC',
    capital: 'Raleigh',
    fireMarshalAuthority: 'Office of State Fire Marshal (OSFM) / NC Department of Insurance',
    administrativeCode: 'North Carolina State Fire Code (NCSFC) & GS 58',
    nfpaEdition: 'North Carolina Fire Prevention Code & NFPA 10',
    taggingRules: {
      annualTagColor: 'Standard North Carolina OSFM inspection tags',
      collarRequired: true,
      digitalTagStatus: 'Accepted Statewide',
      specificRules: [
        'Contractors and technicians must maintain proper licensing under NC OSFM standards.',
        'Digital records with technician license number, equipment serial number, and location are fully compliant.'
      ]
    },
    hoodCleaningRules: {
      authority: 'NC OSFM & Local Fire Prevention Bureaus',
      photoProofMandate: true,
      frequencyReference: 'NFPA 96 & NCSFC Chapter 6',
      details: 'Mandatory commercial hood exhaust cleaning certification and access panel maintenance.'
    },
    fogGreaseRules: {
      authority: 'NC Department of Environmental Quality (DEQ) & Local Municipalities',
      dischargeLimitMgL: 100,
      rule25PercentEnforced: true,
      manifestRetentionYears: 3,
      details: 'Enforces 25% FOG rule and municipal grease control ordinance manifests across Charlotte, Raleigh, and Greensboro.'
    },
    topCities: ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville', 'Cary', 'Wilmington'],
    faqs: [
      {
        question: 'How do North Carolina fire marshals verify digital extinguisher reports?',
        answer: 'Inspectors review digital PDF certificates containing date stamps, pass/fail checklists, technician license details, and serial numbers.'
      }
    ]
  },
  pennsylvania: {
    slug: 'pennsylvania',
    stateName: 'Pennsylvania',
    stateAbbr: 'PA',
    capital: 'Harrisburg',
    fireMarshalAuthority: 'Pennsylvania Office of the State Fire Commissioner (OSFC)',
    administrativeCode: '34 PA Code Chapter 403 (Uniform Construction Code - Fire Prevention)',
    nfpaEdition: 'International Fire Code (IFC) as adopted by PA UCC & NFPA 10',
    taggingRules: {
      annualTagColor: 'Standard annual inspection tags',
      collarRequired: true,
      digitalTagStatus: 'Accepted Statewide',
      specificRules: [
        'Requires certified technicians and accurate physical/digital record retention.',
        'Accepted by Philadelphia, Pittsburgh, and municipal fire marshals statewide.'
      ]
    },
    hoodCleaningRules: {
      authority: 'PA Department of Labor and Industry & Municipal Fire Bureaus',
      photoProofMandate: true,
      frequencyReference: 'NFPA 96 & PA UCC',
      details: 'Restaurant hood systems must be cleaned and certified with inspection tags on hood canopy.'
    },
    fogGreaseRules: {
      authority: 'PA Department of Environmental Protection (DEP) & Local Water Authorities',
      dischargeLimitMgL: 100,
      rule25PercentEnforced: true,
      manifestRetentionYears: 3,
      details: 'Enforces grease trap pumping manifests and 25% capacity threshold.'
    },
    topCities: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Reading', 'Erie', 'Scranton', 'Bethlehem', 'Lancaster'],
    faqs: [
      {
        question: 'What fire code governs extinguisher servicing in Pennsylvania?',
        answer: 'Pennsylvania enforces the Uniform Construction Code (UCC) referencing IFC and NFPA 10 for portable fire extinguishers.'
      }
    ]
  },
  new_york: {
    slug: 'new_york',
    stateName: 'New York',
    stateAbbr: 'NY',
    capital: 'Albany',
    fireMarshalAuthority: 'New York State Division of Homeland Security and Emergency Services (OFPC) / FDNY',
    administrativeCode: '19 NYCRR Chapter XXXIII (Uniform Fire Code) & New York City Fire Code (FC 906)',
    nfpaEdition: 'Uniform Fire Code of NYS & NFPA 10 (FDNY Rules for NYC 5 Boroughs)',
    taggingRules: {
      annualTagColor: 'State-certified inspection tags / FDNY Approved Tags with Certificate of Fitness (C-15 / W-96)',
      collarRequired: true,
      digitalTagStatus: 'Accepted Statewide',
      specificRules: [
        'NYS requires licensed fire equipment contractors.',
        'In New York City, technicians servicing extinguishers must hold FDNY Certificate of Fitness C-15 / W-96.',
        'Digital inspection records and customer portal receipts are standard for commercial real estate audits.'
      ]
    },
    hoodCleaningRules: {
      authority: 'NYS OFPC & FDNY Bureau of Fire Prevention',
      photoProofMandate: true,
      frequencyReference: 'NFPA 96 & NYC Fire Code § 904',
      details: 'High-density kitchen operations require frequent exhaust degreasing and certified service logs.'
    },
    fogGreaseRules: {
      authority: 'NYS Department of Environmental Conservation (DEC) & NYC DEP',
      dischargeLimitMgL: 100,
      rule25PercentEnforced: true,
      manifestRetentionYears: 5,
      details: 'NYC DEP and NYS DEC require rigorous grease interceptor pumping manifests and strict grease trap sizing compliance.'
    },
    topCities: ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany', 'New Rochelle', 'Mount Vernon'],
    faqs: [
      {
        question: 'What are the rules for fire extinguisher tags in New York City?',
        answer: 'In NYC, inspections must be performed by an FDNY Certificate of Fitness holder (C-15) and documented on approved tags with tamper seals and full digital records.'
      }
    ]
  }
};
