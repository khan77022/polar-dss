import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  Compass,
  Layers,
  Ship,
  TriangleAlert,
  ShieldCheck,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  MapPin,
  Eye,
  Crosshair,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Clock,
  Navigation,
  CheckSquare,
  Square,
  AlertOctagon,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { Iceberg, Vessel, RouteOption, MapSector } from '../types';
import { ANTARCTIC_STATIONS, AHEAD_VESSELS, ROUTE_MAX_SAFETY, ROUTE_REROUTED, ROUTE_ORIGINAL } from '../data/polarData';

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

// Sector View Presets
const SECTORS = {
  peninsula: {
    center: [-64.2, -61.5] as [number, number],
    zoom: 6,
    name: 'Antarctic Peninsula & Weddell Sea',
    subtitle: 'Active passage corridor: King George Is. ➔ Rothera & A68A hazard',
  },
  'indian-sector': {
    center: [-69.8, 45.0] as [number, number],
    zoom: 4,
    name: 'Indian Antarctic Sector (East Antarctica)',
    subtitle: 'Covers Maitri (11°44\'E) & Bharati (76°11\'E) Permanent Research Bases',
  },
  'all-antarctica': {
    center: [-72.0, 0.0] as [number, number],
    zoom: 3,
    name: 'Antarctic Continent & Southern Ocean',
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

  // User map controls
  const [basemap, setBasemap] = useState<BasemapType>('satellite');
  const [currentSector, setCurrentSector] = useState<MapSector>('peninsula');
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Layer Visibility Controls
  const [layerVisibility, setLayerVisibility] = useState({
    satellite: true,
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
    aheadVessels: false, // User requested hide/show other ships
  });

  // Live Vessel Route Simulation State
  const [isSimPlaying, setIsSimPlaying] = useState<boolean>(false);
  const [simFraction, setSimFraction] = useState<number>(timelineStep / 4);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x, 2x, 4x

  // Sync sim fraction when timelineStep changes from outside and not playing
  useEffect(() => {
    if (!isSimPlaying) {
      setSimFraction(Math.min(Math.max(timelineStep / 4, 0), 1));
    }
  }, [timelineStep, isSimPlaying]);

  // Simulation timer loop
  useEffect(() => {
    if (!isSimPlaying) return;

    const interval = setInterval(() => {
      setSimFraction((prev) => {
        const next = prev + 0.015 * simSpeed;
        if (next >= 1) {
          setIsSimPlaying(false);
          return 1;
        }
        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isSimPlaying, simSpeed]);

  // Fullscreen escape key & resize handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Compute interpolated vessel position along route
  const currentWaypoints = currentRoute.waypoints || [];
  const vesselPos = useMemo(() => {
    if (!currentWaypoints || currentWaypoints.length === 0) return vessel.currentPos;
    if (simFraction <= 0) return currentWaypoints[0];
    if (simFraction >= 1) return currentWaypoints[currentWaypoints.length - 1];

    const totalSegments = currentWaypoints.length - 1;
    const exactIndex = simFraction * totalSegments;
    const baseIndex = Math.min(Math.floor(exactIndex), totalSegments - 1);
    const remainder = exactIndex - baseIndex;

    const p1 = currentWaypoints[baseIndex];
    const p2 = currentWaypoints[baseIndex + 1];

    return {
      lat: p1.lat + (p2.lat - p1.lat) * remainder,
      lon: p1.lon + (p2.lon - p1.lon) * remainder,
    };
  }, [currentWaypoints, simFraction, vessel.currentPos]);

  // Calculate live voyage metrics
  const totalRouteDistKm = currentRoute.distanceKm || 400;
  const distTravelledKm = Math.round(simFraction * totalRouteDistKm);
  const distRemainingKm = Math.max(0, totalRouteDistKm - distTravelledKm);
  const currentSpeed = vessel.speedKts || 12.5;
  const hoursRemaining = (distRemainingKm / (currentSpeed * 1.852)).toFixed(1);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const initialSector = SECTORS.peninsula;
    const map = L.map(mapContainerRef.current, {
      center: initialSector.center,
      zoom: initialSector.zoom,
      minZoom: 2,
      maxZoom: 12,
      zoomControl: false,
    });

    // Add scale bar
    L.control.scale({ imperial: true, metric: true, position: 'bottomright' }).addTo(map);

    // Zoom control
    L.control.zoom({ position: 'topright' }).addTo(map);

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

    const config = BASEMAP_URLS[basemap];
    const newTileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: 12,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [basemap]);

  // Jump to Sector when selected
  const handleSelectSector = (sector: MapSector) => {
    setCurrentSector(sector);
    const map = mapInstanceRef.current;
    if (!map) return;
    const target = SECTORS[sector];
    map.flyTo(target.center, target.zoom, { duration: 1.2 });
  };

  // Center on Indian Research Vessel
  const handleCenterVessel = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([vesselPos.lat, vesselPos.lon], 7, { duration: 0.8 });
  };

  // Reset to current sector
  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const target = SECTORS[currentSector];
    map.flyTo(target.center, target.zoom, { duration: 0.8 });
  };

  // Toggle specific layer
  const toggleLayer = (layerKey: keyof typeof layerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Toggle ahead vessels (other ships) directly
  const toggleAheadVessels = () => {
    setLayerVisibility((prev) => ({ ...prev, aheadVessels: !prev.aheadVessels }));
  };

  // Render All Dynamic Layers: Sea-ice, Icebergs, Vessel, Routes, Forbidden zones, Escapeability, Stations
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = dynamicLayersRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. RENDER SEA-ICE CONCENTRATION HEATMAP & ICE EDGE
    if (layerVisibility.seaIceConcentration && currentSector === 'peninsula') {
      // Step offset creates dynamic evolution for +0h to +48h
      const stepOffset = timelineStep * 0.12;

      // High concentration pack ice zone in Weddell Sea (>65%)
      const weddellIcePolygon: [number, number][] = [
        [-61.8 - stepOffset, -55.8],
        [-62.8 - stepOffset, -53.8],
        [-66.0, -52.8],
        [-68.5, -55.8],
        [-67.8, -60.8],
        [-65.5, -60.0],
        [-63.6, -57.2],
      ];
      L.polygon(weddellIcePolygon, {
        color: '#dc2626',
        weight: 1.5,
        fillColor: '#bae6fd',
        fillOpacity: 0.45,
        dashArray: '3, 3',
      })
        .bindTooltip('<strong>Heavy Pack Ice (>65% Conc.)</strong><br/>Multi-year floes; unnavigable without icebreaker escort.', { sticky: true })
        .addTo(group);

      // Marginal Ice Zone (MIZ) in Bransfield Strait (30% - 60%)
      const bransfieldMizPolygon: [number, number][] = [
        [-62.1 - stepOffset * 0.5, -60.8],
        [-62.3, -58.0],
        [-63.3, -56.8],
        [-64.0, -59.5],
        [-63.3, -62.2],
      ];
      L.polygon(bransfieldMizPolygon, {
        color: '#0284c7',
        weight: 1.2,
        fillColor: '#7dd3fc',
        fillOpacity: 0.32,
      })
        .bindTooltip('<strong>Marginal Ice Zone (30% - 60% Conc.)</strong><br/>First-year fractured pack; navigable leads scouted by vanguard vessels.', { sticky: true })
        .addTo(group);

      // Low Concentration Navigable Leads (10% - 30%)
      const openLeadsPolygon: [number, number][] = [
        [-62.8, -62.5],
        [-63.5, -63.5],
        [-64.8, -64.8],
        [-64.3, -62.8],
        [-63.2, -61.5],
      ];
      L.polygon(openLeadsPolygon, {
        color: '#10b981',
        weight: 1,
        fillColor: '#a7f3d0',
        fillOpacity: 0.25,
      })
        .bindTooltip('<strong>Open Water & Navigable Leads (10% - 30%)</strong><br/>Route 2 Western Corridor; optimal for fuel efficiency.', { sticky: true })
        .addTo(group);

      // Sea Ice Grid Cells (Simulated Sentinel-1 / AMSR2 Raster Cells)
      const gridSamples: { lat: number; lon: number; conc: number; status: string }[] = [
        { lat: -62.5, lon: -58.5, conc: 68, status: 'High' },
        { lat: -63.0, lon: -59.2, conc: 54, status: 'Medium' },
        { lat: -63.2, lon: -61.2, conc: 22, status: 'Low' },
        { lat: -64.0, lon: -62.5, conc: 18, status: 'Low' },
        { lat: -64.5, lon: -57.5, conc: 82, status: 'Critical Pack' },
      ];

      gridSamples.forEach((cell) => {
        const cellSize = 0.3;
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
    if (layerVisibility.iceEdge && currentSector === 'peninsula') {
      const iceEdgeCoords: [number, number][] = [
        [-61.5, -63.0],
        [-62.0, -60.5],
        [-62.4, -58.2],
        [-63.0, -56.0],
        [-64.5, -54.0],
      ];
      L.polyline(iceEdgeCoords, {
        color: '#38bdf8',
        weight: 2.5,
        dashArray: '6, 6',
        opacity: 0.9,
      })
        .bindTooltip('<strong>Ice Edge (15% Concentration Contour)</strong><br/>Boundary between open Southern Ocean swell and polar pack ice.', { sticky: true })
        .addTo(group);
    }

    // 3. RENDER FORBIDDEN FUTURE ZONES & RISK HEATMAP
    if (layerVisibility.forbiddenZones && currentSector === 'peninsula') {
      // Dynamic entrapment risk zone (closing channel east of Low Island)
      const trapZone: [number, number][] = [
        [-62.8, -59.8],
        [-63.4, -58.9],
        [-63.9, -60.2],
        [-63.2, -60.9],
      ];
      L.polygon(trapZone, {
        color: '#b91c1c',
        weight: 2,
        fillColor: '#fee2e2',
        fillOpacity: 0.4,
        dashArray: '4, 4',
      })
        .bindTooltip('<strong>🚫 FORBIDDEN FUTURE ZONE (+24h to +48h)</strong><br/>Convergence of A68A megaberg pressure ridge with 75% pack ice.<br/><em>High risk of vessel entrapment / besetting.</em>', { sticky: true })
        .addTo(group);
    }

    // 4. RENDER FUTURE ACCESSIBILITY & ESCAPEABILITY VECTORS
    if (layerVisibility.escapeability && currentSector === 'peninsula') {
      // Escape Vector Arrow towards Drake Passage
      const escapePoints: [number, number][] = [
        [-63.2, -61.5],
        [-62.2, -63.8],
      ];
      L.polyline(escapePoints, {
        color: '#10b981',
        weight: 3,
        dashArray: '8, 8',
        opacity: 0.85,
      })
        .bindTooltip('<strong>🟢 Safe Escape Vector (Bearing 295°)</strong><br/>Clear passage into Drake Passage / open water with 88% escapeability index.', { sticky: true })
        .addTo(group);
    }

    // 5. RENDER NAVIGATION ROUTES (Current, Alternative Bypass, Safety Offshore)
    if (layerVisibility.navigationRoutes) {
      // A. Direct Route (Route 1)
      const directCoords: [number, number][] = ROUTE_ORIGINAL.waypoints.map((w) => [w.lat, w.lon]);
      const isRoute1Active = !isRerouted;
      L.polyline(directCoords, {
        color: isRoute1Active ? '#ea580c' : '#94a3b8',
        weight: isRoute1Active ? 4.5 : 2.5,
        dashArray: isRoute1Active ? undefined : '5, 8',
        opacity: isRoute1Active ? 0.95 : 0.5,
      })
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.4;">
            <strong style="color: #ea580c;">Route 1: Direct Passage (380 km)</strong><br/>
            <span>Status: ${isRoute1Active ? 'Active' : 'Deactivated / Bypassed'}</span><br/>
            <span>Risk: <strong>HIGH</strong> (A68A collision hazard at km 185)</span><br/>
            <span>Time: 32h • Fuel: 1,450 L</span>
          </div>
        `)
        .addTo(group);

      // B. Recommended Western Bypass (Route 2)
      const bypassCoords: [number, number][] = ROUTE_REROUTED.waypoints.map((w) => [w.lat, w.lon]);
      L.polyline(bypassCoords, {
        color: '#10b981',
        weight: isRerouted ? 5 : 3.5,
        dashArray: isRerouted ? undefined : '6, 6',
        opacity: isRerouted ? 0.95 : 0.75,
      })
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.4;">
            <strong style="color: #059669;">Route 2: AI Recommended Western Bypass (420 km)</strong><br/>
            <span>Status: ${isRerouted ? 'ACTIVE & COMMITTED' : 'Recommended AI Option'}</span><br/>
            <span>Cleared: Bypasses A68A corridor by +38.5 km.</span><br/>
            <span>Time: 36h • Fuel: 1,180 L • Risk: <strong>LOW</strong></span>
          </div>
        `)
        .addTo(group);

      // C. Max Safety Route (Route 3)
      if (safetyRoute) {
        const safetyCoords: [number, number][] = safetyRoute.waypoints.map((w) => [w.lat, w.lon]);
        L.polyline(safetyCoords, {
          color: '#38bdf8',
          weight: 2,
          dashArray: '4, 8',
          opacity: 0.6,
        })
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.4;">
              <strong style="color: #0284c7;">Route 3: Maximum Safety Offshore (510 km)</strong><br/>
              <span>Clears all ice shelves into open Southern Ocean.</span><br/>
              <span>Time: 44h • Fuel: 1,300 L • Risk: <strong>VERY LOW</strong></span>
            </div>
          `)
          .addTo(group);
      }
    }

    // 6. RENDER CONFLICT HAZARD POINT (if conflict active)
    if (!isRerouted && hasConflict && currentSector === 'peninsula') {
      const conflictLat = -62.35;
      const conflictLon = -59.50;

      L.circle([conflictLat, conflictLon], {
        radius: 14000,
        color: '#ef4444',
        weight: 2,
        fillColor: '#f87171',
        fillOpacity: 0.35,
        dashArray: '3, 4',
      }).addTo(group);

      const conflictIcon = L.divIcon({
        className: 'custom-conflict-marker',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: #dc2626;
            color: white;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 14px rgba(220, 38, 38, 0.85);
            cursor: pointer;
            animation: pulse 1.5s infinite;
          ">
            <span style="font-weight: 800; font-size: 16px;">!</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const conflictMarker = L.marker([conflictLat, conflictLon], { icon: conflictIcon }).addTo(group);
      conflictMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.5; min-width: 220px;">
          <div style="font-weight: bold; color: #b91c1c; border-bottom: 1px solid #fee2e2; padding-bottom: 4px; margin-bottom: 4px;">
            ⚠️ PROJECTED COLLISION HAZARD
          </div>
          <div><strong>Epoch:</strong> 21 Sep 2026 • 14:00 UTC</div>
          <div><strong>Target:</strong> Megaberg A68A Drift Corridor</div>
          <div><strong>Closest Approach:</strong> 4.8 km (Violates 15 km limit)</div>
          <div style="margin-top: 6px; padding: 5px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 4px; font-size: 11px;">
            Action Required: Engage Route 2 Western Bypass to restore safety margin.
          </div>
        </div>
      `);
    }

    // 7. RENDER ICEBERGS, TRAJECTORIES & UNCERTAINTY CORRIDORS
    if (layerVisibility.icebergs && currentSector === 'peninsula') {
      icebergs.forEach((berg) => {
        const isA68A = berg.id === 'A68A';
        const isSelected = selectedIcebergId === berg.id;

        // Current interpolated position for iceberg
        const pos =
          timelineStep < berg.predictedTrack.length
            ? berg.predictedTrack[timelineStep]
            : berg.currentPos;

        // A. Uncertainty Corridor Polygon
        if (layerVisibility.uncertaintyCorridor && berg.corridorPolygon && berg.corridorPolygon.length > 0) {
          const polyCoords: [number, number][] = berg.corridorPolygon.map((p) => [p.lat, p.lon]);
          L.polygon(polyCoords, {
            color: isA68A ? '#ef4444' : '#0284c7',
            weight: 1,
            fillColor: isA68A ? '#fee2e2' : '#e0f2fe',
            fillOpacity: isA68A ? 0.35 : 0.2,
            dashArray: '3, 4',
          })
            .bindTooltip(`<strong>${berg.id} 95% Bayesian Uncertainty Corridor</strong><br/>Hydrodynamic drift envelope expanding with forecast horizon.`, { sticky: true })
            .addTo(group);
        }

        // B. Iceberg Trajectories (Originating directly from iceberg)
        if (layerVisibility.trajectories) {
          // Historical Track
          if (berg.observedTrack && berg.observedTrack.length > 0) {
            const histCoords: [number, number][] = berg.observedTrack.map((p) => [p.lat, p.lon]);
            L.polyline(histCoords, {
              color: isA68A ? '#991b1b' : '#475569',
              weight: 2,
              opacity: 0.85,
            })
              .bindTooltip(`Observed Historical Track (${berg.id})`, { sticky: true })
              .addTo(group);
          }

          // Predicted Drift Track
          const trackPoints: [number, number][] = berg.predictedTrack.map((p) => [p.lat, p.lon]);
          L.polyline(trackPoints, {
            color: isA68A ? '#ef4444' : '#38bdf8',
            weight: isA68A ? 3 : 1.5,
            dashArray: '5, 5',
            opacity: 0.9,
          })
            .bindTooltip(`Physics Predicted Drift Vector (${berg.id})`, { sticky: true })
            .addTo(group);
        }

        // C. Danger Zone Radius Circle (15 km alert envelope around A68A)
        if (isA68A) {
          L.circle([pos.lat, pos.lon], {
            radius: 15000,
            color: '#ef4444',
            weight: 1.5,
            fillColor: '#fee2e2',
            fillOpacity: 0.22,
          }).addTo(group);
        }

        // D. Iceberg Marker
        const bergIcon = L.divIcon({
          className: 'custom-berg-marker',
          html: `
            <div style="
              display: flex;
              align-items: center;
              gap: 4px;
              background: ${isA68A ? '#991b1b' : '#1e293b'};
              color: white;
              padding: 2.5px 7px;
              border-radius: 4px;
              border: 1.5px solid ${isSelected ? '#fde047' : isA68A ? '#fca5a5' : '#94a3b8'};
              font-family: sans-serif;
              font-size: 10px;
              font-weight: 700;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              white-space: nowrap;
              cursor: pointer;
            ">
              <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: ${
                isA68A ? '#f87171' : '#38bdf8'
              };"></span>
              <span>${berg.id}</span>
              ${isA68A ? '<span style="color: #fca5a5; font-size: 9px;">(HAZARD)</span>' : ''}
            </div>
          `,
          iconSize: [80, 22],
          iconAnchor: [40, 11],
        });

        const marker = L.marker([pos.lat, pos.lon], { icon: bergIcon }).addTo(group);
        marker.on('click', () => onSelectIceberg(berg.id));

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.45; min-width: 200px;">
            <div style="font-weight: bold; color: ${isA68A ? '#b91c1c' : '#1e293b'}; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 4px;">
              ${berg.name}
            </div>
            <div><strong>Classification:</strong> ${berg.classification}</div>
            <div><strong>Dimensions:</strong> ${berg.dimensionsKm.length} × ${berg.dimensionsKm.width} km (Area: ${berg.areaSqKm} km²)</div>
            <div><strong>Drift Velocity:</strong> ${berg.driftSpeedKts} kts • Heading ${berg.driftDirectionDeg}°</div>
            <div><strong>Current Position:</strong> ${Math.abs(pos.lat).toFixed(2)}°S, ${Math.abs(pos.lon).toFixed(2)}°W</div>
            <div><strong>Origin:</strong> ${berg.origin} (Calved: ${berg.calveYear})</div>
            <div><strong>Trajectory Confidence:</strong> <span style="color: #0284c7; font-weight: bold;">89% (Physics-Informed)</span></div>
          </div>
        `);
      });
    }

    // 8. RENDER RESEARCH STATIONS (Bharati, Maitri, Dakshin Gangotri, etc.)
    if (layerVisibility.stations) {
      ANTARCTIC_STATIONS.forEach((station) => {
        const isIndian = station.isIndian;

        const stationIcon = L.divIcon({
          className: 'custom-station-marker',
          html: `
            <div style="
              display: flex;
              align-items: center;
              gap: 4px;
              background: ${isIndian ? '#0c2340' : '#ffffff'};
              color: ${isIndian ? '#ffffff' : '#0f172a'};
              padding: 2px 7px;
              border-radius: 12px;
              border: 1.5px solid ${isIndian ? '#0284c7' : '#94a3b8'};
              font-family: sans-serif;
              font-size: 10px;
              font-weight: 700;
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
              white-space: nowrap;
              cursor: pointer;
            ">
              <span>${station.flag}</span>
              <span>${station.name}</span>
            </div>
          `,
          iconSize: [115, 22],
          iconAnchor: [57, 11],
        });

        const stationMarker = L.marker([station.lat, station.lon], { icon: stationIcon }).addTo(group);
        stationMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.45; min-width: 220px;">
            <div style="font-weight: bold; color: ${isIndian ? '#1e3a8a' : '#0f172a'}; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 4px;">
              ${station.flag} ${station.name}
            </div>
            <div><strong>Nation:</strong> ${station.nation}</div>
            <div><strong>Position:</strong> ${Math.abs(station.lat).toFixed(2)}°S, ${station.lon >= 0 ? station.lon.toFixed(2) + '°E' : Math.abs(station.lon).toFixed(2) + '°W'}</div>
            <div style="margin-top: 4px; font-size: 11px; color: #475569;">${station.info}</div>
          </div>
        `);
      });
    }

    // 9. RENDER RESEARCH VESSEL (MV Vasiliy Golovnin)
    if (layerVisibility.vessel) {
      const vesselIcon = L.divIcon({
        className: 'custom-vessel-marker',
        html: `
          <div style="position: relative; cursor: pointer;">
            <!-- Radar ping ring -->
            <div style="
              position: absolute;
              top: -12px;
              left: -12px;
              width: 48px;
              height: 48px;
              border-radius: 50%;
              background: rgba(37, 99, 235, 0.22);
              border: 1.5px solid #3b82f6;
              animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <!-- Ship Crest -->
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 28px;
              height: 28px;
              background: #1d4ed8;
              color: white;
              border-radius: 50%;
              border: 2px solid #ffffff;
              box-shadow: 0 2px 10px rgba(0,0,0,0.5);
              transform: rotate(${vessel.headingDeg}deg);
            ">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
              </svg>
            </div>
            <!-- Ship Tag -->
            <div style="
              position: absolute;
              top: 30px;
              left: 50%;
              transform: translateX(-50%);
              background: #0f172a;
              color: #ffffff;
              padding: 2px 7px;
              border-radius: 3px;
              font-size: 9px;
              font-weight: bold;
              white-space: nowrap;
              border: 1px solid #38bdf8;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            ">
              🇮🇳 ${vessel.name.split(' ')[0]} ${vessel.name.split(' ')[1] || ''}
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const vesselMarker = L.marker([vesselPos.lat, vesselPos.lon], { icon: vesselIcon }).addTo(group);
      vesselMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.5; min-width: 230px;">
          <div style="font-weight: bold; color: #1e40af; border-bottom: 1px solid #dbeafe; padding-bottom: 4px; margin-bottom: 4px;">
            🇮🇳 ${vessel.name}
          </div>
          <div><strong>Call Sign:</strong> ${vessel.callSign}</div>
          <div><strong>Class:</strong> ${vessel.polarClass}</div>
          <div><strong>Current Position:</strong> ${Math.abs(vesselPos.lat).toFixed(2)}°S, ${Math.abs(vesselPos.lon).toFixed(2)}°W</div>
          <div><strong>Speed:</strong> ${vessel.speedKts} kts • <strong>Heading:</strong> ${vessel.headingDeg}°</div>
          <div><strong>Distance Remaining:</strong> ${distRemainingKm} km (ETA: ${hoursRemaining}h)</div>
          <div><strong>Departure:</strong> ${vessel.startPort}</div>
          <div><strong>Destination:</strong> ${vessel.destination}</div>
        </div>
      `);
    }

    // 10. RENDER AHEAD SCOUT VESSELS (OTHER SHIPS)
    if (layerVisibility.aheadVessels && currentSector === 'peninsula') {
      AHEAD_VESSELS.forEach((scout) => {
        const scoutIcon = L.divIcon({
          className: 'custom-scout-vessel-marker',
          html: `
            <div style="position: relative; width: 24px; height: 24px; cursor: pointer;">
              <!-- Ping -->
              <div style="
                position: absolute;
                inset: -5px;
                border-radius: 50%;
                background: ${scout.isIndian ? 'rgba(16, 185, 129, 0.25)' : 'rgba(56, 189, 248, 0.2)'};
                border: 1px dashed ${scout.isIndian ? '#10b981' : '#38bdf8'};
                animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></div>
              <!-- Hull -->
              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                background: ${scout.isIndian ? '#047857' : '#0369a1'};
                color: white;
                border-radius: 50%;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 8px rgba(0,0,0,0.35);
                transform: rotate(${scout.headingDeg}deg);
              ">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
                </svg>
              </div>
              <!-- Scout Tag -->
              <div style="
                position: absolute;
                top: 24px;
                left: 50%;
                transform: translateX(-50%);
                background: #020617;
                color: #ffffff;
                padding: 1.5px 5px;
                border-radius: 3px;
                font-size: 8.5px;
                font-weight: bold;
                white-space: nowrap;
                border: 1px solid ${scout.isIndian ? '#34d399' : '#7dd3fc'};
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
              ">
                ${scout.flag} ${scout.vesselName.split(' ')[0]} ${scout.vesselName.split(' ')[1] || ''}
              </div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const scoutMarker = L.marker([scout.currentPos.lat, scout.currentPos.lon], { icon: scoutIcon }).addTo(group);
        scoutMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.5; min-width: 240px;">
            <div style="font-weight: bold; color: ${scout.isIndian ? '#065f46' : '#0369a1'}; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
              <span>${scout.flag} ${scout.vesselName}</span>
              <span style="font-size: 10px; background: #f1f5f9; padding: 2px 4px; border-radius: 3px;">${scout.callSign}</span>
            </div>
            <div><strong>Role:</strong> ${scout.role}</div>
            <div><strong>Position Ahead:</strong> ${scout.distanceAheadKm} km ahead (Bearing ${scout.bearingDeg}°)</div>
            <div><strong>Observed Ice Conc:</strong> <span style="font-weight: bold; color: #0284c7;">${scout.observedSeaIceConcentration}%</span> (Floe: ${scout.floeThicknessM}m)</div>
            <div><strong>Lead Condition:</strong> <span style="color: #059669; font-weight: 600;">${scout.leadCondition}</span></div>
            <div style="margin-top: 6px; padding: 5px; background: #f8fafc; border-left: 3px solid #0ea5e9; font-size: 11px; font-style: italic; color: #334155;">
              "${scout.vPirepNotes}"
            </div>
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
      {/* 1. TOP CONTROL BAR */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Sector Selector */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-xs border border-slate-200 rounded-md p-1 shadow-xs flex items-center gap-1">
          <button
            onClick={() => handleSelectSector('peninsula')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              currentSector === 'peninsula'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Antarctic Peninsula</span>
          </button>

          <button
            onClick={() => handleSelectSector('indian-sector')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              currentSector === 'indian-sector'
                ? 'bg-[#0f172a] text-amber-400 shadow-2xs border border-amber-400/40'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>🇮🇳</span>
            <span>Indian Bases (Maitri & Bharati)</span>
          </button>

          <button
            onClick={() => handleSelectSector('all-antarctica')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer hidden sm:flex items-center gap-1 ${
              currentSector === 'all-antarctica'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Pan-Antarctica</span>
          </button>
        </div>

        {/* Right: Quick Controls, Layer Manager, Other Ships Button & Fullscreen */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Basemap Switcher */}
          <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded-md p-1 shadow-xs flex items-center gap-1 text-xs font-medium">
            <button
              onClick={() => setBasemap('satellite')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                basemap === 'satellite' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              🛰️ Satellite
            </button>
            <button
              onClick={() => setBasemap('ocean')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                basemap === 'ocean' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              🌊 Ocean
            </button>
            <button
              onClick={() => setBasemap('chart')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer hidden md:block ${
                basemap === 'chart' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              🗺️ Topo
            </button>
          </div>

          {/* Quick Toggle: Other Ships Button (Directly satisfies user prompt) */}
          <button
            id="btn-toggle-other-ships"
            onClick={toggleAheadVessels}
            title={layerVisibility.aheadVessels ? 'Hide Other Ships' : 'Show Other Ships'}
            className={`px-2.5 py-1 border rounded-md shadow-xs cursor-pointer flex items-center gap-1.5 text-xs font-semibold transition-all ${
              layerVisibility.aheadVessels
                ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <Ship className="w-3.5 h-3.5" />
            <span>{layerVisibility.aheadVessels ? 'Other Ships: Visible' : 'Other Ships: Hidden'}</span>
          </button>

          {/* Layer Controls Dropdown */}
          <div className="relative">
            <button
              id="btn-toggle-layers-dropdown"
              onClick={() => setShowLayerMenu((prev) => !prev)}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-md shadow-xs cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Layers</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showLayerMenu && (
              <div
                id="map-layers-menu"
                className="absolute right-0 top-9 w-64 bg-white/98 backdrop-blur-md border border-slate-200 rounded-lg shadow-xl p-3 z-50 text-xs font-sans text-slate-800 space-y-2 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
                    Map Layer Controls
                  </span>
                  <button
                    onClick={() => setShowLayerMenu(false)}
                    className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="text-blue-600">❄️</span>
                      <span>Sea-Ice Concentration</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.seaIceConcentration}
                      onChange={() => toggleLayer('seaIceConcentration')}
                      className="cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="text-cyan-500">🌊</span>
                      <span>Ice Edge Boundary</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.iceEdge}
                      onChange={() => toggleLayer('iceEdge')}
                      className="cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="text-rose-600">🏔️</span>
                      <span>Icebergs (A68A, A76, D28)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.icebergs}
                      onChange={() => toggleLayer('icebergs')}
                      className="cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="text-indigo-600">〰️</span>
                      <span>Iceberg Trajectories</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.trajectories}
                      onChange={() => toggleLayer('trajectories')}
                      className="cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="text-sky-600">🛡️</span>
                      <span>Uncertainty Corridors</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.uncertaintyCorridor}
                      onChange={() => toggleLayer('uncertaintyCorridor')}
                      className="cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="text-blue-600">🚢</span>
                      <span>Research Vessel</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.vessel}
                      onChange={() => toggleLayer('vessel')}
                      className="cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="text-emerald-600">🛣️</span>
                      <span>Navigation Routes</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.navigationRoutes}
                      onChange={() => toggleLayer('navigationRoutes')}
                      className="cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="text-red-600">🚫</span>
                      <span>Forbidden Future Zones</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.forbiddenZones}
                      onChange={() => toggleLayer('forbiddenZones')}
                      className="cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="text-emerald-600">🟢</span>
                      <span>Escapeability Vectors</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.escapeability}
                      onChange={() => toggleLayer('escapeability')}
                      className="cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span>🇮🇳</span>
                      <span>Research Stations</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.stations}
                      onChange={() => toggleLayer('stations')}
                      className="cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer bg-slate-50">
                    <span className="flex items-center gap-2 font-semibold">
                      <Ship className="w-3.5 h-3.5 text-blue-600" />
                      <span>Other Ships (Ahead Fleet)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={layerVisibility.aheadVessels}
                      onChange={toggleAheadVessels}
                      className="cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Recenter Ship */}
          <button
            onClick={handleCenterVessel}
            title="Center on Vessel"
            className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-md shadow-xs cursor-pointer"
          >
            <Crosshair className="w-4 h-4 text-blue-600" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-md shadow-xs cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-blue-600" /> : <Maximize2 className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Reset View */}
          <button
            onClick={handleResetView}
            title="Reset Sector View"
            className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-md shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* 2. SUBTITLE BADGE & LAST SAFE DEPARTURE TIME BANNER */}
      <div className="absolute top-14 left-2.5 z-20 pointer-events-none flex flex-col gap-2 max-w-sm">
        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 text-white rounded px-3 py-1.5 shadow-md">
          <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold">
            {activeSectorInfo.name}
          </div>
          <div className="text-[11px] text-slate-300 mt-0.5 truncate">
            {activeSectorInfo.subtitle}
          </div>
        </div>

        {/* Last Safe Departure Time Banner */}
        <div className="bg-gradient-to-r from-slate-900/90 to-blue-950/90 backdrop-blur-md border border-sky-400/40 text-white rounded-md p-2.5 shadow-lg pointer-events-auto">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-400" />
              Last Safe Departure Time
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/30">
              T-27h 45m
            </span>
          </div>
          <div className="text-xs font-bold text-slate-100 mt-1">
            20 Sep 2026 • 18:30 UTC
          </div>
          <div className="text-[10px] text-slate-300 mt-0.5 leading-snug">
            Closure condition: A68A drift trajectory & 78% pack ice convergence will close Bransfield corridor.
          </div>
        </div>
      </div>

      {/* 3. THE LEAFLET MAP DOM CONTAINER */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* 4. REAL-TIME CONFLICT ALERT OVERLAY */}
      {!isRerouted && hasConflict && currentSector === 'peninsula' && (
        <div className="absolute top-14 right-2.5 z-20 pointer-events-auto max-w-xs animate-in fade-in duration-300">
          <div className="bg-rose-950/90 backdrop-blur-md border border-rose-500/80 text-white rounded-lg p-3 shadow-xl">
            <div className="flex items-start gap-2">
              <TriangleAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h4 className="text-xs font-bold text-rose-200 uppercase tracking-tight">
                  Iceberg Collision Threat Detected
                </h4>
                <p className="text-[11px] text-rose-200/90 mt-0.5 leading-snug">
                  Iceberg <strong>A68A</strong> drift trajectory intersects Route 1 on <strong>21 Sep • 14:00 UTC</strong> (CPA: 4.8 km).
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
                        <span>Computing Western Bypass...</span>
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
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 text-slate-800 rounded-md shadow-lg p-2.5 flex items-center gap-3 text-xs">
            {/* Play / Pause */}
            <button
              onClick={() => setIsSimPlaying((prev) => !prev)}
              className={`px-3 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                isSimPlaying
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
              }`}
            >
              {isSimPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
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
              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Sim Speed Toggle */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <span className="text-[10px] text-slate-500 font-mono">Rate:</span>
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                    simSpeed === spd ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Voyage Distance and ETA readout */}
            <div className="hidden sm:flex items-center gap-3 border-l border-slate-200 pl-3 font-mono text-[11px] text-slate-600">
              <span>Dist: <strong>{distTravelledKm}</strong> / {totalRouteDistKm} km</span>
              <span>Rem: <strong>{distRemainingKm} km</strong></span>
              <span className="text-blue-600 font-bold">ETA: {hoursRemaining}h</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. LIVE COORDINATES & TELEMETRY HUD (Bottom Center) */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none hidden md:block">
        <div className="bg-slate-900/90 backdrop-blur-xs border border-slate-800 text-slate-300 font-mono text-[10px] px-3.5 py-1 rounded-md shadow-sm flex items-center gap-3">
          <span>{vessel.name.split(' ')[0]}: {Math.abs(vesselPos.lat).toFixed(2)}°S, {Math.abs(vesselPos.lon).toFixed(2)}°W</span>
          <span className="text-slate-600">|</span>
          <span>Speed: {vessel.speedKts} kts</span>
          <span className="text-slate-600">|</span>
          <span>HDG: {vessel.headingDeg}°</span>
          <span className="text-slate-600">|</span>
          <span className="text-sky-400">Escapeability: 88%</span>
          <span className="text-slate-600">|</span>
          <span className={isRerouted ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
            {isRerouted ? 'ROUTE 2 BYPASS' : 'HAZARD ON DIRECT'}
          </span>
        </div>
      </div>

      {/* 7. COLLAPSIBLE MAP GUIDE / LEGEND (Bottom Right) */}
      <div className="absolute bottom-2.5 right-2.5 z-20 pointer-events-auto max-w-xs">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 text-slate-800 rounded-md shadow-md overflow-hidden text-xs">
          <button
            onClick={() => setShowGuide((prev) => !prev)}
            className="w-full px-2.5 py-1 bg-slate-50 border-b border-slate-200 font-bold flex items-center justify-between text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-[11px]"
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>Map Legend & Layers</span>
            </span>
            {showGuide ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {showGuide && (
            <div className="p-2.5 space-y-1.5 text-[10.5px] leading-snug">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shrink-0" />
                  <span>MV Vasiliy Golovnin</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-600 border border-white shrink-0" />
                  <span>Megaberg A68A</span>
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
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-900 border border-sky-400 shrink-0" />
                  <span>Bharati & Maitri</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-sky-200 border border-sky-400 rounded shrink-0" />
                  <span>Marginal Ice Zone</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-red-200 border border-red-500 rounded shrink-0" />
                  <span>Forbidden Future Zone</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-emerald-500 border-t border-dashed border-emerald-500 shrink-0" />
                  <span>Safe Escape Vector</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
