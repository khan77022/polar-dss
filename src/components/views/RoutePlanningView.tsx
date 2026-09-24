import React, { useState } from 'react';
import {
  Compass,
  Ship,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  Clock,
  Navigation,
  Sparkles,
  Layers,
  Fuel,
  TrendingDown,
  Info,
  Sliders,
  ArrowLeft,
} from 'lucide-react';
import { AntarcticMap } from '../AntarcticMap';
import { Vessel, Iceberg, RouteOption, NavPage } from '../../types';
import {
  ROUTE_ORIGINAL,
  ROUTE_REROUTED,
  ROUTE_MAX_SAFETY,
} from '../../data/polarData';

interface RoutePlanningViewProps {
  vessel: Vessel;
  icebergs: Iceberg[];
  selectedIcebergId: string | null;
  onSelectIceberg: (id: string) => void;
  timelineStep: number;
  hasConflict?: boolean;
  isRerouted?: boolean;
  onRecalculateRoute?: () => void;
  onResetRoute?: () => void;
  onNavigateToCockpit?: () => void;
}

export const RoutePlanningView: React.FC<RoutePlanningViewProps> = ({
  vessel,
  icebergs,
  selectedIcebergId,
  onSelectIceberg,
  timelineStep,
  hasConflict = true,
  isRerouted = false,
  onRecalculateRoute,
  onResetRoute,
  onNavigateToCockpit,
}) => {
  const [destination, setDestination] = useState<string>('Rothera Research Base (Peninsula)');
  const [objective, setObjective] = useState<'balanced' | 'shortest' | 'safety'>('balanced');
  const [selectedRouteId, setSelectedRouteId] = useState<string>(isRerouted ? 'route-rerouted' : 'route-original');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Sync selectedRouteId when isRerouted changes
  React.useEffect(() => {
    if (isRerouted) {
      setSelectedRouteId('route-rerouted');
    } else {
      setSelectedRouteId('route-original');
    }
  }, [isRerouted]);

  const handleRecalculate = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setSelectedRouteId('route-rerouted');
      if (onRecalculateRoute) {
        onRecalculateRoute();
      }
    }, 750);
  };

  const handleReset = () => {
    setSelectedRouteId('route-original');
    if (onResetRoute) {
      onResetRoute();
    }
  };

  // Active displayed route
  const currentActiveRoute =
    selectedRouteId === 'route-rerouted'
      ? ROUTE_REROUTED
      : selectedRouteId === 'route-safety'
      ? ROUTE_MAX_SAFETY
      : ROUTE_ORIGINAL;

  const isCurrentActiveRerouted = selectedRouteId === 'route-rerouted';

  return (
    <div id="route-planning-view" className="flex-1 flex flex-col p-4 sm:p-6 gap-5 overflow-y-auto max-w-7xl mx-auto w-full bg-[#060b14] text-slate-100">
      {/* 1. Header with Breadcrumb & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center gap-3">
          {onNavigateToCockpit && (
            <button
              onClick={onNavigateToCockpit}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              title="Return to Master Cockpit"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight font-mono">
                ROUTE PLANNING & SIMULATION STUDIO
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                MULTI-OBJECTIVE OPTIMIZER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-objective ice-aware passage optimization, A68A hazard avoidance & diesel consumption minimization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRerouted && (
            <button
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-cyan-400 underline flex items-center gap-1.5 cursor-pointer font-mono"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Conflict Scenario</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Route Configuration Bar (Dark theme styling & high z-index) */}
      <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-4 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Departure Point */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
              Departure Waypoint
            </label>
            <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg font-medium text-slate-200 truncate font-mono">
              {vessel.startPort.split('(')[0]} (King George Approach)
            </div>
          </div>

          {/* Destination Dropdown */}
          <div className="relative z-30">
            <label htmlFor="destination-select" className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
              Destination Station
            </label>
            <select
              id="destination-select"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg font-medium text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500 cursor-pointer shadow-inner"
            >
              <option value="Rothera Research Base (Peninsula)">Rothera Research Base (Adelaide Island)</option>
              <option value="Maitri Station (Queen Maud Land)">Maitri Station (Queen Maud Land, 70°S)</option>
              <option value="Bharati Station (Larsemann Hills)">Bharati Station (Prydz Bay, 69°S)</option>
            </select>
          </div>

          {/* Objective Dropdown */}
          <div className="relative z-30">
            <label htmlFor="objective-select" className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
              Optimization Metric
            </label>
            <select
              id="objective-select"
              value={objective}
              onChange={(e) => {
                const val = e.target.value as any;
                setObjective(val);
                if (val === 'safety') setSelectedRouteId('route-safety');
                else if (val === 'shortest') setSelectedRouteId('route-original');
                else setSelectedRouteId('route-rerouted');
              }}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg font-medium text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500 cursor-pointer shadow-inner"
            >
              <option value="balanced">Balanced (Optimal Fuel & Low Ice Risk)</option>
              <option value="safety">Maximum Safety (Deep Ocean Offshore)</option>
              <option value="shortest">Shortest Passage (Direct Corridor)</option>
            </select>
          </div>

          {/* Recalculate AI Optimization Action */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
              AI Route Engine
            </label>
            <button
              id="btn-calculate-route"
              onClick={handleRecalculate}
              disabled={isAnalyzing}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950 cursor-pointer transition-all disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Computing Pareto Paths...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                  <span>Calculate Optimal Route</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Operational Banners: Last Safe Departure Time & Dynamic Hazard Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card A: Last Safe Departure Time Countdown */}
        <div className="bg-gradient-to-br from-slate-950 via-[#0d1c33] to-[#0a182e] border border-cyan-800/60 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5" />
              Last Safe Departure Time
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              T-Minus 27h 45m
            </span>
          </div>

          <div className="my-2">
            <div className="text-lg font-extrabold text-white font-mono">
              20 Sep 2026 • 18:30 UTC
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-snug">
              <strong>Window Closure Trigger:</strong> Fast northwest drift of Megaberg A68A (1.6 kts) coupled with 78% Weddell pack ice convergence will seal Bransfield Strait corridor.
            </p>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 flex items-center justify-between font-mono">
            <span>Passage Window Status: <strong className="text-amber-400">Open (Narrowing)</strong></span>
            <span className="text-cyan-400 font-bold">Exit via Route 2</span>
          </div>
        </div>

        {/* Card B: Escapeability Score & Forbidden Future Zones */}
        <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Escapeability Index & Exit Vectors
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              88% (High Escapeability)
            </span>
          </div>

          <div className="my-2 space-y-1 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Primary Safe Exit Vector:</span>
              <strong className="text-white font-mono">Bearing 295° (Drake Passage / Open Water)</strong>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Forbidden Future Zone:</span>
              <strong className="text-rose-400 font-mono">East Bransfield (Besetting risk &gt;75%)</strong>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Hull Ice Pressure Margin:</span>
              <strong className="text-emerald-400 font-mono">1.8 MPa (PC3 Certified Envelope)</strong>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span>Vanguard Scout Confirm: <strong className="text-cyan-300">PRV Sagar Dhruv (Clear Leads)</strong></span>
            <span className="text-emerald-400 font-semibold font-mono">✓ Safe Exit Guaranteed</span>
          </div>
        </div>
      </div>

      {/* 4. Conflict / Reroute Notification Banner */}
      {!isCurrentActiveRerouted ? (
        <div className="bg-amber-950/60 border border-amber-500/50 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <h3 className="text-xs font-bold text-amber-200 uppercase tracking-wide font-mono">
                Iceberg A68A Collision Alert on Route 1
              </h3>
              <p className="text-xs text-amber-300/90 mt-0.5 font-medium">
                Drift track intersects Route 1 on <strong>21 Sep • 14:00 UTC</strong> (CPA: 4.8 km). Immediate engagement of Route 2 Western Bypass recommended.
              </p>
            </div>
          </div>

          <button
            onClick={handleRecalculate}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-colors shrink-0 disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Engage Route 2 Western Bypass</span>
          </button>
        </div>
      ) : (
        <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-emerald-200 uppercase tracking-wide font-mono">
                Route 2 (Western Bypass) Active & Committed
              </h3>
              <p className="text-xs text-emerald-300/90 mt-0.5 font-medium">
                CPA expanded to <strong>38.5 km</strong>. Vessel navigates open water leads west of Low Island scouted by PRV Sagar Dhruv.
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-emerald-300 bg-emerald-950 px-3 py-1 rounded-lg border border-emerald-500/40 font-mono">
            ✓ Cleared for Passage
          </span>
        </div>
      )}

      {/* 5. Main Antarctic Satellite Map Workspace */}
      <div className="h-[480px] lg:h-[520px] rounded-xl overflow-hidden border border-slate-800 shadow-xl relative">
        <AntarcticMap
          vessel={vessel}
          icebergs={icebergs}
          selectedIcebergId={selectedIcebergId}
          onSelectIceberg={onSelectIceberg}
          timelineStep={timelineStep}
          currentRoute={currentActiveRoute}
          isRerouted={isCurrentActiveRerouted}
          alternativeRoute={selectedRouteId !== 'route-rerouted' ? ROUTE_REROUTED : undefined}
          safetyRoute={ROUTE_MAX_SAFETY}
          hasConflict={!isCurrentActiveRerouted}
          onRecalculateRoute={handleRecalculate}
          isRecalculating={isAnalyzing}
          className="h-full w-full"
        />
      </div>

      {/* 6. Route Comparison Matrix (Current vs Recommended vs Alternative) */}
      <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Counterfactual Route Comparison Matrix
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Select route to preview or commit track
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px] uppercase tracking-wider bg-slate-900/60 font-mono">
                <th className="py-2.5 px-3">Route Track</th>
                <th className="py-2.5 px-3">Distance</th>
                <th className="py-2.5 px-3">Transit Time</th>
                <th className="py-2.5 px-3">Fuel Burn</th>
                <th className="py-2.5 px-3">Pack Ice Drag</th>
                <th className="py-2.5 px-3">Iceberg A68A CPA</th>
                <th className="py-2.5 px-3">Polar Risk</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {/* Route 1: Direct */}
              <tr className={selectedRouteId === 'route-original' ? 'bg-rose-950/40 font-semibold' : 'text-slate-300 hover:bg-slate-900/40'}>
                <td className="py-2.5 px-3">
                  <div className="font-bold text-white">Route 1 (Direct Track)</div>
                  <div className="text-[10px] text-slate-400 font-normal">Bransfield Strait direct channel</div>
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-200">380 km</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">32 h</td>
                <td className="py-2.5 px-3 font-mono text-rose-400 font-bold">1,450 L</td>
                <td className="py-2.5 px-3 text-amber-400">65% Heavy Pack</td>
                <td className="py-2.5 px-3 font-mono text-rose-400 font-bold">4.8 km (UNSAFE)</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    CRITICAL HAZARD
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => setSelectedRouteId('route-original')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      selectedRouteId === 'route-original'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {selectedRouteId === 'route-original' ? 'Selected' : 'Select'}
                  </button>
                </td>
              </tr>

              {/* Route 2: Recommended */}
              <tr className={selectedRouteId === 'route-rerouted' ? 'bg-emerald-950/50 font-semibold' : 'text-slate-300 hover:bg-slate-900/40'}>
                <td className="py-2.5 px-3">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <span>Route 2 (Western Bypass)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500 text-slate-950 font-bold">AI CHOICE</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">Deflects NW around Low Island</div>
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-200">420 km (+40 km)</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">36 h (+4h)</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">1,180 L (-270L)</td>
                <td className="py-2.5 px-3 text-emerald-300">22% Open Leads</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">38.5 km (SAFE)</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    SAFE / OPTIMAL
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => setSelectedRouteId('route-rerouted')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      selectedRouteId === 'route-rerouted'
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {selectedRouteId === 'route-rerouted' ? 'Active' : 'Engage'}
                  </button>
                </td>
              </tr>

              {/* Route 3: Safety */}
              <tr className={selectedRouteId === 'route-safety' ? 'bg-sky-950/50 font-semibold' : 'text-slate-300 hover:bg-slate-900/40'}>
                <td className="py-2.5 px-3">
                  <div className="font-bold text-sky-300">Route 3 (Max Safety Offshore)</div>
                  <div className="text-[10px] text-slate-400 font-normal">Deep ocean clearance into Drake Passage</div>
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-200">510 km (+130 km)</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">44 h (+12h)</td>
                <td className="py-2.5 px-3 font-mono text-sky-400">1,300 L</td>
                <td className="py-2.5 px-3 text-sky-300">0% Open Ocean</td>
                <td className="py-2.5 px-3 font-mono text-sky-300 font-bold">&gt;120 km (CLEAR)</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    LOW RISK (STORM CONTINGENCY)
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => setSelectedRouteId('route-safety')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      selectedRouteId === 'route-safety'
                        ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {selectedRouteId === 'route-safety' ? 'Selected' : 'Select'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Explainable AI Decision Box */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-300 space-y-1">
          <div className="font-bold text-white flex items-center gap-1.5 font-mono">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Explainable AI Reasoning (Pareto Multi-Objective Analysis):</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Although Route 2 is 40 km longer than Route 1, it saves <strong>270 Litres of diesel</strong>. Cruising through 65% pack ice in Route 1 causes continuous hull resistance, requiring full engine throttle (195 L/h vs 115 L/h). Furthermore, Route 2 expands the iceberg closest point of approach from an unsafe 4.8 km to 38.5 km, well outside the 95% Bayesian trajectory uncertainty corridor.
          </p>
        </div>
      </div>
    </div>
  );
};
