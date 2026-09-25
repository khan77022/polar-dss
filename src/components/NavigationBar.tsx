import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Snowflake,
  TriangleAlert,
  Route,
  Wind,
  Ship,
  FileText,
  Brain,
  ChevronDown,
  ShieldCheck,
  Clock,
  Bot,
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Radar,
  Radio,
  Sliders,
  MapPin,
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

interface DropdownItem {
  id: NavPage;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: DropdownItem[];
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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatCountdown = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const navGroups: NavGroup[] = [
    {
      id: 'analytics',
      label: 'Ice & Analytics',
      icon: Snowflake,
      items: [
        {
          id: 'sea-ice',
          label: 'Sea-Ice Forecast',
          description: 'ConvLSTM spatiotemporal concentration & open lead maps',
          icon: Snowflake,
          badge: 'AI 48h',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        },
        {
          id: 'iceberg-tracking',
          label: 'Iceberg Tracking & Drift',
          description: 'Radar echo tracking, tabular megabergs & swarm vectors',
          icon: TriangleAlert,
          badge: hasConflict ? 'Threat Active' : 'Monitored',
          badgeColor: hasConflict
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        },
        {
          id: 'weather',
          label: 'Weather & Ocean Dynamics',
          description: 'Polar lows, catabatic wind speed, swell & freezing spray',
          icon: Wind,
          badge: 'GFS / ECMWF',
          badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        },
      ],
    },
    {
      id: 'navigation',
      label: 'Navigation & Fleet',
      icon: Route,
      items: [
        {
          id: 'route-planning',
          label: 'Route Simulator',
          description: 'Direct inshore vs Offshore Leads Bypass vs Deep Ocean',
          icon: Route,
          badge: hasConflict ? 'Reroute Rec.' : 'Optimal',
          badgeColor: hasConflict
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        },
        {
          id: 'fleet-recon',
          label: 'Vanguard Fleet Recon',
          description: 'In-situ pilot reports (V-PIREP) & ahead scout vessel mesh',
          icon: Ship,
          badge: '4 Active',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        },
      ],
    },
    {
      id: 'operations',
      label: 'Operations & Models',
      icon: Brain,
      items: [
        {
          id: 'reports',
          label: 'Passage Briefings',
          description: 'Exportable Polar Code voyage logs & safety dossiers',
          icon: FileText,
          badge: 'IMO / WMO',
          badgeColor: 'bg-slate-700 text-slate-300 border-slate-600',
        },
        {
          id: 'model-performance',
          label: 'AI Architecture & PINN',
          description: 'Physics-informed neural networks & ConvLSTM weights',
          icon: Brain,
          badge: '94.2% Acc',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        },
      ],
    },
  ];

  const isCockpitActive = currentPage === 'cockpit' || currentPage === 'dashboard';

