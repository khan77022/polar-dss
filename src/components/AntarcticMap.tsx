import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  Compass,
  Ship,
  TriangleAlert,
  ShieldCheck,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  Eye,
  Crosshair,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  SlidersHorizontal,
  MoreVertical,
  X,
  Layers,
  MapPin,
} from 'lucide-react';
import { Iceberg, Vessel, RouteOption, MapSector } from '../types';
import { ANTARCTIC_STATIONS, AHEAD_VESSELS, ROUTE_MAX_SAFETY, ROUTE_REROUTED } from '../data/polarData';

export interface AntarcticMapProps {
  vessel: Vessel;
  icebergs: Iceberg[];
  selectedIcebergId: string | null;
  onSelectIceberg: (id: string) => void;
  timelineStep: number; // 0 to 4
  currentRoute: RouteOption;
  isRerouted: boolean;
  alternativeRoute?: RouteOption;
  safetyRoute?: RouteOption;
  emergencyRoute?: RouteOption | null;
  isEmergencyActive?: boolean;
  hasConflict: boolean;
  onRecalculateRoute?: () => void;
  isRecalculating?: boolean;
  className?: string;
  showSimControls?: boolean;
}

type BasemapType = 'satellite' | 'ocean' | 'chart';

const BASEMAP_URLS: Record<BasemapType, { url: string; attribution: string; label: string }> = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, Maxar, Earthstar Geographics',
    label: '🛰️ Real Satellite Imagery',
  },
  ocean: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Ocean/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, GEBCO, NOAA, National Geographic',
    label: '🌊 Nautical Ocean Chart',
  },
  chart: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap, © CARTO',
    label: '🗺️ High-Contrast Topo',
  },
};

// Sector View Presets (Antarctic Peninsula & Weddell Sea removed as requested)
const SECTORS = {
  'indian-sector': {
    center: [-69.8, 45.0] as [number, number],
    zoom: 4,
    name: 'Indian Antarctic Sector (East Antarctica)',
    subtitle: 'Covers Maitri (11°44\'E) & Bharati (76°11\'E) Permanent Research Bases',
  },
  'all-antarctica': {
    center: [-72.0, 0.0] as [number, number],
    zoom: 3,
    name: 'Pan-Antarctic Continent & Southern Ocean',
    subtitle: 'Pan-Antarctic scientific observation & marginal ice zone',
  },
};

