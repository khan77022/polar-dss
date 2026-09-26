/** Typed boundary between the Vite UI and the FastAPI public contract. */
const backendFlag = import.meta.env.VITE_USE_BACKEND;
export const useBackend = backendFlag === undefined ? true : backendFlag === 'true';
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '');

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

// ─── Shared primitives ────────────────────────────────────────────────────────
export interface HealthResponse { status?: string; [key: string]: unknown }
export interface Page<T> { items: T[]; limit: number; offset: number; total: number }
export interface LatLon { lat: number; lon: number }
export interface Provenance {
  source: string | null;
  sourceId?: string | null;
  sourceType: string | null;
  dataStatus: 'demo' | 'predicted' | 'provisional' | 'observed' | 'forecast' | 'simulated' | string;
}

// ─── Icebergs ─────────────────────────────────────────────────────────────────
export interface IcebergDto {
  id: string; name: string; classification: string | null; currentPos: LatLon | null;
  dimensionsKm: { length: number | null; width: number | null; heightAboveWaterM: number | null };
  areaSqKm: number | null; driftSpeedKts: number | null; driftDirectionDeg: number | null;
  riskLevel: 'low' | 'medium' | 'high' | null; origin: string | null; calveYear: number | null;
  imageUrl: string | null; imageCaption: string | null; provenance: Provenance;
}

export interface TrajectoryPointDto {
  lat: number; lon: number;
  referenceTime?: string | null;
  uncertaintyRadiusKm?: number | null;
  dataStatus?: string;
}

export interface TrajectoryDto {
  id: string;
  icebergId: string;
  trajectoryType: 'observed' | 'predicted' | 'simulated' | string;
  referenceTime?: string | null;
  forecastHorizonHours?: number | null;
  points: TrajectoryPointDto[];
  provenance: Provenance;
}

export interface BehaviorDto {
  icebergId: string;
  profileVersion: string;
  method: string;
  behaviorClass: string;
  features: Array<{ name: string; availability: string; note?: string | null }>;
  limitations: string;
  provenance: Provenance;
}

export interface ObservationDto {
  id: string;
  icebergId?: string | null;
  observedAt: string;
  position?: LatLon | null;
  centroid?: LatLon | null;
  lengthKm?: number | null;
  widthKm?: number | null;
  areaSqKm?: number | null;
  orientationDeg?: number | null;
  speedKts?: number | null;
  directionDeg?: number | null;
  observationType: string;
  provenance: Provenance;
  hasFootprint: boolean;
}

// ─── Routes ───────────────────────────────────────────────────────────────────
export interface RouteDto {
  id: string; name: string; objective: 'shortest' | 'balanced' | 'safety'; distanceKm: number | null;
  timeHours: number | null; fuelLiters: number | null; iceRisk: string | null; icebergRisk: string | null;
  recommendedFor: string | null; waypoints: Array<LatLon & { label?: string | null }>;
  conflictAtKm: number | null; hasConflict: boolean; provenance: Provenance;
}

export interface RouteCalculateRequest {
  origin: LatLon;
  destination: LatLon;
  objective: 'shortest' | 'balanced' | 'safety';
}

// ─── Weather & Ocean ──────────────────────────────────────────────────────────
export interface WeatherRecordDto {
  id: string;
  recordType: string;
  validAt: string | null;
  position: LatLon;
  values: {
    air_temperature_c?: number | null;
    wind_speed_kts?: number | null;
    wind_direction_deg?: number | null;
    pressure_hpa?: number | null;
    visibility_km?: number | null;
    wave_height_m?: number | null;
    wave_period_s?: number | null;
    freezing_spray_risk?: string | null;
  };
  provenance: Provenance;
}

export interface OceanRecordDto {
  id: string;
  recordType: string;
  validAt: string | null;
  position: LatLon;
  values: {
    current_speed_kts?: number | null;
    current_direction_deg?: number | null;
    sea_surface_temp_c?: number | null;
    salinity_psu?: number | null;
  };
  provenance: Provenance;
}

// ─── Sea Ice ──────────────────────────────────────────────────────────────────
export interface SeaIceRecordDto {
  id: string;
  regionId: string | null;
  recordType: string;
  validAt: string | null;
  concentrationPercent: number | null;
  thicknessM: number | null;
  provenance: Provenance;
}

