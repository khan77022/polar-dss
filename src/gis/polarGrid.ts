import { LatLon } from '../types';

export type TerrainType =
  | 'LAND_GLACIER'
  | 'ICE_SHELF'
  | 'SHALLOW_SOUND'
  | 'COASTAL_FAIRWAY'
  | 'DEEP_OCEAN'
  | 'ICEBERG_BUFFER';

export interface GisCell {
  id: string;
  r: number;
  c: number;
  lat: number;
  lon: number;
  depthM: number;           // 0m on land/glacier, 6-25m in shallow sounds, 150-500m in straits, >1,000m in ocean
  passageWidthM: number;    // Minimum navigable fairway width in meters (e.g. 50m in narrow sound, 50,000m in open sea)
  iceThicknessM: number;    // Sea-ice thickness in meters (0m open ocean, 0.4m leads, 1.5m 1st-yr, 3.5m+ multi-year)
  iceConcentrationPct: number; // Sea-ice concentration 0-100%
  terrainType: TerrainType;
  name?: string;
  isDynamicHazard?: boolean;
}

export interface VesselProfile {
  id: string;
  name: string;
  category: 'small' | 'medium' | 'heavy' | 'super';
  lengthM: number;
  beamM: number;
  draftM: number;                     // Keel draft under water
  icebreakingCapabilityM: number;     // Max ice thickness vessel hull can safely break
  cruisingSpeedKts: number;
  fuelRateLPerHour: number;
  color: string;
  badge: string;
  description: string;
}

export const PRESET_VESSEL_PROFILES: VesselProfile[] = [
  {
    id: 'small-scout',
    name: 'Survey Launch / Zodiac Recon Vanguard',
    category: 'small',
    lengthM: 32,
    beamM: 7.2,
    draftM: 2.2,                     // Very shallow draft: can pass shallow sounds & narrow channels!
    icebreakingCapabilityM: 0.6,     // Light ice capability only
    cruisingSpeedKts: 14.0,
    fuelRateLPerHour: 45,
    color: '#38bdf8',                // Sky blue
    badge: 'LIGHT SCOUT',
    description: 'Ultra-agile scientific survey launch. Can navigate narrow fjords and shallow sounds (depth > 4.2m, width > 12m), but restricted to open water and thin lead fractures (<0.6m ice).',
  },
  {
    id: 'medium-corvette',
    name: 'PRV Sagar Dhruv (Polar Research Corvette)',
    category: 'medium',
    lengthM: 88,
    beamM: 14.8,
    draftM: 5.8,                     // Medium draft
    icebreakingCapabilityM: 1.4,     // PC4 class
    cruisingSpeedKts: 13.0,
    fuelRateLPerHour: 95,
    color: '#34d399',                // Emerald
    badge: 'PC4 RESEARCH',
    description: 'Medium oceanographic research vessel. Navigates coastal fairways and moderate depths (depth > 7.8m, width > 22m). Can break first-year pack ice up to 1.4m.',
  },
  {
    id: 'heavy-icebreaker',
    name: 'MV Vasiliy Golovnin (Heavy PC3 Icebreaker)',
    category: 'heavy',
    lengthM: 161,
    beamM: 22.8,
    draftM: 10.2,                    // Heavy 10.2m draft: BLOCKED by shallow sounds!
    icebreakingCapabilityM: 2.5,     // PC3 heavy icebreaking
    cruisingSpeedKts: 12.5,
    fuelRateLPerHour: 145,
    color: '#06b6d4',                // Cyan
    badge: 'PC3 ICEBREAKER',
    description: 'Heavy polar logistics vessel. Requires deep water (depth > 12.2m) and wide fairways (width > 35m). Capable of breaking heavy 2.5m pack ice. Cannot enter shallow sounds.',
  },
  {
    id: 'super-cargo',
    name: 'Polar Deep-Draft Heavy Transport / Tanker',
    category: 'super',
    lengthM: 228,
    beamM: 32.5,
    draftM: 14.2,                    // Deep draft 14.2m
    icebreakingCapabilityM: 1.8,     // Arc7 class
    cruisingSpeedKts: 11.5,
    fuelRateLPerHour: 210,
    color: '#f59e0b',                // Amber
    badge: 'ARC7 MEGA TANKER',
    description: 'Deep-draft intercontinental supply transport. Strictly confined to deep oceanic trenches (depth > 16.2m, width > 50m). Completely blocked from all shallow straits.',
  },
];

