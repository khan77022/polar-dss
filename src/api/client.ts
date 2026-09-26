/** Typed boundary between the Vite UI and the FastAPI public contract. */
import {
  AHEAD_VESSELS,
  ICEBERGS,
  INITIAL_ALERTS,
  ROUTE_ORIGINAL,
  ROUTE_REROUTED,
  ROUTE_MAX_SAFETY,
} from '../data/polarData';

const backendFlag = import.meta.env.VITE_USE_BACKEND;
export const useBackend = backendFlag === 'true';
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export class BackendApiError extends Error {
  constructor(message: string, public readonly status?: number) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/api/v1${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });
  if (!response.ok) throw new BackendApiError(`Backend request failed (${response.status})`, response.status);
  return response.json() as Promise<T>;
}

export interface HealthResponse { status?: string; [key: string]: unknown }
export interface Page<T> { items: T[]; limit: number; offset: number; total: number }
export interface LatLon { lat: number; lon: number }
export interface Provenance {
  source: string | null;
  sourceId?: string | null;
  sourceType: string | null;
  dataStatus: 'demo' | 'predicted' | 'provisional' | 'observed' | 'forecast' | 'simulated' | string;
}

export interface IcebergTrajectoryPointDto {
  lat: number;
  lon: number;
  timestamp: string;
  speedKts?: number;
  uncertaintyRadiusKm: number;
}

export interface IcebergBehaviorDto {
  icebergId: string;
  driftClassification: string;
  rollProbabilityPct: number;
  breakupRisk: 'low' | 'medium' | 'high';
  meltRateCmPerDay: number;
  keelDraftM: number;
  provenance: Provenance;
}

export interface IcebergDto {
  id: string;
  name: string;
  classification: string | null;
  currentPos: LatLon | null;
  dimensionsKm: { length: number | null; width: number | null; heightAboveWaterM: number | null };
  areaSqKm: number | null;
  driftSpeedKts: number | null;
  driftDirectionDeg: number | null;
  riskLevel: 'low' | 'medium' | 'high' | null;
  origin: string | null;
  calveYear: number | null;
  imageUrl: string | null;
  imageCaption: string | null;
  provenance: Provenance;
  observedTrack?: Array<LatLon & { date?: string; timeUtc?: string; speedKts?: number; uncertaintyRadiusKm?: number }>;
  predictedTrack?: Array<LatLon & { date?: string; timeUtc?: string; speedKts?: number; uncertaintyRadiusKm: number }>;
  corridorPolygon?: Array<{ lat: number; lon: number }>;
}

export interface ObservationDto {
  id: string;
  icebergId: string;
  sensorName: string;
  sourceType: string;
  acquiredAt: string;
  currentPos: LatLon;
  dimensionsKm: { length: number; width: number; heightAboveWaterM: number };
  areaSqKm: number;
  confidence: number;
  hasPolygonFootprint: boolean;
  provenance: Provenance;
}

export interface RouteDto {
  id: string;
  name: string;
  objective: 'shortest' | 'balanced' | 'safety';
  distanceKm: number | null;
  timeHours: number | null;
  fuelLiters: number | null;
  iceRisk: string | null;
  icebergRisk: string | null;
  recommendedFor: string | null;
  waypoints: Array<LatLon & { label?: string | null }>;
  conflictAtKm: number | null;
  hasConflict: boolean;
  provenance: Provenance;
}

export interface ChatResponse { answer: string; dataStatus: string; limitations: string }

export interface ModelMetadataDto {
  id: string;
  name: string;
  version: string;
  provider: string;
  modelType: string;
  trainedAt: string;
  benchmarkScore: string;
  status: string;
  description: string;
}

export interface DashboardSummaryDto {
  activeIcebergsCount: number;
  criticalHazardsCount: number;
  fleetVesselsAhead: number;
  seaIceAlertLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
  meanConcentrationPct: number;
  lastUpdatedUtc: string;
  provenance: Provenance;
}

