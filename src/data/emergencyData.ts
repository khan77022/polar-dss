import { LatLon } from '../types';

export type EmergencyType =
  | 'engine-failure'
  | 'fire'
  | 'collision'
  | 'medical'
  | 'severe-weather'
  | 'ice-danger';

export type EmergencySeverity = 'distress' | 'urgency' | 'alert';

export interface EmergencyTypeInfo {
  id: EmergencyType;
  title: string;
  icon: string;
  badgeColor: string;
  shortDesc: string;
  systemImpact: string;
  criticalFactors: string[];
  recommendedSpeedKts: number;
  priorityFacilities: string[];
  defaultChecklist: { id: string; text: string; done: boolean }[];
}

export const EMERGENCY_TYPES: Record<EmergencyType, EmergencyTypeInfo> = {
  'engine-failure': {
    id: 'engine-failure',
    title: 'Engine Failure / Propulsion Loss',
    icon: '⚙️',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    shortDesc: 'Main engine trip or steering gear failure. Degraded propulsion & drift risk in sea ice.',
    systemImpact: 'Single engine or auxiliary mode only. Rudder response sluggish. Vulnerable to ice drift entrapment.',
    criticalFactors: ['Avoid heavy pack ice (>40%)', 'Seek closest calm anchorage', 'Maintain emergency generator electrical load'],
    recommendedSpeedKts: 6.0,
    priorityFacilities: ['Sheltered Fjord Anchorage', 'Icebreaker Tug Escort', 'Repair Depot'],
    defaultChecklist: [
      { id: 'eng-1', text: 'Start Auxiliary Generators & Engage Emergency Power Bus', done: true },
      { id: 'eng-2', text: 'Sound General Emergency Alarm (7 Short + 1 Prolonged Blast)', done: true },
      { id: 'eng-3', text: 'Assess Steering Gear & Switch to Emergency Local Hydraulic Control', done: false },
      { id: 'eng-4', text: 'Prepare Emergency Port & Starboard Bower Anchors for Drop', done: false },
      { id: 'eng-5', text: 'Transmit PAN-PAN Urgency Broadcast to MRCC on VHF Ch 16', done: false },
    ],
  },
  'fire': {
    id: 'fire',
    title: 'Fire in Compartment / Machinery Space',
    icon: '🔥',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    shortDesc: 'Thermal alarm triggered in lower hold or engine room. Boundary cooling and muster active.',
    systemImpact: 'Potential loss of auxiliary power circuits, ventilation shut down to isolate oxygen.',
    criticalFactors: ['Ventilation isolation', 'Immediate boundary cooling', 'Course relative to wind to exhaust smoke over lee rail'],
    recommendedSpeedKts: 8.5,
    priorityFacilities: ['Shore Firefighting Squad', 'Medical Burn Care', 'Deep Sheltered Harbor'],
    defaultChecklist: [
      { id: 'fir-1', text: 'Sound Fire Alarm & Muster Damage Control Fire Parties', done: true },
      { id: 'fir-2', text: 'Isolate Mechanical Ventilation & Trip Emergency Fuel Quick-Closing Valves', done: true },
      { id: 'fir-3', text: 'Activate Fixed High-Pressure Water Mist / CO2 Smothering System', done: false },
      { id: 'fir-4', text: 'Alter Course to Keep Wind & Smoke Blowing Clear of Superstructure', done: false },
      { id: 'fir-5', text: 'Issue MAYDAY Distress Call to MRCC Cape Town & COMNAP', done: false },
    ],
  },
  'collision': {
    id: 'collision',
    title: 'Collision / Hull Compromise (Ice Impact)',
    icon: '💥',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    shortDesc: 'High-energy impact with submerged growler or bergy bit. Hull plate deflection / bilge ingress.',
    systemImpact: 'Water ingress in forward void spaces. Increased forward draft, listing risk.',
    criticalFactors: ['Watertight door dogging', 'Bilge pump maximum capacity', 'Ballast transfer to correct trim'],
    recommendedSpeedKts: 5.5,
    priorityFacilities: ['Emergency Drydock / Diver Survey', 'Heavy Pumping Support', 'Sheltered Bay'],
    defaultChecklist: [
      { id: 'col-1', text: 'Close All Watertight Bulkhead Doors from Bridge Control Console', done: true },
      { id: 'col-2', text: 'Sound Bilges & Sounding Tubes Across All Double Bottom Tanks', done: true },
      { id: 'col-3', text: 'Engage Main Bilge Pumps & Emergency Submersible Salvage Pumps', done: false },
      { id: 'col-4', text: 'Deploy Damage Control Team with Collision Mat & Shoring Wedges', done: false },
      { id: 'col-5', text: 'Transmit DSC Distress Alert & Alert Nearby Icebreakers', done: false },
    ],
  },
  'medical': {
    id: 'medical',
    title: 'Critical Medical Emergency / Medevac',
    icon: '🩺',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    shortDesc: 'Severe acute surgical trauma, cerebral event, or deep hypothermia exceeding ship sickbay capability.',
    systemImpact: 'Patient requires urgent ICU surgical stabilization or intercontinental aeromedical evacuation.',
    criticalFactors: ['All-weather airfield access', 'Surgical theatre availability', 'Minimal transit time to care'],
    recommendedSpeedKts: 13.0,
    priorityFacilities: ['Surgical Trauma Hospital', 'C-130 / Twin Otter Medevac Airfield', 'Heliport'],
    defaultChecklist: [
      { id: 'med-1', text: 'Ship Doctor Stabilizing Patient in Intensive Care Sickbay', done: true },
      { id: 'med-2', text: 'Establish Telemedical Satellite Conference with Apollo/AIIMS Specialists', done: true },
      { id: 'med-3', text: 'Alert Station Base Medical Directorate for Emergency Reception', done: false },
      { id: 'med-4', text: 'Request DROMLAN / Chilean Air Force Intercontinental Air Ambulance', done: false },
      { id: 'med-5', text: 'Clear Helideck & Test Helicopter Refueling / Night Landing Lights', done: false },
    ],
  },
  'severe-weather': {
    id: 'severe-weather',
    title: 'Severe Weather / Katabatic Hurricane',
    icon: '🌪️',
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    shortDesc: 'Violent Antarctic katabatic blizzard (>65 kts), heavy structural icing, roll instability in high swells.',
    systemImpact: 'Ice accretion topside raising vessel Center of Gravity. Zero visibility, radar sea clutter.',
    criticalFactors: ['Enclosed natural bay shelter', 'Course to minimize violent beam sea rolling', 'Anti-icing deck teams'],
    recommendedSpeedKts: 7.0,
    priorityFacilities: ['Protected Natural Fjord / Caldera', 'Lee Shore Anchorage', 'Heavy Mooring Buoy'],
    defaultChecklist: [
      { id: 'wth-1', text: 'Secure All Loose Cargo & Lash Scientific Gear with Heavy Rigging', done: true },
      { id: 'wth-2', text: 'Activate Steam / Electric Trace Heating on Decks & Whistle Heaters', done: true },
      { id: 'wth-3', text: 'Muster Deck De-Icing Watch with Mallets to Remove Superstructure Ice', done: false },
      { id: 'wth-4', text: 'Ballast Vessel Down to Deep Load Draft to Enhance Dynamic Stability', done: false },
      { id: 'wth-5', text: 'Plot Escape Track to Enclosed Volcanic Caldera / Fjord Lee', done: false },
    ],
  },
  'ice-danger': {
    id: 'ice-danger',
    title: 'Ice Besetment / Megaberg Pressure Ridge',
    icon: '🧊',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    shortDesc: 'Vessel pinched or trapped in 3m+ compressive multi-year pack ice or drifting megaberg proximity.',
    systemImpact: 'Severe lateral hull squeeze. Propeller and rudder vulnerable to ice milling shocks.',
    criticalFactors: ['Locate open fracture leads via SAR satellite', 'Continuous propeller wash', 'Icebreaker convoy escort'],
    recommendedSpeedKts: 4.5,
    priorityFacilities: ['Heavy Polar Class Icebreaker Escort', 'Satellite SAR Ice Routing Assistance', 'Ice Anchorage'],
    defaultChecklist: [
      { id: 'ice-1', text: 'Maintain Constant Propeller Rotation to Clear Brash Ice from Nozzle', done: true },
      { id: 'ice-2', text: 'Monitor Hull Acoustic Stress Sensors for Compressive Pressure Peaks', done: true },
      { id: 'ice-3', text: 'Analyze High-Resolution Sentinel-1 SAR imagery for Fracture Leads', done: false },
      { id: 'ice-4', text: 'Contact Escort Vessels (PRV Sagar Dhruv / Shirase) for Tow/Channel Cleavage', done: false },
      { id: 'ice-5', text: 'Switch Seachests to Recirculating Ice-Box Mode to Prevent Clogging', done: false },
    ],
  },
};

