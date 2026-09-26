import React from 'react';
import {
  Snowflake,
  TriangleAlert,
  Route,
  Wind,
  FileText,
  ArrowRight,
  Compass,
  Ship,
} from 'lucide-react';
import { AntarcticMap } from '../AntarcticMap';
import {
  Iceberg,
  Vessel,
  RouteOption,
  NavPage,
} from '../../types';

interface DashboardViewProps {
  vessel: Vessel;
  icebergs: Iceberg[];
  selectedIcebergId: string | null;
  onSelectIceberg: (id: string) => void;
  timelineStep: number;
  currentRoute: RouteOption;
  isRerouted: boolean;
  hasConflict: boolean;
  onRecalculateRoute: () => void;
  isRecalculating: boolean;
  onNavigate: (page: NavPage) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  vessel,
  icebergs,
  selectedIcebergId,
  onSelectIceberg,
  timelineStep,
  currentRoute,
  isRerouted,
  hasConflict,
  onRecalculateRoute,
  isRecalculating,
  onNavigate,
}) => {
  // Navigation options (Max 5, clean with icon + title + 1-line description)
  const analysisOptions = [
    {
      id: 'sea-ice' as NavPage,
      title: 'Sea-Ice Forecast',
      description: 'Predict spatiotemporal sea-ice concentration and navigable lead channels.',
      icon: Snowflake,
      accent: 'text-cyan-600 bg-cyan-50 border-cyan-200 group-hover:border-cyan-400',
    },
    {
      id: 'iceberg-tracking' as NavPage,
      title: 'Iceberg Tracking',
      description: 'Track observed and predicted drift trajectories with widening uncertainty envelopes.',
      icon: TriangleAlert,
      accent: 'text-amber-600 bg-amber-50 border-amber-200 group-hover:border-amber-400',
    },
    {
      id: 'route-planning' as NavPage,
      title: 'Route Planning',
      description: 'Calculate multi-objective fuel-aware routes avoiding iceberg hazards and heavy pack ice.',
      icon: Route,
      accent: 'text-blue-600 bg-blue-50 border-blue-200 group-hover:border-blue-400',
    },
    {
      id: 'weather' as NavPage,
      title: 'Weather & Ocean',
      description: 'Inspect wind vectors, sea surface temperatures, swell heights, and visibility.',
      icon: Wind,
      accent: 'text-indigo-600 bg-indigo-50 border-indigo-200 group-hover:border-indigo-400',
    },
    {
      id: 'reports' as NavPage,
      title: 'Reports',
      description: 'Compile and export standardized operational passage briefings and risk assessments.',
      icon: FileText,
      accent: 'text-emerald-600 bg-emerald-50 border-emerald-200 group-hover:border-emerald-400',
    },
  ];

  return (
    <div id="dashboard-view" className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* 1. Header Greeting & Direction */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                POLAR DSS
              </h1>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Antarctic Navigation Decision Support System
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Good afternoon. What would you like to analyze?
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              DEMO / SIMULATED DATA
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Central Workspace: Selection Cards on Left, Compact Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* Left Column: Maximum 5 Clean Analysis Cards */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Analysis Modules
          </div>

          {analysisOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                id={`btn-analyze-${opt.id}`}
                onClick={() => onNavigate(opt.id)}
                className="group w-full p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-lg shadow-2xs hover:shadow-xs transition-all flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-start gap-3.5 min-w-0 pr-2">
                  <div
                    className={`w-10 h-10 rounded-md border flex items-center justify-center shrink-0 transition-colors ${opt.accent}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {opt.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                      {opt.description}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 flex items-center justify-center shrink-0 transition-colors">
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Small Antarctic Map Navigation Overview */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Antarctic Geographic Overview
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Sector: Indian Antarctic (Maitri & Bharati)
            </span>
          </div>

          <div className="h-[380px] sm:h-[420px] rounded-lg overflow-hidden border border-slate-200 shadow-xs relative">
            <AntarcticMap
              vessel={vessel}
              icebergs={icebergs}
              selectedIcebergId={selectedIcebergId}
              onSelectIceberg={onSelectIceberg}
              timelineStep={timelineStep}
              currentRoute={currentRoute}
              isRerouted={isRerouted}
              hasConflict={hasConflict}
              onRecalculateRoute={onRecalculateRoute}
              isRecalculating={isRecalculating}
              className="h-full w-full"
            />
          </div>

          {/* Quick Context Strip */}
          <div className="p-3 bg-white rounded-md border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Ship className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-800">{vessel.name}</span>
              <span className="text-slate-400 font-mono">•</span>
              <span className="text-slate-600 font-mono">
                {Math.abs(vessel.currentPos.lat).toFixed(1)}°S, {Math.abs(vessel.currentPos.lon).toFixed(1)}°W
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-500">
              <span>Destination: <strong className="text-slate-700">{vessel.destination.split(' ')[0]}</strong></span>
              <span>Speed: <strong className="text-slate-700">{vessel.speedKts} kts</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
