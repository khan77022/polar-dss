import { Iceberg, Vessel, RouteOption, NavigationAlert, UserSession, AheadVesselReport } from '../types';
import { VESSEL_IMAGES } from '../assets/images';

export const RESEARCH_VESSEL: Vessel = {
  name: 'MV Vasiliy Golovnin (ISEA-44)',
  callSign: 'VGN-IND',
  polarClass: 'PC3 (Chartered Polar Heavy Icebreaker - NCPOR)',
  lengthM: 161,
  beamM: 22.8,
  currentPos: { lat: -62.45, lon: -59.10 }, // Bransfield Strait / King George Approach
  speedKts: 12.5,
  headingDeg: 215,
  fuelRateLPerHour: 115,
  startPort: 'Bharati Station (Larsemann Hills, 69°24\'S 76°11\'E)',
  destination: 'Maitri Station (Schirmacher Oasis, 70°46\'S 11°44\'E)',
  departureDate: '26 Sep 2026',
  eta: '18h 42m',
};

// Vessels operating ahead along the navigation corridor (Vanguard Mesh Network)
export const AHEAD_VESSELS: AheadVesselReport[] = [
  {
    id: 'prv-sagar-dhruv',
    vesselName: 'PRV Sagar Dhruv (साग़र ध्रुव)',
    callSign: 'VT-PRV',
    flag: '🇮🇳',
    nation: 'India (MoES / NCPOR)',
    role: 'Vanguard Deep Polar Science & Lead Scout',
    polarClass: 'PC2 (Heavy Polar Research Vessel)',
    currentPos: { lat: -63.18, lon: -60.42 }, // 48 km ahead in Bransfield-Gerlache approach
    distanceAheadKm: 48,
    bearingDeg: 220,
    speedKts: 11.2,
    headingDeg: 218,
    lastReportTime: '26 Sep • 14:15 UTC (15 min ago)',
    observedSeaIceConcentration: 42,
    floeThicknessM: 0.95,
    leadCondition: 'Clear Open Leads',
    icebergSightings: {
      count: 3,
      details: 'Two tabular fragments (400m) & 1 medium bergy bit drifting NW. Clear 4 nm south of our track.',
      nearestKm: 7.2,
    },
    weather: {
      airTempC: -13.8,
      windSpeedKts: 22,
      windDirection: 'WNW (290°)',
      swellHeightM: 1.8,
      visibilityKm: 12,
      freezingSpray: 'Light',
    },
    vPirepNotes: 'Transiting WP-03 safely. Acoustic sensors and forward sonar confirm open lead opening west of Low Island. High recommendation to engage Western Bypass (Route 2) as A68A megaberg pressure ridge is tightening the direct channel.',
    photoUrl: VESSEL_IMAGES.sagarDhruv,
    radarEchoStatus: 'Clear',
    isIndian: true,
  },
  {
    id: 'orv-sagar-kanya',
    vesselName: 'ORV Sagar Kanya (साग़र कन्या)',
    callSign: 'VTCG',
    flag: '🇮🇳',
    nation: 'India (MoES Oceanographic Fleet)',
    role: 'Southern Ocean Hydrographic Patrol',
    polarClass: 'Ice-Strengthened High-Latitude Vessel',
    currentPos: { lat: -64.40, lon: -62.80 }, // 115 km ahead, near Gerlache northern margin
    distanceAheadKm: 115,
    bearingDeg: 212,
    speedKts: 10.4,
    headingDeg: 205,
    lastReportTime: '18 Sep • 13:40 UTC (50 min ago)',
    observedSeaIceConcentration: 58,
    floeThicknessM: 1.2,
    leadCondition: 'Navigable Fractures',
    icebergSightings: {
      count: 5,
      details: 'Cluster of grounded tabular remnants off Brabant Island. Radar reflections sharp.',
      nearestKm: 11.5,
    },
    weather: {
      airTempC: -15.2,
      windSpeedKts: 28,
      windDirection: 'NW (315°)',
      swellHeightM: 2.4,
      visibilityKm: 9,
      freezingSpray: 'Moderate',
    },
    vPirepNotes: 'Gerlache strait entrance has pancake ice consolidation forming. Water temperature -1.6°C. Ship hull experiencing light brash ice impact, well within safety envelope. Route 2 corridor remains fully navigable.',
    photoUrl: VESSEL_IMAGES.sagarKanya,
    radarEchoStatus: 'Scattered Growlers',
    isIndian: true,
  },
  {
    id: 'rrs-attenborough',
    vesselName: 'RRS Sir David Attenborough',
    callSign: 'ZDLP1',
    flag: '🇬🇧',
    nation: 'United Kingdom (BAS)',
    role: 'Polar Logistics & Marine Research Vanguard',
    polarClass: 'PC4 Polar Vessel',
    currentPos: { lat: -66.85, lon: -67.20 }, // 260 km ahead, southern sector approaching Rothera
    distanceAheadKm: 260,
    bearingDeg: 208,
    speedKts: 13.0,
    headingDeg: 195,
    lastReportTime: '26 Sep • 12:20 UTC (2h ago)',
    observedSeaIceConcentration: 68,
    floeThicknessM: 1.4,
    leadCondition: 'Heavy Pressure Ridges',
    icebergSightings: {
      count: 2,
      details: 'Stable calved iceberg near Adelaide Island entrance.',
      nearestKm: 14.0,
    },
    weather: {
      airTempC: -17.5,
      windSpeedKts: 34,
      windDirection: 'SSW (200°)',
      swellHeightM: 3.1,
      visibilityKm: 7,
      freezingSpray: 'Moderate',
    },
    vPirepNotes: 'Adelaide Island sea ice pressure ridge requires active hull propulsion. X-band radar picking up heavy brash field. Advise Vasiliy Golovnin convoy to prepare ice-breaking watch past lat 66°S.',
    photoUrl: VESSEL_IMAGES.attenborough,
    radarEchoStatus: 'Clear',
    isIndian: false,
  },
  {
    id: 'akademik-fedorov',
    vesselName: 'R/V Akademik Fedorov',
    callSign: 'UBRF',
    flag: '🇷🇺',
    nation: 'Antarctic Expeditions Service',
    role: 'Heavy Supply Transporter & Ice Recon',
    polarClass: 'Arc7 Heavy Polar Class',
    currentPos: { lat: -61.90, lon: -57.40 }, // 65 km north-east, scanning outer Weddell outflow
    distanceAheadKm: 65,
    bearingDeg: 45,
    speedKts: 12.8,
    headingDeg: 40,
    lastReportTime: '26 Sep • 13:55 UTC (35 min ago)',
    observedSeaIceConcentration: 74,
    floeThicknessM: 1.8,
    leadCondition: 'Heavy Pressure Ridges',
    icebergSightings: {
      count: 8,
      details: 'Megaberg A68A trailing fragment cluster detected. Outflow drift moving fast at 1.5 kts NW.',
      nearestKm: 5.4,
    },
    weather: {
      airTempC: -11.0,
      windSpeedKts: 42,
      windDirection: 'W (270°)',
      swellHeightM: 3.8,
      visibilityKm: 6,
      freezingSpray: 'Severe',
    },
    vPirepNotes: 'WARNING to southbound vessels: A68A calve front is shedding growlers into the eastern Bransfield entry corridor. Direct Route 1 is unsafe for unescorted vessels. Divert west immediately.',
    photoUrl: VESSEL_IMAGES.akademikFedorov,
    radarEchoStatus: 'Severe Clutter',
    isIndian: false,
  },
];

