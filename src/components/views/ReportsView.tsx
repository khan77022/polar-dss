import React, { useState } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  Calendar,
  Ship,
  Printer,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Vessel } from '../../types';

interface ReportsViewProps {
  vessel: Vessel;
  isRerouted: boolean;
  onNavigateToCockpit?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ vessel, isRerouted, onNavigateToCockpit }) => {
  const [includeRoute, setIncludeRoute] = useState<boolean>(true);
  const [includeSeaIce, setIncludeSeaIce] = useState<boolean>(true);
  const [includeIcebergs, setIncludeIcebergs] = useState<boolean>(true);
  const [includeRisk, setIncludeRisk] = useState<boolean>(true);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generated, setGenerated] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    setExportNotice(null);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerated(true);
    }, 500);
  };

  const handleExport = () => {
    setExportNotice('Exported: POLAR_DSS_Passage_Briefing.pdf');
    setTimeout(() => setExportNotice(null), 3500);
  };

  return (
    <div id="reports-view" className="flex-1 flex flex-col p-4 sm:p-6 gap-6 overflow-y-auto max-w-5xl mx-auto w-full bg-[#060b14] text-slate-100">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
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
                PASSAGE BRIEFING & IMO POLAR CODE REPORTS
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                IMO POLARIS AUDIT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Standardized operational passage briefings, ice-navigator checklists, and risk assessments.
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-cyan-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
          ISEA-44 / NCPOR POLAR REGIME
        </div>
      </div>

      {/* 2. Checklist Form */}
      <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 font-mono flex items-center justify-between">
          <span>Select Sections to Compile</span>
          <span className="text-slate-400 font-normal">POLARIS Compliance Ready</span>
        </div>

        {/* The 4 Checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium">
          <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/80 hover:bg-slate-900 cursor-pointer border border-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={includeRoute}
              onChange={(e) => setIncludeRoute(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer bg-slate-950 border-slate-700"
            />
            <div>
              <span className="font-semibold text-white block">Route Waypoint Corridor Analysis</span>
              <span className="text-[11px] text-slate-400">Waypoints, total distance, ETA, and engine fuel projections</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/80 hover:bg-slate-900 cursor-pointer border border-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={includeSeaIce}
              onChange={(e) => setIncludeSeaIce(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer bg-slate-950 border-slate-700"
            />
            <div>
              <span className="font-semibold text-white block">ConvLSTM Sea-Ice Concentration Grid</span>
              <span className="text-[11px] text-slate-400">Spatiotemporal pack ice thickness, open leads, and ice edge retreat</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/80 hover:bg-slate-900 cursor-pointer border border-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={includeIcebergs}
              onChange={(e) => setIncludeIcebergs(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer bg-slate-950 border-slate-700"
            />
            <div>
              <span className="font-semibold text-white block">Iceberg Drift & Bayesian Corridors</span>
              <span className="text-[11px] text-slate-400">A68A Megaberg CPA, drift velocity, and 95% uncertainty envelope</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/80 hover:bg-slate-900 cursor-pointer border border-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={includeRisk}
              onChange={(e) => setIncludeRisk(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer bg-slate-950 border-slate-700"
            />
            <div>
              <span className="font-semibold text-white block">Escapeability & POLARIS Risk Score</span>
              <span className="text-[11px] text-slate-400">Safe exit vectors, hull pressure margin (1.8 MPa), and contingency plans</span>
            </div>
          </label>
        </div>

        {/* Generate Button */}
        <div className="pt-2 flex items-center justify-between">
          <button
            id="btn-generate-report"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-bold text-xs shadow-md shadow-cyan-950 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Compiling Briefing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                <span>Compile Official Briefing</span>
              </>
            )}
          </button>

          {exportNotice && (
            <span className="text-xs text-emerald-400 font-mono font-semibold animate-pulse">
              ✓ {exportNotice}
            </span>
          )}
        </div>
      </div>

      {/* 3. Generated Report Preview */}
      {generated && (
        <div className="bg-[#0b1424] border border-cyan-800/60 rounded-xl p-6 shadow-xl space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div>
              <h2 className="text-base font-bold text-white font-mono">
                PASSAGE BRIEFING: VOYAGE ISEA-44-ANT
              </h2>
              <p className="text-xs text-slate-400">
                Generated: 26 Sep 2026 • 14:00 UTC | Vessel: {vessel.name} ({vessel.polarClass})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Committed Route</span>
              <strong className="text-white text-sm font-mono mt-0.5 block">
                {isRerouted ? 'Route 2 (Western Bypass)' : 'Route 1 (Direct Track)'}
              </strong>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Total Distance</span>
              <strong className="text-white text-sm font-mono mt-0.5 block">
                {isRerouted ? '420 km (227 nm)' : '380 km (205 nm)'}
              </strong>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Diesel Projected</span>
              <strong className="text-emerald-400 text-sm font-mono mt-0.5 block">
                {isRerouted ? '1,180 Litres (-270L)' : '1,450 Litres'}
              </strong>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">A68A Megaberg CPA</span>
              <strong className={`text-sm font-mono mt-0.5 block ${isRerouted ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isRerouted ? '38.5 km (Safe)' : '4.8 km (HAZARD)'}
              </strong>
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-2 text-slate-300">
            <h3 className="font-bold text-white uppercase tracking-wider font-mono text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Master Navigation Assessment:
            </h3>
            <p className="leading-relaxed">
              Vessel is cleared for transit along Route 2 Western Bypass. Megaberg A68A drift velocity of 1.6 kts towards 310° Northwest is safely cleared by 38.5 km. Vanguard scout vessel <strong>PRV Sagar Dhruv</strong> has confirmed open leads in the Gerlache approach with floe thickness &lt;0.95m. Maximum hull pressure is calculated at 1.8 MPa, well within the PC3 Polar Class safety envelope.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