export interface SafeHavenDestination {
  id: string;
  name: string;
  subName: string;
  lat: number;
  lon: number;
  nation: string;
  flag: string;
  isIndian: boolean;
  distanceKm: number;
  distanceNm: number;
  shelterType: 'Enclosed Caldera Fjord' | 'Deepwater Bay' | 'Permanent Station Jetty' | 'Protected Roadstead' | 'Inland Airfield Corridor';
  seaIce: {
    concentrationPercent: number;
    floeThicknessM: number;
    compressionRisk: 'Low' | 'Moderate' | 'Severe';
    leadCondition: string;
  };
  weather: {
    windSpeedKts: number;
    gustKts: number;
    airTempC: number;
    visibilityKm: number;
    swellHeightM: number;
    seaSurfaceTempC: number;
    freezingSpray: 'None' | 'Light' | 'Moderate' | 'Severe';
  };
  facilities: {
    hospitalTraumaBay: boolean;
    surgicalTheatre: boolean;
    intercontinentalAirfield: boolean;
    helicopterHangar: boolean;
    shelteredAnchorage: boolean;
    heavyIcebreakerSupport: boolean;
    fuelBunkering: boolean;
    trackedEvacuationVehicles: boolean;
  };
  facilityHighlights: string[];
  vhfEmergencyChannel: string;
  sarZoneAuthority: string;
  suitabilityScore: number; // 0 - 100 calculated dynamic
  suitabilityRationale: string;
  waypoints: LatLon[];
}