// Comprehensive Directory of Indian Antarctic Bases, Coastal Jetties & Logistics Hubs
export const INDIAN_POLAR_HUBS = [
  {
    id: 'bharati',
    code: 'BHT-IND',
    name: 'Bharati Station (भारती अनुसंधान केंद्र)',
    shortName: 'Bharati Base (Larsemann Hills)',
    lat: -69.407,
    lon: 76.187,
    location: 'Larsemann Hills, Prydz Bay (East Antarctica)',
    elevationM: 35,
    winterCrew: 24,
    summerCrew: 47,
    keyScience: 'Atmospheric Physics, Marine Biology, Satellite Ground Station, Glaciology',
    logisticsRole: 'India\'s state-of-the-art permanent station commissioned in 2012 with automated satellite telemetry and sheltered coastal fjord.',
    color: '#0284c7',
  },
  {
    id: 'maitri',
    code: 'MTR-IND',
    name: 'Maitri Station (मैत्री अनुसंधान केंद्र)',
    shortName: 'Maitri Base (Schirmacher Oasis)',
    lat: -70.767,
    lon: 11.733,
    location: 'Schirmacher Oasis, Queen Maud Land',
    elevationM: 117,
    winterCrew: 25,
    summerCrew: 65,
    keyScience: 'Meteorology, Geomagnetism, Human Physiology, Seismology, Environmental Science',
    logisticsRole: 'India\'s 2nd permanent base established in 1989 near Lake Priyadarshini; connected via 100km ice tractor transit to India Bay.',
    color: '#0369a1',
  },
  {
    id: 'dakshin-gangotri',
    code: 'DG-HIST',
    name: 'Dakshin Gangotri (दक्षिण गंगोत्री - ऐतिहासिक आधार)',
    shortName: 'Dakshin Gangotri (Ice Shelf AWS)',
    lat: -70.093,
    lon: 12.000,
    location: 'Princess Astrid Coast Ice Shelf (70°S)',
    elevationM: 20,
    winterCrew: 0,
    summerCrew: 10,
    keyScience: 'Automated Weather Station (AWS), Magnetometer Telemetry, Ice Shelf Calving Dynamics',
    logisticsRole: 'First Indian station established 1983; now acts as an automated weather observation post and emergency fuel transit cache.',
    color: '#0891b2',
  },
  {
    id: 'india-bay',
    code: 'IB-JETTY',
    name: 'India Bay Ice Shelf Anchorage (इंडिया बे लंगरगाह)',
    shortName: 'India Bay Ice Shelf Jetty',
    lat: -69.983,
    lon: 11.917,
    location: 'Queen Maud Land Ice Shelf Margin',
    elevationM: 0,
    winterCrew: 0,
    summerCrew: 20,
    keyScience: 'Ocean Moorings, Acoustic Iceberg Listening Array, Hydrography',
    logisticsRole: 'Crucial offloading zone for MV Vasiliy Golovnin; heavy container cargo & fuel transfers to PistenBully convoys.',
    color: '#2563eb',
  },
  {
    id: 'prydz-bay-marine',
    code: 'PRYDZ-TRANSECT',
    name: 'Prydz Bay Marine Oceanographic Transect (प्राइडज़ बे)',
    shortName: 'Prydz Bay Coastal Sampling Grid',
    lat: -68.750,
    lon: 74.200,
    location: 'East Antarctica / Amery Ice Shelf Outflow',
    elevationM: 0,
    winterCrew: 0,
    summerCrew: 30,
    keyScience: 'Benthic ecology, deep CTD rosette casts, sea-ice drift calibration',
    logisticsRole: 'Primary research transit area between open ocean and Bharati station mooring.',
    color: '#0284c7',
  },
  {
    id: 'ncpor-goa',
    code: 'NCPOR-HQ',
    name: 'Mormugao Port / NCPOR Goa (एनसीपीओआर गोवा मुख्यालय)',
    shortName: 'Goa / Mormugao Port (NCPOR HQ)',
    lat: 15.405,
    lon: 73.805,
    location: 'Headland Sada, Vasco-da-Gama, Goa, India',
    elevationM: 40,
    winterCrew: 150,
    summerCrew: 150,
    keyScience: 'Mission Control, ConvLSTM Ice Forecasting Model Server, Satellite Data Ingestion',
    logisticsRole: 'Apex research institution under Ministry of Earth Sciences (MoES); commands all Indian Antarctic Expeditions.',
    color: '#1d4ed8',
  },
  {
    id: 'cape-town-gateway',
    code: 'CPT-GATE',
    name: 'Cape Town Gateway Port (केप टाउन भारतीय गेटवे)',
    shortName: 'Cape Town Port (ISEA Staging Gateway)',
    lat: -33.905,
    lon: 18.425,
    location: 'Table Bay Harbour, Western Cape, South Africa',
    elevationM: 5,
    winterCrew: 12,
    summerCrew: 30,
    keyScience: 'Pre-voyage calibrations, CTD sensor trials, Icebreaker bunkering',
    logisticsRole: 'Official boarding and departure harbor for all 44 Indian Scientific Expeditions to Antarctica.',
    color: '#059669',
  },
  {
    id: 'king-george-link',
    code: 'KGI-LINK',
    name: 'King George Island Gateway (किंग जॉर्ज द्वीप)',
    shortName: 'King George Island (Joint Polar Gateway)',
    lat: -62.190,
    lon: -58.980,
    location: 'South Shetland Islands (Bransfield Strait entry)',
    elevationM: 10,
    winterCrew: 40,
    summerCrew: 120,
    keyScience: 'Inter-station logistics, Twin Otter polar aviation, Antarctic Peninsula link',
    logisticsRole: 'Air-sea transfer node used during collaborative West Antarctic & Southern Ocean scientific cruises.',
    color: '#d97706',
  },
];

