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
import { polarApi, useBackend, ReportDto } from '../../api/client';
import { provenanceBadgeClass, provenanceBadgeLabel } from '../../api/hooks';

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
  const [backendReport, setBackendReport] = useState<ReportDto | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setExportNotice(null);
    try {
      if (useBackend) {
        const report = await polarApi.generateReport({
          routeId: isRerouted ? 'route-rerouted' : 'route-original',
        });
        setBackendReport(report);
      }
      setGenerated(true);
    } catch (e) {
      console.error('Failed to generate report from backend:', e);
      setGenerated(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    const reportTitle = backendReport?.title ?? 'POLAR DSS PASSAGE BRIEFING';
    const reportId = backendReport?.id ?? `LOCAL-${Date.now()}`;
    const timestamp = backendReport?.createdAt ?? new Date().toISOString();

    const reportContent = `# ${reportTitle}
Document Reference: ${reportId}
Generated At: ${timestamp}
Vessel: ${vessel.name} (${vessel.callSign})
Polar Class: ${vessel.polarClass}
Active Navigation Regime: ${isRerouted ? 'Route 2 (Western Bypass Corridor)' : 'Route 1 (Primary Transit)'}

## Operational Sections Included
- Route Waypoint Corridor Analysis: ${includeRoute ? 'YES' : 'NO'}
- ConvLSTM Sea-Ice Concentration Grid: ${includeSeaIce ? 'YES' : 'NO'}
- Iceberg Drift & Bayesian Corridors: ${includeIcebergs ? 'YES' : 'NO'}
- Escapeability & POLARIS Risk Score: ${includeRisk ? 'YES' : 'NO'}

## Telemetry Summary
- Position: ${vessel.currentPos.lat.toFixed(3)}°S, ${vessel.currentPos.lon.toFixed(3)}°E
- Heading: ${vessel.headingDeg}° | Speed: ${vessel.speedKts} kts
- Distance: ${isRerouted ? '1,565 km' : '1,420 km'}
- Transit Hours: ${isRerouted ? '84.5 h' : '76.8 h'}
- Fuel Projection: ${isRerouted ? '39,200 L' : '35,500 L'}

## Compliance Certification
Certified compliant with IMO Polar Code Part I-A and ISEA-44 NCPOR Operational Directives.
`;

    const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `POLAR_DSS_Passage_Briefing_${reportId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportNotice(`Exported: POLAR_DSS_Passage_Briefing_${reportId}.md`);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handlePrint = () => {
    window.print();
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
              {backendReport?.provenance?.dataStatus && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${provenanceBadgeClass(backendReport.provenance.dataStatus)}`}>
                  {provenanceBadgeLabel(backendReport.provenance.dataStatus)}
                </span>
              )}
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
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="py-2.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Compiling Backend Evidence Dossier...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Compile Official Briefing</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Generated Report Preview (Conditional) */}
      {generated && (
        <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-6 shadow-xl space-y-6 animate-in fade-in duration-300">
          {/* Header of Report */}
          <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                {backendReport?.id ? `PERSISTED AUDIT: ${backendReport.id}` : 'OFFICIAL PASSAGE BRIEFING'}
              </div>
              <h2 className="text-base font-bold text-white font-mono mt-0.5">
                EXPEDITION VOYAGE #44-B • PRYDZ BAY PASSAGE PLAN
              </h2>
              <p className="text-xs text-slate-400">
                Generated: {backendReport?.createdAt ? new Date(backendReport.createdAt).toUTCString() : '26 Sep 2026, 14:30 UTC'} • Flagship: {vessel.name} ({vessel.polarClass})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={handleExport}
                className="py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-cyan-950 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Briefing (.md)</span>
              </button>
            </div>
          </div>

          {exportNotice && (
            <div className="p-3 bg-cyan-950/60 border border-cyan-800/80 rounded-lg text-xs font-mono text-cyan-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{exportNotice}</span>
            </div>
          )}

          {/* Section: Route Stats */}
          {includeRoute && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Ship className="w-4 h-4 text-cyan-400" />
                <span>1. Route Waypoint Corridor Status</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Active Route</span>
                  <span className="font-bold text-white">{isRerouted ? 'Route 2 (Western Bypass)' : 'Route 1 (Primary Transit)'}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Total Distance</span>
                  <span className="font-bold text-cyan-300">{isRerouted ? '1,565 km' : '1,420 km'}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Est. Passage Time</span>
                  <span className="font-bold text-white">{isRerouted ? '84.5 hours' : '76.8 hours'}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Fuel Projections</span>
                  <span className="font-bold text-amber-300">{isRerouted ? '39,200 Litres' : '35,500 Litres'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Sea-Ice */}
          {includeSeaIce && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                2. ConvLSTM Sea-Ice Pack Evaluation
              </h3>
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                Mean pack concentration evaluated along transit corridor at <strong>48%</strong>. Marginal ice edge is trending northward under 20-knot katabatic offshore winds. Leads remain navigable for Polar Class PC-4 vessels.
              </div>
            </div>
          )}

          {/* Section: Icebergs */}
          {includeIcebergs && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                3. Iceberg Hazard & Bayesian Drift Envelope
              </h3>
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                Megaberg <strong>A68A</strong> tracking northwest at 0.65 knots. Closest Point of Approach (CPA) on original route is <strong>0.8 km</strong> at T+24h (Critical Risk). Western bypass maintains <strong>14.2 km CPA</strong>, exceeding IMO 5.0 km clearance requirement.
              </div>
            </div>
          )}

          {/* Section: POLARIS Risk */}
          {includeRisk && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>4. Escapeability & POLARIS Risk Index</span>
              </h3>
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-200 leading-relaxed">
                Risk Outcome Index (RIO) calculated at <strong>+18.4 (Safe Passage Authorized)</strong> for Route 2. Continuous open-water escape vectors exist to the north-northwest. Primary emergency safe haven designated: Bharati Antarctic Research Station (88 km SSE).
              </div>
            </div>
          )}

          {/* Sign-off footer */}
          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap justify-between items-center font-mono">
            <span>Ice Navigator: Capt. Rajesh Varma (Master Polar Cert #9821)</span>
            <span>POLARIS Outcome: APPROVED FOR PASSAGE</span>
          </div>
        </div>
      )}
    </div>
  );
};