export const CANDIDATE_SAFE_DESTINATIONS: SafeHavenDestination[] = [
  {
    id: 'frei-maxwell-bay',
    name: 'Maxwell Bay / Frei & Escudero Hub',
    subName: 'King George Island (South Shetland)',
    lat: -62.19,
    lon: -58.98,
    nation: 'Chile / Multi-National Gateway',
    flag: '🇨🇱',
    isIndian: false,
    distanceKm: 42,
    distanceNm: 22.7,
    shelterType: 'Deepwater Bay',
    seaIce: {
      concentrationPercent: 12,
      floeThicknessM: 0.35,
      compressionRisk: 'Low',
      leadCondition: 'Wide Open Water & Fractured Brash Leads',
    },
    weather: {
      windSpeedKts: 18,
      gustKts: 26,
      airTempC: -2.8,
      visibilityKm: 14,
      swellHeightM: 1.2,
      seaSurfaceTempC: 0.4,
      freezingSpray: 'None',
    },
    facilities: {
      hospitalTraumaBay: true,
      surgicalTheatre: true,
      intercontinentalAirfield: true, // Teniente Marsh Airfield (C-130 Hercules capable)
      helicopterHangar: true,
      shelteredAnchorage: true,
      heavyIcebreakerSupport: true,
      fuelBunkering: true,
      trackedEvacuationVehicles: true,
    },
    facilityHighlights: [
      'Teniente R. Marsh Airfield: 1,300m Gravel Strip for C-130 Intercontinental Medevac',
      'Full Military Hospital (Hospital Naval) with Surgical Operating Suite',
      'Sheltered Fildes Peninsula deep anchorage protected from Drake Passage swell',
      'Fuel storage tanks and marine liaison office',
    ],
    vhfEmergencyChannel: 'VHF Ch 16 / 12 (Frei Harbour Control)',
    sarZoneAuthority: 'MRCC Chile / MRCC Ushuaia (Sub-Antarctic Sector)',
    suitabilityScore: 96,
    suitabilityRationale: 'Supreme all-weather medevac airport with low ice risk (<15%). Premier destination for acute medical crises or propulsion breakdowns.',
    waypoints: [
      { lat: -62.45, lon: -59.10 }, // Ship location
      { lat: -62.36, lon: -59.04 }, // Strait approach waypoint
      { lat: -62.24, lon: -58.96 }, // Fildes Strait safe passage
      { lat: -62.19, lon: -58.98 }, // Maxwell Bay sheltered mooring
    ],
  },
  {
    id: 'deception-island-caldera',
    name: 'Whalers Bay / Deception Island Caldera',
    subName: 'Volcanic Caldera Fjord (Port Foster)',
    lat: -62.97,
    lon: -60.67,
    nation: 'International Protected Historic Haven',
    flag: '⚓',
    isIndian: false,
    distanceKm: 104,
    distanceNm: 56.1,
    shelterType: 'Enclosed Caldera Fjord',
    seaIce: {
      concentrationPercent: 8,
      floeThicknessM: 0.2,
      compressionRisk: 'Low',
      leadCondition: 'Thermal Water Clear of Heavy Pack Ice',
    },
    weather: {
      windSpeedKts: 14,
      gustKts: 22,
      airTempC: 0.5,
      visibilityKm: 16,
      swellHeightM: 0.4, // Complete 360 degree barrier inside caldera
      seaSurfaceTempC: 1.8, // Geothermal heating
      freezingSpray: 'None',
    },
    facilities: {
      hospitalTraumaBay: false,
      surgicalTheatre: false,
      intercontinentalAirfield: false,
      helicopterHangar: false,
      shelteredAnchorage: true,
      heavyIcebreakerSupport: false,
      fuelBunkering: false,
      trackedEvacuationVehicles: false,
    },
    facilityHighlights: [
      '360° Volcanic Caldera Wall provides 100% shelter from Category 12 Katabatic Storms',
      "Neptune's Bellows entrance allows deep-draft PC3 vessel navigation",
      'Geothermally warmed inner water prevents sea-ice freeze-over',
      'Historic whalers anchorage with 40m soft volcanic sand holding ground',
    ],
    vhfEmergencyChannel: 'VHF Ch 16 / Single-Sideband 2182 kHz',
    sarZoneAuthority: 'COMNAP Emergency Disaster Haven Register',
    suitabilityScore: 92,
    suitabilityRationale: 'The ultimate storm & collision refuge in the Southern Ocean. Zero swell, geothermally heated waters prevent besetment.',
    waypoints: [
      { lat: -62.45, lon: -59.10 },
      { lat: -62.70, lon: -59.85 },
      { lat: -62.92, lon: -60.50 },
      { lat: -62.97, lon: -60.67 }, // Port Foster caldera interior
    ],
  },
  {
    id: 'esperanza-hope-bay',
    name: 'Esperanza Base (Hope Bay Refuge)',
    subName: 'Northern Tip of Antarctic Peninsula',
    lat: -63.40,
    lon: -56.99,
    nation: 'Argentina (Joint Antarctic Command)',
    flag: '🇦🇷',
    isIndian: false,
    distanceKm: 158,
    distanceNm: 85.3,
    shelterType: 'Protected Roadstead',
    seaIce: {
      concentrationPercent: 42,
      floeThicknessM: 0.9,
      compressionRisk: 'Moderate',
      leadCondition: 'Antarctic Sound Drift Pack with Active Leads',
    },
    weather: {
      windSpeedKts: 29,
      gustKts: 41,
      airTempC: -7.5,
      visibilityKm: 8,
      swellHeightM: 2.1,
      seaSurfaceTempC: -1.2,
      freezingSpray: 'Light',
    },
    facilities: {
      hospitalTraumaBay: true,
      surgicalTheatre: false,
      intercontinentalAirfield: false,
      helicopterHangar: true,
      shelteredAnchorage: true,
      heavyIcebreakerSupport: true,
      fuelBunkering: true,
      trackedEvacuationVehicles: true,
    },
    facilityHighlights: [
      'Military Infirmary with hyperbaric & trauma stabilization',
      'Bell 212 Helicopter Hangar with mountain rescue winch',
      'Fuel storage depot & mechanical workshops for emergency engine repair',
      'Permanent military SAR detachment (Comando Conjunto Antártico)',
    ],
    vhfEmergencyChannel: 'VHF Ch 16 / 14 (Esperanza Radio)',
    sarZoneAuthority: 'MRCC Ushuaia (Armada Argentina)',
    suitabilityScore: 78,
    suitabilityRationale: 'Strategic eastern gateway refuge with helicopter capability and engine workshop support.',
    waypoints: [
      { lat: -62.45, lon: -59.10 },
      { lat: -62.80, lon: -58.10 },
      { lat: -63.15, lon: -57.40 },
      { lat: -63.40, lon: -56.99 },
    ],
  },
  {
    id: 'palmer-station-anchorage',
    name: 'Palmer Station / Arthur Harbor',
    subName: 'Anvers Island (Gerlache Strait Sector)',
    lat: -64.77,
    lon: -64.05,
    nation: 'United States (USAP / NSF)',
    flag: '🇺🇸',
    isIndian: false,
    distanceKm: 340,
    distanceNm: 183.5,
    shelterType: 'Deepwater Bay',
    seaIce: {
      concentrationPercent: 25,
      floeThicknessM: 0.6,
      compressionRisk: 'Low',
      leadCondition: 'Fractured Coastal Fast Ice with Open Leads',
    },
    weather: {
      windSpeedKts: 16,
      gustKts: 24,
      airTempC: -4.2,
      visibilityKm: 12,
      swellHeightM: 1.1,
      seaSurfaceTempC: -0.6,
      freezingSpray: 'None',
    },
    facilities: {
      hospitalTraumaBay: true,
      surgicalTheatre: true,
      intercontinentalAirfield: false,
      helicopterHangar: false,
      shelteredAnchorage: true,
      heavyIcebreakerSupport: false,
      fuelBunkering: true,
      trackedEvacuationVehicles: false,
    },
    facilityHighlights: [
      'Modern USAP Medical Facility with emergency trauma room',
      'Deep, granite-sheltered Arthur Harbor safe from iceberg incursions',
      'Rigid-hull inflatable rescue fleet (Zodiac Mark V)',
      'Subsea ROV inspection camera for underwater hull & rudder surveys',
    ],
    vhfEmergencyChannel: 'VHF Ch 16 / 27 (Palmer Base Operations)',
    sarZoneAuthority: 'US Coast Guard / National Science Foundation',
    suitabilityScore: 74,
    suitabilityRationale: 'Excellent medical and diver inspection capability, but located further south in Gerlache Strait.',
    waypoints: [
      { lat: -62.45, lon: -59.10 },
      { lat: -63.20, lon: -60.80 },
      { lat: -64.10, lon: -62.50 },
      { lat: -64.77, lon: -64.05 },
    ],
  },
  {
    id: 'rothera-station-runway',
    name: 'Rothera Research Station & Airfield',
    subName: 'Adelaide Island (Marguerite Bay Sector)',
    lat: -67.57,
    lon: -68.12,
    nation: 'United Kingdom (BAS)',
    flag: '🇬🇧',
    isIndian: false,
    distanceKm: 650,
    distanceNm: 350.9,
    shelterType: 'Permanent Station Jetty',
    seaIce: {
      concentrationPercent: 48,
      floeThicknessM: 1.1,
      compressionRisk: 'Moderate',
      leadCondition: 'Marginal Fast Ice with Coastal Crack Leads',
    },
    weather: {
      windSpeedKts: 22,
      gustKts: 34,
      airTempC: -9.8,
      visibilityKm: 10,
      swellHeightM: 1.4,
      seaSurfaceTempC: -1.5,
      freezingSpray: 'Light',
    },
    facilities: {
      hospitalTraumaBay: true,
      surgicalTheatre: true,
      intercontinentalAirfield: true, // 900m crushed-rock runway
      helicopterHangar: true,
      shelteredAnchorage: true,
      heavyIcebreakerSupport: true,
      fuelBunkering: true,
      trackedEvacuationVehicles: true,
    },
    facilityHighlights: [
      '900-meter all-weather crushed rock runway handling Dash-7 and Twin Otter aircraft',
      'Comprehensive British Antarctic Survey Medical Operating Theatre',
      'The Biscoe Wharf: deepwater berthing for heavy icebreakers (RRS Sir David Attenborough base)',
      'Specialized polar dive team and underwater repair workshop',
    ],
    vhfEmergencyChannel: 'VHF Ch 16 / 74 (Rothera Tower)',
    sarZoneAuthority: 'UK Maritime & Coastguard Agency / BAS SAR',
    suitabilityScore: 68,
    suitabilityRationale: 'World-class surgical and air ambulance hub; distance is greater (350 NM), ideal for planned long-range medevac.',
    waypoints: [
      { lat: -62.45, lon: -59.10 },
      { lat: -63.50, lon: -61.20 },
      { lat: -65.20, lon: -65.00 },
      { lat: -66.80, lon: -67.50 },
      { lat: -67.57, lon: -68.12 },
    ],
  },
  {
    id: 'bharati-thala-anchorage',
    name: 'Bharati Station & Thala Hills Deepwater Anchorage',
    subName: 'Larsemann Hills / Prydz Bay (Indian Sector)',
    lat: -69.41,
    lon: 76.19,
    nation: 'India (NCPOR / MoES)',
    flag: '🇮🇳',
    isIndian: true,
    distanceKm: 420,
    distanceNm: 226.7,
    shelterType: 'Deepwater Bay',
    seaIce: {
      concentrationPercent: 35,
      floeThicknessM: 0.85,
      compressionRisk: 'Low',
      leadCondition: 'Navigable Shore Leads Open to Quilty Bay',
    },
    weather: {
      windSpeedKts: 21,
      gustKts: 30,
      airTempC: -11.4,
      visibilityKm: 15,
      swellHeightM: 1.0,
      seaSurfaceTempC: -1.4,
      freezingSpray: 'Light',
    },
    facilities: {
      hospitalTraumaBay: true,
      surgicalTheatre: true,
      intercontinentalAirfield: false,
      helicopterHangar: true,
      shelteredAnchorage: true,
      heavyIcebreakerSupport: true,
      fuelBunkering: true,
      trackedEvacuationVehicles: true,
    },
    facilityHighlights: [
      'Primary Indian Antarctic Operational Command Hub (ISEA-44)',
      'Equipped Indian Medical Infirmary with X-Ray, Telemedicine link to AIIMS, and Surgical Suite',
      'Kamov Ka-32 heavy-lift helicopter hangar for ship-to-shore evacuation',
      'Dedicated engineering and mechanic team for heavy diesel marine propulsion repairs',
    ],
    vhfEmergencyChannel: 'VHF Ch 16 / 06 (Bharati Base Ops)',
    sarZoneAuthority: 'NCPOR Operations Command Goa / MRCC Cape Town',
    suitabilityScore: 89,
    suitabilityRationale: 'Dedicated sovereign Indian Antarctic research base. Full medical, helicopter, and fuel supply resources with direct satellite link to NCPOR Headquarters.',
    waypoints: [
      { lat: -62.45, lon: -59.10 },
      { lat: -66.00, lon: 20.00 },
      { lat: -68.00, lon: 60.00 },
      { lat: -69.41, lon: 76.19 },
    ],
  },
  {
    id: 'maitri-india-bay',
    name: 'Maitri Station & India Bay Ice Depot',
    subName: 'Schirmacher Oasis & Lazarev Ice Shelf (Queen Maud Land)',
    lat: -70.77,
    lon: 11.73,
    nation: 'India (NCPOR / MoES)',
    flag: '🇮🇳',
    isIndian: true,
    distanceKm: 490,
    distanceNm: 264.5,
    shelterType: 'Permanent Station Jetty',
    seaIce: {
      concentrationPercent: 55,
      floeThicknessM: 1.25,
      compressionRisk: 'Moderate',
      leadCondition: 'Lazarev Sea Fast-Ice Edge Approach Leads',
    },
    weather: {
      windSpeedKts: 26,
      gustKts: 38,
      airTempC: -16.2,
      visibilityKm: 10,
      swellHeightM: 1.6,
      seaSurfaceTempC: -1.7,
      freezingSpray: 'Moderate',
    },
    facilities: {
      hospitalTraumaBay: true,
      surgicalTheatre: true,
      intercontinentalAirfield: true, // Connected via DROMLAN Novolazarevskaya Blue-Ice Runway
      helicopterHangar: true,
      shelteredAnchorage: true,
      heavyIcebreakerSupport: false,
      fuelBunkering: true,
      trackedEvacuationVehicles: true,
    },
    facilityHighlights: [
      'Direct connection to DROMLAN Blue-Ice Airfield (Novo Runway - IL-76 intercontinental flights)',
      'Comprehensive Maitri Medical Center with 2 wintering surgeons & telemedicine suite',
      'Heavy Kassbohrer PistenBully tracked polar convoy fleet at India Bay Ice Depot',
      '24/7 HF emergency distress guard with Directorate General of Shipping',
    ],
    vhfEmergencyChannel: 'VHF Ch 16 / 09 (Maitri Communication Center)',
    sarZoneAuthority: 'NCPOR Goa & Maritime Rescue Co-ordination Centre Cape Town',
    suitabilityScore: 84,
    suitabilityRationale: 'Indian sovereign base with DROMLAN intercontinental blue-ice airbridge and heavy tracked vehicle rescue.',
    waypoints: [
      { lat: -62.45, lon: -59.10 },
      { lat: -66.50, lon: -20.00 },
      { lat: -69.00, lon: 5.00 },
      { lat: -70.77, lon: 11.73 },
    ],
  },
];