export const AntarcticMap: React.FC<AntarcticMapProps> = ({
  vessel,
  icebergs,
  selectedIcebergId,
  onSelectIceberg,
  timelineStep,
  currentRoute,
  isRerouted,
  alternativeRoute,
  safetyRoute,
  emergencyRoute,
  isEmergencyActive,
  hasConflict,
  onRecalculateRoute,
  isRecalculating,
  className = '',
  showSimControls = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const dynamicLayersRef = useRef<L.LayerGroup | null>(null);
  const mapSettingsRef = useRef<HTMLDivElement | null>(null);

  // User map controls
  const [basemap, setBasemap] = useState<BasemapType>('satellite');
  const [currentSector, setCurrentSector] = useState<MapSector>('indian-sector');
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Layer Visibility Controls
  const [layerVisibility, setLayerVisibility] = useState({
    satellite: true,
    iceThicknessHeatmap: true, // Real-time ice thickness heatmap layer
    seaIceConcentration: true,
    iceEdge: true,
    icebergs: true,
    trajectories: true,
    uncertaintyCorridor: true,
    vessel: true,
    navigationRoutes: true,
    forbiddenZones: true,
    escapeability: true,
    stations: true,
    aheadVessels: true,
  });

  // Close three-dot menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mapSettingsRef.current && !mapSettingsRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsMenu]);

  // Live Vessel Route Simulation State
  const [isSimPlaying, setIsSimPlaying] = useState<boolean>(false);
  const [simFraction, setSimFraction] = useState<number>(timelineStep / 4);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x, 2x, 4x

  // Sync sim fraction when timelineStep changes from outside and not playing
  useEffect(() => {
    if (!isSimPlaying) {
      setSimFraction(timelineStep / 4);
    }
  }, [timelineStep, isSimPlaying]);

  // Handle Play/Pause timer for smooth route sailing animation
  useEffect(() => {
    if (!isSimPlaying) return;
    const interval = setInterval(() => {
      setSimFraction((prev) => {
        const next = prev + 0.006 * simSpeed;
        if (next >= 1) {
          setIsSimPlaying(false);
          return 1;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isSimPlaying, simSpeed]);

  // Calculate live vessel position along active route based on simFraction
  const activeWaypoints = useMemo(() => {
    const r = isRerouted && alternativeRoute ? alternativeRoute : currentRoute;
    return r.waypoints;
  }, [isRerouted, alternativeRoute, currentRoute]);

  const vesselPos = useMemo(() => {
    if (!activeWaypoints || activeWaypoints.length === 0) return vessel.currentPos;
    if (activeWaypoints.length === 1) return { lat: activeWaypoints[0].lat, lon: activeWaypoints[0].lon };

    const totalSegs = activeWaypoints.length - 1;
    const scaled = Math.max(0, Math.min(1, simFraction)) * totalSegs;
    const segIndex = Math.min(Math.floor(scaled), totalSegs - 1);
    const segFraction = scaled - segIndex;

    const p1 = activeWaypoints[segIndex];
    const p2 = activeWaypoints[segIndex + 1];

    return {
      lat: p1.lat + (p2.lat - p1.lat) * segFraction,
      lon: p1.lon + (p2.lon - p1.lon) * segFraction,
    };
  }, [activeWaypoints, simFraction, vessel.currentPos]);

  // ETA and distance stats calculated for simulation HUD
  const activeRouteObj = isRerouted && alternativeRoute ? alternativeRoute : currentRoute;
  const totalRouteDistKm = activeRouteObj.distanceKm || 380;
  const distTravelledKm = Math.round(totalRouteDistKm * Math.max(0, Math.min(1, simFraction)));
  const distRemainingKm = Math.max(0, totalRouteDistKm - distTravelledKm);
  const currentSpeed = vessel.speedKts || 12.5;
  const hoursRemaining = (distRemainingKm / (currentSpeed * 1.852)).toFixed(1);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialSector = SECTORS['indian-sector'];
    const map = L.map(mapContainerRef.current, {
      center: initialSector.center,
      zoom: initialSector.zoom,
      minZoom: 2,
      maxZoom: 12,
      zoomControl: false,
    });

    // Add scale bar
    L.control.scale({ imperial: true, metric: true, position: 'bottomright' }).addTo(map);

    // Zoom control at bottomright so top-right is reserved for clean three-dot settings
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial Tile Layer
    const basemapConfig = BASEMAP_URLS[basemap];
    const tileLayer = L.tileLayer(basemapConfig.url, {
      attribution: basemapConfig.attribution,
      maxZoom: 12,
      subdomains: 'abcd',
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Layer group for all dynamic elements
    const dynamicGroup = L.layerGroup().addTo(map);
    dynamicLayersRef.current = dynamicGroup;

    mapInstanceRef.current = map;

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap Tiles when selected
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const basemapConfig = BASEMAP_URLS[basemap];
    const newTileLayer = L.tileLayer(basemapConfig.url, {
      attribution: basemapConfig.attribution,
      maxZoom: 12,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [basemap]);

  // Center on Sector View
  const handleSelectSector = (sectorKey: MapSector) => {
    setCurrentSector(sectorKey);
    const sector = SECTORS[sectorKey];
    if (mapInstanceRef.current && sector) {
      mapInstanceRef.current.flyTo(sector.center, sector.zoom, { duration: 1.2 });
    }
    setShowSettingsMenu(false);
  };

  // Center Map on Vessel
  const handleCenterVessel = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([vesselPos.lat, vesselPos.lon], 7, { duration: 1.0 });
    }
  };

  // Reset to default Sector view
  const handleResetView = () => {
    const sector = SECTORS[currentSector];
    if (mapInstanceRef.current && sector) {
      mapInstanceRef.current.flyTo(sector.center, sector.zoom, { duration: 1.0 });
    }
  };

  // Toggle specific layers
  const toggleLayer = (layerKey: keyof typeof layerVisibility) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  const toggleAheadVessels = () => {
    setLayerVisibility((prev) => ({
      ...prev,
      aheadVessels: !prev.aheadVessels,
    }));
  };

  // -------------------------------------------------------------
  // DYNAMIC LEAFLET LAYERS ENGINE
  // -------------------------------------------------------------
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = dynamicLayersRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 0. RENDER REAL-TIME ICE THICKNESS HEATMAP LAYER (CRITICAL HAZARD ZONES ACROSS ANTARCTIC SHELF)
    if (layerVisibility.iceThicknessHeatmap) {
      // Step offset creates dynamic real-time evolution based on current timeline
      const stepDrift = timelineStep * 0.08;

      // A. Contoured Ice Thickness Polygons across the Antarctic shelf
      // 1. Extreme Critical Ice Shelf Hazard Zones (>3.0m - 4.8m) - Deep Crimson
      const extremeThicknessZones: { coords: [number, number][]; label: string; thicknessRange: string; stressKPa: number }[] = [
        {
          coords: [
            [-68.3 - stepDrift, 69.8],
            [-68.8 - stepDrift, 74.6],
            [-70.3, 76.8],
            [-71.2, 72.2],
            [-70.1, 68.4],
          ],
          label: 'Amery Ice Shelf Grounding Ridge',
          thicknessRange: '3.8m - 4.6m',
          stressKPa: 840,
        },
        {
          coords: [
            [-69.7 - stepDrift * 0.5, 9.8],
            [-70.3, 15.0],
            [-71.5, 15.4],
            [-71.7, 9.0],
          ],
          label: 'Princess Astrid Coast Fast-Ice Barrier',
          thicknessRange: '3.4m - 4.2m',
          stressKPa: 760,
        },
      ];

      extremeThicknessZones.forEach((zone) => {
        L.polygon(zone.coords, {
          color: '#991b1b',
          weight: 2,
          fillColor: '#dc2626',
          fillOpacity: 0.46,
          dashArray: '4, 4',
        })
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.5; min-width: 230px;">
              <div style="font-weight: bold; color: #991b1b; border-bottom: 1px solid #fee2e2; padding-bottom: 3px; margin-bottom: 4px; display: flex; items-center; justify-content: space-between;">
                <span>🚨 CRITICAL ICE HAZARD</span>
                <span style="font-size: 10px; background: #fef2f2; color: #b91c1c; padding: 1px 5px; border-radius: 3px; font-weight: bold;">HULL RISK: EXTREME</span>
              </div>
              <div><strong>Zone:</strong> ${zone.label}</div>
              <div><strong>Mean Ice Thickness:</strong> <span style="color: #dc2626; font-weight: bold; font-size: 13px;">${zone.thicknessRange}</span></div>
              <div><strong>Compressive Stress:</strong> ${zone.stressKPa} kPa (Severe)</div>
              <div><strong>Regime:</strong> Multi-Year Compressive Fast Ice Ridge</div>
              <div style="margin-top: 5px; padding: 4px 6px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; font-size: 11px; color: #991b1b;">
                <strong>PC3 Operational Directive:</strong> Exceeds 2.5m structural tolerance envelope. Vessel transit strictly prohibited.
              </div>
            </div>
          `)
          .bindTooltip(`🚨 <strong>Critical Hazard Zone (${zone.thicknessRange})</strong><br/>${zone.label}`, { sticky: true })
          .addTo(group);
      });

      // 2. Moderate Ice Thickness Hazard Pack (1.5m - 2.8m) - Amber / Orange
      const moderateThicknessZones: { coords: [number, number][]; label: string; thicknessRange: string }[] = [
        {
          coords: [
            [-67.3 - stepDrift, 69.2],
            [-68.1 - stepDrift, 77.2],
            [-69.1, 78.2],
            [-68.5, 68.8],
          ],
          label: 'Prydz Bay / Larsemann Outer Pack Floes',
          thicknessRange: '1.8m - 2.4m',
        },
        {
          coords: [
            [-68.4 - stepDrift * 0.5, 7.2],
            [-69.2, 13.8],
            [-70.1, 14.6],
            [-69.5, 6.2],
          ],
          label: 'Lazarev Marginal Sea Ice Pack',
          thicknessRange: '1.6m - 2.2m',
        },
      ];

      moderateThicknessZones.forEach((zone) => {
        L.polygon(zone.coords, {
          color: '#d97706',
          weight: 1.5,
          fillColor: '#f59e0b',
          fillOpacity: 0.36,
        })
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.5; min-width: 220px;">
              <div style="font-weight: bold; color: #d97706; border-bottom: 1px solid #fef3c7; padding-bottom: 3px; margin-bottom: 4px;">
                ⚠️ MODERATE PACK ICE THICKNESS
              </div>
              <div><strong>Zone:</strong> ${zone.label}</div>
              <div><strong>Mean Ice Thickness:</strong> <span style="color: #b45309; font-weight: bold;">${zone.thicknessRange}</span></div>
              <div style="margin-top: 4px; font-size: 11px; color: #78350f;">
                Deformed first-year floes. Active watch on forward sonar; reduce transit speed to 6-8 kts.
              </div>
            </div>
          `)
          .bindTooltip(`⚠️ <strong>Moderate Thickness (${zone.thicknessRange})</strong><br/>${zone.label}`, { sticky: true })
          .addTo(group);
      });

      // 3. Low Thickness Navigable Leads (0.3m - 1.0m) - Emerald / Cyan
      const lowThicknessLeads: { coords: [number, number][]; label: string; thicknessRange: string }[] = [
        {
          coords: [
            [-66.0, 32.0],
            [-66.8, 50.0],
            [-67.4, 65.0],
            [-66.6, 69.5],
            [-65.6, 46.0],
            [-65.2, 32.0],
          ],
          label: 'Inter-Station Offshore Navigable Lead Corridor',
          thicknessRange: '0.4m - 0.8m',
        },
      ];

      lowThicknessLeads.forEach((zone) => {
        L.polygon(zone.coords, {
          color: '#059669',
          weight: 1.2,
          fillColor: '#10b981',
          fillOpacity: 0.26,
          dashArray: '3, 3',
        })
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.5; min-width: 220px;">
              <div style="font-weight: bold; color: #059669; border-bottom: 1px solid #d1fae5; padding-bottom: 3px; margin-bottom: 4px;">
                🟢 NAVIGABLE LOW-THICKNESS CORRIDOR
              </div>
              <div><strong>Zone:</strong> ${zone.label}</div>
              <div><strong>Ice Thickness:</strong> <span style="color: #059669; font-weight: bold;">${zone.thicknessRange}</span></div>
              <div style="margin-top: 4px; font-size: 11px; color: #065f46;">
                Open fracture leads & thin first-year sheet. Optimal fuel conservation track for PC3 vessel.
              </div>
            </div>
          `)
          .bindTooltip(`🟢 <strong>Navigable Lead (${zone.thicknessRange})</strong><br/>${zone.label}`, { sticky: true })
          .addTo(group);
      });

      // B. High-Density Radar Altimeter Thickness Soundings (CryoSat-2 SARIn & Sentinel-3)
      const thicknessSoundings: { lat: number; lon: number; depthM: number; rating: 'LEAD' | 'FIRST_YEAR' | 'HEAVY' | 'HAZARD' }[] = [
        // Prydz Bay / Bharati Approach
        { lat: -69.2, lon: 76.5, depthM: 0.6, rating: 'LEAD' },
        { lat: -69.7, lon: 75.9, depthM: 2.2, rating: 'HEAVY' },
        { lat: -70.2, lon: 73.8, depthM: 4.1, rating: 'HAZARD' },
        { lat: -68.5, lon: 74.2, depthM: 1.3, rating: 'FIRST_YEAR' },
        { lat: -67.9, lon: 72.0, depthM: 0.8, rating: 'LEAD' },
        { lat: -68.2, lon: 76.8, depthM: 1.7, rating: 'HEAVY' },
        // Maitri / India Bay / Lazarev Coast
        { lat: -69.9, lon: 12.1, depthM: 1.1, rating: 'FIRST_YEAR' },
        { lat: -70.5, lon: 13.5, depthM: 3.6, rating: 'HAZARD' },
        { lat: -69.1, lon: 10.8, depthM: 0.5, rating: 'LEAD' },
        { lat: -70.9, lon: 10.2, depthM: 3.9, rating: 'HAZARD' },
        { lat: -70.1, lon: 14.8, depthM: 2.5, rating: 'HEAVY' },
        // Coastal Transit Route
        { lat: -66.5, lon: 25.0, depthM: 0.4, rating: 'LEAD' },
        { lat: -66.9, lon: 36.0, depthM: 0.5, rating: 'LEAD' },
        { lat: -67.2, lon: 47.0, depthM: 0.8, rating: 'LEAD' },
        { lat: -67.8, lon: 56.0, depthM: 1.4, rating: 'FIRST_YEAR' },
        { lat: -68.4, lon: 64.0, depthM: 2.3, rating: 'HEAVY' },
      ];

      thicknessSoundings.forEach((s) => {
        const color =
          s.depthM < 1.0 ? '#10b981' : s.depthM < 1.8 ? '#06b6d4' : s.depthM < 3.0 ? '#f59e0b' : '#ef4444';

        const soundingIcon = L.divIcon({
          className: 'custom-thickness-sounding',
          html: `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              background: #070e1b;
              border: 1.5px solid ${color};
              border-radius: 4px;
              padding: 1px 4px;
              box-shadow: 0 0 6px ${color}80;
              font-family: monospace;
              font-size: 9px;
              font-weight: bold;
              color: ${color};
              white-space: nowrap;
              cursor: pointer;
            ">
              ${s.depthM}m
            </div>
          `,
          iconSize: [36, 18],
          iconAnchor: [18, 9],
        });

        const m = L.marker([s.lat, s.lon], { icon: soundingIcon }).addTo(group);
        m.bindTooltip(`
          <strong>Altimetric Thickness: ${s.depthM}m</strong><br/>
          Rating: <strong>${s.rating}</strong><br/>
          Sensor: CryoSat-2 SARIn Telemetry
        `, { sticky: true });
      });
    }

    // 1. RENDER SEA-ICE CONCENTRATION HEATMAP & ICE EDGE
    if (layerVisibility.seaIceConcentration) {
      const stepOffset = timelineStep * 0.12;

      // A. Indian Sector: High Concentration Pack Ice in Prydz Bay / Amery Margin (>65%)
      const prydzBayIcePolygon: [number, number][] = [
        [-67.5 - stepOffset, 71.0],
        [-68.2 - stepOffset, 75.0],
        [-69.6, 78.5],
        [-70.5, 73.0],
        [-69.0, 68.0],
        [-68.0, 69.5],
      ];
      L.polygon(prydzBayIcePolygon, {
        color: '#dc2626',
        weight: 1.5,
        fillColor: '#bae6fd',
        fillOpacity: 0.45,
        dashArray: '3, 3',
      })
        .bindTooltip('<strong>Heavy Pack Ice (>65% Conc.) - Prydz Bay</strong><br/>Multi-year floes fronting Amery Ice Shelf & Bharati approach.', { sticky: true })
        .addTo(group);

      // B. Indian Sector: Queen Maud Land / India Bay Fast Ice Zone
      const queenMaudIcePolygon: [number, number][] = [
        [-68.5 - stepOffset * 0.5, 8.0],
        [-69.2, 12.0],
        [-70.8, 16.0],
        [-71.2, 10.0],
        [-69.8, 6.0],
      ];
      L.polygon(queenMaudIcePolygon, {
        color: '#0284c7',
        weight: 1.2,
        fillColor: '#7dd3fc',
        fillOpacity: 0.32,
      })
        .bindTooltip('<strong>Marginal Ice Zone (30% - 60% Conc.) - Lazarev Coast</strong><br/>Navigable coastal lead corridor approaching Maitri Jetty (India Bay).', { sticky: true })
        .addTo(group);

      // C. Navigable Coastal Leads (10% - 30%)
      const openLeadsPolygon: [number, number][] = [
        [-66.8, 55.0],
        [-67.5, 62.0],
        [-68.8, 70.0],
        [-68.2, 65.0],
        [-67.2, 58.0],
      ];
      L.polygon(openLeadsPolygon, {
        color: '#10b981',
        weight: 1,
        fillColor: '#a7f3d0',
        fillOpacity: 0.25,
      })
        .bindTooltip('<strong>Open Water & Navigable Leads (10% - 30%)</strong><br/>Inter-station coastal transit track; optimal for fuel conservation.', { sticky: true })
        .addTo(group);

      // D. Sea Ice Grid Cells (Simulated Sentinel-1 / SAR Raster Cells)
      const gridSamples: { lat: number; lon: number; conc: number; status: string }[] = [
        { lat: -68.8, lon: 74.5, conc: 72, status: 'High' },
        { lat: -69.2, lon: 76.0, conc: 48, status: 'Medium' },
        { lat: -68.4, lon: 45.0, conc: 18, status: 'Low' },
        { lat: -70.1, lon: 12.5, conc: 58, status: 'Medium' },
        { lat: -69.5, lon: 11.2, conc: 25, status: 'Low' },
      ];

      gridSamples.forEach((cell) => {
        const cellSize = 0.6;
        const bounds: [[number, number], [number, number]] = [
          [cell.lat - cellSize / 2, cell.lon - cellSize / 2],
          [cell.lat + cellSize / 2, cell.lon + cellSize / 2],
        ];
        const cellColor = cell.conc > 65 ? '#ef4444' : cell.conc > 35 ? '#0284c7' : '#10b981';
        L.rectangle(bounds, {
          color: cellColor,
          weight: 0.8,
          fillColor: cellColor,
          fillOpacity: 0.18,
          dashArray: '2, 2',
        })
          .bindTooltip(`SAR Grid Cell: <strong>${cell.conc}% Concentration</strong> (${cell.status})`, { sticky: true })
          .addTo(group);
      });
    }

    // 2. RENDER ICE EDGE BOUNDARY
    if (layerVisibility.iceEdge) {
      const iceEdgeCoords: [number, number][] = [
        [-66.2, 5.0],
        [-66.8, 20.0],
        [-67.2, 40.0],
        [-66.9, 60.0],
        [-67.8, 75.0],
        [-68.5, 85.0],
      ];
      L.polyline(iceEdgeCoords, {
        color: '#38bdf8',
        weight: 2.5,
        dashArray: '6, 6',
      })
        .bindTooltip('<strong>Marginal Ice Edge (15% Sea-Ice Extent Boundary)</strong><br/>Daily SAR Sentinel-1 / AMSR2 calibrated threshold.', { sticky: true })
        .addTo(group);
    }

    // 3. RENDER FORBIDDEN FUTURE ZONES
    if (layerVisibility.forbiddenZones) {
      const forbiddenZoneA: [number, number][] = [
        [-68.0, 71.5],
        [-68.8, 75.5],
        [-69.8, 74.0],
        [-69.0, 70.0],
      ];
      L.polygon(forbiddenZoneA, {
        color: '#b91c1c',
        weight: 1.5,
        fillColor: '#ef4444',
        fillOpacity: 0.28,
        dashArray: '4, 4',
      })
        .bindTooltip('<strong>⛔ High-Risk Forbidden Zone</strong><br/>Compressive ice pressure & fast-ice consolidation exceeds PC3 hull limits.', { sticky: true })
        .addTo(group);
    }

    // 4. RENDER ESCAPEABILITY VECTORS
    if (layerVisibility.escapeability) {
      const escapeVectors: { from: [number, number]; to: [number, number]; score: number; label: string }[] = [
        { from: [-68.8, 72.0], to: [-66.5, 68.0], score: 92, label: 'Northern Deepwater Exit (Score: 92%)' },
        { from: [-69.8, 12.0], to: [-67.5, 10.0], score: 86, label: 'Offshore Open Leads Exit (Score: 86%)' },
      ];
      escapeVectors.forEach((v) => {
        L.polyline([v.from, v.to], {
          color: '#10b981',
          weight: 2.5,
          dashArray: '5, 5',
        })
          .bindTooltip(`<strong>🟢 ${v.label}</strong><br/>Recommended dynamic escape corridor with lowest ice compression.`, { sticky: true })
          .addTo(group);
      });
    }

    // 5. RENDER STATIONS (Indian Antarctic Stations: Maitri, Bharati, Dakshin Gangotri)
    if (layerVisibility.stations) {
      ANTARCTIC_STATIONS.forEach((station) => {
        const isIndian = station.isIndian;
        const stationIcon = L.divIcon({
          className: 'custom-station-marker',
          html: `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: ${isIndian ? '28px' : '20px'};
              height: ${isIndian ? '28px' : '20px'};
              background: ${isIndian ? '#0b1424' : '#ffffff'};
              border: 2px solid ${isIndian ? '#f59e0b' : '#3b82f6'};
              border-radius: 50%;
              box-shadow: 0 0 ${isIndian ? '10px #f59e0b' : '4px rgba(0,0,0,0.3)'};
              color: ${isIndian ? '#f59e0b' : '#1e3a8a'};
              font-size: ${isIndian ? '12px' : '9px'};
              font-weight: bold;
              cursor: pointer;
            ">
              ${isIndian ? '🇮🇳' : '❄️'}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([station.lat, station.lon], { icon: stationIcon }).addTo(group);
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.5; min-width: 220px;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
              <strong style="color: ${isIndian ? '#b45309' : '#0284c7'}; font-size: 13px;">${station.name}</strong>
              <span style="font-size: 11px; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-weight: bold;">${station.flag} ${station.nation}</span>
            </div>
            <div><strong>Position:</strong> ${Math.abs(station.lat).toFixed(2)}°S, ${Math.abs(station.lon).toFixed(2)}°${station.lon >= 0 ? 'E' : 'W'}</div>
            <div><strong>Status:</strong> ${station.isIndian ? 'Indian Antarctic Base' : 'International Polar Hub'}</div>
            <div style="margin-top: 4px; font-size: 11px; color: #475569;">${station.info}</div>
          </div>
        `);
      });
    }

    // 6. RENDER ICEBERGS, TRAJECTORIES & CORRIDORS
    if (layerVisibility.icebergs) {
      icebergs.forEach((berg) => {
        const isSelected = selectedIcebergId === berg.id;
        const pos =
          timelineStep < berg.predictedTrack.length
            ? berg.predictedTrack[timelineStep]
            : berg.currentPos;

        // Uncertainty corridor polygon
        if (layerVisibility.uncertaintyCorridor && berg.corridorPolygon && berg.corridorPolygon.length > 0) {
          const polyCoords: [number, number][] = berg.corridorPolygon.map((p) => [p.lat, p.lon]);
          L.polygon(polyCoords, {
            color: '#0284c7',
            weight: 1,
            fillColor: '#e0f2fe',
            fillOpacity: 0.25,
            dashArray: '3, 4',
          })
            .bindTooltip(`<strong>${berg.id} Uncertainty Corridor</strong><br/>Drift trajectory envelope.`, { sticky: true })
            .addTo(group);
        }

        // Predicted trajectory line
        if (layerVisibility.trajectories && berg.predictedTrack.length > 1) {
          const trackCoords: [number, number][] = berg.predictedTrack.map((pt) => [pt.lat, pt.lon]);
          L.polyline(trackCoords, {
            color: '#6366f1',
            weight: 2,
            dashArray: '4, 6',
          }).addTo(group);
        }

        // Iceberg Marker
        const bergIcon = L.divIcon({
          className: 'custom-iceberg-marker',
          html: `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: ${isSelected ? '32px' : '24px'};
              height: ${isSelected ? '32px' : '24px'};
              background: #0f172a;
              border: 2px solid ${isSelected ? '#38bdf8' : '#e2e8f0'};
              border-radius: 6px;
              color: #38bdf8;
              font-size: 11px;
              font-weight: bold;
              box-shadow: 0 0 ${isSelected ? '12px #38bdf8' : '4px rgba(0,0,0,0.5)'};
              cursor: pointer;
            ">
              🏔️
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const bergMarker = L.marker([pos.lat, pos.lon], { icon: bergIcon }).addTo(group);
        bergMarker.on('click', () => onSelectIceberg(berg.id));
        bergMarker.bindTooltip(`<strong>${berg.name}</strong> (${berg.classification})<br/>Drift: ${berg.driftSpeedKts} kts • Area: ${berg.areaSqKm} km²`, { sticky: true });
      });
    }

    // 7. RENDER NAVIGATION ROUTES
    if (layerVisibility.navigationRoutes) {
      if (currentRoute && currentRoute.waypoints.length > 1) {
        const coords: [number, number][] = currentRoute.waypoints.map((wp) => [wp.lat, wp.lon]);
        L.polyline(coords, {
          color: isRerouted ? '#94a3b8' : hasConflict ? '#f97316' : '#0284c7',
          weight: isRerouted ? 2 : 3,
          dashArray: isRerouted ? '4, 6' : undefined,
          opacity: isRerouted ? 0.6 : 0.9,
        })
          .bindTooltip(`<strong>${currentRoute.name}</strong> (${currentRoute.distanceKm} km)`, { sticky: true })
          .addTo(group);
      }

      if (alternativeRoute && alternativeRoute.waypoints.length > 1) {
        const coords: [number, number][] = alternativeRoute.waypoints.map((wp) => [wp.lat, wp.lon]);
        L.polyline(coords, {
          color: '#10b981',
          weight: isRerouted ? 4 : 2,
          opacity: isRerouted ? 0.95 : 0.65,
        })
          .bindTooltip(`<strong>${alternativeRoute.name}</strong> (${alternativeRoute.distanceKm} km)`, { sticky: true })
          .addTo(group);
      }

      // RENDER ACTIVE EMERGENCY DIVERSION ROUTE & HAVEN BEACON
      if (emergencyRoute && emergencyRoute.waypoints.length > 1) {
        const emergencyCoords: [number, number][] = emergencyRoute.waypoints.map((wp) => [wp.lat, wp.lon]);

        // Glowing red/rose halo underlay
        L.polyline(emergencyCoords, {
          color: '#e11d48',
          weight: 8,
          opacity: 0.4,
        }).addTo(group);

        // Core tactical emergency line
        L.polyline(emergencyCoords, {
          color: '#f43f5e',
          weight: 3.5,
          dashArray: '6, 6',
          opacity: 0.95,
        })
          .bindTooltip(`🚨 <strong>ACTIVE EMERGENCY HAVEN CORRIDOR</strong><br/>${emergencyRoute.name} (${emergencyRoute.distanceKm} km)`, { sticky: true })
          .addTo(group);

        // Emergency Waypoint pins
        emergencyRoute.waypoints.forEach((wp, idx) => {
          if (idx === 0) return; // skip origin (vessel)
          const isDest = idx === emergencyRoute.waypoints.length - 1;
          const wpIcon = L.divIcon({
            className: 'custom-emergency-wp-marker',
            html: `
              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: ${isDest ? '32px' : '22px'};
                height: ${isDest ? '32px' : '22px'};
                background: ${isDest ? '#dc2626' : '#091222'};
                border: 2px solid ${isDest ? '#ffffff' : '#f43f5e'};
                border-radius: ${isDest ? '50%' : '5px'};
                color: #ffffff;
                font-family: monospace;
                font-size: ${isDest ? '15px' : '10px'};
                font-weight: bold;
                box-shadow: 0 0 12px ${isDest ? '#ef4444' : '#f43f5e'};
                cursor: pointer;
              ">
                ${isDest ? '⚓' : `W${idx}`}
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          L.marker([wp.lat, wp.lon], { icon: wpIcon })
            .bindTooltip(`🚨 <strong>${isDest ? 'DESTINATION REFUGE ANCHORAGE' : `EMERGENCY WAYPOINT WP-0${idx}`}</strong><br/>Lat: ${Math.abs(wp.lat).toFixed(2)}°S, Lon: ${Math.abs(wp.lon).toFixed(2)}°W`, { sticky: true })
            .addTo(group);
        });
      }
    }

    // 8. RENDER RESEARCH VESSEL
    if (layerVisibility.vessel) {
      const vesselIcon = L.divIcon({
        className: 'custom-vessel-marker',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: #0284c7;
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 12px rgba(2, 132, 199, 0.9);
            color: white;
            cursor: pointer;
          ">
            🚢
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const vesselMarker = L.marker([vesselPos.lat, vesselPos.lon], { icon: vesselIcon }).addTo(group);
      vesselMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.5;">
          <strong style="color: #0284c7; font-size: 13px;">${vessel.name}</strong><br/>
          <span>Polar Class: <strong>${vessel.polarClass}</strong></span><br/>
          <span>Speed: <strong>${vessel.speedKts} kts</strong> • HDG: <strong>${vessel.headingDeg}°</strong></span><br/>
          <span>Position: ${Math.abs(vesselPos.lat).toFixed(2)}°S, ${Math.abs(vesselPos.lon).toFixed(2)}°${vesselPos.lon >= 0 ? 'E' : 'W'}</span>
        </div>
      `);
    }

    // 9. RENDER AHEAD VESSELS (Vanguard Fleet)
    if (layerVisibility.aheadVessels) {
      AHEAD_VESSELS.forEach((scout) => {
        const scoutIcon = L.divIcon({
          className: 'custom-scout-marker',
          html: `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 26px;
              height: 26px;
              background: ${scout.isIndian ? '#065f46' : '#1e293b'};
              border: 2px solid ${scout.isIndian ? '#34d399' : '#94a3b8'};
              border-radius: 50%;
              box-shadow: 0 0 8px rgba(0,0,0,0.5);
              color: white;
              font-size: 11px;
              cursor: pointer;
            ">
              ${scout.flag}
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        const scoutMarker = L.marker([scout.currentPos.lat, scout.currentPos.lon], { icon: scoutIcon }).addTo(group);
        scoutMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.5; min-width: 200px;">
            <strong style="color: #059669;">${scout.vesselName}</strong><br/>
            <span>Role: ${scout.role}</span><br/>
            <span>Ice Conc: <strong>${scout.observedSeaIceConcentration}%</strong></span><br/>
            <span style="font-style: italic; font-size: 11px;">"${scout.vPirepNotes}"</span>
          </div>
        `);
      });
    }
  }, [
    vesselPos,
    simFraction,
    currentRoute,
    alternativeRoute,
    safetyRoute,
    emergencyRoute,
    isEmergencyActive,
    isRerouted,
    hasConflict,
    icebergs,
    selectedIcebergId,
    timelineStep,
    layerVisibility,
    currentSector,
    vessel,
    onSelectIceberg,
  ]);

  const activeSectorInfo = SECTORS[currentSector];

  return (
    <div
      id="antarctic-map-root"
      className={`${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-slate-950 rounded-none border-none p-0 m-0'
          : 'relative w-full h-full min-h-[480px] bg-slate-900 overflow-hidden rounded-md border border-slate-200 shadow-xs'
      } select-none ${className}`}
    >
      {/* 1. TOP-LEFT: Clean Sector Badge (Safely offset so left sidebar toggle button is NEVER overlapped) */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none max-w-xs sm:max-w-sm">
        <div className="bg-[#0b1424]/90 backdrop-blur-md border border-cyan-800/60 text-white rounded-lg px-3 py-2 shadow-lg">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>{activeSectorInfo.name}</span>
          </div>
          <div className="text-[11px] text-slate-300 mt-0.5 truncate">
            {activeSectorInfo.subtitle}
          </div>
        </div>

        {/* Real-Time Ice Thickness Heatmap Legend HUD (When active) */}
        {layerVisibility.iceThicknessHeatmap && (
          <div className="mt-2 bg-[#0b1424]/95 backdrop-blur-md border border-cyan-800/80 rounded-lg px-2.5 py-1.5 text-white shadow-xl flex flex-wrap items-center gap-2.5 font-mono text-[10px] pointer-events-auto">
            <div className="flex items-center gap-1 font-bold text-cyan-300 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>ICE THICKNESS:</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 shadow-2xs" />
              <span className="text-slate-300">&lt;1.0m Leads</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500 shadow-2xs" />
              <span className="text-slate-300">1.0-1.8m 1st-Yr</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 shadow-2xs" />
              <span className="text-slate-300">1.8-3.0m Pack</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 shadow-2xs animate-pulse" />
              <span className="text-rose-300 font-bold">&gt;3.0m Hazard</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. TOP-RIGHT: Three-Dot Map Settings Menu & Quick Action Controls */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        {/* Three-Dot Dropdown for Map Settings */}
        <div className="relative" ref={mapSettingsRef}>
          <button
            id="btn-map-settings-menu"
            onClick={() => setShowSettingsMenu((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border backdrop-blur-md shadow-lg cursor-pointer flex items-center gap-1.5 text-xs font-semibold transition-all ${
              showSettingsMenu
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-cyan-500/40'
                : 'bg-[#0b1424]/90 hover:bg-[#122038] border-cyan-800/70 text-slate-200 hover:text-white'
            }`}
            title="Map Settings & Layers"
          >
            <MoreVertical className="w-4 h-4" />
            <span className="font-mono hidden sm:inline">Map Settings</span>
          </button>

          {/* Three-Dot Dropdown Popover */}
          {showSettingsMenu && (
            <div
              id="map-settings-dropdown-panel"
              className="absolute right-0 top-10 w-80 max-h-[80vh] overflow-y-auto bg-[#0b1424]/98 backdrop-blur-xl border border-cyan-700/80 rounded-xl shadow-2xl p-4 z-50 text-xs font-sans text-slate-200 space-y-3.5 animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white font-mono uppercase tracking-wider text-[11px]">
                    Map Configuration
                  </span>
                </div>
                <button
                  onClick={() => setShowSettingsMenu(false)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sector Selection */}
              <div>
                <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Antarctic Sector Preset</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    onClick={() => handleSelectSector('indian-sector')}
                    className={`px-3 py-2 rounded-lg text-xs text-left border transition-all cursor-pointer flex items-center justify-between ${
                      currentSector === 'indian-sector'
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-xs ring-1 ring-cyan-500/50'
                        : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">🇮🇳</span>
                      <div>
                        <div className="font-semibold text-white">Indian Sector (East Antarctica)</div>
                        <div className="text-[10px] text-slate-400 font-mono">Maitri & Bharati Bases</div>
                      </div>
                    </span>
                    {currentSector === 'indian-sector' && (
                      <span className="text-xs text-cyan-400 font-bold">ACTIVE</span>
                    )}
                  </button>

                  <button
                    onClick={() => handleSelectSector('all-antarctica')}
                    className={`px-3 py-2 rounded-lg text-xs text-left border transition-all cursor-pointer flex items-center justify-between ${
                      currentSector === 'all-antarctica'
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-xs ring-1 ring-cyan-500/50'
                        : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="font-semibold text-white">Pan-Antarctic Continent</div>
                        <div className="text-[10px] text-slate-400 font-mono">Full Southern Ocean Extent</div>
                      </div>
                    </span>
                    {currentSector === 'all-antarctica' && (
                      <span className="text-xs text-cyan-400 font-bold">ACTIVE</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Basemap Selection */}
              <div>
                <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Basemap Surface</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setBasemap('satellite')}
                    className={`p-2 rounded-lg text-center border transition-all cursor-pointer ${
                      basemap === 'satellite'
                        ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 font-bold shadow-xs'
                        : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-sm">🛰️</div>
                    <div className="text-[10px] mt-0.5 font-medium">Satellite</div>
                  </button>

                  <button
                    onClick={() => setBasemap('ocean')}
                    className={`p-2 rounded-lg text-center border transition-all cursor-pointer ${
                      basemap === 'ocean'
                        ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 font-bold shadow-xs'
                        : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-sm">🌊</div>
                    <div className="text-[10px] mt-0.5 font-medium">Ocean</div>
                  </button>

                  <button
                    onClick={() => setBasemap('chart')}
                    className={`p-2 rounded-lg text-center border transition-all cursor-pointer ${
                      basemap === 'chart'
                        ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 font-bold shadow-xs'
                        : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-sm">🗺️</div>
                    <div className="text-[10px] mt-0.5 font-medium">Topo</div>
                  </button>
                </div>
              </div>

              {/* Layer Toggles */}
              <div>
                <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold mb-1.5 flex items-center justify-between">
                  <span>Tactical Layer Overlays</span>
                  <span className="text-[9px] text-slate-400">Click to Toggle</span>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                  {/* REAL-TIME ICE THICKNESS HEATMAP TOGGLE */}
                  <label className="flex items-center justify-between p-2 rounded-lg cursor-pointer bg-gradient-to-r from-cyan-950/60 to-blue-950/40 border border-cyan-500/40 shadow-xs mb-1.5 hover:border-cyan-400 transition-colors">
                    <div className="flex items-start gap-2">
                      <span className="text-base">🌡️</span>
                      <div>
                        <div className="font-bold text-cyan-200 flex items-center gap-1.5">
                          <span>Ice Thickness Heatmap</span>
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-cyan-400 text-slate-950">
                            LIVE ALTIMETRY
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Altimetric depth contours & hazard zones (0 - 5.0m)
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={layerVisibility.iceThicknessHeatmap}
                      onChange={() => toggleLayer('iceThicknessHeatmap')}
                      className="cursor-pointer accent-cyan-400 w-4 h-4 shrink-0"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 hover:bg-slate-900/60 rounded-lg cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span>❄️</span>
                      <span>Sea-Ice Concentration</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.seaIceConcentration}
                      onChange={() => toggleLayer('seaIceConcentration')}
                      className="cursor-pointer accent-cyan-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 hover:bg-slate-900/60 rounded-lg cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span>🌊</span>
                      <span>Ice Edge Boundary</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.iceEdge}
                      onChange={() => toggleLayer('iceEdge')}
                      className="cursor-pointer accent-cyan-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 hover:bg-slate-900/60 rounded-lg cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span>🏔️</span>
                      <span>Icebergs & Trajectories</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.icebergs}
                      onChange={() => toggleLayer('icebergs')}
                      className="cursor-pointer accent-cyan-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 hover:bg-slate-900/60 rounded-lg cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span>🛡️</span>
                      <span>Uncertainty Corridors</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.uncertaintyCorridor}
                      onChange={() => toggleLayer('uncertaintyCorridor')}
                      className="cursor-pointer accent-cyan-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 hover:bg-slate-900/60 rounded-lg cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span>🛣️</span>
                      <span>Navigation Routes</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.navigationRoutes}
                      onChange={() => toggleLayer('navigationRoutes')}
                      className="cursor-pointer accent-cyan-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 hover:bg-slate-900/60 rounded-lg cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span>🚫</span>
                      <span>Forbidden Zones</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.forbiddenZones}
                      onChange={() => toggleLayer('forbiddenZones')}
                      className="cursor-pointer accent-cyan-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 hover:bg-slate-900/60 rounded-lg cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span>🟢</span>
                      <span>Escapeability Vectors</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.escapeability}
                      onChange={() => toggleLayer('escapeability')}
                      className="cursor-pointer accent-cyan-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 hover:bg-slate-900/60 rounded-lg cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span>🇮🇳</span>
                      <span>Research Stations (Maitri & Bharati)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.stations}
                      onChange={() => toggleLayer('stations')}
                      className="cursor-pointer accent-cyan-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 hover:bg-slate-900/60 rounded-lg cursor-pointer bg-cyan-950/30">
                    <span className="flex items-center gap-2 font-semibold text-cyan-200">
                      <Ship className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Other Ships (Ahead Fleet)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.aheadVessels}
                      onChange={toggleAheadVessels}
                      className="cursor-pointer accent-cyan-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Utility Icon: Recenter Vessel */}
        <button
          onClick={handleCenterVessel}
          title="Center on Vessel"
          className="p-2 bg-[#0b1424]/90 hover:bg-[#122038] border border-cyan-800/60 text-cyan-400 hover:text-white rounded-lg shadow-md cursor-pointer transition-colors backdrop-blur-md"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* Quick Utility Icon: Reset Sector View */}
        <button
          onClick={handleResetView}
          title="Reset Sector View"
          className="p-2 bg-[#0b1424]/90 hover:bg-[#122038] border border-cyan-800/60 text-slate-300 hover:text-white rounded-lg shadow-md cursor-pointer transition-colors backdrop-blur-md"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Quick Utility Icon: Fullscreen */}
        <button
          onClick={() => setIsFullscreen((prev) => !prev)}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          className="p-2 bg-[#0b1424]/90 hover:bg-[#122038] border border-cyan-800/60 text-slate-300 hover:text-white rounded-lg shadow-md cursor-pointer transition-colors backdrop-blur-md"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* 3. THE LEAFLET MAP DOM CONTAINER */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* 4. REAL-TIME CONFLICT ALERT OVERLAY (When Threat Active) */}
      {!isRerouted && hasConflict && (
        <div className="absolute top-14 right-3 z-20 pointer-events-auto max-w-xs animate-in fade-in duration-300">
          <div className="bg-rose-950/90 backdrop-blur-md border border-rose-500/80 text-white rounded-lg p-3 shadow-xl">
            <div className="flex items-start gap-2">
              <TriangleAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h4 className="text-xs font-bold text-rose-200 uppercase tracking-tight font-mono">
                  Iceberg Proximity Hazard Detected
                </h4>
                <p className="text-[11px] text-rose-200/90 mt-0.5 leading-snug">
                  Trajectory convergence detected along direct path. Engage bypass route to maintain safety clearance.
                </p>
                {onRecalculateRoute && (
                  <button
                    onClick={onRecalculateRoute}
                    disabled={isRecalculating}
                    className="mt-2.5 w-full py-1.5 px-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isRecalculating ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Computing Safe Bypass...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Recalculate Safe Route</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. LIVE SIMULATION CONTROLS (Floating at Bottom Left) */}
      {showSimControls && (
        <div className="absolute bottom-2.5 left-2.5 z-20 pointer-events-auto">
          <div className="bg-[#0b1424]/95 backdrop-blur-md border border-cyan-800/60 text-slate-100 rounded-lg shadow-lg p-2 sm:p-2.5 flex items-center gap-2 sm:gap-2.5 text-xs">
            {/* Play / Pause */}
            <button
              onClick={() => setIsSimPlaying((prev) => !prev)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                isSimPlaying
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold shadow-xs'
              }`}
            >
              {isSimPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Sim</span>
                </>
              )}
            </button>

            {/* Reset Sim */}
            <button
              onClick={() => {
                setIsSimPlaying(false);
                setSimFraction(0);
              }}
              title="Reset simulation to voyage start"
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Sim Speed Toggle */}
            <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Rate:</span>
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                    simSpeed === spd
                      ? 'bg-cyan-600 text-slate-950'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Voyage Distance and ETA readout */}
            <div className="hidden lg:flex items-center gap-2.5 border-l border-slate-800 pl-2.5 font-mono text-[11px] text-slate-300 whitespace-nowrap">
              <span>Dist: <strong className="text-white">{distTravelledKm}</strong>/{totalRouteDistKm}km</span>
              <span>Rem: <strong className="text-white">{distRemainingKm}km</strong></span>
              <span className="text-cyan-400 font-bold">ETA: {hoursRemaining}h</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. LIVE COORDINATES & TELEMETRY HUD (Floating at Top Center or Bottom Right Offset, fully clear of bottom-left Start Sim controls) */}
      <div className="absolute bottom-14 left-2.5 sm:bottom-2.5 sm:left-auto sm:right-44 z-20 pointer-events-none hidden md:block">
        <div className="bg-[#0b1424]/95 backdrop-blur-md border border-cyan-900/60 text-slate-300 font-mono text-[10.5px] px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2.5 whitespace-nowrap">
          <span>{vessel.name.split(' ')[0]}: <strong className="text-white">{Math.abs(vesselPos.lat).toFixed(2)}°S, {Math.abs(vesselPos.lon).toFixed(2)}°{vesselPos.lon >= 0 ? 'E' : 'W'}</strong></span>
          <span className="text-slate-700">|</span>
          <span>Speed: <strong className="text-white">{vessel.speedKts} kts</strong></span>
          <span className="text-slate-700">|</span>
          <span>HDG: <strong className="text-white">{vessel.headingDeg}°</strong></span>
          <span className="text-slate-700">|</span>
          <span className="text-cyan-400 font-bold">Escape: 88%</span>
          <span className="text-slate-700">|</span>
          <span className={isRerouted ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            {isRerouted ? 'ROUTE 2 BYPASS' : 'HAZARD ON DIRECT'}
          </span>
        </div>
      </div>

      {/* 7. COLLAPSIBLE MAP GUIDE / LEGEND (Bottom Right) */}
      <div className="absolute bottom-2.5 right-14 z-20 pointer-events-auto max-w-xs">
        <div className="bg-[#0b1424]/95 backdrop-blur-md border border-cyan-900/60 text-slate-200 rounded-lg shadow-md overflow-hidden text-xs">
          <button
            onClick={() => setShowGuide((prev) => !prev)}
            className="w-full px-2.5 py-1 bg-slate-900/80 border-b border-slate-800 font-bold flex items-center justify-between text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>Map Legend</span>
            </span>
            {showGuide ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {showGuide && (
            <div className="p-2.5 space-y-1.5 text-[10.5px] leading-snug">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 border border-white shrink-0" />
                  <span>MV Vasiliy Golovnin</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white shrink-0" />
                  <span>Iceberg D28</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-orange-500 border-t border-dashed border-orange-500 shrink-0" />
                  <span>Route 1 (Conflict)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1 bg-emerald-500 rounded shrink-0" />
                  <span>Route 2 (Bypass)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shrink-0" />
                  <span>Bharati & Maitri</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-cyan-200 border border-cyan-400 rounded shrink-0" />
                  <span>Marginal Ice Zone</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