export interface PassabilityResult {
  passable: boolean;
  reason?: string;
  limitingFactor?: 'LAND' | 'DEPTH' | 'WIDTH' | 'ICE_THICKNESS' | 'ICEBERG_HAZARD';
  depthClearanceM: number;
  widthClearanceM: number;
}

export function checkCellPassability(
  cell: GisCell,
  vessel: VesselProfile,
  safetyUnderkeelMarginM: number = 2.0
): PassabilityResult {
  const depthClearanceM = cell.depthM - (vessel.draftM + safetyUnderkeelMarginM);
  const widthClearanceM = cell.passageWidthM - (vessel.beamM * 1.35);

  // 1. Permanent Land / Continental Glacier / Ice Shelf
  if (cell.terrainType === 'LAND_GLACIER' || cell.terrainType === 'ICE_SHELF' || cell.depthM <= 0) {
    return {
      passable: false,
      reason: `Impassable Glacial Land / Continental Shelf (${cell.name || 'Glacial Rock'})`,
      limitingFactor: 'LAND',
      depthClearanceM: -vessel.draftM,
      widthClearanceM: -vessel.beamM,
    };
  }

  // 2. Dynamic Megaberg Hazard Buffer (A68A collision envelope)
  if (cell.terrainType === 'ICEBERG_BUFFER' || cell.isDynamicHazard) {
    return {
      passable: false,
      reason: `A68A Megaberg Active Collision Exclusion Zone (${cell.name || 'Drift Envelope'})`,
      limitingFactor: 'ICEBERG_HAZARD',
      depthClearanceM,
      widthClearanceM,
    };
  }

  // 3. Bathymetric Depth Check (Draft + Underkeel Margin)
  if (depthClearanceM < 0) {
    return {
      passable: false,
      reason: `Insufficient Water Depth (${cell.depthM}m). Vessel requires ${(vessel.draftM + safetyUnderkeelMarginM).toFixed(1)}m (Draft ${vessel.draftM}m + ${safetyUnderkeelMarginM}m underkeel margin).`,
      limitingFactor: 'DEPTH',
      depthClearanceM,
      widthClearanceM,
    };
  }

  // 4. Navigable Channel Width Check
  if (widthClearanceM < 0) {
    return {
      passable: false,
      reason: `Channel Width Too Narrow (${cell.passageWidthM}m). Vessel requires ${(vessel.beamM * 1.35).toFixed(1)}m for beam ${vessel.beamM}m.`,
      limitingFactor: 'WIDTH',
      depthClearanceM,
      widthClearanceM,
    };
  }

  // 5. Sea-Ice Thickness vs Polar Hull Class Capability
  if (cell.iceThicknessM > vessel.icebreakingCapabilityM) {
    return {
      passable: false,
      reason: `Ice Thickness (${cell.iceThicknessM}m) exceeds hull capability (${vessel.icebreakingCapabilityM}m). Risk of hull compression & besetment.`,
      limitingFactor: 'ICE_THICKNESS',
      depthClearanceM,
      widthClearanceM,
    };
  }

  return {
    passable: true,
    depthClearanceM,
    widthClearanceM,
  };
}

// -------------------------------------------------------------
// GRID GEOMETRY & GENERATOR
// Domain: Latitude -61.5°S to -68.5°S (7.0° range)
//         Longitude -55.0°W to -72.0°W (17.0° range)
// -------------------------------------------------------------

export interface PolarGisGrid {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  rows: number;
  cols: number;
  dLat: number;
  dLon: number;
  cells: GisCell[][];
  flatCells: GisCell[];
}

