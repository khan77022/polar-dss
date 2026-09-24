import React from 'react';
import {
  Compass,
  Snowflake,
  TriangleAlert,
  Route,
  Wind,
  Ship,
  FileText,
  Brain,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Bot,
  Layers,
  Activity,
} from 'lucide-react';
import { NavPage } from '../types';

interface NavigationBarProps {
  currentPage: NavPage;
  onSelectPage: (page: NavPage) => void;
  hasConflict: boolean;
  isRerouted: boolean;
  onRecalculateRoute: () => void;
  onResetRoute: () => void;
  countdownSeconds: number;
  currentDateLabel: string;
  currentTimeUtc: string;
  onToggleChatbot: () => void;
  isChatbotOpen: boolean;
  isAnalyzing?: boolean;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  currentPage,
  onSelectPage,
  hasConflict,
  isRerouted,
  onRecalculateRoute,
  onResetRoute,
  countdownSeconds,
  currentDateLabel,
  currentTimeUtc,
  onToggleChatbot,
  isChatbotOpen,
  isAnalyzing = false,
}) => {
  const formatCountdown = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const navItems: {
    id: NavPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }[] = [
    { id: 'cockpit', label: 'Mission Cockpit', icon: Compass },
    { id: 'sea-ice', label: 'Sea-Ice Forecast', icon: Snowflake },
    {
      id: 'iceberg-tracking',
      label: 'Iceberg Tracking',
      icon: TriangleAlert,
      badge: hasConflict ? 'Threat' : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    },
    {
      id: 'route-planning',
      label: 'Route Simulator',
      icon: Route,
      badge: hasConflict ? 'Alert' : 'Optimal',
      badgeColor: hasConflict
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    { id: 'weather', label: 'Weather & Ocean', icon: Wind },
    { id: 'fleet-recon', label: 'Vanguard Recon', icon: Ship },
    { id: 'reports', label: 'Passage Briefings', icon: FileText },
    { id: 'model-performance', label: 'AI Architecture', icon: Brain },
  ];

  return (
    <header
      id="top-navigation-bar"
      className="h-14 min-h-[56px] max-h-[56px] bg-[#0b1424] border-b border-cyan-900/40 px-3 sm:px-4 flex items-center justify-between z-30 shrink-0 shadow-lg select-none backdrop-blur-md"
    >
      {/* 1. Left: Branding & Vessel Status */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onSelectPage('cockpit')}
          className="flex items-center gap-2.5 text-left cursor-pointer group"
          title="Return to Master Cockpit"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-cyan-950 group-hover:scale-105 transition-transform">
            <Compass className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-wider text-white font-mono uppercase">
                POLAR NAVIGATOR
              </span>
              <span className="hidden xl:inline-flex px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
                SIH-26059
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 truncate">
              <span className="text-slate-300 font-semibold truncate max-w-[140px] sm:max-w-none">MV Vasiliy Golovnin</span>
              <span className="text-cyan-400 font-mono hidden sm:inline">• PC3</span>
              <span className="text-slate-400 font-mono hidden 2xl:inline">| 12.5 kts • HDG 215°</span>
            </div>
          </div>
        </button>
      </div>

      {/* 2. Middle: Main Navigation Bar Tabs */}
      <nav className="flex items-center gap-1 overflow-x-auto py-1 px-1 max-w-full scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id || (item.id === 'cockpit' && currentPage === 'dashboard');
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer relative ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-200 border border-cyan-500/60 shadow-xs shadow-cyan-900/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`ml-0.5 px-1 py-0.2 rounded text-[8px] font-bold font-mono border ${item.badgeColor || 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}
                >
                  {item.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-400 rounded-full shadow-xs shadow-cyan-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Right: Departure Window Countdown, Operational Conflict Action, UTC & AI Copilot */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-xs">
        {/* Departure Window Countdown HUD */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded bg-[#070d18] border border-cyan-900/60 text-slate-300 font-mono text-[11px]"
          title="Dynamic Last Safe Departure Countdown"
        >
          <Clock className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
          <span className="text-slate-400 text-[10px]">DEPART IN:</span>
          <span className="font-bold text-amber-400">{formatCountdown(countdownSeconds)}</span>
        </div>

        {/* Hazard Quick Action */}
        {hasConflict ? (
          <button
            onClick={onRecalculateRoute}
            disabled={isAnalyzing}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow-sm cursor-pointer transition-colors disabled:opacity-50"
            title="Iceberg A68A Threat on Route 1 - Engage Route 2 Bypass"
          >
            <TriangleAlert className="w-3.5 h-3.5 shrink-0 animate-bounce" />
            <span>{isAnalyzing ? 'Optimizing...' : 'ENGAGE BYPASS'}</span>
          </button>
        ) : (
          <button
            onClick={onResetRoute}
            className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:text-white font-mono text-[10px] cursor-pointer transition-colors"
            title="Route 2 Western Bypass Active - Click to Reset Scenario"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>BYPASS ACTIVE (RESET)</span>
          </button>
        )}

        {/* UTC Clock & SAR Satellite Sync */}
        <div className="hidden 2xl:flex items-center gap-1.5 font-mono text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{currentDateLabel} • {currentTimeUtc}</span>
        </div>

        {/* AI Copilot Launcher */}
        <button
          onClick={onToggleChatbot}
          className={`px-2.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer border transition-all ${
            isChatbotOpen
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-cyan-500/40'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-400/40 shadow-cyan-900/40'
          }`}
          title="Toggle ध्रुव-AI (Dhruv Navigator) Polar Copilot"
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ध्रुव-AI</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
        </button>
      </div>
    </header>
  );
};
