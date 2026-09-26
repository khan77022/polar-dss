/** Explicit DTO-to-view-model adapters.  Backend data is never replaced by mock
 * records when VITE_USE_BACKEND is enabled. */
import type { Iceberg, RouteOption, IcebergTrajectoryPoint } from '../types';
import type { IcebergDto, RouteDto, TrajectoryDto } from './client';

const risk = (value: string | null): Iceberg['riskLevel'] =>
  value === 'high' || value === 'medium' || value === 'low' ? value : 'low';
const routeRisk = (value: string | null): RouteOption['iceRisk'] =>
  value === 'High' || value === 'Medium' || value === 'Low' || value === 'Very Low'
    ? value : 'Low';

/** Convert a backend TrajectoryDto into a flat array of IcebergTrajectoryPoints. */
export function trajectoryPointsFromDto(dto: TrajectoryDto): IcebergTrajectoryPoint[] {
  return dto.points.map((p, i) => ({
    lat: p.lat,
    lon: p.lon,
    date: p.referenceTime ? new Date(p.referenceTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : `T+${i * 6}h`,
    timeUtc: p.referenceTime ? new Date(p.referenceTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' UTC' : '',
    speedKts: 0,
    uncertaintyRadiusKm: p.uncertaintyRadiusKm ?? 3.5,
  }));
}

/** Merge backend trajectory pages into an iceberg view-model.
 *  Pass trajectories=[] to keep tracks empty (initial load before trajectories arrive). */
export function icebergFromDto(item: IcebergDto, trajectories?: TrajectoryDto[] | unknown): Iceberg {
  const trajList = Array.isArray(trajectories) ? (trajectories as TrajectoryDto[]) : [];
  const observed = trajList.find(t => t.trajectoryType === 'observed');
  const predicted = trajList.find(t => t.trajectoryType === 'predicted' || t.trajectoryType === 'simulated');

  return {
    id: item.id,
    name: item.name,
    classification: item.classification ?? 'unavailable',
    currentPos: item.currentPos ?? { lat: 0, lon: 0 },
    dimensionsKm: {
      length: item.dimensionsKm.length ?? 0,
      width: item.dimensionsKm.width ?? 0,
      heightAboveWaterM: item.dimensionsKm.heightAboveWaterM ?? 0,
    },
    areaSqKm: item.areaSqKm ?? 0,
    driftSpeedKts: item.driftSpeedKts ?? 0,
    driftDirectionDeg: item.driftDirectionDeg ?? 0,
    riskLevel: risk(item.riskLevel),
    origin: item.origin ?? 'unavailable',
    calveYear: item.calveYear ?? 0,
    // ── FIX: preserve backend trajectory data instead of zeroing it ──────────
    observedTrack: observed ? trajectoryPointsFromDto(observed) : [],
    predictedTrack: predicted ? trajectoryPointsFromDto(predicted) : [],
    corridorPolygon: [],          // corridor geometry not yet in backend schema
    // ─────────────────────────────────────────────────────────────────────────
    imageUrl: item.imageUrl ?? '',
    imageCaption: item.imageCaption ?? `Backend ${item.provenance.dataStatus} record`,
  };
}

export function routeFromDto(item: RouteDto): RouteOption {
  return {
    id: item.id,
    name: item.name,
    objective: item.objective,
    distanceKm: item.distanceKm ?? 0,
    timeHours: item.timeHours ?? 0,
    fuelLiters: item.fuelLiters ?? 0,
    iceRisk: routeRisk(item.iceRisk),
    icebergRisk: routeRisk(item.icebergRisk),
    recommendedFor: item.recommendedFor ?? 'unavailable',
    waypoints: item.waypoints.map(({ lat, lon }) => ({ lat, lon })),
    conflictAtKm: item.conflictAtKm ?? undefined,
    hasConflict: item.hasConflict,
  };
}