export const INDIAN_VESSELS: Vessel[] = [
  {
    name: 'MV Vasiliy Golovnin (Chartered Icebreaker)',
    callSign: 'VGN-44-IND',
    polarClass: 'PC3 (Heavy Polar Cargo & Icebreaker)',
    lengthM: 161,
    beamM: 22.8,
    currentPos: { lat: -62.45, lon: -59.10 },
    speedKts: 12.5,
    headingDeg: 215,
    fuelRateLPerHour: 115,
    startPort: 'Cape Town (Indian Gateway Port)',
    destination: 'Bharati Station (Larsemann Hills)',
    departureDate: '18 Sep 2026',
    eta: '18h 42m',
  },
  {
    name: 'PRV Sagar Dhruv (Indian Polar Research Vessel)',
    callSign: 'VT-PRV',
    polarClass: 'PC2 (State-of-the-Art Deep Polar Vessel)',
    lengthM: 122,
    beamM: 24,
    currentPos: { lat: -68.80, lon: 74.50 }, // Approaching Bharati Station in Prydz Bay
    speedKts: 13.2,
    headingDeg: 145,
    fuelRateLPerHour: 125,
    startPort: 'Goa (Mormugao Port - NCPOR HQ)',
    destination: 'Bharati Station (Prydz Bay)',
    departureDate: '12 Sep 2026',
    eta: '14h 20m',
  },
  {
    name: 'ORV Sagar Kanya (MoES Oceanographic Fleet)',
    callSign: 'VTCG',
    polarClass: 'Ice-Strengthened High-Latitude Vessel',
    lengthM: 100.3,
    beamM: 16.4,
    currentPos: { lat: -60.10, lon: 15.20 }, // Southern Ocean approach to Maitri
    speedKts: 11.8,
    headingDeg: 180,
    fuelRateLPerHour: 95,
    startPort: 'Maitri Station (Schirmacher Oasis)',
    destination: 'Dakshin Gangotri Ice Shelf Depot',
    departureDate: '10 Sep 2026',
    eta: '38h 15m',
  },
];

