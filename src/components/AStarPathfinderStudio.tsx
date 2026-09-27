import React, { useState, useEffect } from 'react';
import {
  Compass,
  Ship,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Zap,
  Info,
  ArrowRight,
  ShieldCheck,
  X,
  Gauge,
  Waves,
} from 'lucide-react';
import {
  PRESET_VESSEL_PROFILES,
  VesselProfile,
  PolarGisGrid,
  generatePolarGisGrid,
  runAStarOnGisGrid,
  AStarSearchResult,
} from '../gis/polarGrid';
import { LatLon } from '../types';

interface AStarPathfinderStudioProps {
  onApplyRoute?: (result: AStarSearchResult, compareResult?: AStarSearchResult | null) => void;
  onClose?: () => void;
  gisGrid: PolarGisGrid;
}

const ROUTE_PRESETS: { id: string; label: string; origin: LatLon; destination: LatLon; desc: string }[] = [
  {
    id: 'full-expedition',
    label: 'Maxwell Bay ➔ Rothera Station (Full Antarctic Voyage)',
    origin: { lat: -62.30, lon: -59.00 },
    destination: { lat: -67.57, lon: -68.12 },
    desc: 'Passage through Bransfield Strait, Boyd Strait bypass, and Bellingshausen deep ocean trench into Marguerite Bay.',
  },
  {
    id: 'shallow-sound-challenge',
    label: 'Inshore Archipelago ➔ Lemaire Channel (Depth & Width Test)',
    origin: { lat: -64.40, lon: -62.80 },
    destination: { lat: -65.50, lon: -64.30 },
    desc: 'Critical test passage: Narrow sound has 10.5m depth and 85m width. Small vessels (draft 2.2m) pass easily; heavy vessels (draft 10.2m) are blocked and must divert offshore!',
  },
  {
    id: 'boyd-bypass-test',
    label: 'Central Bransfield ➔ Bellingshausen Open Sea (A68A Avoidance)',
    origin: { lat: -62.75, lon: -59.80 },
    destination: { lat: -64.85, lon: -66.20 },
    desc: 'Deep-water transit through Boyd Strait avoiding the A68A megaberg collision buffer.',
  },
];

