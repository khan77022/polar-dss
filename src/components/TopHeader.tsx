import React from 'react';
import { ShieldAlert, CheckCircle2, Home, Bot } from 'lucide-react';
import { NavPage } from '../types';

interface TopHeaderProps {
  currentPage: NavPage;
  currentDateLabel: string;
  currentTimeUtc: string;
  hasConflict: boolean;
  isRerouted?: boolean;
  onResetRoute?: () => void;
  onReturnToLanding?: () => void;
  onToggleChatbot?: () => void;
}

const PAGE_TITLES: Record<NavPage, { title: string; subtitle: string }> = {
  cockpit: {
    title: 'Mission Cockpit',
    subtitle: 'Integrated satellite map and Antarctic decision support system',
  },
  dashboard: {
    title: 'Application Home',
    subtitle: 'Select an operational module to initiate polar navigation analysis',
  },
  'route-planning': {
    title: 'Route Planning',
    subtitle: 'Find a safe, ice-aware, and fuel-efficient navigation track',
  },
  'sea-ice': {
    title: 'Sea-Ice Forecast',
    subtitle: 'Forecast Antarctic sea-ice concentration and navigable channels',
  },
  'iceberg-tracking': {
    title: 'Iceberg Tracking',
    subtitle: 'Drift trajectory forecasting and probability uncertainty corridors',
  },
  weather: {
    title: 'Weather & Ocean',
    subtitle: 'Polar meteorological conditions and surface sea-state observations',
  },
  'fleet-recon': {
    title: 'Vanguard Fleet Recon',
    subtitle: 'Ahead-of-route vessel mesh and tactical pilot reports (V-PIREP)',
  },
  reports: {
    title: 'Navigation Reports',
    subtitle: 'Operational passage briefings and risk assessment exports',
  },
  'model-performance': {
    title: 'Model Information',
    subtitle: 'Architecture and validation benchmarks for predictive components',
  },
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentPage,
  currentDateLabel,
  currentTimeUtc,
  hasConflict,
  isRerouted,
  onResetRoute,
  onReturnToLanding,
  onToggleChatbot,
}) => {
  const pageMeta = PAGE_TITLES[currentPage] || PAGE_TITLES.dashboard;

  return (
    <header
      id="top-header"
      className="h-14 min-h-[56px] max-h-[56px] bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between z-10 shrink-0 select-none"
    >
      {/* Left title & subtitle */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
            {pageMeta.title}
          </h2>
          {hasConflict && currentPage === 'route-planning' && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <ShieldAlert className="w-3 h-3 text-amber-600" />
              Conflict Detected
            </span>
          )}
          {isRerouted && currentPage === 'route-planning' && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Bypass Engaged
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 font-normal leading-normal truncate mt-0.5">
          {pageMeta.subtitle}
        </p>
      </div>

      {/* Right meta status */}
      <div className="flex items-center gap-3 sm:gap-4 text-xs">
        {isRerouted && onResetRoute && currentPage === 'route-planning' && (
          <button
            onClick={onResetRoute}
            className="text-[11px] font-medium text-slate-500 hover:text-blue-600 underline transition-colors cursor-pointer"
            title="Reset to initial hazard state to replay recalculation"
          >
            Reset Conflict Demo
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1.5 text-slate-500 text-xs font-mono">
          <span>{currentDateLabel}</span>
          <span className="text-slate-300">•</span>
          <span>{currentTimeUtc}</span>
        </div>

        {/* AI Chatbot Launcher */}
        {onToggleChatbot && (
          <button
            id="btn-top-chatbot"
            onClick={onToggleChatbot}
            className="px-2.5 py-1 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-600 hover:to-sky-500 text-white rounded shadow-xs text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open ध्रुव-AI Polar Tactical Navigation Assistant"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ध्रुव-AI Copilot</span>
          </button>
        )}

        {/* Small Simulated Data Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          <span>SIMULATED DATA</span>
        </div>

        {/* Exit to Landing */}
        {onReturnToLanding && (
          <button
            onClick={onReturnToLanding}
            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Return to Welcome Landing Screen"
          >
            <Home className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Welcome Screen</span>
          </button>
        )}
      </div>
    </header>
  );
};