// Major Antarctic research stations - with India's prominent stations highlighted
export const ANTARCTIC_STATIONS = [
  // Indian National Stations
  {
    id: 'bharati',
    name: 'Bharati Station (भारत)',
    lat: -69.407,
    lon: 76.187,
    nation: 'India (NCPOR / MoES)',
    flag: '🇮🇳',
    isIndian: true,
    info: 'Larsemann Hills, Prydz Bay. 3rd Indian Permanent Base (Commissioned 2012). Atmospheric, biological & oceanographic sciences.',
  },
  {
    id: 'maitri',
    name: 'Maitri Station (मैत्री)',
    lat: -70.767,
    lon: 11.733,
    nation: 'India (NCPOR / MoES)',
    flag: '🇮🇳',
    isIndian: true,
    info: 'Schirmacher Oasis, Queen Maud Land. 2nd Indian Permanent Base (Commissioned 1989). Year-round polar research.',
  },
  {
    id: 'dakshin-gangotri',
    name: 'Dakshin Gangotri (दक्षिण गंगोत्री)',
    lat: -70.093,
    lon: 12.000,
    nation: 'India (Historical Base / Supply Depot)',
    flag: '🇮🇳',
    isIndian: true,
    info: 'Historical 1st Indian Antarctic Station (1983). Now an automated telemetry & supply transit depot.',
  },
  // Key International Stations in Navigation Corridors
  {
    id: 'frei',
    name: 'Frei Base / Escudero (King George Is.)',
    lat: -62.19,
    lon: -58.98,
    nation: 'Chile / Multi-national Logistics',
    flag: '🇨🇱',
    isIndian: false,
    info: 'Key northern logistics hub & airway corridor into the Antarctic Peninsula.',
  },
  {
    id: 'rothera',
    name: 'Rothera Research Station',
    lat: -67.57,
    lon: -68.12,
    nation: 'United Kingdom (BAS)',
    flag: '🇬🇧',
    isIndian: false,
    info: 'Adelaide Island deep polar science and marine logistics runway.',
  },
  {
    id: 'palmer',
    name: 'Palmer Station',
    lat: -64.77,
    lon: -64.05,
    nation: 'United States (USAP)',
    flag: '🇺🇸',
    isIndian: false,
    info: 'Anvers Island biological & oceanographic laboratory.',
  },
  {
    id: 'esperanza',
    name: 'Esperanza Base',
    lat: -63.40,
    lon: -56.99,
    nation: 'Argentina',
    flag: '🇦🇷',
    isIndian: false,
    info: 'Hope Bay, northern tip of Antarctic Peninsula.',
  },
];

