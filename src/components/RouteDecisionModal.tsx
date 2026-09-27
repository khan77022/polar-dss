import React from 'react';
import {
  X,
  Compass,
  CheckCircle,
  AlertTriangle,
  Layers,
  Fuel,
  ShieldCheck,
  Scale,
  ExternalLink,
  ChevronRight,
  Anchor,
} from 'lucide-react';
import { Vessel, RouteOption } from '../types';

interface RouteDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  vessel: Vessel;
  currentRoute: RouteOption;
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
}

export const RouteDecisionModal: React.FC<RouteDecisionModalProps> = ({
  isOpen,
  onClose,
  vessel,
  currentRoute,
  selectedRouteId,
  onSelectRoute,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-[#0b1424] border border-cyan-700/80 rounded-2xl shadow-2xl text-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-cyan-800/60 bg-[#0f1d33] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
              <Compass className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Who Decides the Path?</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-600 text-cyan-300">
                  POLARIS / IMO POLAR CODE
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                NCPOR Multi-Objective Constrained A* Pathfinding Architecture & Marine Fairway Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {/* 1. Chain of Command Banner */}
          <div className="bg-[#122038] border border-cyan-700/50 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider font-mono">
              <Scale className="w-4 h-4 text-cyan-400" />
              <span>Navigation Decision Authority</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="bg-[#0b1424] p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase font-mono">
                  Institutional Authority:
                </span>
                <strong className="text-white">NCPOR Expedition Directorate (MoES India)</strong>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Governed under IMO Polar Code Res. MSC.385(94) and SOLAS Chapter XIV.
                </p>
              </div>
              <div className="bg-[#0b1424] p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase font-mono">
                  Bridge Command:
                </span>
                <strong className="text-white">Master & Ice Navigation Officer</strong>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Flagship {vessel.name} ({vessel.polarClass.split(' ')[0]} heavy polar icebreaker).
                </p>
              </div>
            </div>
          </div>

          {/* 2. Marine Fairway Guarantee (Answer to "Is this path on the ice?") */}
          <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider font-mono">
              <Anchor className="w-4 h-4 text-emerald-400" />
              <span>Marine Fairway Guarantee (Zero Land / Glacier Intersection)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-200">
              All 3 plotted tracks follow <strong>certified deep-water marine fairways</strong> (Bransfield Strait, Boyd Strait, Open Bellingshausen Sea, and Marguerite Bay). Every waypoint maintains water depth soundings between <strong>200m and 1,200m</strong>, safely accommodating {vessel.name}&apos;s <strong>{vessel.draftM || 8.5}m draft</strong>.
            </p>
            <div className="bg-[#0b1424]/80 p-2.5 rounded border border-emerald-600/30 text-[10px] text-slate-300 space-y-1">
              <div>
                • <strong className="text-white">Why Satellite Basemaps Look White</strong>: In polar satellite imagery, glaciated islands (Brabant, Anvers, Adelaide) appear as solid white snow. The dense waypoints ensure the ship curves smoothly through oceanic troughs, never touching land or glaciers.
              </div>
              <div>
                • <strong className="text-white">Floating Sea-Ice Leads</strong>: The route passes through floating seasonal sea ice (35-45% concentration), which {vessel.name} easily breaks using its certified <strong>{vessel.polarClass.split(' ')[0]} hull</strong> (up to 1.5m level ice).
              </div>
            </div>
          </div>

          {/* 3. The 4 Multi-Objective Decision Criteria */}
          <div>
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider font-mono mb-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Multi-Objective Constrained A* Decision Criteria</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="bg-[#0f1d33] p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>1. Bathymetric Keel Clearance</span>
                </div>
                <p className="text-slate-300 text-[10px]">
                  Enforces depth &gt; 200m using GEBCO/IBCSO digital terrain models. Guarantees &gt;190m under-keel margin.
                </p>
              </div>

              <div className="bg-[#0f1d33] p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>2. Iceberg CPA Hazard Buffer</span>
                </div>
                <p className="text-slate-300 text-[10px]">
                  Mandates &ge; 15.0 km CPA exclusion envelope around megaberg A68A (82 km length) and its drift corridor.
                </p>
              </div>

              <div className="bg-[#0f1d33] p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>3. ConvLSTM Sea-Ice Concentration</span>
                </div>
                <p className="text-slate-300 text-[10px]">
                  Searches 48h satellite AI forecast matrices to route through open leads, penalizing heavy ridging (&gt;60%).
                </p>
              </div>

              <div className="bg-[#0f1d33] p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>4. Hydrodynamic Fuel vs Transit Delta</span>
                </div>
                <p className="text-slate-300 text-[10px]">
                  Balances detour nautical miles against ice-ramming drag. Route 2 saves 270L fuel despite +40km detour.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Active Route Trade-off Comparison */}
          <div>
            <div className="flex items-center justify-between text-cyan-300 font-bold text-xs uppercase tracking-wider font-mono mb-2">
              <span className="flex items-center gap-1.5">
                <Fuel className="w-4 h-4 text-cyan-400" />
                <span>Evaluated Trajectories & Decisions</span>
              </span>
            </div>
            <div className="space-y-2">
              {/* Route 1 */}
              <div
                onClick={() => onSelectRoute('route-original')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedRouteId === 'route-original'
                    ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500/50'
                    : 'bg-[#0f1d33]/80 hover:bg-[#142645] border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">Route 1 (Shortest / Direct Track)</span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 text-[9px] font-bold">
                      ⚠️ A68A HAZARD ACTIVE
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    380 km • 32h • 1,450L fuel • <strong>CPA: 4.8 km (Breach &lt; 15km)</strong>
                  </div>
                  <div className="text-[10px] text-rose-300 mt-1">
                    Rejected by decision engine due to collision risk with megaberg A68A.
                  </div>
                </div>
                {selectedRouteId === 'route-original' ? (
                  <span className="text-[10px] font-mono text-rose-400 font-bold px-2 py-1 bg-rose-950 rounded border border-rose-600">
                    ACTIVE
                  </span>
                ) : (
                  <span className="text-slate-400 hover:text-white text-xs font-mono flex items-center gap-1">
                    Select <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              {/* Route 2 (Recommended) */}
              <div
                onClick={() => onSelectRoute('route-rerouted')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedRouteId === 'route-rerouted'
                    ? 'bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/50'
                    : 'bg-[#0f1d33]/80 hover:bg-[#142645] border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">Route 2 (Balanced / Western Bypass)</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-200 text-[9px] font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-300" />
                      AI OPTIMAL CHOICE
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    420 km • 36h • 1,180L fuel • <strong>CPA: 38.5 km (Safe clearance)</strong>
                  </div>
                  <div className="text-[10px] text-emerald-300 mt-1">
                    Approved by decision engine: Clears A68A west of Low Island, saves 270L fuel in open waters.
                  </div>
                </div>
                {selectedRouteId === 'route-rerouted' ? (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-1 bg-emerald-950 rounded border border-emerald-600">
                    ACTIVE
                  </span>
                ) : (
                  <span className="text-emerald-400 hover:text-emerald-300 text-xs font-mono font-bold flex items-center gap-1">
                    Engage <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              {/* Route 3 */}
              <div
                onClick={() => onSelectRoute('route-safety')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedRouteId === 'route-safety'
                    ? 'bg-cyan-950/60 border-cyan-500 ring-1 ring-cyan-500/50'
                    : 'bg-[#0f1d33]/80 hover:bg-[#142645] border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">Route 3 (Lowest Risk / Wide Offshore)</span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[9px] font-bold">
                      DEEP OCEAN CONTINGENCY
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    510 km • 44h • 1,300L fuel • <strong>CPA: &gt;120 km (Open Sea)</strong>
                  </div>
                  <div className="text-[10px] text-cyan-300 mt-1">
                    Held in reserve for severe katabatic storms or heavy coastal pack-ice choking.
                  </div>
                </div>
                {selectedRouteId === 'route-safety' ? (
                  <span className="text-[10px] font-mono text-cyan-400 font-bold px-2 py-1 bg-cyan-950 rounded border border-cyan-600">
                    ACTIVE
                  </span>
                ) : (
                  <span className="text-slate-400 hover:text-white text-xs font-mono flex items-center gap-1">
                    Select <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-cyan-800/60 bg-[#0f1d33] flex items-center justify-between shrink-0">
          <div className="text-[10px] text-slate-400 font-mono">
            Vessel: <strong className="text-white">{vessel.name}</strong> ({vessel.lengthM}m × {vessel.beamM}m, {vessel.polarClass.split(' ')[0]})
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer shadow-md transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
