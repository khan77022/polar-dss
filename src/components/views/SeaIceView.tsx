import React, { useState } from 'react';
import {
  Snowflake,
  Layers,
  CheckCircle2,
  Calendar,
  Clock,
  Compass,
  Info,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { AntarcticMap } from '../AntarcticMap';
import { Vessel, Iceberg } from '../../types';
import { ROUTE_REROUTED } from '../../data/polarData';

interface SeaIceViewProps {
  vessel: Vessel;
  icebergs: Iceberg[];
  selectedIcebergId: string | null;
  onSelectIceberg: (id: string) => void;
  timelineStep: number;
  onNavigateToCockpit?: () => void;
}

export const SeaIceView: React.FC<SeaIceViewProps> = ({
  vessel,
  icebergs,
  selectedIcebergId,
  onSelectIceberg,
  timelineStep: initialTimelineStep,
  onNavigateToCockpit,
}) => {
  const [region, setRegion] = useState<string>('Prydz Bay / Larsemann Hills');
  const [forecastHorizon, setForecastHorizon] = useState<string>('+24h');
  const [localStep, setLocalStep] = useState<number>(3);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedSuccess, setGeneratedSuccess] = useState<boolean>(false);

  // Forecast Horizons: Current, +6h, +12h, +24h, +48h
  const horizons = [
    { label: 'Current', step: 0, time: '18 Sep 14:00' },
    { label: '+6h', step: 1, time: '18 Sep 20:00' },
    { label: '+12h', step: 2, time: '19 Sep 02:00' },
    { label: '+24h', step: 3, time: '19 Sep 14:00' },
    { label: '+48h', step: 4, time: '20 Sep 14:00' },
  ];

  const horizonData: Record<
    string,
    { meanConcentration: string; risk: 'Low' | 'Medium' | 'High'; confidence: string; iceEdgeTrend: string }
  > = {
    Current: { meanConcentration: '44%', risk: 'Low', confidence: 'Observed (98%)', iceEdgeTrend: 'Stable' },
    '+6h': { meanConcentration: '49%', risk: 'Low', confidence: 'ConvLSTM (95%)', iceEdgeTrend: 'Slow northward advance' },
    '+12h': { meanConcentration: '55%', risk: 'Medium', confidence: 'ConvLSTM (91%)', iceEdgeTrend: 'Coastal leads narrowing' },
    '+24h': { meanConcentration: '64%', risk: 'Medium', confidence: 'ConvLSTM (87%)', iceEdgeTrend: 'High pack ice advancing from shelf' },
    '+48h': { meanConcentration: '73%', risk: 'High', confidence: 'ConvLSTM (82%)', iceEdgeTrend: 'Pack convergence closing eastern channel' },
  };

  const currentStats = horizonData[forecastHorizon] || horizonData['+24h'];

  const handleSelectHorizon = (h: { label: string; step: number }) => {
    setForecastHorizon(h.label);
    setLocalStep(h.step);
    setGeneratedSuccess(false);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setGeneratedSuccess(false);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedSuccess(true);
    }, 600);
  };

  return (
    <div id="sea-ice-view" className="flex-1 flex flex-col p-4 sm:p-6 gap-4 overflow-y-auto max-w-7xl mx-auto w-full bg-[#060b14] text-slate-100">
      {/* 1. Header */}
      <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-3">
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
                SEA-ICE CONCENTRATION FORECAST
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                ConvLSTM MODEL
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Spatiotemporal sea-ice concentration prediction, marginal ice zone tracking & ice edge boundary evolution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>ConvLSTM Spatiotemporal Grid (25 km Resolution)</span>
        </div>
      </div>

      {/* 2. Main Grid: Controls on Left, Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[520px]">
        {/* Controls Card (4 cols) */}
        <div className="lg:col-span-4 bg-[#0b1424] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Snowflake className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Prediction Parameters
              </h2>
            </div>

            {/* Region Dropdown */}
            <div className="relative z-30">
              <label htmlFor="sea-ice-region-select" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">
                Antarctic Region
              </label>
              <select
                id="sea-ice-region-select"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-white shadow-inner focus:outline-hidden focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="Prydz Bay / Larsemann Hills">Prydz Bay / Larsemann Hills (Bharati Station)</option>
                <option value="Queen Maud Land / India Bay">Queen Maud Land / India Bay (Maitri Base)</option>
                <option value="Amery Ice Shelf Marginal Sea">Amery Ice Shelf Marginal Sea (D28 Calving Zone)</option>
                <option value="Princess Astrid Coast Passage">Princess Astrid Coast Fast-Ice Passage</option>
              </select>
            </div>

            {/* Prediction Timeline Buttons: Current, +6h, +12h, +24h, +48h */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between uppercase tracking-wider text-[10px]">
                <span>Forecast Horizon</span>
                <span className="text-[10px] font-mono text-cyan-400 font-normal">Step: {localStep + 1} of 5</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {horizons.map((h) => (
                  <button
                    key={h.label}
                    type="button"
                    onClick={() => handleSelectHorizon(h)}
                    className={`py-2 px-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer text-center ${
                      forecastHorizon === h.label
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-950 scale-102'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    <div>{h.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ice Environment Categories Readout */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
              <div className="font-semibold text-slate-200 flex items-center justify-between font-mono">
                <span>Ice Concentration Scale:</span>
                <span className="text-[10px] text-cyan-400">Sentinel-1 SAR</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="p-2 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-emerald-200">
                  <div className="font-bold">Low (0-30%)</div>
                  <div className="text-slate-400 mt-0.5">Navigable leads</div>
                </div>
                <div className="p-2 bg-sky-950/40 border border-sky-800/50 rounded-lg text-sky-200">
                  <div className="font-bold">MIZ (30-65%)</div>
                  <div className="text-slate-400 mt-0.5">Fractured pack</div>
                </div>
                <div className="p-2 bg-rose-950/40 border border-rose-800/50 rounded-lg text-rose-200">
                  <div className="font-bold">High (&gt;65%)</div>
                  <div className="text-slate-400 mt-0.5">Heavy pack ice</div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-200 leading-snug">
              <strong>Evolution Trend ({forecastHorizon}):</strong> {currentStats.iceEdgeTrend}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-slate-800 mt-4 space-y-2">
            {generatedSuccess && (
              <div className="text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/50 rounded-lg p-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Updated spatiotemporal prediction loaded for {forecastHorizon}.</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950 cursor-pointer transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating Spatiotemporal Grid...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Run ConvLSTM Prediction</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Map Workspace (8 cols) */}
        <div className="lg:col-span-8 bg-[#0b1424] border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-3 bg-[#0e1a30] border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="font-bold text-white uppercase">{region}</span>
              <span className="text-slate-400">• Horizon: {forecastHorizon}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span>Mean Conc: <strong className="text-white">{currentStats.meanConcentration}</strong></span>
              <span>Confidence: <strong className="text-emerald-400">{currentStats.confidence}</strong></span>
            </div>
          </div>

          <div className="flex-1 w-full relative min-h-[440px]">
            <AntarcticMap
              vessel={vessel}
              icebergs={icebergs}
              selectedIcebergId={selectedIcebergId}
              onSelectIceberg={onSelectIceberg}
              timelineStep={localStep}
              currentRoute={ROUTE_REROUTED}
              isRerouted={true}
              hasConflict={false}
              className="w-full h-full"
              showSimControls={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
