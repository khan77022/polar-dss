import React, { useState } from 'react';
import {
  TriangleAlert,
  Compass,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  Info,
  Clock,
  Navigation,
  ArrowLeft,
  Sparkles,
  Radar,
  ShieldAlert,
} from 'lucide-react';
import { AntarcticMap } from '../AntarcticMap';
import { Iceberg, Vessel, RouteOption } from '../../types';
import { ROUTE_ORIGINAL, ROUTE_REROUTED } from '../../data/polarData';

interface IcebergTrackingViewProps {
  vessel: Vessel;
  icebergs: Iceberg[];
  selectedIcebergId: string | null;
  onSelectIceberg: (id: string) => void;
  timelineStep: number;
  onStepChange?: (step: number) => void;
  hasConflict: boolean;
  isRerouted: boolean;
  onRecalculateRoute: () => void;
  onNavigateToCockpit?: () => void;
}

export const IcebergTrackingView: React.FC<IcebergTrackingViewProps> = ({
  vessel,
  icebergs,
  selectedIcebergId,
  onSelectIceberg,
  timelineStep,
  onStepChange,
  hasConflict,
  isRerouted,
  onRecalculateRoute,
  onNavigateToCockpit,
}) => {
  const currentBerg =
    icebergs.find((b) => b.id === (selectedIcebergId || 'A68A')) || icebergs[0];

  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [recalcSuccess, setRecalcSuccess] = useState<boolean>(false);

  const timelineDates = [
    { step: 0, label: '18 Sep', time: '14:30 UTC' },
    { step: 1, label: '19 Sep', time: '12:00 UTC' },
    { step: 2, label: '20 Sep', time: '12:00 UTC' },
    { step: 3, label: '21 Sep', time: '14:00 UTC' },
    { step: 4, label: '22 Sep', time: '12:00 UTC' },
  ];

  // Displacement calculation based on current step
  const currentPredictedPt =
    timelineStep < currentBerg.predictedTrack.length
      ? currentBerg.predictedTrack[timelineStep]
      : currentBerg.currentPos;

  const currentUncertaintyRadiusKm =
    timelineStep < currentBerg.predictedTrack.length
      ? currentBerg.predictedTrack[timelineStep].uncertaintyRadiusKm
      : 3.5;

  const displacementKm = (timelineStep * currentBerg.driftSpeedKts * 1.852 * 24).toFixed(0);

  const handleRecalculateTrajectory = () => {
    setIsRecalculating(true);
    setRecalcSuccess(false);
    setTimeout(() => {
      setIsRecalculating(false);
      setRecalcSuccess(true);
    }, 700);
  };

  return (
    <div id="iceberg-tracking-view" className="flex-1 flex flex-col p-4 sm:p-6 gap-4 overflow-y-auto max-w-7xl mx-auto w-full bg-[#060b14] text-slate-100">
      {/* 1. Header */}
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
                ICEBERG DRIFT TRAJECTORY PREDICTION
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800/60">
                BAYESIAN ENVELOPE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Physics-informed hydrodynamic drift forecasting with widening Bayesian uncertainty corridors.
            </p>
          </div>
        </div>

        {/* Iceberg Selector Dropdown */}
        <div className="flex items-center gap-2 relative z-30">
          <label htmlFor="iceberg-select" className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
            Monitored Target:
          </label>
          <select
            id="iceberg-select"
            value={currentBerg.id}
            onChange={(e) => {
              onSelectIceberg(e.target.value);
              setRecalcSuccess(false);
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-inner focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            {icebergs.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id} — {b.name} ({b.dimensionsKm.length}×{b.dimensionsKm.width} km) • {b.riskLevel.toUpperCase()} RISK
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Main Map Display */}
      <div className="h-[460px] lg:h-[500px] rounded-xl overflow-hidden border border-slate-800 shadow-xl relative">
        <AntarcticMap
          vessel={vessel}
          icebergs={icebergs}
          selectedIcebergId={currentBerg.id}
          onSelectIceberg={onSelectIceberg}
          timelineStep={timelineStep}
          currentRoute={isRerouted ? ROUTE_REROUTED : ROUTE_ORIGINAL}
          isRerouted={isRerouted}
          hasConflict={hasConflict}
          onRecalculateRoute={onRecalculateRoute}
          className="h-full w-full"
        />

        {/* Floating Trajectory Legend Badge */}
        <div className="absolute top-14 left-3 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800 text-white rounded-xl p-3 text-[11px] space-y-1.5 shadow-2xl">
          <div className="font-bold text-slate-200 text-xs border-b border-slate-800 pb-1 flex items-center justify-between gap-2 font-mono">
            <span>Drift Corridor Model</span>
            <span className="text-[10px] text-cyan-400">95% Bayesian Confidence</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-0.5 bg-slate-200 rounded" />
            <span className="text-slate-300">Solid line: Observed historical trajectory</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-0.5 border-t border-dashed border-cyan-400" />
            <span className="text-cyan-300">Dashed line: Predicted hydrodynamic drift</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-cyan-500/20 border border-cyan-400/50" />
            <span className="text-cyan-200">Corridor: Expanding epistemic uncertainty</span>
          </div>
        </div>
      </div>

      {/* 3. Iceberg Telemetry & Drift Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Velocity & Drift Direction */}
        <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Current Velocity & Heading
          </div>
          <div className="text-xl font-extrabold text-white font-mono mt-1">
            {currentBerg.driftSpeedKts} knots
          </div>
          <div className="text-xs text-amber-400 mt-0.5 font-mono">
            Direction: {currentBerg.driftDirectionDeg}° (NW Northwest)
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-tight">
            Driven by Antarctic coastal current (0.6 kts) + katabatic surface winds (20.5 kts).
          </p>
        </div>

        {/* Card 2: Projected 48h Displacement */}
        <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Predicted Displacement (+48h)
          </div>
          <div className="text-xl font-extrabold text-white font-mono mt-1">
            {displacementKm} km NW
          </div>
          <div className="text-xs text-cyan-400 mt-0.5 font-mono">
            CPA to Route 1: {hasConflict ? '4.8 km (CRITICAL)' : '38.5 km (Safe)'}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-tight">
            Expected position on 21 Sep: 63.35°S, 60.10°W inside Bransfield shipping lane.
          </p>
        </div>

        {/* Card 3: Trajectory Confidence */}
        <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Trajectory Confidence
          </div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
            95% Corridor
          </div>
          <div className="text-xs text-slate-300 mt-0.5 font-mono">
            Uncertainty Radius: ±{currentUncertaintyRadiusKm} km
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-tight">
            Epistemic uncertainty grows +2.4 km per 24 hours of forecast horizon.
          </p>
        </div>

        {/* Card 4: Last Observation */}
        <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Last Observation
          </div>
          <div className="text-sm font-extrabold text-white font-mono mt-1 truncate">
            Sentinel-1 SAR
          </div>
          <div className="text-xs text-cyan-300 mt-0.5 font-mono">
            18 Sep 2026 • 12:30 UTC
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-tight">
            Calved from Larsen-C Ice Shelf (2017). Current area: {currentBerg.areaSqKm} km².
          </p>
        </div>
      </div>
    </div>
  );
};