export interface RescueAuthority {
  id: string;
  name: string;
  role: string;
  region: string;
  contactFrequencies: string[];
  callSign: string;
  status: 'ONLINE' | 'STANDBY' | 'ACKNOWLEDGED';
}

export const RESCUE_AUTHORITIES: RescueAuthority[] = [
  {
    id: 'mrcc-capetown',
    name: 'MRCC Cape Town (Maritime Rescue Co-ordination Centre)',
    role: 'Primary IMO/IAMSAR International Antarctic SAR Coordinator',
    region: 'Southern Ocean / Antarctic Indian-Atlantic Sector (Zone VI)',
    contactFrequencies: ['MF/HF DSC 2187.5 kHz', 'Inmarsat-C: 460100123', 'VHF Ch 16 / 70'],
    callSign: 'ZSC (Cape Town Radio)',
    status: 'ONLINE',
  },
  {
    id: 'ncpor-command',
    name: 'NCPOR 24/7 Polar Operations Command Room (Goa, India)',
    role: 'National Sovereign Expedition Control & Polar Ministry (MoES)',
    region: '44th Indian Scientific Expedition Fleet Control',
    contactFrequencies: ['Iridium Pilot: +8816 7770 1984', 'SatCom Broadband IP', 'HF Net 8291 kHz'],
    callSign: 'NCPOR-SAR-HQ',
    status: 'ONLINE',
  },
  {
    id: 'mrcc-chile',
    name: 'MRCC Chile / Armada de Chile (Magallanes)',
    role: 'Antarctic Peninsula & Drake Passage Emergency SAR Lead',
    region: 'South Shetland Islands & Antarctic Peninsula Maritime Zone',
    contactFrequencies: ['VHF Ch 16', 'DSC 2187.5 kHz', 'SatPhone: +56 61 220 5410'],
    callSign: 'CVM (Magallanes Radio)',
    status: 'ONLINE',
  },
  {
    id: 'comnap-net',
    name: 'COMNAP Emergency Polar Response Network',
    role: 'Council of Managers of National Antarctic Programs Mutual Aid',
    region: 'Pan-Antarctic Inter-Station Safety Web',
    contactFrequencies: ['COMNAP Satellite Portal', 'VHF Ch 16 Guard'],
    callSign: 'COMNAP-EMERGENCY',
    status: 'ONLINE',
  },
  {
    id: 'dromlan-air',
    name: 'DROMLAN Polar Aeromedical Evacuation Command',
    role: 'Intercontinental Antarctic Air Ambulance & Airfield Operations',
    region: 'Queen Maud Land & South Shetland Airway Corridors',
    contactFrequencies: ['Aviation VHF 123.45 MHz', 'Novo Tower 118.1 MHz'],
    callSign: 'DROMLAN-MEDEVAC',
    status: 'STANDBY',
  },
  {
    id: 'prv-sagar-dhruv',
    name: 'PRV Sagar Dhruv (साग़र ध्रुव) - Escort Icebreaker',
    role: 'Indian PC2 Heavy Research & Lead Scout Vessel (48 km ahead)',
    region: 'Direct Navigational Corridor Mesh',
    contactFrequencies: ['VHF Ch 16 / 13 (Bridge-to-Bridge)', 'AIS SART'],
    callSign: 'VT-PRV',
    status: 'ONLINE',
  },
];

