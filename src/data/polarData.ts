import { Iceberg, Vessel, RouteOption, NavigationAlert, UserSession, AheadVesselReport } from '../types';

export const RESEARCH_VESSEL: Vessel = {
  name: 'MV Vasiliy Golovnin',
  callSign: 'VGN-PC3',
  polarClass: 'PC3 Polar Heavy Icebreaker',
  lengthM: 161,
  beamM: 22.8,
  currentPos: { lat: -68.85, lon: 74.20 }, // Prydz Bay approach / East Antarctic Corridor
  speedKts: 12.5,
  headingDeg: 268,
  fuelRateLPerHour: 115,
  startPort: 'Bharati Station (Larsemann Hills, 69°24\'S 76°11\'E)',
  destination: 'Maitri Station (Schirmacher Oasis, 70°46\'S 11°44\'E)',
  departureDate: '18 Sep 2026',
  eta: '18h 42m',
};

// Vessels operating ahead along the navigation corridor (Vanguard Mesh Network)
export const AHEAD_VESSELS: AheadVesselReport[] = [
  {
    id: 'prv-polar-vanguard',
    vesselName: 'RV Polar Vanguard',
    callSign: 'PVG-01',
    flag: '',
    nation: 'Polar Research Fleet',
    role: 'Vanguard Deep Polar Science & Lead Scout',
    polarClass: 'PC2 Heavy Polar Research Vessel',
    currentPos: { lat: -68.65, lon: 71.80 }, // 48 km ahead in Amery margin coastal leads
    distanceAheadKm: 48,
    bearingDeg: 265,
    speedKts: 11.2,
    headingDeg: 268,
    lastReportTime: '18 Sep • 14:15 UTC (15 min ago)',
    observedSeaIceConcentration: 42,
    floeThicknessM: 0.95,
    leadCondition: 'Clear Open Leads',
    icebergSightings: {
      count: 3,
      details: 'Two tabular fragments (400m) & 1 medium bergy bit drifting WNW. Clear 4 nm south of our track.',
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
    vPirepNotes: 'Transiting coastal waypoint safely. Acoustic sensors and forward sonar confirm open lead opening north of the fast ice boundary. High recommendation to engage Offshore Leads Bypass (Route 2) as D28 tabular berg pressure ridge is tightening the direct inshore channel.',
    photoUrl: '/src/assets/images/polar_vanguard_icebreaker_1790325622639.jpg',
    radarEchoStatus: 'Clear',
    isIndian: true,
  },
  {
    id: 'orv-ocean-surveyor',
    vesselName: 'ORV Ocean Surveyor',
    callSign: 'OSV-02',
    flag: '',
    nation: 'Oceanographic Fleet',
    role: 'High-Latitude Hydrographic Patrol',
    polarClass: 'Ice-Strengthened High-Latitude Vessel',
    currentPos: { lat: -67.90, lon: 58.60 }, // 115 km ahead, Enderby Land passage
    distanceAheadKm: 115,
    bearingDeg: 262,
    speedKts: 10.4,
    headingDeg: 260,
    lastReportTime: '18 Sep • 13:40 UTC (50 min ago)',
    observedSeaIceConcentration: 58,
    floeThicknessM: 1.2,
    leadCondition: 'Navigable Fractures',
    icebergSightings: {
      count: 5,
      details: 'Cluster of grounded tabular remnants off Enderby coastal bank. Radar reflections sharp.',
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
    vPirepNotes: 'Enderby Land approach has pancake ice consolidation forming. Water temperature -1.6°C. Ship hull experiencing light brash ice impact, well within safety envelope. Route 2 corridor remains fully navigable.',
    photoUrl: '/src/assets/images/ocean_surveyor_ship_1790325637362.jpg',
    radarEchoStatus: 'Scattered Growlers',
    isIndian: true,
  },
  {
    id: 'rrs-polar-explorer',
    vesselName: 'RRS Polar Explorer',
    callSign: 'PEX-03',
    flag: '',
    nation: 'International Polar Logistics',
    role: 'Polar Logistics & Marine Research Vanguard',
    polarClass: 'PC4 Polar Vessel',
    currentPos: { lat: -68.30, lon: 42.10 }, // 260 km ahead in Cosmonaut Sea corridor
    distanceAheadKm: 260,
    bearingDeg: 258,
    speedKts: 13.0,
    headingDeg: 255,
    lastReportTime: '18 Sep • 12:20 UTC (2h ago)',
    observedSeaIceConcentration: 68,
    floeThicknessM: 1.4,
    leadCondition: 'Heavy Pressure Ridges',
    icebergSightings: {
      count: 2,
      details: 'Stable calved iceberg near Cosmonaut Sea entrance.',
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
    vPirepNotes: 'Cosmonaut Sea pressure ridge requires active hull propulsion. X-band radar picking up heavy brash field. Advise Vasiliy Golovnin convoy to prepare ice-breaking watch past lon 45°E.',
    photoUrl: '/src/assets/images/polar_logistics_vessel_1790325650990.jpg',
    radarEchoStatus: 'Clear',
    isIndian: false,
  },
  {
    id: 'rv-arctic-ice-scout',
    vesselName: 'R/V Arctic Ice Scout',
    callSign: 'AIS-04',
    flag: '',
    nation: 'Polar Expeditions Service',
    role: 'Heavy Supply Transporter & Ice Recon',
    polarClass: 'Arc7 Heavy Polar Class',
    currentPos: { lat: -69.20, lon: 24.50 }, // Ahead near Astrid Coast approach
    distanceAheadKm: 380,
    bearingDeg: 252,
    speedKts: 12.8,
    headingDeg: 250,
    lastReportTime: '18 Sep • 13:55 UTC (35 min ago)',
    observedSeaIceConcentration: 74,
    floeThicknessM: 1.8,
    leadCondition: 'Heavy Pressure Ridges',
    icebergSightings: {
      count: 6,
      details: 'Tabular fragment cluster detected. Outflow drift moving fast at 1.5 kts NW.',
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
    vPirepNotes: 'WARNING to westbound vessels: Inshore fast-ice zone is shedding growlers into the direct corridor. Route 1 inshore channel is unsafe for unescorted vessels. Divert to Route 2 offshore leads immediately.',
    photoUrl: '/src/assets/images/heavy_icebreaker_polar_1790325665941.jpg',
    radarEchoStatus: 'Severe Clutter',
    isIndian: false,
  },
];

// Comprehensive Directory of Indian Antarctic Bases, Coastal Jetties & Logistics Hubs
export const INDIAN_POLAR_HUBS = [
  {
    id: 'bharati',
    code: 'BHT-IND',
    name: 'Bharati Research Station',
    shortName: 'Bharati Base (Larsemann Hills)',
    lat: -69.407,
    lon: 76.187,
    location: 'Larsemann Hills, Prydz Bay (East Antarctica)',
    elevationM: 35,
    winterCrew: 24,
    summerCrew: 47,
    keyScience: 'Atmospheric Physics, Marine Biology, Satellite Ground Station, Glaciology',
    logisticsRole: 'Permanent polar research base commissioned in 2012 with automated satellite telemetry and sheltered coastal fjord.',
    color: '#0284c7',
  },
  {
    id: 'maitri',
    code: 'MTR-IND',
    name: 'Maitri Research Station',
    shortName: 'Maitri Base (Schirmacher Oasis)',
    lat: -70.767,
    lon: 11.733,
    location: 'Schirmacher Oasis, Queen Maud Land',
    elevationM: 117,
    winterCrew: 25,
    summerCrew: 65,
    keyScience: 'Meteorology, Geomagnetism, Human Physiology, Seismology, Environmental Science',
    logisticsRole: 'Permanent research base established in 1989 near Lake Priyadarshini; connected via 100km ice tractor transit to India Bay.',
    color: '#0369a1',
  },
  {
    id: 'dakshin-gangotri',
    code: 'DG-HIST',
    name: 'Dakshin Gangotri AWS Station',
    shortName: 'Dakshin Gangotri (Ice Shelf AWS)',
    lat: -70.093,
    lon: 12.000,
    location: 'Princess Astrid Coast Ice Shelf (70°S)',
    elevationM: 20,
    winterCrew: 0,
    summerCrew: 10,
    keyScience: 'Automated Weather Station (AWS), Magnetometer Telemetry, Ice Shelf Calving Dynamics',
    logisticsRole: 'First Antarctic station established 1983; now acts as an automated weather observation post and emergency fuel transit cache.',
    color: '#0891b2',
  },
  {
    id: 'india-bay',
    code: 'IB-JETTY',
    name: 'India Bay Ice Shelf Anchorage',
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
    name: 'Prydz Bay Oceanographic Transect',
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
    name: 'NCPOR Operations Center',
    shortName: 'NCPOR Polar Mission Control',
    lat: 15.405,
    lon: 73.805,
    location: 'Vasco-da-Gama, Goa',
    elevationM: 40,
    winterCrew: 150,
    summerCrew: 150,
    keyScience: 'Mission Control, ConvLSTM Ice Forecasting Model Server, Satellite Data Ingestion',
    logisticsRole: 'Apex polar science and logistics control center commanding Antarctic expedition voyages.',
    color: '#1d4ed8',
  },
  {
    id: 'cape-town-gateway',
    code: 'CPT-GATE',
    name: 'Cape Town Gateway Port',
    shortName: 'Cape Town Staging Gateway',
    lat: -33.905,
    lon: 18.425,
    location: 'Table Bay Harbour, Western Cape, South Africa',
    elevationM: 5,
    winterCrew: 12,
    summerCrew: 30,
    keyScience: 'Pre-voyage calibrations, CTD sensor trials, Icebreaker bunkering',
    logisticsRole: 'Staging harbor and embarkation point for polar research expeditions to East Antarctica.',
    color: '#059669',
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

// Major Antarctic research stations in the operating sector
export const ANTARCTIC_STATIONS = [
  {
    id: 'bharati',
    name: 'Bharati Station',
    lat: -69.407,
    lon: 76.187,
    nation: 'Polar Research Base (NCPOR)',
    flag: '',
    isIndian: true,
    info: 'Larsemann Hills, Prydz Bay. Permanent Antarctic research station commissioned in 2012. Atmospheric, biological & oceanographic sciences.',
  },
  {
    id: 'maitri',
    name: 'Maitri Station',
    lat: -70.767,
    lon: 11.733,
    nation: 'Polar Research Base (NCPOR)',
    flag: '',
    isIndian: true,
    info: 'Schirmacher Oasis, Queen Maud Land. Permanent Antarctic research station. Connected to India Bay ice shelf anchorage via 100km tractor corridor.',
  },
  {
    id: 'dakshin-gangotri',
    name: 'Dakshin Gangotri AWS',
    lat: -70.093,
    lon: 12.000,
    nation: 'Historical Base / Automatic Weather Station',
    flag: '',
    isIndian: true,
    info: 'First Antarctic station (1983). Operates continuous automated telemetry and emergency fuel transit depot.',
  },
  {
    id: 'progress',
    name: 'Progress Station',
    lat: -69.37,
    lon: 76.38,
    nation: 'International Antarctic Logistics',
    flag: '',
    isIndian: false,
    info: 'Larsemann Hills adjacent station in Prydz Bay; collaborative weather and aerodrome link.',
  },
  {
    id: 'syowa',
    name: 'Syowa Station',
    lat: -69.00,
    lon: 39.58,
    nation: 'East Antarctic Research Center',
    flag: '',
    isIndian: false,
    info: 'East Ongul Island, Queen Maud Land coastal approach; upper atmosphere and oceanographic monitoring.',
  },
  {
    id: 'troll',
    name: 'Troll Station',
    lat: -72.01,
    lon: 2.53,
    nation: 'Queen Maud Land Plateau Base',
    flag: '',
    isIndian: false,
    info: 'Jutulsessen nunatak observatory and intercontinental polar airfield link.',
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
      { lat: -65.40, lon: -54.10, date: '15 Sep', timeUtc: '00:00', speedKts: 1.1, uncertaintyRadiusKm: 2.0 },
      { lat: -64.90, lon: -54.80, date: '16 Sep', timeUtc: '06:00', speedKts: 1.2, uncertaintyRadiusKm: 2.5 },
      { lat: -64.35, lon: -55.50, date: '17 Sep', timeUtc: '12:00', speedKts: 1.3, uncertaintyRadiusKm: 3.0 },
      { lat: -63.85, lon: -56.20, date: '18 Sep', timeUtc: '14:30', speedKts: 1.4, uncertaintyRadiusKm: 3.5 },
    ],
    predictedTrack: [
      { lat: -63.85, lon: -56.20, date: '18 Sep', timeUtc: '14:30', speedKts: 1.4, uncertaintyRadiusKm: 3.5 },
      { lat: -63.30, lon: -57.10, date: '19 Sep', timeUtc: '12:00', speedKts: 1.4, uncertaintyRadiusKm: 7.0 },
      { lat: -62.80, lon: -58.20, date: '20 Sep', timeUtc: '12:00', speedKts: 1.5, uncertaintyRadiusKm: 12.0 },
      { lat: -62.35, lon: -59.50, date: '21 Sep', timeUtc: '14:00', speedKts: 1.6, uncertaintyRadiusKm: 18.0 }, // Potential encounter point!
      { lat: -61.80, lon: -61.00, date: '22 Sep', timeUtc: '12:00', speedKts: 1.5, uncertaintyRadiusKm: 26.0 },
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
      { lat: -67.20, lon: -49.50, date: '15 Sep', timeUtc: '00:00', speedKts: 0.8, uncertaintyRadiusKm: 2.0 },
      { lat: -66.65, lon: -50.15, date: '16 Sep', timeUtc: '12:00', speedKts: 0.8, uncertaintyRadiusKm: 3.0 },
      { lat: -66.10, lon: -50.80, date: '18 Sep', timeUtc: '14:30', speedKts: 0.9, uncertaintyRadiusKm: 4.0 },
    ],
    predictedTrack: [
      { lat: -66.10, lon: -50.80, date: '18 Sep', timeUtc: '14:30', speedKts: 0.9, uncertaintyRadiusKm: 4.0 },
      { lat: -65.40, lon: -51.60, date: '19 Sep', timeUtc: '12:00', speedKts: 0.9, uncertaintyRadiusKm: 8.0 },
      { lat: -64.70, lon: -52.40, date: '20 Sep', timeUtc: '12:00', speedKts: 1.0, uncertaintyRadiusKm: 14.0 },
      { lat: -64.00, lon: -53.20, date: '21 Sep', timeUtc: '12:00', speedKts: 1.0, uncertaintyRadiusKm: 20.0 },
      { lat: -63.20, lon: -54.00, date: '22 Sep', timeUtc: '12:00', speedKts: 1.1, uncertaintyRadiusKm: 28.0 },
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
    name: 'D28 (Amery Tabular Megaberg)',
    classification: 'Tabular Megaberg',
    currentPos: { lat: -68.35, lon: 72.80 }, // Outflow from Amery Ice Shelf drifting WNW across coastal shipping lane
    dimensionsKm: { length: 30, width: 14, heightAboveWaterM: 32 },
    areaSqKm: 420,
    driftSpeedKts: 1.4,
    driftDirectionDeg: 295,
    riskLevel: 'high',
    origin: 'Amery Ice Shelf (East Antarctica)',
    calveYear: 2019,
    imageUrl: '/src/assets/images/polar_vanguard_icebreaker_1790325622639.jpg',
    imageCaption: 'D28 tabular megaberg calved from Amery Ice Shelf drifting through East Antarctic coastal leads',
    observedTrack: [
      { lat: -68.85, lon: 74.50, date: '15 Sep', timeUtc: '00:00', speedKts: 1.1, uncertaintyRadiusKm: 2.0 },
      { lat: -68.70, lon: 73.90, date: '16 Sep', timeUtc: '06:00', speedKts: 1.2, uncertaintyRadiusKm: 2.5 },
      { lat: -68.50, lon: 73.30, date: '17 Sep', timeUtc: '12:00', speedKts: 1.3, uncertaintyRadiusKm: 3.0 },
      { lat: -68.35, lon: 72.80, date: '18 Sep', timeUtc: '14:30', speedKts: 1.4, uncertaintyRadiusKm: 3.5 },
    ],
    predictedTrack: [
      { lat: -68.35, lon: 72.80, date: '18 Sep', timeUtc: '14:30', speedKts: 1.4, uncertaintyRadiusKm: 3.5 },
      { lat: -68.15, lon: 72.00, date: '19 Sep', timeUtc: '12:00', speedKts: 1.4, uncertaintyRadiusKm: 7.0 },
      { lat: -67.95, lon: 71.10, date: '20 Sep', timeUtc: '12:00', speedKts: 1.5, uncertaintyRadiusKm: 12.0 },
      { lat: -67.75, lon: 70.20, date: '21 Sep', timeUtc: '14:00', speedKts: 1.6, uncertaintyRadiusKm: 18.0 }, // Conflict point on Route 1
      { lat: -67.50, lon: 69.10, date: '22 Sep', timeUtc: '12:00', speedKts: 1.5, uncertaintyRadiusKm: 26.0 },
    ],
    corridorPolygon: [
      { lat: -68.35, lon: 72.90 },
      { lat: -68.10, lon: 72.25 },
      { lat: -67.85, lon: 71.30 },
      { lat: -67.60, lon: 70.40 },
      { lat: -67.30, lon: 69.20 },
      { lat: -67.65, lon: 68.85 },
      { lat: -67.95, lon: 69.90 },
      { lat: -68.20, lon: 70.90 },
      { lat: -68.45, lon: 71.85 },
      { lat: -68.35, lon: 72.90 },
    ],
  },
];

// Initial planned route (Direct Inshore Fast-Ice Corridor: Bharati ➔ Maitri)
// Note: Intersects predicted D28 Megaberg trajectory on 21 Sep!
export const ROUTE_ORIGINAL: RouteOption = {
  id: 'route-original',
  name: 'Route 1 (Direct Inshore Track)',
  objective: 'shortest',
  distanceKm: 2850,
  timeHours: 124,
  fuelLiters: 14250,
  iceRisk: 'High',
  icebergRisk: 'High',
  recommendedFor: 'Time-critical emergency transit only',
  hasConflict: true,
  conflictAtKm: 340,
  waypoints: [
    { lat: -69.41, lon: 76.19 }, // Bharati Station (Larsemann Hills) Departure
    { lat: -68.85, lon: 74.20 }, // Current vessel position (Prydz Bay Exit)
    { lat: -68.40, lon: 72.50 }, // Inshore Amery Ice Shelf channel
    { lat: -67.75, lon: 70.20 }, // CONFLICT ZONE with D28 megaberg drift corridor!
    { lat: -67.50, lon: 58.00 }, // Enderby Land inshore fast-ice margin
    { lat: -67.90, lon: 42.00 }, // Cosmonaut Sea coastal margin
    { lat: -68.80, lon: 26.00 }, // Riiser-Larsen Sea approach
    { lat: -69.60, lon: 15.00 }, // Astrid Coast ice shelf approach
    { lat: -69.98, lon: 11.92 }, // India Bay Anchorage / Maitri Station Jetty
  ],
};

// Rerouted Safe Alternative (AI Optimized Offshore Leads Bypass)
export const ROUTE_REROUTED: RouteOption = {
  id: 'route-rerouted',
  name: 'Route 2 (Balanced / Offshore Leads Bypass)',
  objective: 'balanced',
  distanceKm: 2980,
  timeHours: 132,
  fuelLiters: 11650,
  iceRisk: 'Low',
  icebergRisk: 'Low',
  recommendedFor: 'Recommended for selected objective',
  hasConflict: false,
  waypoints: [
    { lat: -69.41, lon: 76.19 }, // Bharati Station
    { lat: -68.85, lon: 74.20 }, // Current vessel position
    { lat: -67.20, lon: 73.00 }, // Deflects north into open marginal leads away from Amery pack ice
    { lat: -66.50, lon: 69.80 }, // Safely clears D28 trajectory by >42 km
    { lat: -66.10, lon: 56.50 }, // Navigates low-drag open water leads north of Enderby Land
    { lat: -66.80, lon: 40.50 }, // Deep open leads through Cosmonaut Sea
    { lat: -67.90, lon: 25.00 }, // Clear of coastal grounded bergs
    { lat: -69.20, lon: 14.00 }, // Safe approach vector into Astrid Coast
    { lat: -69.98, lon: 11.92 }, // India Bay Anchorage / Maitri Station
  ],
};

// Route 3: Deep Southern Ocean Safety Track (Lowest ice/iceberg density, offshore arc)
export const ROUTE_MAX_SAFETY: RouteOption = {
  id: 'route-safety',
  name: 'Route 3 (Lowest Risk / Deep Ocean Offshore)',
  objective: 'safety',
  distanceKm: 3260,
  timeHours: 146,
  fuelLiters: 12900,
  iceRisk: 'Low',
  icebergRisk: 'Very Low',
  recommendedFor: 'Severe weather / low-visibility conditions',
  hasConflict: false,
  waypoints: [
    { lat: -69.41, lon: 76.19 },
    { lat: -68.85, lon: 74.20 },
    { lat: -65.50, lon: 72.00 }, // Wide northward arc into open Southern Ocean
    { lat: -64.80, lon: 60.00 }, // Clear of all marginal ice pack
    { lat: -65.20, lon: 45.00 }, // Deep ocean transit
    { lat: -66.00, lon: 30.00 }, // Open water corridor
    { lat: -67.50, lon: 16.00 }, // Gradual approach south
    { lat: -69.98, lon: 11.92 }, // India Bay / Maitri Station
  ],
};

export const INITIAL_ALERTS: NavigationAlert[] = [
  {
    id: 'alert-1',
    severity: 'high',
    title: 'Potential iceberg encounter',
    timestamp: '21 Sep • 14:00 UTC',
    description: 'Predicted trajectory for Megaberg D28 intersects planned Route 1 corridor. Closest point of approach: 4.8 km.',
    distanceKm: 4.8,
    resolved: false,
  },
  {
    id: 'alert-2',
    severity: 'warning',
    title: 'Sea-ice concentration increasing',
    timestamp: '22 Sep • 06:00 UTC',
    description: 'ConvLSTM forecast indicates pack ice convergence along coastal shelf (concentration > 70%).',
    resolved: false,
  },
  {
    id: 'alert-3',
    severity: 'info',
    title: 'New observation available',
    timestamp: '18 Sep • 13:45 UTC',
    description: 'Sentinel-1 SAR synthetic aperture radar swath assimilated into drift model.',
    resolved: false,
  },
];

export const TIMELINE_STEPS = [
  { index: 0, label: '18 Sep', fullDate: '18 Sep 2026', timeUtc: '14:30 UTC', description: 'Present Observation' },
  { index: 1, label: '19 Sep', fullDate: '19 Sep 2026', timeUtc: '12:00 UTC', description: '+22h Forecast Step' },
  { index: 2, label: '20 Sep', fullDate: '20 Sep 2026', timeUtc: '12:00 UTC', description: '+46h Forecast Step' },
  { index: 3, label: '21 Sep', fullDate: '21 Sep 2026', timeUtc: '14:00 UTC', description: '+72h Conflict Window' },
  { index: 4, label: '22 Sep', fullDate: '22 Sep 2026', timeUtc: '12:00 UTC', description: '+94h Arrival Horizon' },
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
