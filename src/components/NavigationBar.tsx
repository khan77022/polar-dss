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
  CheckCircle2,
  Bot,
  Radio,
} from 'lucide-react';
import { NavPage } from '../types';

interface NavigationBarProps {
  currentPage: NavPage;
  onSelectPage: (page: NavPage) => void;
  hasConflict: boolean;
  isRerouted: boolean;
  onRecalculateRoute: () => void;
  onResetRoute: () => void;
  countdownSeconds?: number;
  currentDateLabel: string;
  currentTimeUtc: string;
  onToggleChatbot: () => void;
  isChatbotOpen: boolean;
  isAnalyzing?: boolean;
  onOpenEmergency?: () => void;
  isEmergencyActive?: boolean;
  emergencyTypeTitle?: string;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  currentPage,
  onSelectPage,
  hasConflict,
  isRerouted,
  onRecalculateRoute,
  onResetRoute,
  currentDateLabel,
  currentTimeUtc,
  onToggleChatbot,
  isChatbotOpen,
  isAnalyzing = false,
  onOpenEmergency,
  isEmergencyActive = false,
  emergencyTypeTitle,
}) => {
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
      className="h-14 min-h-[56px] max-h-[56px] bg-[#070e1b]/95 border-b border-cyan-500/25 px-3 sm:px-4 flex items-center justify-between z-30 shrink-0 shadow-lg select-none backdrop-blur-md"
    >
      {/* 1. Left: Branding & Vessel Status */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onSelectPage('cockpit')}
          className="flex items-center gap-2.5 text-left cursor-pointer group"
          title="Return to Master Cockpit"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-cyan-950/80 group-hover:scale-105 transition-transform border border-cyan-400/30">
            <Compass className="w-4 h-4 text-cyan-100 group-hover:rotate-45 transition-transform duration-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-wider text-white font-mono uppercase bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                POLAR NAVIGATOR
              </span>
              <span className="hidden xl:inline-flex px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 shadow-xs">
                44th ISEA
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 truncate">
              <span className="text-slate-300 font-semibold truncate max-w-[140px] sm:max-w-none">
                MV Vasiliy Golovnin
              </span>
              <span className="text-cyan-400 font-mono hidden sm:inline">• PC3</span>
              <span className="text-slate-400 font-mono hidden 2xl:inline">
                | 12.5 kts • HDG 215°
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* 2. Middle: Navigation Bar Tabs */}
      <nav className="flex items-center gap-1 overflow-x-auto py-1 px-1 max-w-full scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentPage === item.id || (item.id === 'cockpit' && currentPage === 'dashboard');
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer relative ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/90 via-blue-950/80 to-slate-900 text-cyan-200 border border-cyan-500/50 shadow-xs shadow-cyan-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${
                  isActive ? 'text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]' : 'text-slate-400'
                }`}
              />
              <span className={isActive ? 'font-bold text-white' : ''}>{item.label}</span>
              {item.badge && (
                <span
                  className={`ml-0.5 px-1 py-0.2 rounded text-[8px] font-bold font-mono border ${
                    item.badgeColor || 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full shadow-xs shadow-cyan-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Right: Hazard Quick Action, Live GNSS UTC & AI Copilot */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 text-xs">
        {/* POLAR EMERGENCY RESPONSE SYSTEM TRIGGER */}
        {onOpenEmergency && (
          <button
            onClick={onOpenEmergency}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-bold cursor-pointer transition-all border shadow-md ${
              isEmergencyActive
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-rose-950 animate-pulse'
                : 'bg-rose-950/80 hover:bg-rose-900 border-rose-500/50 text-rose-200 hover:text-white shadow-rose-950/40'
            }`}
            title="Open Polar Emergency Decision Support System (EDSS)"
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            <span className="font-extrabold">{isEmergencyActive ? '🚨 MAYDAY ACTIVE' : '🚨 EMERGENCY'}</span>
          </button>
        )}

        {/* Hazard Bypass Action */}
        {hasConflict ? (
          <button
            onClick={onRecalculateRoute}
            disabled={isAnalyzing}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-[11px] shadow-md shadow-amber-950/40 cursor-pointer transition-all disabled:opacity-50"
            title="Iceberg Threat on Direct Track - Engage Western Bypass"
          >
            <TriangleAlert className="w-3.5 h-3.5 shrink-0 animate-bounce" />
            <span>{isAnalyzing ? 'Optimizing...' : 'ENGAGE BYPASS'}</span>
          </button>
        ) : (
          <button
            onClick={onResetRoute}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:text-white font-mono text-[10px] cursor-pointer transition-colors shadow-xs"
            title="Bypass Track Active - Click to Reset Scenario"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>BYPASS ACTIVE</span>
          </button>
        )}

        {/* Live GNSS Satellite UTC Clock */}
        <div className="hidden xl:flex items-center gap-1.5 font-mono text-[11px] text-slate-300 bg-[#060b14]/90 px-2.5 py-1 rounded-lg border border-cyan-900/50 shadow-inner">
          <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span className="text-[10px] text-cyan-400/80 font-bold">GNSS</span>
          <span className="text-slate-500">•</span>
          <span>{currentDateLabel}</span>
          <span className="text-cyan-300 font-bold">{currentTimeUtc}</span>
        </div>

        {/* AI Copilot Launcher */}
        <button
          onClick={onToggleChatbot}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer border transition-all ${
            isChatbotOpen
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-cyan-500/40'
              : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-400/40 shadow-cyan-900/40'
          }`}
          title="Toggle ध्रुव-AI (Dhruv Navigator) Polar Copilot"
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-mono">ध्रुव-AI</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
        </button>
      </div>
    </header>
  );
};