/**
 * Intelligent Multi-Criteria Decision Analysis (MCDA) function to score and rank
 * candidate safe haven destinations based on the selected emergency type and current conditions.
 */
export function rankSafeDestinations(
  emergencyType: EmergencyType,
  destinations: SafeHavenDestination[]
): SafeHavenDestination[] {
  return destinations
    .map((dest) => {
      let score = 50; // Base score

      // 1. Distance penalty (Closer is better, but weight depends on urgency)
      const distanceFactor = Math.max(0, 30 - dest.distanceKm * 0.06);
      score += distanceFactor;

      // 2. Sea Ice conditions consideration
      if (dest.seaIce.concentrationPercent < 20) {
        score += 20; // Open water is high score
      } else if (dest.seaIce.concentrationPercent < 45) {
        score += 10;
      } else if (dest.seaIce.concentrationPercent > 60) {
        score -= 25; // Dangerous for compromised vessels
      }

      if (dest.seaIce.compressionRisk === 'Severe') {
        score -= 25;
      } else if (dest.seaIce.compressionRisk === 'Low') {
        score += 8;
      }

      // 3. Weather / Swell consideration
      if (dest.weather.swellHeightM < 1.0) {
        score += 12;
      } else if (dest.weather.swellHeightM > 2.5) {
        score -= 15;
      }

      if (dest.weather.windSpeedKts > 35) {
        score -= 10;
      }

      // 4. Emergency Type-Specific Facility Weighting
      if (emergencyType === 'medical') {
        if (dest.facilities.hospitalTraumaBay) score += 25;
        if (dest.facilities.surgicalTheatre) score += 20;
        if (dest.facilities.intercontinentalAirfield) score += 30; // Critical for medevac
        if (dest.facilities.helicopterHangar) score += 15;
      } else if (emergencyType === 'engine-failure') {
        if (dest.facilities.shelteredAnchorage) score += 25;
        if (dest.distanceKm < 100) score += 30; // Cannot transit long distance on degraded engine
        if (dest.seaIce.concentrationPercent > 30) score -= 30; // Drift entrapment danger!
        if (dest.facilities.heavyIcebreakerSupport) score += 20;
      } else if (emergencyType === 'fire') {
        if (dest.facilities.shelteredAnchorage) score += 25;
        if (dest.distanceKm < 120) score += 25;
        if (dest.facilities.hospitalTraumaBay) score += 15;
      } else if (emergencyType === 'collision') {
        if (dest.facilities.shelteredAnchorage) score += 25;
        if (dest.seaIce.concentrationPercent < 20) score += 25; // Must avoid ice hammering breached hull
        if (dest.distanceKm < 100) score += 20;
        if (dest.facilities.heavyIcebreakerSupport) score += 15;
      } else if (emergencyType === 'severe-weather') {
        if (dest.shelterType === 'Enclosed Caldera Fjord') score += 40; // Deception Island caldera is ideal
        if (dest.weather.swellHeightM < 0.6) score += 20;
        if (dest.facilities.shelteredAnchorage) score += 20;
      } else if (emergencyType === 'ice-danger') {
        if (dest.seaIce.concentrationPercent < 15) score += 35; // Must reach open lead
        if (dest.facilities.heavyIcebreakerSupport) score += 25;
        if (dest.seaIce.compressionRisk === 'Low') score += 20;
      }

      // Normalize score between 10 and 99
      const normalizedScore = Math.min(99, Math.max(12, Math.round(score)));

      return {
        ...dest,
        suitabilityScore: normalizedScore,
      };
    })
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}

