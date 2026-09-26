/** Explicit DTO-to-view-model adapters.  Backend data is never replaced by mock
 * records when VITE_USE_BACKEND is enabled. */
import type { Iceberg, RouteOption } from '../types';
import type { IcebergDto, RouteDto } from './client';

const risk = (value: string | null): Iceberg['riskLevel'] =>
  value === 'high' || value === 'medium' || value === 'low' ? value : 'low';
const routeRisk = (value: string | null): RouteOption['iceRisk'] =>
  value === 'High' || value === 'Medium' || value === 'Low' || value === 'Very Low'
    ? value : 'Low';

export function icebergFromDto(item: IcebergDto): Iceberg {
  return {
    id: item.id, name: item.name, classification: item.classification ?? 'unavailable',
    currentPos: item.currentPos ?? { lat: 0, lon: 0 },
    dimensionsKm: { length: item.dimensionsKm.length ?? 0, width: item.dimensionsKm.width ?? 0, heightAboveWaterM: item.dimensionsKm.heightAboveWaterM ?? 0 },
    areaSqKm: item.areaSqKm ?? 0, driftSpeedKts: item.driftSpeedKts ?? 0,
    driftDirectionDeg: item.driftDirectionDeg ?? 0, riskLevel: risk(item.riskLevel),
    origin: item.origin ?? 'unavailable', calveYear: item.calveYear ?? 0,
    observedTrack: [], predictedTrack: [], corridorPolygon: [],
    imageUrl: item.imageUrl ?? '', imageCaption: item.imageCaption ?? `Backend ${item.provenance.dataStatus} record`,
  };
}

export function routeFromDto(item: RouteDto): RouteOption {
  return {
    id: item.id, name: item.name, objective: item.objective, distanceKm: item.distanceKm ?? 0,
    timeHours: item.timeHours ?? 0, fuelLiters: item.fuelLiters ?? 0,
    iceRisk: routeRisk(item.iceRisk), icebergRisk: routeRisk(item.icebergRisk),
    recommendedFor: item.recommendedFor ?? 'unavailable',
    waypoints: item.waypoints.map(({ lat, lon }) => ({ lat, lon })),
    conflictAtKm: item.conflictAtKm ?? undefined, hasConflict: item.hasConflict,
  };
}
