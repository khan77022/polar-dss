export type NavPage =
  | 'cockpit'
  | 'dashboard'
  | 'sea-ice'
  | 'iceberg-tracking'
  | 'route-planning'
  | 'weather'
  | 'fleet-recon'
  | 'reports'
  | 'model-performance';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface LatLon {
  lat: number;
  lon: number;
}

export interface AheadVesselReport {
  id: string;
  vesselName: string;
  callSign: string;
  flag: string;
  nation: string;
  role: string;
  polarClass: string;
  currentPos: LatLon;
  distanceAheadKm: number;
  bearingDeg: number;
  speedKts: number;
  headingDeg: number;
  lastReportTime: string;
  observedSeaIceConcentration: number; // percentage
  floeThicknessM: number;
  leadCondition: 'Clear Open Leads' | 'Navigable Fractures' | 'Heavy Pressure Ridges' | 'Open Water Passage';
  icebergSightings: {
    count: number;
    details: string;
    nearestKm: number;
  };
  weather: {
    airTempC: number;
    windSpeedKts: number;
    windDirection: string;
    swellHeightM: number;
    visibilityKm: number;
    freezingSpray: 'None' | 'Light' | 'Moderate' | 'Severe';
  };
  vPirepNotes: string;
  photoUrl: string;
  radarEchoStatus: 'Clear' | 'Scattered Growlers' | 'Severe Clutter';
  isIndian: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: string;
  text: string;
  actionTag?: 'reroute' | 'recon' | 'weather' | 'convlstm';
  actionLabel?: string;
}

export interface IcebergTrajectoryPoint extends LatLon {
  date: string;
  timeUtc: string;
  speedKts: number;
  uncertaintyRadiusKm: number;
}

export interface Iceberg {
  id: string;
  name: string;
  classification: string;
  currentPos: LatLon;
  dimensionsKm: { length: number; width: number; heightAboveWaterM: number };
  areaSqKm: number;
  driftSpeedKts: number;
  driftDirectionDeg: number;
  riskLevel: RiskLevel;
  origin: string;
  calveYear: number;
  observedTrack: IcebergTrajectoryPoint[];
  predictedTrack: IcebergTrajectoryPoint[];
  corridorPolygon: LatLon[];
  imageUrl: string;
  imageCaption: string;
}

export interface Vessel {
  name: string;
  callSign: string;
  polarClass: string;
  lengthM: number;
  beamM: number;
  currentPos: LatLon;
  speedKts: number;
  headingDeg: number;
  fuelRateLPerHour: number;
  startPort: string;
  destination: string;
  departureDate: string;
  eta: string;
}

export interface RouteOption {
  id: string;
  name: string;
  objective: 'shortest' | 'balanced' | 'safety';
  distanceKm: number;
  timeHours: number;
  fuelLiters: number;
  iceRisk: 'High' | 'Medium' | 'Low' | 'Very Low';
  icebergRisk: 'High' | 'Medium' | 'Low' | 'Very Low';
  recommendedFor: string;
  waypoints: LatLon[];
  conflictAtKm?: number;
  hasConflict?: boolean;
}

export interface NavigationAlert {
  id: string;
  severity: 'high' | 'warning' | 'info';
  title: string;
  timestamp: string;
  description: string;
  distanceKm?: number;
  resolved?: boolean;
}

export interface TimelineState {
  stepIndex: number; // 0: 18 Sep, 1: 19 Sep, 2: 20 Sep, 3: 21 Sep, 4: 22 Sep
  dateString: string;
  timeUtc: string;
}

export interface SeaIceGridPoint extends LatLon {
  concentrationPercent: number; // 0 - 100
  iceThicknessM: number;
}

export type MapSector = 'peninsula' | 'indian-sector' | 'all-antarctica';

export interface UserSession {
  id: string;
  name: string;
  role: string;
  organization: string;
  email: string;
  vesselName: string;
  expedition: string;
  badge: string;
  avatarInitials: string;
}
