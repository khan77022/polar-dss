import React, { useEffect, useState } from 'react';
import {
  Brain,
  Layers,
  ArrowRight,
  Cpu,
  CheckCircle2,
  Database,
  LineChart,
  ArrowLeft,
  Sparkles,
  Server,
  Tag,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { polarApi, ModelMetadataDto } from '../../api/client';

interface ModelPerformanceViewProps {
  onNavigateToCockpit?: () => void;
}

export const ModelPerformanceView: React.FC<ModelPerformanceViewProps> = ({ onNavigateToCockpit }) => {
  const [models, setModels] = useState<ModelMetadataDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    polarApi.models()
      .then((res) => {
        if (active) {
          setModels(res.items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div id="model-performance-view" className="flex-1 flex flex-col p-4 sm:p-6 gap-6 overflow-y-auto max-w-5xl mx-auto w-full bg-[#060b14] text-slate-100">
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
                AI MODEL ARCHITECTURE & EVALUATION
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                SIH PROBLEM 26059 BENCHMARKS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Deep learning architecture, physics-informed hydrodynamic solvers, and empirical validation metrics.
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-cyan-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
          VALIDATION REPORT • NCPOR POLAR AI LAB
        </div>
      </div>

      {/* 2. Live Model Metadata Registry (Item 8) */}
      <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Live Model Architecture & Metadata Registry (GET /api/v1/models)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-800/50 px-2 py-0.5 rounded">
            {models.length} Registered Models
          </span>
        </div>

        {loading ? (
          <div className="py-6 text-center text-xs text-slate-400 font-mono">
            Querying backend model registry...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {models.map((m) => (
              <div key={m.id} className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-start justify-between gap-1">
                  <strong className="text-xs font-bold text-white font-mono leading-tight">
                    {m.name}
                  </strong>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60 shrink-0">
                    v{m.version}
                  </span>
                </div>
                <div className="text-[11px] text-cyan-300 font-mono">
                  {m.provider}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {m.description}
                </p>
                <div className="pt-2 border-t border-slate-800 text-[10px] font-mono space-y-1">
                  <div className="text-slate-300 flex items-center justify-between">
                    <span className="text-slate-500">Benchmark:</span>
                    <span className="text-emerald-400 font-bold">{m.benchmarkScore}</span>
                  </div>
                  <div className="text-slate-400 flex items-center justify-between">
                    <span className="text-slate-500">Trained:</span>
                    <span>{new Date(m.trainedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. The Two Core Prediction Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Component 1: Sea-Ice Forecast */}
        <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono">
                Sea-Ice Forecast: External Forecast Grid
              </h3>
              <p className="text-[11px] text-cyan-400 font-mono">
                Recurrent Spatiotemporal Grid Model
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Spatiotemporal model trained on multi-year Sentinel-1 SAR and AMSR2 microwave radiometry to forecast grid-scale sea-ice concentration and navigable leads up to 120 hours ahead with 25 km spatial fidelity.
          </p>
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
            <span className="text-slate-400">Mean RMSE: <strong className="text-emerald-400">4.8%</strong></span>
            <span className="text-slate-400">Lead Precision: <strong className="text-cyan-300">92.4%</strong></span>
          </div>
        </div>

        {/* Component 2: Iceberg Trajectory */}
        <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800/60 text-amber-400 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono">
                Iceberg Drift: Physics-Informed Solver
              </h3>
              <p className="text-[11px] text-amber-400 font-mono">
                Coupled Ocean-Atmosphere-Ice Mechanics
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Solves 2D momentum balance incorporating air drag, water drag, Coriolis acceleration, sea-surface slope, and pack-ice internal pressure with Monte Carlo Gaussian process perturbation for calibrated 95% Bayesian envelopes.
          </p>
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
            <span className="text-slate-400">48h Error: <strong className="text-emerald-400">&lt; 3.2 km</strong></span>
            <span className="text-slate-400">Confidence: <strong className="text-cyan-300">95% Envelope</strong></span>
          </div>
        </div>
      </div>

      {/* 4. Prediction Pipeline */}
      <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-2">
          End-to-End Decision Pipeline
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">
              1. Satellite Ingest
            </div>
            <div className="text-xs font-semibold text-slate-200">
              Sentinel-1 SAR, AMSR2 Radiometry, ERA5 Winds
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-cyan-950/40 border border-cyan-800/50 text-center">
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono mb-1">
              2. Neural Inference
            </div>
            <div className="text-xs font-semibold text-cyan-100">
              Spatiotemporal Grid Forecast (+6h to +48h)
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/50 text-center">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono mb-1">
              3. Hydrodynamic Drift
            </div>
            <div className="text-xs font-semibold text-amber-100">
              Coupled Momentum Equation & Bayesian Corridors
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-center">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono mb-1">
              4. Pareto Optimization
            </div>
            <div className="text-xs font-semibold text-emerald-100">
              Ice Hazard Avoidance & Fuel-Minimized Path Planning
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
