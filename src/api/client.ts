/** Typed boundary between the Vite UI and the FastAPI public contract. */
export const useBackend = import.meta.env.VITE_USE_BACKEND === 'true';
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

export interface HealthResponse { status?: string; [key: string]: unknown }
export interface Page<T> { items: T[]; limit: number; offset: number; total: number }
export interface LatLon { lat: number; lon: number }
export interface Provenance {
  source: string | null;
  sourceId?: string | null;
  sourceType: string | null;
  dataStatus: 'demo' | 'predicted' | 'provisional' | 'observed' | 'forecast' | 'simulated' | string;
}
export interface IcebergDto {
  id: string; name: string; classification: string | null; currentPos: LatLon | null;
  dimensionsKm: { length: number | null; width: number | null; heightAboveWaterM: number | null };
  areaSqKm: number | null; driftSpeedKts: number | null; driftDirectionDeg: number | null;
  riskLevel: 'low' | 'medium' | 'high' | null; origin: string | null; calveYear: number | null;
  imageUrl: string | null; imageCaption: string | null; provenance: Provenance;
}
export interface RouteDto {
  id: string; name: string; objective: 'shortest' | 'balanced' | 'safety'; distanceKm: number | null;
  timeHours: number | null; fuelLiters: number | null; iceRisk: string | null; icebergRisk: string | null;
  recommendedFor: string | null; waypoints: Array<LatLon & { label?: string | null }>;
  conflictAtKm: number | null; hasConflict: boolean; provenance: Provenance;
}
export interface ChatResponse { answer: string; dataStatus: string; limitations: string }

export const polarApi = {
  health: () => request<HealthResponse>('/health'),
  icebergs: () => request<Page<IcebergDto>>('/icebergs'),
  iceberg: (id: string) => request<IcebergDto>(`/icebergs/${encodeURIComponent(id)}`),
  history: (id: string) => request<Page<unknown>>(`/icebergs/${encodeURIComponent(id)}/history`),
  trajectory: (id: string) => request<Page<unknown>>(`/icebergs/${encodeURIComponent(id)}/trajectory`),
  behavior: (id: string) => request<unknown>(`/icebergs/${encodeURIComponent(id)}/behavior`),
  vesselsCurrent: () => request<unknown>('/vessels/current'),
  vesselsAhead: () => request<Page<unknown>>('/vessels/ahead'),
  stations: () => request<Page<unknown>>('/stations'),
  seaIceCurrent: () => request<Page<unknown>>('/sea-ice/current'),
  seaIceForecast: () => request<Page<unknown>>('/sea-ice/forecast'),
  weatherCurrent: () => request<Page<unknown>>('/weather/current'),
  weatherForecast: () => request<Page<unknown>>('/weather/forecast'),
  oceanCurrent: () => request<Page<unknown>>('/ocean/current'),
  oceanForecast: () => request<Page<unknown>>('/ocean/forecast'),
  routes: () => request<Page<RouteDto>>('/routes'),
  alerts: () => request<Page<unknown>>('/alerts'),
  dashboard: () => request<unknown>('/dashboard/summary'),
  models: () => request<{ items: unknown[] }>('/models'),
  chat: (message: string) => request<ChatResponse>('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) }),
};