export const AStarPathfinderStudio: React.FC<AStarPathfinderStudioProps> = ({
  onApplyRoute,
  onClose,
  gisGrid,
}) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string>('heavy-icebreaker');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('shallow-sound-challenge');

  // Custom vessel override state
  const [customDraft, setCustomDraft] = useState<number>(10.2);
  const [customBeam, setCustomBeam] = useState<number>(22.8);
  const [customIceCapability, setCustomIceCapability] = useState<number>(2.5);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // A* Options
  const [avoidIcebergs, setAvoidIcebergs] = useState<boolean>(true);
  const [underkeelMargin, setUnderkeelMargin] = useState<number>(2.0);
  const [compareSmallVsHeavy, setCompareSmallVsHeavy] = useState<boolean>(true);

  // Execution Results
  const [primaryResult, setPrimaryResult] = useState<AStarSearchResult | null>(null);
  const [compareResult, setCompareResult] = useState<AStarSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Active vessel profile
  const activeProfile: VesselProfile = React.useMemo(() => {
    if (isCustomMode) {
      return {
        id: 'custom-vessel',
        name: `Custom Vessel (Draft ${customDraft}m, Beam ${customBeam}m)`,
        category: customDraft < 4.0 ? 'small' : customDraft < 8.0 ? 'medium' : customDraft < 12.0 ? 'heavy' : 'super',
        lengthM: customDraft * 15,
        beamM: customBeam,
        draftM: customDraft,
        icebreakingCapabilityM: customIceCapability,
        cruisingSpeedKts: 12.0,
        fuelRateLPerHour: Math.round(customDraft * 14),
        color: '#f43f5e',
        badge: 'CUSTOM SPECS',
        description: `Custom vessel specifications: Under-water draft ${customDraft}m, beam width ${customBeam}m, icebreaking ${customIceCapability}m.`,
      };
    }
    const found = PRESET_VESSEL_PROFILES.find((p) => p.id === selectedProfileId);
    return found || PRESET_VESSEL_PROFILES[2];
  }, [selectedProfileId, isCustomMode, customDraft, customBeam, customIceCapability]);

  const activePreset = ROUTE_PRESETS.find((p) => p.id === selectedPresetId) || ROUTE_PRESETS[0];

  // Auto-run A* calculation
  const executeAStarSearch = () => {
    setIsSearching(true);

    setTimeout(() => {
      // 1. Run primary A* search
      const result = runAStarOnGisGrid(
        gisGrid,
        activePreset.origin,
        activePreset.destination,
        activeProfile,
        {
          avoidIcebergs,
          safetyMarginM: underkeelMargin,
        }
      );
      setPrimaryResult(result);

      // 2. If comparison enabled, run small scout comparison
      let compRes: AStarSearchResult | null = null;
      if (compareSmallVsHeavy && activeProfile.id !== 'small-scout') {
        compRes = runAStarOnGisGrid(
          gisGrid,
          activePreset.origin,
          activePreset.destination,
          PRESET_VESSEL_PROFILES[0], // Small scout
          {
            avoidIcebergs,
            safetyMarginM: 1.5,
          }
        );
        setCompareResult(compRes);
      } else {
        setCompareResult(null);
      }

      setIsSearching(false);

      if (onApplyRoute) {
        onApplyRoute(result, compRes);
      }
    }, 50);
  };

  // Run on mount or preset/profile change
  useEffect(() => {
    executeAStarSearch();
  }, [selectedProfileId, selectedPresetId, isCustomMode, customDraft, customBeam, customIceCapability, compareSmallVsHeavy, avoidIcebergs, underkeelMargin]);

  return (
    <div className="flex flex-col h-full bg-[#080d1a] border border-cyan-800/80 rounded-2xl shadow-2xl text-slate-100 overflow-hidden text-xs">
      {/* 1. Header with Title & Dismiss */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d1627] border-b border-cyan-800/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-400">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-mono tracking-wide text-white">
                A* GIS SPATIAL PATHFINDER ENGINE
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                2D RASTER GRID: {gisGrid.rows}×{gisGrid.cols} NODES
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Parametric spatial A* pathfinding. Evaluates water depth, fairway width, ice thickness, and land obstacles.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 2. Vessel Profile Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Ship className="w-3.5 h-3.5" />
              <span>Select Vessel Class & Physical Dimensions</span>
            </label>
            <button
              onClick={() => setIsCustomMode(!isCustomMode)}
              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                isCustomMode
                  ? 'bg-rose-950 text-rose-300 border-rose-600'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              {isCustomMode ? '⚙️ Custom Spec Active' : '✏️ Configure Custom Specs'}
            </button>
          </div>

          {!isCustomMode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {PRESET_VESSEL_PROFILES.map((profile) => {
                const isSelected = selectedProfileId === profile.id;
                return (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-400 shadow-md ring-1 ring-cyan-400/50'
                        : 'bg-[#0f172a]/60 hover:bg-[#15233e] border-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white text-xs truncate max-w-[130px]">
                          {profile.name.split('(')[0]}
                        </span>
                        <span
                          className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase"
                          style={{
                            backgroundColor: `${profile.color}20`,
                            color: profile.color,
                            border: `1px solid ${profile.color}50`,
                          }}
                        >
                          {profile.badge}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 font-mono text-[10px] text-slate-400 my-1 bg-slate-950/60 p-1 rounded">
                        <div>
                          Draft: <strong className="text-white">{profile.draftM}m</strong>
                        </div>
                        <div>
                          Beam: <strong className="text-white">{profile.beamM}m</strong>
                        </div>
                        <div>
                          Ice: <strong className="text-cyan-300">{profile.icebreakingCapabilityM}m</strong>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                        {profile.description}
                      </p>
                    </div>

                    <div className="mt-2 text-[10px] font-mono flex items-center justify-between border-t border-slate-800/80 pt-1.5">
                      <span className="text-slate-500">Speed: {profile.cruisingSpeedKts} kts</span>
                      {isSelected ? (
                        <span className="text-cyan-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> ACTIVE
                        </span>
                      ) : (
                        <span className="text-slate-500">Select</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#0f172a] border border-rose-500/50 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-300">
                <span>Custom Vessel Parameter Simulator</span>
                <span className="text-[10px] text-slate-400">
                  Slide parameters to test how A* adapts to size
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Draft Slider */}
                <div>
                  <div className="flex justify-between font-mono text-xs mb-1">
                    <span className="text-slate-300">Under-Water Draft:</span>
                    <strong className="text-rose-400">{customDraft.toFixed(1)} m</strong>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="18.0"
                    step="0.2"
                    value={customDraft}
                    onChange={(e) => setCustomDraft(parseFloat(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500 flex justify-between font-mono mt-0.5">
                    <span>1.0m (Zodiac)</span>
                    <span>10m (Icebreaker)</span>
                    <span>18m (Mega Tanker)</span>
                  </div>
                </div>

                {/* Beam Slider */}
                <div>
                  <div className="flex justify-between font-mono text-xs mb-1">
                    <span className="text-slate-300">Vessel Beam (Width):</span>
                    <strong className="text-amber-400">{customBeam.toFixed(1)} m</strong>
                  </div>
                  <input
                    type="range"
                    min="5.0"
                    max="40.0"
                    step="0.5"
                    value={customBeam}
                    onChange={(e) => setCustomBeam(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500 flex justify-between font-mono mt-0.5">
                    <span>5m (Small)</span>
                    <span>23m (Standard)</span>
                    <span>40m (Wide Beam)</span>
                  </div>
                </div>

                {/* Icebreaking Slider */}
                <div>
                  <div className="flex justify-between font-mono text-xs mb-1">
                    <span className="text-slate-300">Max Ice Breaking:</span>
                    <strong className="text-cyan-400">{customIceCapability.toFixed(1)} m</strong>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.5"
                    step="0.1"
                    value={customIceCapability}
                    onChange={(e) => setCustomIceCapability(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500 flex justify-between font-mono mt-0.5">
                    <span>0.2m (Leads only)</span>
                    <span>1.5m (PC4)</span>
                    <span>3.5m (Nuclear/Arc7)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Preset Scenario Selector */}
        <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-3 space-y-2">
          <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Select Navigation Route Scenario</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-normal">
              Origin ➔ Destination
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ROUTE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedPresetId(preset.id)}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                  selectedPresetId === preset.id
                    ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-xs'
                    : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="font-bold text-xs truncate">{preset.label}</div>
                <div className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-snug">
                  {preset.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. A* Settings & Comparison Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a1220] border border-slate-800 rounded-xl p-2.5 px-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer font-mono text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={avoidIcebergs}
                onChange={(e) => setAvoidIcebergs(e.target.checked)}
                className="cursor-pointer accent-cyan-500"
              />
              <span>Avoid Megaberg A68A Buffer</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-mono text-[11px] text-emerald-300">
              <input
                type="checkbox"
                checked={compareSmallVsHeavy}
                onChange={(e) => setCompareSmallVsHeavy(e.target.checked)}
                className="cursor-pointer accent-emerald-500"
              />
              <span className="font-bold">⚡ Compare Small vs Heavy Ship Path</span>
            </label>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-400">Underkeel Margin:</span>
            <select
              value={underkeelMargin}
              onChange={(e) => setUnderkeelMargin(parseFloat(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white cursor-pointer"
            >
              <option value="1.0">1.0 m</option>
              <option value="2.0">2.0 m (Standard)</option>
              <option value="3.0">3.0 m (Safety)</option>
            </select>
          </div>
        </div>

        {/* 5. A* Search Execution Results */}
        {primaryResult && (
          <div className="space-y-3">
            <div className="flex items-center justify-between font-mono">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>A* Search Pathfinding Telemetry</span>
              </span>
              <span className="text-slate-400 text-[10px]">
                Solved in <strong className="text-emerald-400">{primaryResult.executionTimeMs} ms</strong> • Evaluated <strong className="text-cyan-400">{primaryResult.nodesEvaluated}</strong> grid nodes
              </span>
            </div>

            {/* Results Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Primary Vessel Result */}
              <div className={`p-3 rounded-xl border ${primaryResult.success ? 'bg-[#0a1626] border-cyan-600/70' : 'bg-rose-950/40 border-rose-700'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeProfile.color }} />
                    <strong className="text-white text-xs">{activeProfile.name}</strong>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    primaryResult.success ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' : 'bg-rose-900 text-rose-200'
                  }`}>
                    {primaryResult.success ? 'FEASIBLE ROUTE SOLVED' : 'BLOCKED / NO PATH'}
                  </span>
                </div>

                {primaryResult.success ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 font-mono text-center bg-slate-950/60 p-2 rounded-lg">
                      <div>
                        <div className="text-[10px] text-slate-400">Voyage Distance</div>
                        <div className="text-sm font-bold text-white">{primaryResult.distanceKm} km</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Transit Time</div>
                        <div className="text-sm font-bold text-cyan-300">{primaryResult.timeHours} hrs</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Diesel Consumption</div>
                        <div className="text-sm font-bold text-amber-300">{primaryResult.fuelLiters.toLocaleString()} L</div>
                      </div>
                    </div>

                    <div className="text-[10.5px] text-slate-300 leading-snug">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>All waypoints verified in deep navigable waters (0% Land / Glacial Intersection)</span>
                      </div>
                      <span>
                        Route generated across {primaryResult.path.length} waypoints via {primaryResult.gridPath.length} GIS spatial cells.
                      </span>
                    </div>

                    {primaryResult.bottlenecks.length > 0 && (
                      <div className="p-2 rounded bg-amber-950/40 border border-amber-600/50 text-[10px] text-amber-200 space-y-1">
                        <div className="font-bold flex items-center gap-1 text-amber-400">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Narrow Fairways Avoided by A* Router:</span>
                        </div>
                        {primaryResult.bottlenecks.map((b, idx) => (
                          <div key={idx} className="font-mono text-slate-300">
                            • Cell [{b.cell.r}, {b.cell.c}] {b.cell.name}: <span className="text-rose-300">{b.issue}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-rose-300 text-xs p-2 bg-rose-950/60 rounded">
                    <strong>Search Terminated:</strong> {primaryResult.failureReason}
                  </div>
                )}
              </div>

              {/* Comparison Vessel Result (Small Scout Launch) */}
              {compareResult && (
                <div className="p-3 rounded-xl border bg-[#061e1b] border-emerald-600/70">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <strong className="text-white text-xs">Small Survey Launch (Draft 2.2m)</strong>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600">
                      COMPARISON TRACK
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 font-mono text-center bg-slate-950/60 p-2 rounded-lg">
                      <div>
                        <div className="text-[10px] text-slate-400">Voyage Distance</div>
                        <div className="text-sm font-bold text-emerald-300">{compareResult.distanceKm} km</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Transit Time</div>
                        <div className="text-sm font-bold text-white">{compareResult.timeHours} hrs</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Diesel Consumption</div>
                        <div className="text-sm font-bold text-amber-300">{compareResult.fuelLiters.toLocaleString()} L</div>
                      </div>
                    </div>

                    <div className="text-[10.5px] text-emerald-200/90 leading-snug">
                      <div className="font-bold text-emerald-300 mb-0.5">
                        ⚡ Physical Constraint Difference:
                      </div>
                      <span>
                        With a shallow draft of 2.2m, the small vessel successfully traverses narrow coastal sounds and shallow fairways (e.g. Lemaire Channel, depth 10.5m), saving distance compared to heavy deep-draft icebreakers!
                      </span>
                    </div>

                    <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/40 text-[10px] text-emerald-200 font-mono">
                      <span>Mapped on viewport: </span>
                      <strong className="text-emerald-300">Dotted Emerald Line</strong>
                      <span> vs Primary </span>
                      <strong className="text-cyan-300">Solid Cyan Line</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. Action Footer */}
      <div className="p-3 bg-[#0d1627] border-t border-cyan-800/60 flex items-center justify-between shrink-0">
        <div className="text-[11px] text-slate-400 font-mono">
          <span>Active Vessel: </span>
          <strong className="text-white">{activeProfile.name}</strong>
          <span className="text-slate-600"> | </span>
          <span>Draft: </span>
          <strong className="text-cyan-300">{activeProfile.draftM}m</strong>
          <span className="text-slate-600"> | </span>
          <span>Min Depth Required: </span>
          <strong className="text-emerald-400">{(activeProfile.draftM + underkeelMargin).toFixed(1)}m</strong>
        </div>

        <button
          onClick={executeAStarSearch}
          disabled={isSearching}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer transition-all hover:scale-102 disabled:opacity-50"
        >
          {isSearching ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Solving Graph...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Re-Run A* Pathfinding</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