// Authorized Polar Navigation & NCPOR Demo Profiles
export const DEMO_USER_SESSIONS: UserSession[] = [
  {
    id: 'ncpor-operator',
    name: 'Polar Operations Duty Officer',
    role: 'Polar Navigation & Route Watch Officer',
    organization: 'National Centre for Polar and Ocean Research (NCPOR)',
    email: 'operator.polar@ncpor.gov.in',
    vesselName: 'MV Vasiliy Golovnin',
    expedition: '44th Indian Scientific Expedition to Antarctica (ISEA)',
    badge: 'OPERATIONS',
    avatarInitials: 'PO',
  },
  {
    id: 'ncpor-scientist',
    name: 'Dr. Rajesh Sharma',
    role: 'Chief Scientist & Expedition Leader',
    organization: 'National Centre for Polar and Ocean Research (NCPOR), Goa',
    email: 'rsharma.ncpor@gov.in',
    vesselName: 'MV Vasiliy Golovnin',
    expedition: '44th ISEA - Maitri & Bharati Operations',
    badge: 'EXPEDITION LEADER',
    avatarInitials: 'RS',
  },
  {
    id: 'polar-master',
    name: 'Capt. Sunildutt Verma',
    role: 'Polar Navigation Master (Ice Pilot)',
    organization: 'Directorate General of Shipping / MoES Operations',
    email: 'captain.verma@shipping.gov.in',
    vesselName: 'MV Vasiliy Golovnin',
    expedition: 'Polar Maritime Safety & Convoy Navigation',
    badge: 'ICE MASTER',
    avatarInitials: 'SV',
  },
];