/**
 * Generates official formatted IMO GMDSS / IAMSAR Distress message
 */
export function generateDistressMessage(
  vessel: { name: string; callSign: string; polarClass: string; currentPos: LatLon; speedKts: number },
  emergencyType: EmergencyType,
  severity: EmergencySeverity,
  targetDestination: SafeHavenDestination,
  etaString: string
): string {
  const urgencyWord = severity === 'distress' ? 'MAYDAY MAYDAY MAYDAY' : severity === 'urgency' ? 'PAN PAN PAN PAN PAN PAN' : 'SECURITE SECURITE SECURITE';
  const latStr = `${Math.abs(vessel.currentPos.lat).toFixed(2)}°${vessel.currentPos.lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(vessel.currentPos.lon).toFixed(2)}°${vessel.currentPos.lon >= 0 ? 'E' : 'W'}`;

  return `================ EMERGENCY DISTRESS TELEGRAPH ===============
RADIO TRANSMISSION PRIORITY: ${severity.toUpperCase()}
CALLSIGN: ${vessel.callSign} | VESSEL: ${vessel.name.toUpperCase()}
IMO NUMBER: 8853178 | MMSI: 419001450 | FLAG: INDIA / NCPOR

${urgencyWord}
THIS IS: ${vessel.name.toUpperCase()} (CALL SIGN: ${vessel.callSign})
CURRENT POSITION: ${latStr}, ${lonStr} (BRANSFIELD / GERLACHE SECTOR)
NATURE OF EMERGENCY: ${EMERGENCY_TYPES[emergencyType].title.toUpperCase()}
SEVERITY LEVEL: ${severity.toUpperCase()} (IMMEDIATE ASSISTANCE DIRECTIVE)
PEOPLE ON BOARD (POB): 64 PERSONS (38 SCIENTISTS, 26 MARITIME CREW)
HULL STATUS / POLAR CLASS: ${vessel.polarClass}
CURRENT SOG: ${vessel.speedKts} KTS | HEADING: 215° TRUE

TACTICAL ACTION IN PROGRESS:
DIVERTING IMMEDIATELY TOWARD SAFE REFUGE:
>> DESTINATION: ${targetDestination.name.toUpperCase()}
>> POSITION: ${Math.abs(targetDestination.lat).toFixed(2)}°S, ${Math.abs(targetDestination.lon).toFixed(2)}°${targetDestination.lon >= 0 ? 'E' : 'W'}
>> DISTANCE TO RUN: ${targetDestination.distanceKm} KM (${targetDestination.distanceNm} NM)
>> ESTIMATED TIME OF ARRIVAL (ETA): ${etaString} UTC

REQUESTED RESCUE ASSISTANCE:
1. MRCC CAPE TOWN & MRCC CHILE TO LOG ACTIVE SAR CASE FILE
2. ESCORT ICEBREAKER (PRV SAGAR DHRUV) STANDBY ON VHF CH 16
3. SHORE RECEPTION MEDICAL / FIREFIGHTING / TUG CREW MOBILIZATION
4. COMNAP MUTUAL AID NOTIFICATION

MASTER, MV VASILIY GOLOVNIN / EXPEDITION LEADER ISEA-44
=============================================================`;
}