export function generatePolarGisGrid(rows: number = 42, cols: number = 48): PolarGisGrid {
  const minLat = -68.5;
  const maxLat = -61.5;
  const minLon = -72.0;
  const maxLon = -55.0;

  const dLat = (maxLat - minLat) / (rows - 1);
  const dLon = (maxLon - minLon) / (cols - 1);

  const cells: GisCell[][] = [];
  const flatCells: GisCell[] = [];

  for (let r = 0; r < rows; r++) {
    const rowCells: GisCell[] = [];
    const lat = minLat + r * dLat;

    for (let c = 0; c < cols; c++) {
      const lon = minLon + c * dLon;

      const cellInfo = classifyGeography(lat, lon);

      const cell: GisCell = {
        id: `gis_${r}_${c}`,
        r,
        c,
        lat: Number(lat.toFixed(3)),
        lon: Number(lon.toFixed(3)),
        depthM: cellInfo.depthM,
        passageWidthM: cellInfo.passageWidthM,
        iceThicknessM: cellInfo.iceThicknessM,
        iceConcentrationPct: cellInfo.iceConcentrationPct,
        terrainType: cellInfo.terrainType,
        name: cellInfo.name,
        isDynamicHazard: cellInfo.isDynamicHazard,
      };

      rowCells.push(cell);
      flatCells.push(cell);
    }
    cells.push(rowCells);
  }

  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
    rows,
    cols,
    dLat,
    dLon,
    cells,
    flatCells,
  };
}

/**
 * High-fidelity geographical classifier modeling real Antarctic bathymetry,
 * islands, shallow straits, deep ocean trenches, and ice conditions.
 */