// Icebergs with observed historical track and predicted drift corridor
export const ICEBERGS: Iceberg[] = [
  {
    id: 'A68A',
    name: 'A68A (Tabular Fragment)',
    classification: 'Megaberg / Very Large Tabular',
    currentPos: { lat: -63.85, lon: -56.20 }, // Weddell Sea outflow, drifting NW into Bransfield/Drake corridor
    dimensionsKm: { length: 82, width: 28, heightAboveWaterM: 35 },
    areaSqKm: 2296,
    driftSpeedKts: 1.4,
    driftDirectionDeg: 325, // NW drift
    riskLevel: 'high',
    origin: 'Larsen C Ice Shelf',
    calveYear: 2017,
    imageUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=800&q=80',
    imageCaption: 'Tabular iceberg drifting in the Southern Ocean (Sentinel-3 / BAS optical validation)',
    observedTrack: [
      { lat: -65.40, lon: -54.10, date: '23 Sep', timeUtc: '00:00', speedKts: 1.1, uncertaintyRadiusKm: 2.0 },
      { lat: -64.90, lon: -54.80, date: '24 Sep', timeUtc: '06:00', speedKts: 1.2, uncertaintyRadiusKm: 2.5 },
      { lat: -64.35, lon: -55.50, date: '25 Sep', timeUtc: '12:00', speedKts: 1.3, uncertaintyRadiusKm: 3.0 },
      { lat: -63.85, lon: -56.20, date: '26 Sep', timeUtc: '14:30', speedKts: 1.4, uncertaintyRadiusKm: 3.5 },
    ],
    predictedTrack: [
      { lat: -63.85, lon: -56.20, date: '26 Sep', timeUtc: '14:30', speedKts: 1.4, uncertaintyRadiusKm: 3.5 },
      { lat: -63.30, lon: -57.10, date: '27 Sep', timeUtc: '12:00', speedKts: 1.4, uncertaintyRadiusKm: 7.0 },
      { lat: -62.80, lon: -58.20, date: '28 Sep', timeUtc: '12:00', speedKts: 1.5, uncertaintyRadiusKm: 12.0 },
      { lat: -62.35, lon: -59.50, date: '29 Sep', timeUtc: '14:00', speedKts: 1.6, uncertaintyRadiusKm: 18.0 }, // Potential encounter point!
      { lat: -61.80, lon: -61.00, date: '30 Sep', timeUtc: '12:00', speedKts: 1.5, uncertaintyRadiusKm: 26.0 },
    ],
    // The corridor polygon points (left edge going forward, right edge returning)
    corridorPolygon: [
      // Left boundary (widening westward)
      { lat: -63.85, lon: -56.28 },
      { lat: -63.26, lon: -57.26 },
      { lat: -62.72, lon: -58.52 },
      { lat: -62.20, lon: -60.05 },
      { lat: -61.60, lon: -61.80 },
      // Right boundary (widening eastward)
      { lat: -62.00, lon: -60.20 },
      { lat: -62.50, lon: -58.95 },
      { lat: -62.88, lon: -57.88 },
      { lat: -63.34, lon: -56.94 },
      { lat: -63.85, lon: -56.12 },
    ],
  },
  {
    id: 'A76',
    name: 'A76 (Northern Fragment)',
    classification: 'Tabular Megaberg',
    currentPos: { lat: -66.10, lon: -50.80 }, // Outer Weddell Sea gyre
    dimensionsKm: { length: 54, width: 20, heightAboveWaterM: 40 },
    areaSqKm: 1080,
    driftSpeedKts: 0.9,
    driftDirectionDeg: 340,
    riskLevel: 'medium',
    origin: 'Ronne Ice Shelf',
    calveYear: 2021,
    imageUrl: 'https://images.unsplash.com/photo-1548232979-6c557ee14752?auto=format&fit=crop&w=800&q=80',
    imageCaption: 'Deep-keeled Antarctic iceberg fragment monitored via Sentinel-1 SAR',
    observedTrack: [
      { lat: -67.20, lon: -49.50, date: '23 Sep', timeUtc: '00:00', speedKts: 0.8, uncertaintyRadiusKm: 2.0 },
      { lat: -66.65, lon: -50.15, date: '24 Sep', timeUtc: '12:00', speedKts: 0.8, uncertaintyRadiusKm: 3.0 },
      { lat: -66.10, lon: -50.80, date: '26 Sep', timeUtc: '14:30', speedKts: 0.9, uncertaintyRadiusKm: 4.0 },
    ],
    predictedTrack: [
      { lat: -66.10, lon: -50.80, date: '26 Sep', timeUtc: '14:30', speedKts: 0.9, uncertaintyRadiusKm: 4.0 },
      { lat: -65.40, lon: -51.60, date: '27 Sep', timeUtc: '12:00', speedKts: 0.9, uncertaintyRadiusKm: 8.0 },
      { lat: -64.70, lon: -52.40, date: '28 Sep', timeUtc: '12:00', speedKts: 1.0, uncertaintyRadiusKm: 14.0 },
      { lat: -64.00, lon: -53.20, date: '29 Sep', timeUtc: '12:00', speedKts: 1.0, uncertaintyRadiusKm: 20.0 },
      { lat: -63.20, lon: -54.00, date: '30 Sep', timeUtc: '12:00', speedKts: 1.1, uncertaintyRadiusKm: 28.0 },
    ],
    corridorPolygon: [
      { lat: -66.10, lon: -50.90 },
      { lat: -65.35, lon: -51.85 },
      { lat: -64.60, lon: -52.80 },
      { lat: -63.85, lon: -53.80 },
      { lat: -63.00, lon: -54.80 },
      { lat: -63.40, lon: -53.20 },
      { lat: -64.15, lon: -52.60 },
      { lat: -64.80, lon: -52.00 },
      { lat: -65.45, lon: -51.35 },
      { lat: -66.10, lon: -50.70 },
    ],
  },
  {
    id: 'D28',
    name: 'D28 ("Moo Cow")',
    classification: 'Medium Tabular',
    currentPos: { lat: -65.20, lon: -60.50 }, // Larsen B remnant embayment
    dimensionsKm: { length: 30, width: 14, heightAboveWaterM: 28 },
    areaSqKm: 420,
    driftSpeedKts: 0.6,
    driftDirectionDeg: 10,
    riskLevel: 'low',
    origin: 'Amery Ice Shelf (East Antarctica drift)',
    calveYear: 2019,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    imageCaption: 'High-latitude sea ice floe and tabular remnant',
    observedTrack: [
      { lat: -65.80, lon: -60.30, date: '24 Sep', timeUtc: '00:00', speedKts: 0.5, uncertaintyRadiusKm: 2.0 },
      { lat: -65.20, lon: -60.50, date: '26 Sep', timeUtc: '14:30', speedKts: 0.6, uncertaintyRadiusKm: 3.0 },
    ],
    predictedTrack: [
      { lat: -65.20, lon: -60.50, date: '26 Sep', timeUtc: '14:30', speedKts: 0.6, uncertaintyRadiusKm: 3.0 },
      { lat: -64.70, lon: -60.70, date: '28 Sep', timeUtc: '12:00', speedKts: 0.6, uncertaintyRadiusKm: 8.0 },
      { lat: -64.20, lon: -60.90, date: '30 Sep', timeUtc: '12:00', speedKts: 0.7, uncertaintyRadiusKm: 15.0 },
    ],
    corridorPolygon: [
      { lat: -65.20, lon: -60.58 },
      { lat: -64.70, lon: -60.88 },
      { lat: -64.18, lon: -61.20 },
      { lat: -64.22, lon: -60.60 },
      { lat: -64.70, lon: -60.52 },
      { lat: -65.20, lon: -60.42 },
    ],
  },
];