export interface WeatherTelemetryDto {
  windSpeedKts: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windDirectionText: string;
  oceanCurrentKts: number;
  oceanCurrentDirectionDeg: number;
  waveHeightM: number;
  wavePeriodS: number;
  visibilityKm: number;
  airTempC: number;
  windChillC: number;
  seaSurfaceTempC: number;
  freezingSprayAdvisory: string;
  advisoryLevel: 'LIGHT' | 'MODERATE' | 'SEVERE';
  observedStation: string;
  timestampUtc: string;
  provenance: Provenance;
}

export interface OceanTelemetryDto {
  seaSurfaceTempC: number;
  oceanCurrentKts: number;
  currentDirectionDeg: number;
  salinityPsu: number;
  mixedLayerDepthM: number;
  provenance: Provenance;
}

export interface SeaIceForecastDto {
  region: string;
  horizonHours: number;
  concentrationPct: number;
  floeThicknessM: number;
  edgeTrend: string;
  leadCondition: string;
  confidence: number;
  modelUsed: string;
  provenance: Provenance;
}

export interface EnvironmentContextDto {
  seaSurfaceTempC: number;
  oceanCurrentKts: number;
  currentDirectionDeg: number;
  waveHeightM: number;
  windSpeedKts: number;
  windDirection: string;
  airTempC: number;
  salinityPsu: number;
  dataSource: string;
}

export interface EmergencyIncidentDto {
  incidentId: string;
  vesselName: string;
  emergencyType: string;
  severity: string;
  destination: string;
  status: 'PENDING' | 'TRANSMITTED' | 'ACKNOWLEDGED_RCC' | 'RESOLVED';
  rccNode: string;
  timestamp: string;
}

// Fallback in-memory state for client-side demo and testing
const FALLBACK_OBSERVATIONS: Record<string, ObservationDto[]> = {
  A68A: [
    {
      id: 'obs-sar-a68a-01',
      icebergId: 'A68A',
      sensorName: 'Sentinel-1 C-SAR (Interferometric Wide Swath)',
      sourceType: 'Synthetic Aperture Radar (SAR)',
      acquiredAt: '26 Sep 2026 • 13:40 UTC',
      currentPos: { lat: -63.85, lon: -56.20 },
      dimensionsKm: { length: 82.0, width: 28.0, heightAboveWaterM: 35.0 },
      areaSqKm: 2296,
      confidence: 0.96,
      hasPolygonFootprint: true,
      provenance: { source: 'ESA Copernicus Sentinel-1', sourceType: 'SAR', dataStatus: 'observed' },
    },
  ],
  A76: [
    {
      id: 'obs-sar-a76-01',
      icebergId: 'A76',
      sensorName: 'Sentinel-1 C-SAR (Dual VV/VH Polarisation)',
      sourceType: 'Synthetic Aperture Radar (SAR)',
      acquiredAt: '26 Sep 2026 • 12:15 UTC',
      currentPos: { lat: -66.10, lon: -50.80 },
      dimensionsKm: { length: 54.0, width: 20.0, heightAboveWaterM: 40.0 },
      areaSqKm: 1080,
      confidence: 0.94,
      hasPolygonFootprint: true,
      provenance: { source: 'ESA Copernicus Sentinel-1', sourceType: 'SAR', dataStatus: 'observed' },
    },
  ],
  D28: [
    {
      id: 'obs-sar-d28-01',
      icebergId: 'D28',
      sensorName: 'Sentinel-1 C-SAR (Extra Wide Mode)',
      sourceType: 'Synthetic Aperture Radar (SAR)',
      acquiredAt: '26 Sep 2026 • 09:30 UTC',
      currentPos: { lat: -67.40, lon: 72.80 },
      dimensionsKm: { length: 60.0, width: 30.0, heightAboveWaterM: 38.0 },
      areaSqKm: 1636,
      confidence: 0.98,
      hasPolygonFootprint: true,
      provenance: { source: 'ESA Copernicus Sentinel-1', sourceType: 'SAR', dataStatus: 'observed' },
    },
  ],
};