function classifyGeography(lat: number, lon: number): {
  depthM: number;
  passageWidthM: number;
  iceThicknessM: number;
  iceConcentrationPct: number;
  terrainType: TerrainType;
  name?: string;
  isDynamicHazard?: boolean;
} {
  // 1. ANTARCTIC CONTINENTAL MAINLAND (Graham Land & Palmer Land spine)
  // Glacial spine runs diagonally from ~(-63.3, -57.5) to (-68.5, -67.0)
  const peninsulaSpineLon = -57.5 - ((lat - -63.3) / (-68.5 - -63.3)) * 8.5;
  if (lon > peninsulaSpineLon - 0.75 && lon < -56.0 && lat < -63.2) {
    return {
      depthM: 0,
      passageWidthM: 0,
      iceThicknessM: 99.0,
      iceConcentrationPct: 100,
      terrainType: 'LAND_GLACIER',
      name: 'Antarctic Peninsula Continental Ice Sheet',
    };
  }

  // 2. WEDDELL SEA / LARSEN C ICE SHELF (East of Peninsula, heavy fast ice)
  if (lon > -60.0 && lat < -64.2) {
    return {
      depthM: 280,
      passageWidthM: 25000,
      iceThicknessM: 4.2,
      iceConcentrationPct: 92,
      terrainType: 'ICE_SHELF',
      name: 'Larsen C Compressive Fast-Ice Shelf',
    };
  }

  // 3. SOUTH SHETLAND ISLANDS
  // King George Island (-62.0 to -62.3, -57.5 to -59.0)
  if (lat >= -62.30 && lat <= -61.95 && lon >= -59.05 && lon <= -57.60) {
    return {
      depthM: 0,
      passageWidthM: 0,
      iceThicknessM: 50.0,
      iceConcentrationPct: 100,
      terrainType: 'LAND_GLACIER',
      name: 'King George Island (Glacial Cap)',
    };
  }

  // Maxwell Bay / Frei Approach Fjord (-62.20 to -62.38, -59.02 to -58.75)
  // Depth: 45m, Width: 2,500m (Navigable entrance to Bransfield Strait)
  if (lat >= -62.38 && lat <= -62.20 && lon >= -59.02 && lon <= -58.75) {
    return {
      depthM: 45.0,
      passageWidthM: 2500,
      iceThicknessM: 0.3,
      iceConcentrationPct: 15,
      terrainType: 'COASTAL_FAIRWAY',
      name: 'Maxwell Bay Inshore Marine Fairway',
    };
  }

  // Nelson Island (-62.25 to -62.36, -59.22 to -59.04)
  if (lat >= -62.36 && lat <= -62.25 && lon >= -59.22 && lon <= -59.04) {
    return {
      depthM: 0,
      passageWidthM: 0,
      iceThicknessM: 40.0,
      iceConcentrationPct: 100,
      terrainType: 'LAND_GLACIER',
      name: 'Nelson Island Glacial Land',
    };
  }

  // Robert & Greenwich Islands (-62.38 to -62.55, -59.95 to -59.40)
  if (lat >= -62.55 && lat <= -62.38 && lon >= -59.95 && lon <= -59.40) {
    return {
      depthM: 0,
      passageWidthM: 0,
      iceThicknessM: 45.0,
      iceConcentrationPct: 100,
      terrainType: 'LAND_GLACIER',
      name: 'Greenwich & Robert Islands',
    };
  }

  // Livingston Island (-62.50 to -62.72, -60.75 to -60.00)
  if (lat >= -62.72 && lat <= -62.50 && lon >= -60.75 && lon <= -60.00) {
    return {
      depthM: 0,
      passageWidthM: 0,
      iceThicknessM: 60.0,
      iceConcentrationPct: 100,
      terrainType: 'LAND_GLACIER',
      name: 'Livingston Island (Mount Friesland Ice Cap)',
    };
  }

  // Snow Island (-62.70 to -62.88, -61.55 to -61.15)
  if (lat >= -62.88 && lat <= -62.70 && lon >= -61.55 && lon <= -61.15) {
    return {
      depthM: 0,
      passageWidthM: 0,
      iceThicknessM: 35.0,
      iceConcentrationPct: 100,
      terrainType: 'LAND_GLACIER',
      name: 'Snow Island Glaciated Plateau',
    };
  }

  // Smith Island (-62.90 to -63.15, -62.65 to -62.35)
  if (lat >= -63.15 && lat <= -62.90 && lon >= -62.65 && lon <= -62.35) {
    return {
      depthM: 0,
      passageWidthM: 0,
      iceThicknessM: 55.0,
      iceConcentrationPct: 100,
      terrainType: 'LAND_GLACIER',
      name: 'Smith Island (Mount Foster Range)',
    };
  }

  // Low Island (-63.25 to -63.45, -62.25 to -62.00)
  if (lat >= -63.45 && lat <= -63.25 && lon >= -62.25 && lon <= -62.00) {
    return {
      depthM: 0,
      passageWidthM: 0,
      iceThicknessM: 40.0,
      iceConcentrationPct: 100,
      terrainType: 'LAND_GLACIER',
      name: 'Low Island Ice Plateau',
    };
  }

  // Deception Island (-62.95 to -63.02, -60.70 to -60.58)
  if (lat >= -63.02 && lat <= -62.95 && lon >= -60.70 && lon <= -60.58) {
    return {
      depthM: 0,
      passageWidthM: 0,
      iceThicknessM: 20.0,
      iceConcentrationPct: 100,
      terrainType: 'LAND_GLACIER',
      name: 'Deception Island Volcanic Caldera Wall',
    };
  }

  // 4. PALMER ARCHIPELAGO ISLANDS
  // Brabant Island (-64.00 to -64.40, -62.65 to -62.00)
  if (lat >= -64.40 && lat <= -64.00 && lon >= -62.65 && lon <= -62.00) {
    return {
      depthM: 0,
      passageWidthM: 0,
      iceThicknessM: 50.0,
      iceConcentrationPct: 100,
      terrainType: 'LAND_GLACIER',
      name: 'Brabant Island (Parry Plateau)',
    };
  }

  // Anvers Island (-64.45 to -64.90, -64.20 to -63.15)
  if (lat >= -64.90 && lat <= -64.45 && lon >= -64.20 && lon <= -63.15) {
    return {
      depthM: 0,
      passageWidthM: 0,
      iceThicknessM: 60.0,
      iceConcentrationPct: 100,
      terrainType: 'LAND_GLACIER',
      name: 'Anvers Island (Mount Français)',
    };
  }

  // Adelaide Island (-66.75 to -67.55, -69.20 to -68.00)
  if (lat >= -67.55 && lat <= -66.75 && lon >= -69.20 && lon <= -68.00) {
    return {
      depthM: 0,
      passageWidthM: 0,
      iceThicknessM: 55.0,
      iceConcentrationPct: 100,
      terrainType: 'LAND_GLACIER',
      name: 'Adelaide Island Continental Ice Cap',
    };
  }

  // 5. SHALLOW SOUNDS & NARROW CHANNELS (Restricted fairways: Small craft pass, Heavy vessels blocked!)
  // English Strait Shallows (between Greenwich & Robert Islands: -62.42 to -62.48, -59.70 to -59.50)
  // Depth: 9.0m, Width: 70m (Passable for small scout draft 2.2m; BLOCKED for heavy icebreakers draft > 7.0m!)
  if (lat >= -62.48 && lat <= -62.42 && lon >= -59.70 && lon <= -59.50) {
    return {
      depthM: 9.0,
      passageWidthM: 70,
      iceThicknessM: 0.4,
      iceConcentrationPct: 15,
      terrainType: 'SHALLOW_SOUND',
      name: 'English Strait Shallows (Depth 9.0m, Fairway 70m)',
    };
  }

  // Lemaire / Neumayer Channel & Inshore Archipelago (-64.95 to -65.25, -64.25 to -63.75)
  // Depth: 10.5m, Width: 85m (Passable for small craft, BLOCKED for heavy icebreakers!)
  if (lat >= -65.25 && lat <= -64.95 && lon >= -64.25 && lon <= -63.75) {
    return {
      depthM: 10.5,
      passageWidthM: 85,
      iceThicknessM: 0.5,
      iceConcentrationPct: 22,
      terrainType: 'SHALLOW_SOUND',
      name: 'Lemaire & Neumayer Channel (Depth 10.5m, Fairway 85m)',
    };
  }

  // Peltier Channel / Port Lockroy Marine Sound (-64.80 to -64.95, -63.60 to -63.40)
  // Depth: 8.0m, Width: 60m (Passable for small survey craft draft 2.2m only!)
  if (lat >= -64.95 && lat <= -64.80 && lon >= -63.60 && lon <= -63.40) {
    return {
      depthM: 8.0,
      passageWidthM: 60,
      iceThicknessM: 0.3,
      iceConcentrationPct: 18,
      terrainType: 'SHALLOW_SOUND',
      name: 'Peltier Sound & Lockroy Shallows (Depth 8.0m, Fairway 60m)',
    };
  }

  // Bismarck Strait Inshore Reef Passage (-64.85 to -65.05, -64.60 to -64.30)
  // Depth: 11.2m, Width: 95m (Blocked for heavy vessels draft > 9.2m)
  if (lat >= -65.05 && lat <= -64.85 && lon >= -64.60 && lon <= -64.30) {
    return {
      depthM: 11.2,
      passageWidthM: 95,
      iceThicknessM: 0.6,
      iceConcentrationPct: 25,
      terrainType: 'SHALLOW_SOUND',
      name: 'Bismarck Strait Inshore Reef (Depth 11.2m, Fairway 95m)',
    };
  }

  // Marguerite Bay Inshore Approach to Rothera (-67.55 to -67.65, -68.30 to -68.10)
  if (lat >= -67.65 && lat <= -67.55 && lon >= -68.30 && lon <= -68.10) {
    return {
      depthM: 75.0,
      passageWidthM: 3200,
      iceThicknessM: 0.7,
      iceConcentrationPct: 28,
      terrainType: 'COASTAL_FAIRWAY',
      name: 'Rothera Point Deep Wharf Approach',
    };
  }

  // 6. DYNAMIC ICEBERG HAZARD: MEGABERG A68A (Drifting NW in Eastern Bransfield)
  const distToA68A = Math.hypot(lat - -63.25, lon - -61.40);
  if (distToA68A < 0.28) {
    return {
      depthM: 1400,
      passageWidthM: 15000,
      iceThicknessM: 35.0,
      iceConcentrationPct: 95,
      terrainType: 'ICEBERG_BUFFER',
      name: 'A68A Megaberg Core Hazard (82km Drift Corridor)',
      isDynamicHazard: true,
    };
  }

  // 7. MAJOR NAVIGABLE DEEP CHANNELS
  // Boyd Strait (between Low Island and Smith/Snow Islands: -63.15 to -63.55, -62.80 to -61.80)
  if (lat >= -63.55 && lat <= -63.15 && lon >= -62.80 && lon <= -61.80) {
    return {
      depthM: 950,
      passageWidthM: 18000,
      iceThicknessM: 0.4,
      iceConcentrationPct: 18,
      terrainType: 'DEEP_OCEAN',
      name: 'Boyd Strait Deep Oceanic Fairway',
    };
  }

  // Central Bransfield Strait Basin (-62.40 to -63.30, -61.20 to -58.50)
  if (lat >= -63.30 && lat <= -62.40 && lon >= -61.20 && lon <= -58.50) {
    return {
      depthM: 1650,
      passageWidthM: 45000,
      iceThicknessM: 0.6,
      iceConcentrationPct: 25,
      terrainType: 'DEEP_OCEAN',
      name: 'Bransfield Strait Deep Axial Basin',
    };
  }

  // Marguerite Trough / Outer Marguerite Bay (-67.30 to -68.00, -70.50 to -68.50)
  if (lat >= -68.00 && lat <= -67.30 && lon >= -70.50 && lon <= -68.50) {
    return {
      depthM: 820,
      passageWidthM: 35000,
      iceThicknessM: 0.8,
      iceConcentrationPct: 35,
      terrainType: 'DEEP_OCEAN',
      name: 'Marguerite Trough Bathymetric Trench',
    };
  }

  // Outer Bellingshausen Sea & Drake Passage (Open Ocean >50km offshore)
  if (lon < -64.5) {
    return {
      depthM: 2800,
      passageWidthM: 75000,
      iceThicknessM: 0.2,
      iceConcentrationPct: 8,
      terrainType: 'DEEP_OCEAN',
      name: 'Open Bellingshausen Deep Oceanic Basin',
    };
  }

  // Default Coastal Oceanic Waters
  return {
    depthM: 420,
    passageWidthM: 12000,
    iceThicknessM: 0.5,
    iceConcentrationPct: 20,
    terrainType: 'COASTAL_FAIRWAY',
    name: 'Coastal Oceanic Navigable Fairway',
  };
}

