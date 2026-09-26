/** Explicit DTO-to-view-model adapters with full trajectory preservation and fallback resilience. */
import type { Iceberg, RouteOption } from '../types';
import type { IcebergDto, RouteDto } from './client';
import {
  ICEBERGS,
  ROUTE_ORIGINAL,
  ROUTE_REROUTED,
  ROUTE_MAX_SAFETY,
} from '../data/polarData';

const risk = (value: string | null): Iceberg['riskLevel'] =>
  value === 'high' || value === 'medium' || value === 'low' ? value : 'low';

const routeRisk = (value: string | null): RouteOption['iceRisk'] =>
  value === 'High' || value === 'Medium' || value === 'Low' || value === 'Very Low'
    ? value
    : 'Low';

export function icebergFromDto(item: IcebergDto): Iceberg {
  const fallback = ICEBERGS.find((b) => b.id === item.id) || ICEBERGS[0];

  const observedTrack =
    item.observedTrack && item.observedTrack.length > 0
      ? item.observedTrack
      : fallback.observedTrack;

  const predictedTrack =
    item.predictedTrack && item.predictedTrack.length > 0
      ? item.predictedTrack
      : fallback.predictedTrack;

  const corridorPolygon =
    item.corridorPolygon && item.corridorPolygon.length > 0
      ? item.corridorPolygon
      : fallback.corridorPolygon;

  return {
    id: item.id,
    name: item.name || fallback.name,
    classification: item.classification ?? fallback.classification,
    currentPos: item.currentPos ?? fallback.currentPos,
    dimensionsKm: {
      length: item.dimensionsKm.length ?? fallback.dimensionsKm.length,
      width: item.dimensionsKm.width ?? fallback.dimensionsKm.width,
      heightAboveWaterM: item.dimensionsKm.heightAboveWaterM ?? fallback.dimensionsKm.heightAboveWaterM,
    },
    areaSqKm: item.areaSqKm ?? fallback.areaSqKm,
    driftSpeedKts: item.driftSpeedKts ?? fallback.driftSpeedKts,
    driftDirectionDeg: item.driftDirectionDeg ?? fallback.driftDirectionDeg,
    riskLevel: risk(item.riskLevel),
    origin: item.origin ?? fallback.origin,
    calveYear: item.calveYear ?? fallback.calveYear,
    observedTrack: observedTrack as any,
    predictedTrack: predictedTrack as any,
    corridorPolygon: corridorPolygon as any,
    imageUrl: item.imageUrl || fallback.imageUrl,
    imageCaption: item.imageCaption ?? `Backend ${item.provenance?.dataStatus ?? 'observed'} record`,
  };
}

export function routeFromDto(item: RouteDto): RouteOption {
  const fallback =
    item.id === 'route-rerouted'
      ? ROUTE_REROUTED
      : item.id === 'route-safety'
      ? ROUTE_MAX_SAFETY
      : ROUTE_ORIGINAL;

  return {
    id: item.id,
    name: item.name || fallback.name,
    objective: item.objective || fallback.objective,
    distanceKm: item.distanceKm ?? fallback.distanceKm,
    timeHours: item.timeHours ?? fallback.timeHours,
    fuelLiters: item.fuelLiters ?? fallback.fuelLiters,
    iceRisk: routeRisk(item.iceRisk),
    icebergRisk: routeRisk(item.icebergRisk),
    recommendedFor: item.recommendedFor ?? fallback.recommendedFor,
    waypoints:
      item.waypoints && item.waypoints.length > 0
        ? item.waypoints.map(({ lat, lon }) => ({ lat, lon }))
        : fallback.waypoints,
    conflictAtKm: item.conflictAtKm ?? fallback.conflictAtKm,
    hasConflict: item.hasConflict ?? fallback.hasConflict,
  };
}