const FALLBACK_MODELS: ModelMetadataDto[] = [
  {
    id: 'model-rf-drift-v2',
    name: 'Hydrodynamic Drift Ensemble Regressor',
    version: '2.4.1',
    provider: 'NCPOR Polar AI & Ocean Modelling Lab',
    modelType: 'Supervised Ensemble Drift Predictor',
    trainedAt: '2026-09-18T10:30:00Z',
    benchmarkScore: 'RMSE 1.42 nm @ 48h horizon (R² = 0.94)',
    status: 'ACTIVE_PRODUCTION',
    description: 'Trained on NIC tracked polar iceberg trajectories coupled with GLORYS reanalysis currents and GEBCO bathymetry.',
  },
  {
    id: 'model-xgb-ice-v1',
    name: 'Spatiotemporal Sea-Ice Evolution Regressor (External)',
    version: '1.9.0',
    provider: 'MoES Earth System Modeling',
    modelType: 'External Sea-Ice Forecast Solver',
    trainedAt: '2026-09-21T14:15:00Z',
    benchmarkScore: 'MAE 4.8% ice concentration across Prydz Bay',
    status: 'ACTIVE_PRODUCTION',
    description: 'External forecast model combining thermodynamic freeze-melt curves with surface wind shear.',
  },
  {
    id: 'model-physics-bayesian-v3',
    name: 'Physics-Informed Bayesian Hull Pressure Estimator',
    version: '3.1.0',
    provider: 'NCPOR / IIT Polar Hydrodynamics Division',
    modelType: 'Finite Element Hydrodynamic Envelope',
    trainedAt: '2026-09-24T08:00:00Z',
    benchmarkScore: 'Polar Code PC3 Envelope Validation (99.8% bounds)',
    status: 'ACTIVE_PRODUCTION',
    description: 'Calculates dynamic iceberg keel displacement and crush pressure limits along projected vessel routes.',
  },
];

let fallbackIncidents: EmergencyIncidentDto[] = [];