// Initial planned route (Direct Bransfield Strait corridor)
// Note: Intersects predicted A68A trajectory on 29 Sep!
export const ROUTE_ORIGINAL: RouteOption = {
  id: 'route-original',
  name: 'Route 1 (Shortest / Direct)',
  objective: 'shortest',
  distanceKm: 380,
  timeHours: 32,
  fuelLiters: 1450,
  iceRisk: 'High',
  icebergRisk: 'High',
  recommendedFor: 'Time-critical emergency transit only',
  hasConflict: true,
  conflictAtKm: 185,
  waypoints: [
    { lat: -62.19, lon: -58.98 }, // King George Island (Frei Base)
    { lat: -62.45, lon: -59.10 }, // Current vessel position
    { lat: -62.80, lon: -59.60 }, // Enters Bransfield Passage
    { lat: -63.50, lon: -60.80 }, // CONFLICT ZONE with A68A drift corridor!
    { lat: -64.77, lon: -64.05 }, // Palmer Station approach (Gerlache Strait)
    { lat: -66.10, lon: -66.50 }, // Grandidier Channel
    { lat: -67.57, lon: -68.12 }, // Rothera Research Station
  ],
};

// Rerouted Safe Alternative (West of Low Island / Western Bransfield Bypass)
export const ROUTE_REROUTED: RouteOption = {
  id: 'route-rerouted',
  name: 'Route 2 (Balanced / Optimized)',
  objective: 'balanced',
  distanceKm: 420,
  timeHours: 36,
  fuelLiters: 1180,
  iceRisk: 'Low',
  icebergRisk: 'Low',
  recommendedFor: 'Recommended for selected objective',
  hasConflict: false,
  waypoints: [
    { lat: -62.19, lon: -58.98 }, // King George Island
    { lat: -62.45, lon: -59.10 }, // Current vessel position
    { lat: -62.60, lon: -60.20 }, // Deflects NW around Livingston Island
    { lat: -63.15, lon: -61.90 }, // Safe deep-water passage avoiding A68A corridor
    { lat: -64.20, lon: -63.40 }, // Outer Gerlache entry
    { lat: -64.77, lon: -64.05 }, // Palmer Station corridor
    { lat: -66.10, lon: -66.50 }, // Grandidier Channel
    { lat: -67.57, lon: -68.12 }, // Rothera Station
  ],
};

// Route 3: Deep Ocean Safety Track (Lowest ice/iceberg density, longest distance)
export const ROUTE_MAX_SAFETY: RouteOption = {
  id: 'route-safety',
  name: 'Route 3 (Lowest Risk / Wide Offshore)',
  objective: 'safety',
  distanceKm: 510,
  timeHours: 44,
  fuelLiters: 1300,
  iceRisk: 'Low',
  icebergRisk: 'Very Low',
  recommendedFor: 'Severe weather / low-visibility conditions',
  hasConflict: false,
  waypoints: [
    { lat: -62.19, lon: -58.98 },
    { lat: -62.45, lon: -59.10 },
    { lat: -62.10, lon: -61.20 }, // Far north into Drake Passage margin
    { lat: -63.00, lon: -64.50 }, // Deep open ocean
    { lat: -64.50, lon: -66.20 }, // Clear of all coastal grounded bergs
    { lat: -66.30, lon: -68.00 }, // Outer Bellingshausen Sea
    { lat: -67.57, lon: -68.12 }, // Rothera Station
  ],
};

export const INITIAL_ALERTS: NavigationAlert[] = [
  {
    id: 'alert-1',
    severity: 'high',
    title: 'Potential iceberg encounter',
    timestamp: '29 Sep • 14:00 UTC',
    description: 'Predicted trajectory for A68A intersects planned route corridor. Closest point of approach: 4.8 km.',
    distanceKm: 4.8,
    resolved: false,
  },
  {
    id: 'alert-2',
    severity: 'warning',
    title: 'Sea-ice concentration increasing',
    timestamp: '30 Sep • 06:00 UTC',
    description: 'ConvLSTM forecast indicates marginal ice zone expanding in southern Gerlache Strait (concentration > 65%).',
    resolved: false,
  },
  {
    id: 'alert-3',
    severity: 'info',
    title: 'New observation available',
    timestamp: '26 Sep • 13:45 UTC',
    description: 'Sentinel-1B SAR synthetic aperture radar swath assimilated into drift model.',
    resolved: false,
  },
];

export const TIMELINE_STEPS = [
  { index: 0, label: '26 Sep', fullDate: '26 Sep 2026', timeUtc: '14:30 UTC', description: 'Present Observation' },
  { index: 1, label: '27 Sep', fullDate: '27 Sep 2026', timeUtc: '12:00 UTC', description: '+22h Forecast Step' },
  { index: 2, label: '28 Sep', fullDate: '28 Sep 2026', timeUtc: '12:00 UTC', description: '+46h Forecast Step' },
  { index: 3, label: '29 Sep', fullDate: '29 Sep 2026', timeUtc: '14:00 UTC', description: '+72h Conflict Window' },
  { index: 4, label: '30 Sep', fullDate: '30 Sep 2026', timeUtc: '12:00 UTC', description: '+94h Arrival Horizon' },
];