// -------------------------------------------------------------
// A* (A-STAR) PATHFINDING SEARCH ALGORITHM
// -------------------------------------------------------------

export interface AStarSearchResult {
  success: boolean;
  path: LatLon[];
  gridPath: GisCell[];
  distanceKm: number;
  timeHours: number;
  fuelLiters: number;
  iceRisk: 'Low' | 'Medium' | 'High';
  nodesEvaluated: number;
  executionTimeMs: number;
  vesselUsed: VesselProfile;
  bottlenecks: { cell: GisCell; issue: string }[];
  failureReason?: string;
}

/**
 * Calculates great-circle Haversine distance in kilometers between two lat/lon points.
 */
export function haversineKm(p1: LatLon, p2: LatLon): number {
  const R = 6371.0;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the nearest cell in the GIS grid to the requested coordinate.
 */
export function findNearestGridCell(grid: PolarGisGrid, point: LatLon): GisCell {
  const clampedLat = Math.max(grid.minLat, Math.min(grid.maxLat, point.lat));
  const clampedLon = Math.max(grid.minLon, Math.min(grid.maxLon, point.lon));

  const r = Math.round((clampedLat - grid.minLat) / grid.dLat);
  const c = Math.round((clampedLon - grid.minLon) / grid.dLon);

  const safeR = Math.max(0, Math.min(grid.rows - 1, r));
  const safeC = Math.max(0, Math.min(grid.cols - 1, c));

  return grid.cells[safeR][safeC];
}

/**
 * Finds the nearest passable navigable cell in the GIS grid for a given vessel.
 * Snaps harbor/wharf coordinates situated on shorelines into navigable deep water.
 */
export function findNearestNavigableCell(
  grid: PolarGisGrid,
  point: LatLon,
  vessel: VesselProfile,
  safetyMarginM: number = 2.0
): GisCell {
  const direct = findNearestGridCell(grid, point);
  const directPass = checkCellPassability(direct, vessel, safetyMarginM);
  if (directPass.passable) return direct;

  // Search in expanding concentric rings up to 6 cells away
  for (let radius = 1; radius <= 6; radius++) {
    let bestCell: GisCell | null = null;
    let minD = Infinity;

    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
        const nr = direct.r + dr;
        const nc = direct.c + dc;
        if (nr < 0 || nr >= grid.rows || nc < 0 || nc >= grid.cols) continue;

        const candidate = grid.cells[nr][nc];
        const pass = checkCellPassability(candidate, vessel, safetyMarginM);
        if (pass.passable) {
          const d = haversineKm(point, candidate);
          if (d < minD) {
            minD = d;
            bestCell = candidate;
          }
        }
      }
    }
    if (bestCell) return bestCell;
  }

  return direct;
}