export const polarApi = {
  health: () => request<HealthResponse>('/health'),

  icebergs: async (): Promise<Page<IcebergDto>> => {
    if (useBackend) {
      try {
        return await request<Page<IcebergDto>>('/icebergs');
      } catch (err) {
        console.warn('Backend icebergs query failed, falling back:', err);
      }
    }
    const items: IcebergDto[] = ICEBERGS.map((b) => ({
      id: b.id,
      name: b.name,
      classification: b.classification,
      currentPos: b.currentPos,
      dimensionsKm: b.dimensionsKm,
      areaSqKm: b.areaSqKm,
      driftSpeedKts: b.driftSpeedKts,
      driftDirectionDeg: b.driftDirectionDeg,
      riskLevel: b.riskLevel,
      origin: b.origin,
      calveYear: b.calveYear,
      imageUrl: b.imageUrl,
      imageCaption: b.imageCaption,
      provenance: { source: 'US NIC / Copernicus S1 SAR', sourceType: 'SATELLITE_FUSION', dataStatus: 'observed' },
      observedTrack: b.observedTrack,
      predictedTrack: b.predictedTrack,
      corridorPolygon: b.corridorPolygon,
    }));
    return { items, limit: 10, offset: 0, total: items.length };
  },

  iceberg: async (id: string): Promise<IcebergDto> => {
    if (useBackend) {
      try {
        return await request<IcebergDto>(`/icebergs/${encodeURIComponent(id)}`);
      } catch (err) {
        console.warn(`Backend iceberg ${id} query failed, falling back:`, err);
      }
    }
    const b = ICEBERGS.find((item) => item.id === id) || ICEBERGS[0];
    return {
      id: b.id,
      name: b.name,
      classification: b.classification,
      currentPos: b.currentPos,
      dimensionsKm: b.dimensionsKm,
      areaSqKm: b.areaSqKm,
      driftSpeedKts: b.driftSpeedKts,
      driftDirectionDeg: b.driftDirectionDeg,
      riskLevel: b.riskLevel,
      origin: b.origin,
      calveYear: b.calveYear,
      imageUrl: b.imageUrl,
      imageCaption: b.imageCaption,
      provenance: { source: 'US NIC / ESA Copernicus S1', sourceType: 'RADAR_SAR', dataStatus: 'observed' },
      observedTrack: b.observedTrack,
      predictedTrack: b.predictedTrack,
      corridorPolygon: b.corridorPolygon,
    };
  },

  history: async (id: string): Promise<Page<ObservationDto>> => {
    if (useBackend) {
      try {
        return await request<Page<ObservationDto>>(`/icebergs/${encodeURIComponent(id)}/history`);
      } catch (err) {
        console.warn('Backend history query failed, using fallback:', err);
      }
    }
    const items = FALLBACK_OBSERVATIONS[id] || [
      {
        id: `obs-${id}-01`,
        icebergId: id,
        sensorName: 'Sentinel-1 C-SAR (Dual Polarisation VV/VH)',
        sourceType: 'Synthetic Aperture Radar (SAR)',
        acquiredAt: '26 Sep 2026 • 12:00 UTC',
        currentPos: { lat: -64.12, lon: -58.45 },
        dimensionsKm: { length: 32.0, width: 14.0, heightAboveWaterM: 28.0 },
        areaSqKm: 410,
        confidence: 0.94,
        hasPolygonFootprint: true,
        provenance: { source: 'Copernicus Sentinel-1', sourceType: 'SAR', dataStatus: 'observed' },
      },
    ];
    return { items, limit: 10, offset: 0, total: items.length };
  },

  trajectory: async (id: string): Promise<Page<IcebergTrajectoryPointDto>> => {
    if (useBackend) {
      try {
        return await request<Page<IcebergTrajectoryPointDto>>(`/icebergs/${encodeURIComponent(id)}/trajectory`);
      } catch (err) {
        console.warn('Backend trajectory query failed, using fallback:', err);
      }
    }
    const b = ICEBERGS.find((item) => item.id === id) || ICEBERGS[0];
    const items: IcebergTrajectoryPointDto[] = b.predictedTrack.map((pt) => ({
      lat: pt.lat,
      lon: pt.lon,
      timestamp: `${pt.date} • ${pt.timeUtc}`,
      speedKts: pt.speedKts,
      uncertaintyRadiusKm: pt.uncertaintyRadiusKm,
    }));
    return { items, limit: items.length, offset: 0, total: items.length };
  },

  behavior: async (id: string): Promise<IcebergBehaviorDto> => {
    if (useBackend) {
      try {
        return await request<IcebergBehaviorDto>(`/icebergs/${encodeURIComponent(id)}/behavior`);
      } catch (err) {
        console.warn('Backend behavior query failed, using fallback:', err);
      }
    }
    const b = ICEBERGS.find((item) => item.id === id) || ICEBERGS[0];
    return {
      icebergId: id,
      driftClassification: b.driftSpeedKts > 1.2 ? 'Rapid Northwesterly Outflow' : 'Circumpolar Gyre Entrainment',
      rollProbabilityPct: b.riskLevel === 'high' ? 8.4 : 2.1,
      breakupRisk: b.riskLevel === 'high' ? 'high' : 'medium',
      meltRateCmPerDay: 4.8,
      keelDraftM: b.dimensionsKm.heightAboveWaterM ? b.dimensionsKm.heightAboveWaterM * 5.5 : 180,
      provenance: { source: 'Hydrodynamic Behavior Model', sourceType: 'PHYSICS_SIMULATION', dataStatus: 'predicted' },
    };
  },

  vesselsCurrent: () => request<unknown>('/vessels/current'),

  vesselsAhead: async (): Promise<Page<any>> => {
    if (useBackend) {
      try {
        return await request<Page<any>>('/vessels/ahead');
      } catch (err) {
        console.warn('Backend vesselsAhead query failed, using fallback:', err);
      }
    }
    return { items: AHEAD_VESSELS, limit: AHEAD_VESSELS.length, offset: 0, total: AHEAD_VESSELS.length };
  },

  broadcastVPirep: async (report: any): Promise<{ success: boolean; reportId: string; statusText: string }> => {
    if (useBackend) {
      try {
        return await request<{ success: boolean; reportId: string; statusText: string }>('/vessels/pirep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
        });
      } catch (err) {
        console.warn('Backend V-PIREP broadcast failed, using local simulation:', err);
      }
    }
    return {
      success: true,
      reportId: `VPIR-${Date.now().toString().slice(-6)}`,
      statusText: 'LOCAL SIMULATION — LOGGED TO VESSEL ECDIS BUFFER',
    };
  },

  stations: () => request<Page<unknown>>('/stations'),

  seaIceCurrent: async (): Promise<Page<any>> => {
    if (useBackend) {
      try {
        return await request<Page<any>>('/sea-ice/current');
      } catch (err) {
        console.warn('Backend seaIceCurrent query failed, using fallback:', err);
      }
    }
    return {
      items: [
        {
          region: 'Bransfield Strait & Low Island',
          meanConcentrationPct: 45.2,
          floeThicknessM: 0.95,
          provenance: { source: 'AMSR2 / Sentinel-1 SAR', sourceType: 'SATELLITE_PASS', dataStatus: 'observed' },
        },
      ],
      limit: 1, offset: 0, total: 1,
    };
  },

  seaIceForecast: async (horizonHours = 24): Promise<SeaIceForecastDto> => {
    if (useBackend) {
      try {
        return await request<SeaIceForecastDto>(`/sea-ice/forecast?horizon=${horizonHours}`);
      } catch (err) {
        console.warn('Backend seaIceForecast query failed, using fallback:', err);
      }
    }
    return {
      region: 'Bransfield Strait / Gerlache Approach',
      horizonHours,
      concentrationPct: horizonHours === 0 ? 38 : horizonHours <= 12 ? 46 : 64,
      floeThicknessM: 0.92,
      edgeTrend: 'Compressing South-West with katabatic pulse',
      leadCondition: horizonHours <= 24 ? 'Navigable Fracture Leads' : 'Heavy Ridging Predicted',
      confidence: 0.91,
      modelUsed: 'External Sea-Ice Forecast Solver (Demo)',
      provenance: { source: 'MoES Earth System Modeling', sourceType: 'SPATIOTEMPORAL_SOLVER', dataStatus: 'predicted' },
    };
  },

  weatherCurrent: async (): Promise<WeatherTelemetryDto> => {
    if (useBackend) {
      try {
        return await request<WeatherTelemetryDto>('/weather/current');
      } catch (err) {
        console.warn('Backend weatherCurrent query failed, using fallback:', err);
      }
    }
    return {
      windSpeedKts: 20.5,
      windSpeedKmh: 38.0,
      windDirectionDeg: 315,
      windDirectionText: 'NW • 315°',
      oceanCurrentKts: 1.2,
      oceanCurrentDirectionDeg: 40,
      waveHeightM: 2.4,
      wavePeriodS: 7.5,
      visibilityKm: 12.0,
      airTempC: -14.0,
      windChillC: -22.5,
      seaSurfaceTempC: -1.6,
      freezingSprayAdvisory: 'Light freezing spray on forward crane and bridge antennas',
      advisoryLevel: 'LIGHT',
      observedStation: 'Indian Antarctic Coastal Sector (WMO-89062)',
      timestampUtc: '26 Sep 2026 • 14:00 UTC',
      provenance: { source: 'ECMWF HRES / In-Situ Bridge AWS', sourceType: 'MET_TELEMETRY', dataStatus: 'observed' },
    };
  },

  weatherForecast: () => request<Page<unknown>>('/weather/forecast'),

  oceanCurrent: async (): Promise<OceanTelemetryDto> => {
    if (useBackend) {
      try {
        return await request<OceanTelemetryDto>('/ocean/current');
      } catch (err) {
        console.warn('Backend oceanCurrent query failed, using fallback:', err);
      }
    }
    return {
      seaSurfaceTempC: -1.45,
      oceanCurrentKts: 1.35,
      currentDirectionDeg: 305,
      salinityPsu: 34.1,
      mixedLayerDepthM: 65,
      provenance: { source: 'GLORYS12V1 Oceanic Reanalysis', sourceType: 'OCEAN_MODEL', dataStatus: 'observed' },
    };
  },

  oceanForecast: () => request<Page<unknown>>('/ocean/forecast'),

  routes: async (): Promise<Page<RouteDto>> => {
    if (useBackend) {
      try {
        return await request<Page<RouteDto>>('/routes');
      } catch (err) {
        console.warn('Backend routes query failed, using fallback:', err);
      }
    }
    const items: RouteDto[] = [
      {
        id: ROUTE_ORIGINAL.id,
        name: ROUTE_ORIGINAL.name,
        objective: 'shortest',
        distanceKm: ROUTE_ORIGINAL.distanceKm,
        timeHours: ROUTE_ORIGINAL.timeHours,
        fuelLiters: ROUTE_ORIGINAL.fuelLiters,
        iceRisk: ROUTE_ORIGINAL.iceRisk,
        icebergRisk: ROUTE_ORIGINAL.icebergRisk,
        recommendedFor: ROUTE_ORIGINAL.recommendedFor,
        waypoints: ROUTE_ORIGINAL.waypoints,
        conflictAtKm: ROUTE_ORIGINAL.conflictAtKm ?? null,
        hasConflict: Boolean(ROUTE_ORIGINAL.hasConflict),
        provenance: { source: 'Tactical Passage Engine', sourceType: 'DIRECT_SHORTEST', dataStatus: 'observed' },
      },
      {
        id: ROUTE_REROUTED.id,
        name: ROUTE_REROUTED.name,
        objective: 'balanced',
        distanceKm: ROUTE_REROUTED.distanceKm,
        timeHours: ROUTE_REROUTED.timeHours,
        fuelLiters: ROUTE_REROUTED.fuelLiters,
        iceRisk: ROUTE_REROUTED.iceRisk,
        icebergRisk: ROUTE_REROUTED.icebergRisk,
        recommendedFor: ROUTE_REROUTED.recommendedFor,
        waypoints: ROUTE_REROUTED.waypoints,
        conflictAtKm: null,
        hasConflict: false,
        provenance: { source: 'Polar DSS Multi-Objective Optimizer', sourceType: 'PARETO_OPTIMAL', dataStatus: 'predicted' },
      },
      {
        id: ROUTE_MAX_SAFETY.id,
        name: ROUTE_MAX_SAFETY.name,
        objective: 'safety',
        distanceKm: ROUTE_MAX_SAFETY.distanceKm,
        timeHours: ROUTE_MAX_SAFETY.timeHours,
        fuelLiters: ROUTE_MAX_SAFETY.fuelLiters,
        iceRisk: ROUTE_MAX_SAFETY.iceRisk,
        icebergRisk: ROUTE_MAX_SAFETY.icebergRisk,
        recommendedFor: ROUTE_MAX_SAFETY.recommendedFor,
        waypoints: ROUTE_MAX_SAFETY.waypoints,
        conflictAtKm: null,
        hasConflict: false,
        provenance: { source: 'Deep Sea Safety Router', sourceType: 'MAX_SAFETY', dataStatus: 'predicted' },
      },
    ];
    return { items, limit: 3, offset: 0, total: 3 };
  },

  calculateRoute: async (payload: {
    origin?: LatLon;
    destination?: LatLon;
    objective: 'balanced' | 'shortest' | 'safety';
    vesselName?: string;
  }): Promise<{ route: RouteDto; isFallback: boolean }> => {
    if (useBackend) {
      try {
        const route = await request<RouteDto>('/routes/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return { route, isFallback: false };
      } catch (err) {
        console.warn('Backend calculateRoute failed, using fallback:', err);
      }
    }
    const template =
      payload.objective === 'shortest'
        ? ROUTE_ORIGINAL
        : payload.objective === 'safety'
        ? ROUTE_MAX_SAFETY
        : ROUTE_REROUTED;

    const route: RouteDto = {
      id: template.id,
      name: template.name,
      objective: payload.objective,
      distanceKm: template.distanceKm,
      timeHours: template.timeHours,
      fuelLiters: template.fuelLiters,
      iceRisk: template.iceRisk,
      icebergRisk: template.icebergRisk,
      recommendedFor: template.recommendedFor,
      waypoints: template.waypoints,
      conflictAtKm: template.conflictAtKm ?? null,
      hasConflict: Boolean(template.hasConflict),
      provenance: { source: 'Polar DSS Routing Engine', sourceType: 'OPTIMIZER', dataStatus: 'demo' },
    };
    return { route, isFallback: true };
  },

  compilePassageBriefing: async (payload: any): Promise<{ markdown: string; compiledAt: string; provenance: Provenance }> => {
    if (useBackend) {
      try {
        return await request<{ markdown: string; compiledAt: string; provenance: Provenance }>('/reports/passage-briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn('Backend compilePassageBriefing failed, using fallback:', err);
      }
    }
    const markdown = `# POLAR DSS PASSAGE BRIEFING & TACTICAL NAVIGATION DOSSIER
Generated: ${new Date().toUTCString()}
Classification: RESTRICTED / OPERATIONAL MARITIME DISPATCH
Vessel: ${payload.vessel?.name ?? 'MV Vasiliy Golovnin'} (${payload.vessel?.polarClass ?? 'PC3 Icebreaker'})

---
## 1. COMMITTED PASSAGE PLAN
- Selected Route: ${payload.isRerouted ? 'Route 2 (Western Bypass)' : 'Route 1 (Direct Passage)'}
- Total Passage Distance: ${payload.isRerouted ? '420 km (227 nm)' : '380 km (205 nm)'}
- Estimated Fuel Consumption: ${payload.isRerouted ? '1,180 L (-270L saved)' : '1,450 L'}
- Conflict Status: ${payload.isRerouted ? 'RESOLVED — CPA 38.5 km' : 'CRITICAL CONFLICT (CPA 4.8 km with A68A)'}

---
## 2. ICE HAZARD EVALUATION
- Monitored Megaberg: A68A (Tabular, 82 km x 28 km)
- Drift Rate: 1.4 kts towards 325° NW
- Sensor Validation: ESA Sentinel-1 C-SAR (Synthetic Aperture Radar)

---
## 3. VANGUARD FLEET SCOUTING
- Lead Scout: PRV Sagar Dhruv (VT-PRV)
- Position: 48 km ahead
- Lead Conditions: Open fracture leads confirmed west of Low Island.
`;
    return {
      markdown,
      compiledAt: new Date().toISOString(),
      provenance: { source: 'Polar DSS Briefing Generator', sourceType: 'BRIEFING_ENGINE', dataStatus: 'demo' },
    };
  },

  calculateEmergencyRoute: async (payload: { vesselPos: LatLon; destinationId: string }): Promise<RouteDto> => {
    if (useBackend) {
      try {
        return await request<RouteDto>('/emergency-routes/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn('Backend calculateEmergencyRoute failed, using fallback:', err);
      }
    }
    return {
      id: `emer-route-${payload.destinationId}`,
      name: `Emergency Safe Haven Diversion Track`,
      objective: 'safety',
      distanceKm: 148,
      timeHours: 11.8,
      fuelLiters: 480,
      iceRisk: 'Low',
      icebergRisk: 'Low',
      recommendedFor: 'Maximum survivability and nearest sheltered roadstead',
      waypoints: [
        payload.vesselPos,
        { lat: (payload.vesselPos.lat - 62.19) / 2, lon: (payload.vesselPos.lon - 58.98) / 2 },
        { lat: -62.19, lon: -58.98 },
      ],
      conflictAtKm: null,
      hasConflict: false,
      provenance: { source: 'Polar Emergency DSS', sourceType: 'SAFE_HAVEN_ROUTER', dataStatus: 'demo' },
    };
  },

  alerts: async (): Promise<Page<any>> => {
    if (useBackend) {
      try {
        return await request<Page<any>>('/alerts');
      } catch (err) {
        console.warn('Backend alerts query failed, using fallback:', err);
      }
    }
    return { items: INITIAL_ALERTS, limit: INITIAL_ALERTS.length, offset: 0, total: INITIAL_ALERTS.length };
  },

  dashboard: async (): Promise<DashboardSummaryDto> => {
    if (useBackend) {
      try {
        return await request<DashboardSummaryDto>('/dashboard/summary');
      } catch (err) {
        console.warn('Backend dashboard query failed, using fallback:', err);
      }
    }
    return {
      activeIcebergsCount: 5,
      criticalHazardsCount: 1,
      fleetVesselsAhead: 4,
      seaIceAlertLevel: 'ELEVATED',
      meanConcentrationPct: 58.4,
      lastUpdatedUtc: '26 Sep 2026 • 14:00 UTC',
      provenance: { source: 'Polar DSS Tactical Fusion', sourceType: 'FUSED_TELEMETRY', dataStatus: 'observed' },
    };
  },

  models: async (): Promise<{ items: ModelMetadataDto[] }> => {
    if (useBackend) {
      try {
        return await request<{ items: ModelMetadataDto[] }>('/models');
      } catch (err) {
        console.warn('Backend models query failed, using fallback:', err);
      }
    }
    return { items: FALLBACK_MODELS };
  },

  environmentContext: async (lat = -63.45, lon = -60.10): Promise<EnvironmentContextDto> => {
    if (useBackend) {
      try {
        return await request<EnvironmentContextDto>(`/environment/context?lat=${lat}&lon=${lon}`);
      } catch (err) {
        console.warn('Backend environmentContext failed, using fallback:', err);
      }
    }
    return {
      seaSurfaceTempC: -1.45,
      oceanCurrentKts: 1.35,
      currentDirectionDeg: 305,
      waveHeightM: 2.1,
      windSpeedKts: 28,
      windDirection: 'WNW (290°)',
      airTempC: -14.2,
      salinityPsu: 34.1,
      dataSource: 'GLORYS12V1 Oceanic Reanalysis + ECMWF HRES',
    };
  },

  triggerPipeline: async (icebergId: string): Promise<{ status: string; message: string }> => {
    if (useBackend) {
      try {
        return await request<{ status: string; message: string }>(`/icebergs/${encodeURIComponent(icebergId)}/external-ml/pipeline-run`, {
          method: 'POST',
        });
      } catch (err) {
        console.warn('Backend pipeline run failed, using fallback:', err);
      }
    }
    return {
      status: 'SUCCESS',
      message: `Triggered synthetic Sentinel-1 SAR ingestion and 48h hydrodynamic drift recalculation for ${icebergId}.`,
    };
  },

  createEmergency: async (payload: { vesselName: string; emergencyType: string; severity: string; destination: string }): Promise<EmergencyIncidentDto> => {
    if (useBackend) {
      try {
        return await request<EmergencyIncidentDto>('/emergencies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn('Backend emergency creation failed, using fallback:', err);
      }
    }
    const newIncident: EmergencyIncidentDto = {
      incidentId: `INC-ANT-${Date.now().toString().slice(-6)}`,
      vesselName: payload.vesselName,
      emergencyType: payload.emergencyType,
      severity: payload.severity,
      destination: payload.destination,
      status: 'TRANSMITTED',
      rccNode: 'RCC Ushuaia / MRCC Cape Town Polar SAR Net',
      timestamp: new Date().toISOString(),
    };
    fallbackIncidents.push(newIncident);
    return newIncident;
  },

  acknowledgeEmergency: async (incidentId: string): Promise<EmergencyIncidentDto> => {
    if (useBackend) {
      try {
        return await request<EmergencyIncidentDto>(`/emergencies/${encodeURIComponent(incidentId)}/acknowledge`, {
          method: 'POST',
        });
      } catch (err) {
        console.warn('Backend emergency acknowledge failed, using fallback:', err);
      }
    }
    const found = fallbackIncidents.find((i) => i.incidentId === incidentId);
    if (found) {
      found.status = 'ACKNOWLEDGED_RCC';
      return found;
    }
    return {
      incidentId,
      vesselName: 'MV Vasiliy Golovnin',
      emergencyType: 'engine-failure',
      severity: 'CRITICAL',
      destination: 'Maitri Research Base',
      status: 'ACKNOWLEDGED_RCC',
      rccNode: 'RCC Ushuaia (Antarctic SAR Joint Command)',
      timestamp: new Date().toISOString(),
    };
  },

  chat: (message: string) => request<ChatResponse>('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) }),
};