// ─── Vessels ──────────────────────────────────────────────────────────────────
export interface VesselDto {
  id: string;
  name: string;
  callSign: string | null;
  polarClass: string | null;
  role: string | null;
  currentPos: LatLon;
  speedKts: number | null;
  headingDeg: number | null;
  destination: string | null;
  aheadReport?: Record<string, unknown> | null;
  provenance: Provenance;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export interface AlertDto {
  id: string;
  category: string;
  severity: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  provenance: Provenance;
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export interface ReportDto {
  id: string;
  reportType: string;
  title: string;
  sections: Record<string, unknown>;
  limitations: string;
  createdAt: string;
  provenance: Provenance;
}

export interface ReportRequest {
  routeId?: string | null;
  vesselId?: string | null;
}

// ─── Models ───────────────────────────────────────────────────────────────────
export interface ModelMetaDto {
  id: string;
  modelName: string;
  modelVersion: string;
  interfaceType: string;
  inputContract: Record<string, unknown>;
  outputContract: Record<string, unknown>;
  limitations: string;
  provenance: Record<string, unknown>;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatResponse { answer: string; dataStatus: string; limitations: string }

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardDto {
  availability: Array<{ domain: string; count: number; statuses: Record<string, number> }>;
  activeAlerts: number;
  provenanceNote: string;
}

// ─── Emergency ────────────────────────────────────────────────────────────────
export interface EmergencyIncidentDto {
  id: string;
  incidentType: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  reportedAt: string;
  location: LatLon | null;
  peopleAffected: number | null;
  provenance: { source: string; sourceType: string; dataStatus: string };
}

export interface EmergencyCreateRequest {
  incidentType: string;
  severity: string;
  title: string;
  description: string;
  location: LatLon;
  peopleAffected?: number;
}

// ─── External ML ingestion contracts ────────────────────────────────────────
export interface ExternalProvenance {
  source: string;
  sourceRecordId: string;
  sourceProductId: string;
  sourceType?: string;
  processingVersion?: string | null;
}

export interface TrajectoryPredictionInput {
  modelName: string;
  modelVersion: string;
  generatedAt: string;
  validFrom: string;
  validTo: string;
  points: Array<{ timestamp: string; position: { lat: number; lon: number }; uncertaintyRadiusKm?: number }>;
  limitations: string;
  provenance: ExternalProvenance;
  dataStatus?: string;
  confidence?: number | null;
}

// ─── API surface ──────────────────────────────────────────────────────────────
export const polarApi = {
  // Health
  health: () => request<HealthResponse>('/health'),

  // Icebergs
  icebergs: () => request<Page<IcebergDto>>('/icebergs'),
  iceberg: (id: string) => request<IcebergDto>(`/icebergs/${encodeURIComponent(id)}`),
  history: (id: string) => request<Page<ObservationDto>>(`/icebergs/${encodeURIComponent(id)}/history`),
  trajectory: (id: string) => request<Page<TrajectoryDto>>(`/icebergs/${encodeURIComponent(id)}/trajectory`),
  behavior: (id: string) => request<BehaviorDto>(`/icebergs/${encodeURIComponent(id)}/behavior`),

  // External ML ingestion
  pushTrajectory: (id: string, payload: TrajectoryPredictionInput) =>
    request<{ id: string; ingestionRunId: string; dataStatus: string; limitations: string }>(
      `/icebergs/${encodeURIComponent(id)}/external-ml/trajectory`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    ),
  pushBehavior: (id: string, payload: unknown) =>
    request<{ id: string; ingestionRunId: string; dataStatus: string; limitations: string }>(
      `/icebergs/${encodeURIComponent(id)}/external-ml/behavior`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    ),

  // Unified environment context
  environmentContext: (params: { latitude: number; longitude: number; timestamp?: string }) =>
    request<unknown>(`/environment/context?latitude=${params.latitude}&longitude=${params.longitude}${params.timestamp ? `&timestamp=${encodeURIComponent(params.timestamp)}` : ''}`),

  // Vessels
  vesselsCurrent: () => request<VesselDto>('/vessels/current'),
  vesselsAhead: () => request<Page<VesselDto>>('/vessels/ahead'),

  // Stations
  stations: () => request<Page<unknown>>('/stations'),

  // Sea-ice
  seaIceCurrent: () => request<Page<SeaIceRecordDto>>('/sea-ice/current'),
  seaIceForecast: () => request<Page<SeaIceRecordDto>>('/sea-ice/forecast'),
  seaIceRegions: () => request<Page<{ id: string; name: string; provenance: Provenance }>>('/sea-ice/regions'),

  // Weather & ocean
  weatherCurrent: () => request<Page<WeatherRecordDto>>('/weather/current'),
  weatherForecast: () => request<Page<WeatherRecordDto>>('/weather/forecast'),
  oceanCurrent: () => request<Page<OceanRecordDto>>('/ocean/current'),
  oceanForecast: () => request<Page<OceanRecordDto>>('/ocean/forecast'),

  // Routes
  routes: () => request<Page<RouteDto>>('/routes'),
  route: (id: string) => request<RouteDto>(`/routes/${encodeURIComponent(id)}`),
  calculateRoute: (payload: RouteCalculateRequest) =>
    request<RouteDto>('/routes/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // Alerts
  alerts: () => request<Page<AlertDto>>('/alerts'),
  acknowledgeAlert: (id: string) =>
    request<AlertDto>(`/alerts/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' }),

  // Reports
  dashboard: () => request<DashboardDto>('/dashboard/summary'),
  generateReport: (payload: ReportRequest) =>
    request<ReportDto>('/reports/passage-briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  getReport: (id: string) => request<ReportDto>(`/reports/${encodeURIComponent(id)}`),

  // Models
  models: () => request<{ items: ModelMetaDto[] }>('/models'),
  modelDetail: (id: string) => request<ModelMetaDto>(`/models/${encodeURIComponent(id)}`),

  // Chat
  chat: (message: string) =>
    request<ChatResponse>('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }),

  // Emergency
  createEmergency: (payload: EmergencyCreateRequest) =>
    request<EmergencyIncidentDto>('/emergencies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  acknowledgeEmergency: (id: string) =>
    request<EmergencyIncidentDto>(`/emergencies/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' }),
};