  return (
    <header
      id="top-navigation-bar"
      className="h-14 min-h-[56px] max-h-[56px] bg-[#080f1d] border-b border-cyan-900/50 px-3 sm:px-4 flex items-center justify-between z-30 shrink-0 shadow-xl select-none backdrop-blur-md relative"
      ref={navRef}
    >
      {/* 1. Left: Branding & Vessel Telemetry */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => {
            onSelectPage('cockpit');
            setOpenDropdown(null);
          }}
          className="flex items-center gap-2.5 text-left cursor-pointer group"
          title="Return to Master Mission Cockpit"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-cyan-950 group-hover:scale-105 transition-transform border border-cyan-400/40">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-extrabold tracking-wider text-white font-mono uppercase">
                POLAR NAVIGATOR
              </span>
              <span className="hidden xl:inline-flex px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-700/50">
                SIH-26059
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 truncate">
              <span className="text-slate-200 font-semibold truncate max-w-[130px] sm:max-w-none">
                MV Vasiliy Golovnin
              </span>
              <span className="text-cyan-400 font-mono hidden sm:inline">• PC3</span>
              <span className="text-slate-400 font-mono hidden 2xl:inline">| HDG 268° • 12.5 kts</span>
            </div>
          </div>
        </button>
      </div>

      {/* 2. Middle: Navigation Links with Sleek Dropdown Menus */}
      <nav className="flex items-center gap-1.5 sm:gap-2">
        {/* Cockpit Direct Button */}
        <button
          onClick={() => {
            onSelectPage('cockpit');
            setOpenDropdown(null);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer relative ${
            isCockpitActive
              ? 'bg-gradient-to-r from-cyan-950 via-blue-950 to-cyan-900 text-cyan-200 border border-cyan-400/80 shadow-md shadow-cyan-950 ring-1 ring-cyan-500/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800/60'
          }`}
        >
          <Radar className={`w-3.5 h-3.5 ${isCockpitActive ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
          <span>Mission Cockpit</span>
          {isCockpitActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          )}
        </button>

        {/* Dropdown Groups */}
        {navGroups.map((group) => {
          const GroupIcon = group.icon;
          const isGroupActive = group.items.some((item) => item.id === currentPage);
          const isOpen = openDropdown === group.id;

          return (
            <div key={group.id} className="relative">
              {/* Dropdown Trigger */}
              <button
                onClick={() => setOpenDropdown(isOpen ? null : group.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isOpen
                    ? 'bg-slate-800 text-white border-cyan-500/60 shadow-md'
                    : isGroupActive
                    ? 'bg-[#0d1e38] text-cyan-300 border-cyan-500/70 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-slate-800/60'
                }`}
              >
                <GroupIcon className={`w-3.5 h-3.5 ${isGroupActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="hidden md:inline">{group.label}</span>
                <span className="inline md:hidden">{group.label.split(' ')[0]}</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>

              {/* Dropdown Popover */}
              {isOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-64 sm:w-72 bg-[#091322] border border-cyan-800/70 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl ring-1 ring-cyan-500/20">
                  <div className="px-2.5 py-1.5 border-b border-slate-800/80 mb-1 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-cyan-400">
                      {group.label}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">Tactical Modules</span>
                  </div>

                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isItemActive = currentPage === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSelectPage(item.id);
                            setOpenDropdown(null);
                          }}
                          className={`w-full p-2 rounded-lg text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                            isItemActive
                              ? 'bg-gradient-to-r from-cyan-950/90 to-blue-950/90 border border-cyan-500/50 text-white'
                              : 'hover:bg-slate-800/70 text-slate-300 hover:text-white border border-transparent'
                          }`}
                        >
                          <div
                            className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                              isItemActive
                                ? 'bg-cyan-500 text-slate-950'
                                : 'bg-slate-900 border border-slate-800 text-cyan-400'
                            }`}
                          >
                            <ItemIcon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold font-sans truncate">
                                {item.label}
                              </span>
                              {item.badge && (
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border shrink-0 ${
                                    item.badgeColor || 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 leading-tight">
                              {item.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 3. Right: Departure Window Countdown, Operational Conflict Action & AI Copilot */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-xs">
        {/* Dynamic Departure Window Countdown HUD */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#050b14] border border-cyan-900/70 text-slate-300 font-mono text-[11px]"
          title="Last Safe Departure Window before sea-ice convergence"
        >
          <Clock className="w-3 h-3 text-cyan-400 animate-spin-slow" />
          <span className="text-slate-400 text-[10px] font-semibold">DEPART IN:</span>
          <span className="font-bold text-amber-400 tracking-wide font-mono">
            {formatCountdown(countdownSeconds)}
          </span>
        </div>

        {/* Hazard Quick Action */}
        {hasConflict ? (
          <button
            onClick={onRecalculateRoute}
            disabled={isAnalyzing}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-[11px] shadow-sm shadow-amber-950 cursor-pointer transition-all disabled:opacity-50"
            title="Tabular Iceberg Threat on Direct Track - Engage Offshore Bypass"
          >
            <TriangleAlert className="w-3.5 h-3.5 shrink-0 animate-bounce" />
            <span>{isAnalyzing ? 'Computing...' : 'ENGAGE BYPASS'}</span>
          </button>
        ) : (
          <button
            onClick={onResetRoute}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 hover:text-white font-mono text-[10px] cursor-pointer transition-colors"
            title="Offshore Bypass Active - Click to Reset Scenario"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>BYPASS ACTIVE</span>
          </button>
        )}

        {/* UTC Clock & Date */}
        <div className="hidden 2xl:flex items-center gap-1.5 font-mono text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{currentDateLabel} • {currentTimeUtc}</span>
        </div>

        {/* POLAR-AI Copilot Launcher (Neutral, international maritime title) */}
        <button
          onClick={onToggleChatbot}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer border transition-all ${
            isChatbotOpen
              ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-cyan-500/40 ring-1 ring-cyan-400'
              : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-400/40 shadow-cyan-950'
          }`}
          title="Toggle POLAR-AI Tactical Navigation Copilot"
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-mono">POLAR-AI</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
        </button>
      </div>
    </header>
  );
};
