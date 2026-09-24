import React from 'react';
import {
  LayoutDashboard,
  Route,
  Snowflake,
  TriangleAlert,
  Wind,
  FileText,
  Activity,
  Compass,
  Home,
} from 'lucide-react';
import { NavPage } from '../types';

interface SidebarProps {
  currentPage: NavPage;
  onSelectPage: (page: NavPage) => void;
  activeConflict: boolean;
  onReturnToLanding?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  activeConflict,
  onReturnToLanding,
}) => {
  const navItems: { id: NavPage; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sea-ice', label: 'Sea-Ice Forecast', icon: Snowflake },
    {
      id: 'iceberg-tracking',
      label: 'Iceberg Tracking',
      icon: TriangleAlert,
      badge: activeConflict ? 'Alert' : undefined,
    },
    { id: 'route-planning', label: 'Route Planning', icon: Route },
    { id: 'weather', label: 'Weather & Ocean', icon: Wind },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'model-performance', label: 'Model Info', icon: Activity },
  ];

  return (
    <aside
      id="app-sidebar"
      className="w-56 min-w-[220px] max-w-[220px] bg-[#0c1829] text-slate-200 flex flex-col border-r border-slate-800 select-none shrink-0"
    >
      {/* 1. Header: POLAR DSS */}
      <div id="sidebar-brand" className="px-4 py-4 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-white font-mono leading-none">
                POLAR DSS
              </h1>
              <p className="text-[10px] text-slate-400 mt-1 leading-none">
                Antarctic Navigation
              </p>
            </div>
          </div>

          {onReturnToLanding && (
            <button
              onClick={onReturnToLanding}
              title="Return to Welcome Landing Screen"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Narrow Focused Navigation List */}
      <nav id="sidebar-nav" className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-500/25 text-red-300 border border-red-500/40">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Bottom: DEMO MODE */}
      <div id="sidebar-footer" className="p-3.5 border-t border-slate-800 bg-[#091322]">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-300 tracking-wider">DEMO MODE</span>
        </div>
      </div>
    </aside>
  );
};