/**
 * A* Pathfinding Engine parameterized by Vessel physical constraints.
 */
export function runAStarOnGisGrid(
  grid: PolarGisGrid,
  origin: LatLon,
  destination: LatLon,
  vessel: VesselProfile,
  options?: {
    avoidIcebergs?: boolean;
    safetyMarginM?: number;
    iceCostWeight?: number;
  }
): AStarSearchResult {
  const t0 = performance.now();
  const avoidIcebergs = options?.avoidIcebergs ?? true;
  const safetyMarginM = options?.safetyMarginM ?? 2.0;
  const iceWeight = options?.iceCostWeight ?? 12.0;

  // Snap origin and destination to nearest navigable water cells for this vessel profile
  const startCell = findNearestNavigableCell(grid, origin, vessel, safetyMarginM);
  const goalCell = findNearestNavigableCell(grid, destination, vessel, safetyMarginM);

  // Check start and goal passability
  const startCheck = checkCellPassability(startCell, vessel, safetyMarginM);
  if (!startCheck.passable) {
    return {
      success: false,
      path: [],
      gridPath: [],
      distanceKm: 0,
      timeHours: 0,
      fuelLiters: 0,
      iceRisk: 'High',
      nodesEvaluated: 1,
      executionTimeMs: performance.now() - t0,
      vesselUsed: vessel,
      bottlenecks: [{ cell: startCell, issue: startCheck.reason || 'Impassable Origin' }],
      failureReason: `Origin cell is impassable for ${vessel.name}: ${startCheck.reason}`,
    };
  }

  const goalCheck = checkCellPassability(goalCell, vessel, safetyMarginM);
  if (!goalCheck.passable) {
    return {
      success: false,
      path: [],
      gridPath: [],
      distanceKm: 0,
      timeHours: 0,
      fuelLiters: 0,
      iceRisk: 'High',
      nodesEvaluated: 1,
      executionTimeMs: performance.now() - t0,
      vesselUsed: vessel,
      bottlenecks: [{ cell: goalCell, issue: goalCheck.reason || 'Impassable Destination' }],
      failureReason: `Destination cell is impassable for ${vessel.name}: ${goalCheck.reason}`,
    };
  }

  // 8-directional neighbor offsets (dr, dc)
  const neighbors = [
    [-1, 0], [1, 0], [0, -1], [0, 1], // Orthogonal
    [-1, -1], [-1, 1], [1, -1], [1, 1], // Diagonal
  ];

  const rows = grid.rows;
  const cols = grid.cols;

  // Track g-scores and came-from pointers
  const gScore: number[][] = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const fScore: number[][] = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const parent: (GisCell | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  const closedSet = new Set<string>();

  // Simple min-heap / priority list
  interface OpenNode {
    cell: GisCell;
    f: number;
  }
  const openList: OpenNode[] = [];

  gScore[startCell.r][startCell.c] = 0;
  fScore[startCell.r][startCell.c] = haversineKm(startCell, goalCell);
  openList.push({ cell: startCell, f: fScore[startCell.r][startCell.c] });

  let nodesEvaluated = 0;
  let reachedGoal: GisCell | null = null;
  const bottlenecks: { cell: GisCell; issue: string }[] = [];

  while (openList.length > 0) {
    nodesEvaluated++;

    // Extract node with lowest f-score
    let minIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[minIdx].f) minIdx = i;
    }
    const current = openList.splice(minIdx, 1)[0].cell;

    if (current.r === goalCell.r && current.c === goalCell.c) {
      reachedGoal = current;
      break;
    }

    closedSet.add(current.id);

    for (const [dr, dc] of neighbors) {
      const nr = current.r + dr;
      const nc = current.c + dc;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

      const neighbor = grid.cells[nr][nc];
      if (closedSet.has(neighbor.id)) continue;

      // Passability check
      const pass = checkCellPassability(neighbor, vessel, safetyMarginM);
      if (!pass.passable) {
        if (pass.limitingFactor === 'DEPTH' || pass.limitingFactor === 'WIDTH') {
          if (bottlenecks.length < 5 && !bottlenecks.some((b) => b.cell.id === neighbor.id)) {
            bottlenecks.push({ cell: neighbor, issue: pass.reason || 'Dimension bottleneck' });
          }
        }
        continue;
      }

      if (avoidIcebergs && neighbor.isDynamicHazard) {
        continue;
      }

      // Cost calculation
      const stepDistKm = haversineKm(current, neighbor);
      // Ice penalty
      const icePenalty = neighbor.iceThicknessM * iceWeight;
      // Shallow water caution penalty
      const depthPenalty = neighbor.depthM < 25 ? 4.0 : 0.0;

      const tentativeG = gScore[current.r][current.c] + stepDistKm + icePenalty + depthPenalty;

      if (tentativeG < gScore[nr][nc]) {
        parent[nr][nc] = current;
        gScore[nr][nc] = tentativeG;
        const h = haversineKm(neighbor, goalCell);
        fScore[nr][nc] = tentativeG + h;

        const existingIdx = openList.findIndex((item) => item.cell.id === neighbor.id);
        if (existingIdx >= 0) {
          openList[existingIdx].f = fScore[nr][nc];
        } else {
          openList.push({ cell: neighbor, f: fScore[nr][nc] });
        }
      }
    }
  }

  const executionTimeMs = performance.now() - t0;

  if (!reachedGoal) {
    return {
      success: false,
      path: [],
      gridPath: [],
      distanceKm: 0,
      timeHours: 0,
      fuelLiters: 0,
      iceRisk: 'High',
      nodesEvaluated,
      executionTimeMs,
      vesselUsed: vessel,
      bottlenecks,
      failureReason: `No feasible A* route found for ${vessel.name}. Hull draft (${vessel.draftM}m) or width (${vessel.beamM}m) is blocked by impassable shallows, land barriers, or heavy ice.`,
    };
  }

  // Reconstruct path
  const rawGridPath: GisCell[] = [];
  let curr: GisCell | null = reachedGoal;
  while (curr) {
    rawGridPath.unshift(curr);
    curr = parent[curr.r][curr.c];
  }

  // Path smoothing (Collinear reduction)
  const smoothedPath: LatLon[] = [];
  smoothedPath.push(origin); // Start at exact user origin

  for (let i = 0; i < rawGridPath.length; i++) {
    // Keep waypoints that change direction or significant landmark cells
    if (i === 0 || i === rawGridPath.length - 1 || i % 2 === 0) {
      smoothedPath.push({ lat: rawGridPath[i].lat, lon: rawGridPath[i].lon });
    }
  }
  smoothedPath.push(destination); // Finish at exact destination

  // Calculate actual navigational distance
  let distanceKm = 0;
  for (let i = 0; i < smoothedPath.length - 1; i++) {
    distanceKm += haversineKm(smoothedPath[i], smoothedPath[i + 1]);
  }
  distanceKm = Math.round(distanceKm * 10) / 10;

  const timeHours = Math.round((distanceKm / vessel.cruisingSpeedKts) * 1.852 * 10) / 10;
  const fuelLiters = Math.round(timeHours * vessel.fuelRateLPerHour);

  const meanIce = rawGridPath.reduce((acc, c) => acc + c.iceThicknessM, 0) / rawGridPath.length;
  const iceRisk: 'Low' | 'Medium' | 'High' = meanIce > 1.5 ? 'High' : meanIce > 0.6 ? 'Medium' : 'Low';

  return {
    success: true,
    path: smoothedPath,
    gridPath: rawGridPath,
    distanceKm,
    timeHours,
    fuelLiters,
    iceRisk,
    nodesEvaluated,
    executionTimeMs: Math.round(executionTimeMs * 10) / 10,
    vesselUsed: vessel,
    bottlenecks,
  };
}