export const WEATHER_DATA = {
  airTemperatureC: -12,
  windSpeedKmh: 28,
  windSpeedKts: 15.1,
  windDirection: 'NW (315°)',
  oceanCurrentSpeedMs: 0.6,
  oceanCurrentDir: 'NE (040°)',
  waveHeightM: 2.1,
  wavePeriodS: 7.5,
  visibility: 'Good (> 10 km)',
  surfacePressureHpa: 988,
  freezingSprayRisk: 'Low (Sea temp: -1.4°C)',
  seaSurfaceTempC: -1.4,
};

// Realistic validation benchmarks for the two machine-learning / physical models
export const MODEL_PERFORMANCE_DATA = {
  seaIceModel: {
    name: 'ConvLSTM Spatiotemporal Sea-Ice Model',
    architecture: 'ConvLSTM (5 Recurrent Layers + Spatial Attention)',
    trainingPeriod: '2015 – 2024 (10 Years NSIDC/AMSR2)',
    resolution: '6.25 km polar stereographic grid',
    inputs: [
      { name: 'SSMIS / AMSR2', role: 'Passive microwave brightness temperature (89 GHz / 36 GHz)' },
      { name: 'Sentinel-1 SAR', role: 'High-resolution surface roughness & lead detection' },
      { name: 'ERA5 Reanalysis', role: 'Surface 10m wind vector, 2m air temp, thermal radiation' },
      { name: 'HYCOM Ocean Data', role: 'Mixed layer depth, sea surface temperature & currents' },
    ],
    metrics: [
      { metric: 'Mean Absolute Error (MAE)', value: '4.2%', unit: 'concentration', status: 'Optimal' },
      { metric: 'Root Mean Square Error (RMSE)', value: '6.8%', unit: 'concentration', status: 'Optimal' },
      { metric: 'Ice Edge Location Error', value: '11.4 km', unit: 'distance', status: 'Optimal' },
      { metric: 'Inference Latency', value: '1.42 s', unit: 'time', status: 'Real-time ready' },
    ],
    benchmarkHistory: [
      { horizon: '+24h', mae: 2.8, rmse: 4.1, edgeErrorKm: 6.2 },
      { horizon: '+48h', mae: 4.2, rmse: 6.8, edgeErrorKm: 11.4 },
      { horizon: '+72h', mae: 5.9, rmse: 8.9, edgeErrorKm: 16.8 },
      { horizon: '+96h', mae: 7.8, rmse: 11.2, edgeErrorKm: 22.5 },
      { horizon: '+120h', mae: 9.4, rmse: 13.6, edgeErrorKm: 29.1 },
    ],
  },
  icebergModel: {
    name: 'Physics-Informed Iceberg Drift & Ensemble Corridor Model',
    approach: 'Hydrodynamic momentum balance (Coriolis, form drag, skin friction, wave radiation pressure, internal ice stress)',
    inputs: [
      { name: 'Ocean Currents', role: 'Baroclinic & barotropic current profiles (0–300m keel depth)' },
      { name: 'Surface Wind Fields', role: '10m atmospheric drag with sail-height scaling' },
      { name: 'Sea-Ice Concentration', role: 'Dampening force & momentum transfer from pack ice' },
      { name: 'Historical Trajectories', role: 'Kalman filter Bayesian update on Sentinel/MODIS positions' },
    ],
    metrics: [
      { metric: '24h Position Error', value: '3.8 km', unit: 'median offset', status: 'High accuracy' },
      { metric: '48h Trajectory Error', value: '7.4 km', unit: 'median offset', status: 'High accuracy' },
      { metric: '72h Trajectory Error', value: '13.1 km', unit: 'median offset', status: 'Validated' },
      { metric: 'Corridor 95% Coverage', value: '93.8%', unit: 'confidence band hit rate', status: 'Calibrated' },
    ],
    errorProgression: [
      { horizon: '0h', medianErrorKm: 0.0, p95CorridorWidthKm: 3.5 },
      { horizon: '24h', medianErrorKm: 3.8, p95CorridorWidthKm: 7.0 },
      { horizon: '48h', medianErrorKm: 7.4, p95CorridorWidthKm: 12.0 },
      { horizon: '72h', medianErrorKm: 13.1, p95CorridorWidthKm: 18.0 },
      { horizon: '96h', medianErrorKm: 21.6, p95CorridorWidthKm: 26.0 },
    ],
  },
};
