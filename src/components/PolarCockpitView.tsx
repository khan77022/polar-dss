import React, { useState, useEffect } from 'react';
import {
  Compass,
  Ship,
  TriangleAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Clock,
  Navigation,
  Sparkles,
  Layers,
  Fuel,
  TrendingDown,
  Info,
  Radio,
  FileText,
  Wind,
  Brain,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Snowflake,
  ExternalLink,
  Bot,
  X,
  Printer,
  Calendar,
  Waves,
  Thermometer,
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  Radar,
  Maximize2,
  Minimize2,
  MapPin,
  Flame,
} from 'lucide-react';
import { AntarcticMap } from './AntarcticMap';
import { NavigationBar } from './NavigationBar';
import { PolarAiChatbot } from './PolarAiChatbot';
import { RoutePlanningView } from './views/RoutePlanningView';
import { SeaIceView } from './views/SeaIceView';
import { IcebergTrackingView } from './views/IcebergTrackingView';
import { WeatherView } from './views/WeatherView';
import { FleetReconView } from './views/FleetReconView';
import { ReportsView } from './views/ReportsView';
import { ModelPerformanceView } from './views/ModelPerformanceView';
import { PolarEmergencySystem } from './PolarEmergencySystem';
import { EmergencyType, SafeHavenDestination, EMERGENCY_TYPES } from '../data/emergencyData';
import { Vessel, Iceberg, RouteOption, NavPage } from '../types';
import {
  RESEARCH_VESSEL,
  ICEBERGS,
  ROUTE_ORIGINAL,
  ROUTE_REROUTED,
  ROUTE_MAX_SAFETY,
  TIMELINE_STEPS,
  AHEAD_VESSELS,
} from '../data/polarData';

export const PolarCockpitView: React.FC = () => {
  // Navigation Bar State: default to 'cockpit'
  const [currentPage, setCurrentPage] = useState<NavPage>('cockpit');

  // Core System State
  const [vessel] = useState<Vessel>(RESEARCH_VESSEL);
  const [icebergs] = useState<Iceberg[]>(ICEBERGS);
  const [selectedIcebergId, setSelectedIcebergId] = useState<string>('A68A');

  // Timeline Step (0 = Current +0h, 1 = +6h, 2 = +12h, 3 = +24h [Conflict Window], 4 = +48h)
  const [timelineStep, setTimelineStep] = useState<number>(3);

  // Active Route Selection: 'route-original' | 'route-rerouted' | 'route-safety'
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-original');
  const [destination, setDestination] = useState<string>('Maitri Research Base (Queen Maud Land)');
  const [objective, setObjective] = useState<'balanced' | 'shortest' | 'safety'>('balanced');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Panels Collapse States for Cockpit layout
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(true);
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(true);

  // Quick Modal Overlays inside Cockpit
  const [activeQuickModal, setActiveQuickModal] = useState<'weather' | 'reports' | 'model' | null>(null);

  // AI Chatbot Open State
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  // Emergency Response Decision Support System State
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [isEmergencyActive, setIsEmergencyActive] = useState<boolean>(false);
  const [activeEmergencyType, setActiveEmergencyType] = useState<EmergencyType>('engine-failure');
  const [activeEmergencyDestination, setActiveEmergencyDestination] = useState<SafeHavenDestination | null>(null);
  const [emergencyRoute, setEmergencyRoute] = useState<RouteOption | null>(null);

  // Derive active route object
  const currentRoute: RouteOption =
    selectedRouteId === 'route-rerouted'
      ? ROUTE_REROUTED
      : selectedRouteId === 'route-safety'
      ? ROUTE_MAX_SAFETY
      : ROUTE_ORIGINAL;

  const isRerouted = selectedRouteId === 'route-rerouted';
  const hasConflict = selectedRouteId === 'route-original';

  // Emergency handlers
  const handleEngageEmergencyRoute = (route: RouteOption, destination: SafeHavenDestination) => {
    setEmergencyRoute(route);
    setActiveEmergencyDestination(destination);
    setIsEmergencyActive(true);
    showToast(`🚨 Emergency Haven Engaged: Diverting to ${destination.name}`);
  };

  const handleCancelEmergency = () => {
    setIsEmergencyActive(false);
    setEmergencyRoute(null);
    showToast('Emergency Stood Down: Resumed standard passage plan.');
  };

  // Recalculate AI Optimization Action
  const handleRecalculateRoute = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setSelectedRouteId('route-rerouted');
      showToast('AI Optimization Complete: Route 2 (Western Bypass) Engaged.');
    }, 750);
  };

  const handleResetRoute = () => {
    setSelectedRouteId('route-original');
    setTimelineStep(3);
    showToast('Simulation reset to Route 1 conflict scenario.');
  };

  const selectedIceberg = icebergs.find((ib) => ib.id === selectedIcebergId) || icebergs[0];
  const currentTimelineInfo = TIMELINE_STEPS[timelineStep] || TIMELINE_STEPS[0];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#060b14] text-slate-100 font-sans select-none relative">
      {/* 1. TOP MULTI-FEATURE NAVIGATION BAR */}
      <NavigationBar
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        hasConflict={hasConflict}
        isRerouted={isRerouted}
        onRecalculateRoute={handleRecalculateRoute}
        onResetRoute={handleResetRoute}
        currentDateLabel={currentTimelineInfo.fullDate}
        currentTimeUtc={currentTimelineInfo.timeUtc}
        onToggleChatbot={() => setIsChatbotOpen((prev) => !prev)}
        isChatbotOpen={isChatbotOpen}
        isAnalyzing={isAnalyzing}
        onOpenEmergency={() => setIsEmergencyModalOpen(true)}
        isEmergencyActive={isEmergencyActive}
        emergencyTypeTitle={EMERGENCY_TYPES[activeEmergencyType].title}
      />

      {/* 2. DEDICATED VIEW ROUTER OR MASTER COCKPIT */}
      {currentPage === 'cockpit' || currentPage === 'dashboard' ? (
        /* MASTER THREE-COLUMN COMMAND COCKPIT WORKSPACE */
        <div className="flex-1 flex min-h-0 w-full overflow-hidden relative">
          {/* LEFT PANEL: Tactical Route Controls & Target Tracking (Optimized width to maximize central map) */}
          {leftPanelOpen && (
            <aside className="w-72 xl:w-76 min-w-[275px] max-w-[310px] h-full bg-[#0b1424] border-r border-slate-800 flex flex-col z-10 shrink-0 overflow-y-auto">
              {/* Panel Header */}
              <div className="p-2.5 sm:p-3 border-b border-slate-800/80 flex items-center justify-between bg-[#0e1a30]/90 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Tactical Controls
                  </span>
                </div>
                <button
                  onClick={() => setLeftPanelOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Collapse Left Panel"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2.5 sm:p-3 space-y-3 text-xs">
                {/* SECTION A: ROUTE SELECTION & OPTIMIZER */}
                <div className="bg-[#0e1a30] border border-slate-800/90 rounded-xl p-3.5 space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 uppercase tracking-wide text-[11px] flex items-center gap-1.5 font-mono">
                      <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                      Corridor Track Selector
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400">3 Routes</span>
                  </div>

                  <div className="space-y-1.5">
                    {/* Route 1 Tab */}
                    <button
                      onClick={() => setSelectedRouteId('route-original')}
                      className={`w-full p-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                        selectedRouteId === 'route-original'
                          ? 'bg-rose-950/50 border-rose-500/80 text-rose-100 shadow-md ring-1 ring-rose-500/40'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">Route 1 (Direct Track)</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/30 text-rose-300 border border-rose-500/40 font-mono">
                          CRITICAL HAZARD
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between font-mono">
                        <span>380 km • 32h • 1,450L</span>
                        <span className="text-rose-400 font-bold">CPA 4.8 km</span>
                      </div>
                    </button>

                    {/* Route 2 Tab */}
                    <button
                      onClick={() => setSelectedRouteId('route-rerouted')}
                      className={`w-full p-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                        selectedRouteId === 'route-rerouted'
                          ? 'bg-emerald-950/60 border-emerald-500/90 text-emerald-100 shadow-md ring-1 ring-emerald-500/40'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white">Route 2 (Western Bypass)</span>
                          <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-emerald-500 text-slate-950">AI CHOICE</span>
                        </div>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono">
                          OPTIMAL / SAFE
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between font-mono">
                        <span>420 km • 36h • 1,180L</span>
                        <span className="text-emerald-400 font-bold">CPA 38.5 km</span>
                      </div>
                    </button>

                    {/* Route 3 Tab */}
                    <button
                      onClick={() => setSelectedRouteId('route-safety')}
                      className={`w-full p-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                        selectedRouteId === 'route-safety'
                          ? 'bg-sky-950/60 border-sky-500/80 text-sky-100 shadow-md ring-1 ring-sky-500/40'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">Route 3 (Max Safety Offshore)</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/30 text-sky-300 border border-sky-500/40 font-mono">
                          DEEP OCEAN
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between font-mono">
                        <span>510 km • 44h • 1,300L</span>
                        <span className="text-sky-300 font-bold">CPA &gt;120 km</span>
                      </div>
                    </button>
                  </div>

                  {/* AI Calculate Button */}
                  <button
                    onClick={handleRecalculateRoute}
                    disabled={isAnalyzing}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Optimizing Pareto Corridor...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                        <span>Calculate Optimal Route</span>
                      </>
                    )}
                  </button>
                </div>

                {/* SECTION B: ACTIVE ICEBERG TARGET TRACKING & SWARM DETECTION */}
                <div className="bg-[#0e1a30] border border-slate-800/90 rounded-xl p-3.5 space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 uppercase tracking-wide text-[11px] flex items-center gap-1.5 font-mono">
                      <TriangleAlert className="w-3.5 h-3.5 text-amber-400" />
                      Iceberg Target & Swarm Tracking
                    </span>
                    <span className="text-[10px] font-mono text-amber-400">A68A Primary</span>
                  </div>

                  {/* Iceberg Selector Buttons */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {icebergs.map((ib) => (
                      <button
                        key={ib.id}
                        onClick={() => setSelectedIcebergId(ib.id)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer text-center border ${
                          selectedIcebergId === ib.id
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border-slate-800'
                        }`}
                      >
                        {ib.id}
                      </button>
                    ))}
                  </div>

                  {/* Selected Iceberg Telemetry */}
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1.5 text-[11px]">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400">Dimensions:</span>
                      <span className="font-mono text-white font-semibold">
                        {selectedIceberg.dimensionsKm.length} × {selectedIceberg.dimensionsKm.width} km ({selectedIceberg.areaSqKm} km²)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400">Drift Velocity:</span>
                      <span className="font-mono text-amber-300 font-bold">
                        {selectedIceberg.driftSpeedKts} kts @ {selectedIceberg.driftDirectionDeg}° (NW)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400">Position:</span>
                      <span className="font-mono text-white">
                        {Math.abs(selectedIceberg.currentPos.lat).toFixed(2)}°S, {Math.abs(selectedIceberg.currentPos.lon).toFixed(2)}°W
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400">Trajectory Confidence:</span>
                      <span className="font-mono text-emerald-400 font-semibold">95% Bayesian Corridor</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400">Last Observation:</span>
                      <span className="font-mono text-cyan-300">Sentinel-1 SAR (2h ago)</span>
                    </div>
                  </div>

                  {/* Swarm Cluster Badge */}
                  <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/50 text-[10px] text-amber-200">
                    <span className="font-bold">Iceberg Field Cluster Detected:</span> 3 medium tabular remnants drifting northwest in formation. Avoiding corridor avoids whole field.
                  </div>
                </div>

                {/* SECTION C: SATELLITE CHANGE-DETECTION ALARMS */}
                <div className="bg-[#0e1a30] border border-slate-800/90 rounded-xl p-3.5 space-y-2 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 uppercase tracking-wide text-[11px] flex items-center gap-1.5 font-mono">
                      <Radar className="w-3.5 h-3.5 text-rose-400" />
                      Change-Detection Alarms
                    </span>
                    <span className="text-[10px] font-mono text-rose-400 animate-pulse">LIVE ALARM</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="p-2 rounded-lg bg-rose-950/50 border border-rose-800/60 text-[11px] text-rose-200">
                      <div className="font-bold flex items-center justify-between font-mono">
                        <span>ICE EDGE SHIFTED 14 KM</span>
                        <span className="text-[9px] text-rose-400">08:30 UTC</span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">
                        Coastal gyre compressive front has forced marginal ice edge northward along the shelf.
                      </p>
                    </div>

                    <div className="p-2 rounded-lg bg-amber-950/50 border border-amber-800/60 text-[11px] text-amber-200">
                      <div className="font-bold flex items-center justify-between font-mono">
                        <span>OPEN-WATER CORRIDOR RAPIDLY CLOSING</span>
                        <span className="text-[9px] text-amber-400">12:15 UTC</span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">
                        Bransfield channel width shrinking by 1.2 km/hour under A68A megaberg pressure ridge.
                      </p>
                    </div>
                  </div>
                </div>

                {/* SECTION D: QUICK MISSION ACTIONS */}
                <div className="bg-[#0e1a30] border border-slate-800/90 rounded-xl p-3.5 space-y-2 shadow-md">
                  <span className="font-bold text-slate-200 uppercase tracking-wide text-[11px] flex items-center gap-1.5 font-mono">
                    <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                    Mission Actions
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        if (hasConflict) handleRecalculateRoute();
                        else handleResetRoute();
                      }}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{hasConflict ? 'Bypass A68A' : 'Reset Route'}</span>
                    </button>

                    <button
                      onClick={() => setActiveQuickModal('reports')}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Passage Plan</span>
                    </button>

                    <button
                      onClick={() => {
                        showToast('Passage Waypoint Telemetry Broadcasted to Bridge Crew (VHF Ch 16 / SatCom)');
                      }}
                      className="col-span-2 p-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border border-cyan-400/40 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950 cursor-pointer transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5 text-cyan-200" />
                      <span>Share Track with Bridge Crew</span>
                    </button>
                  </div>

                  {/* EMERGENCY DECISION SUPPORT SYSTEM LAUNCHER */}
                  <div className="pt-2 border-t border-slate-800">
                    <button
                      onClick={() => setIsEmergencyModalOpen(true)}
                      className={`w-full p-2.5 rounded-xl border font-mono font-bold text-[11px] flex items-center justify-between shadow-md cursor-pointer transition-all ${
                        isEmergencyActive
                          ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-rose-950 animate-pulse'
                          : 'bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/50 hover:bg-rose-900/80 border-rose-500/40 text-rose-200 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{EMERGENCY_TYPES[activeEmergencyType].icon}</span>
                        <div className="text-left">
                          <div className="leading-tight font-extrabold flex items-center gap-1.5">
                            <span>{isEmergencyActive ? 'MAYDAY GUIDANCE ACTIVE' : 'EMERGENCY PROTOCOL (EDSS)'}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                          </div>
                          <div className="text-[9px] text-rose-300/80 font-normal">
                            {isEmergencyActive
                              ? `Diversion: ${activeEmergencyDestination?.name}`
                              : 'Engine • Fire • Collision • Medical • Ice'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-rose-300 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* Collapsed Left Panel Re-open Button */}
          {!leftPanelOpen && (
            <button
              onClick={() => setLeftPanelOpen(true)}
              className="absolute left-3 top-3 z-40 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0b1424]/95 border border-cyan-500/60 text-cyan-300 hover:text-white hover:bg-cyan-900/60 shadow-2xl cursor-pointer backdrop-blur-md transition-all font-mono text-xs font-bold ring-1 ring-cyan-500/40"
              title="Open Tactical Controls"
            >
              <ChevronRight className="w-4 h-4 text-cyan-400" />
              <span>TACTICAL CONTROLS</span>
            </button>
          )}

          {/* CENTER MAIN WORKSPACE: THE SATELLITE MAP */}
          <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-slate-950">
            {/* FLOATING ACTIVE EMERGENCY GUIDANCE HUD (When engaged) */}
            {isEmergencyActive && activeEmergencyDestination && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-rose-950/95 via-[#1a0815]/95 to-slate-950/95 border-2 border-rose-500/80 rounded-xl px-4 py-2 text-white shadow-2xl backdrop-blur-md flex flex-wrap items-center gap-3 animate-in fade-in max-w-[94%]">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-mono font-bold text-rose-300 uppercase flex items-center gap-1.5 truncate">
                    <span>🚨 ACTIVE MAYDAY REFUGE DIVERSION</span>
                    <span>•</span>
                    <span className="text-white">{EMERGENCY_TYPES[activeEmergencyType].title}</span>
                  </div>
                  <div className="text-xs font-bold font-mono text-white flex items-center gap-2 truncate">
                    <span>DEST: {activeEmergencyDestination.name}</span>
                    <span className="text-cyan-300 font-normal hidden sm:inline">
                      ({activeEmergencyDestination.distanceKm} km • {activeEmergencyDestination.weather.windSpeedKts} kts wind)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsEmergencyModalOpen(true)}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-[10px] cursor-pointer shadow-md transition-colors"
                  >
                    EMERGENCY CONSOLE
                  </button>
                  <button
                    onClick={handleCancelEmergency}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-mono cursor-pointer border border-slate-700 transition-colors"
                    title="Cancel Emergency and return to normal navigation"
                  >
                    STAND DOWN
                  </button>
                </div>
              </div>
            )}

            {/* THE PRESERVED SATELLITE MAP IMPLEMENTATION */}
            <div className="flex-1 w-full h-full relative">
              <AntarcticMap
                vessel={vessel}
                icebergs={icebergs}
                selectedIcebergId={selectedIcebergId}
                onSelectIceberg={setSelectedIcebergId}
                timelineStep={timelineStep}
                currentRoute={currentRoute}
                isRerouted={isRerouted}
                alternativeRoute={selectedRouteId !== 'route-rerouted' ? ROUTE_REROUTED : undefined}
                safetyRoute={ROUTE_MAX_SAFETY}
                emergencyRoute={emergencyRoute}
                isEmergencyActive={isEmergencyActive}
                hasConflict={hasConflict}
                onRecalculateRoute={handleRecalculateRoute}
                isRecalculating={isAnalyzing}
                className="w-full h-full"
                showSimControls={true}
              />
            </div>

            {/* DOCKED BOTTOM TIMELINE BAR */}
            <div className="h-12 min-h-[48px] bg-[#0b1424]/95 border-t border-slate-800 px-4 flex items-center justify-between z-10 backdrop-blur-md shrink-0 shadow-lg">
              {/* Left: Prediction Horizon Buttons */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline mr-1 font-mono">
                  Sea-Ice Horizon:
                </span>
                {TIMELINE_STEPS.map((step, idx) => (
                  <button
                    key={step.index}
                    onClick={() => setTimelineStep(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      timelineStep === idx
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950 scale-102'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>

              {/* Right: Date & Conflict Indicator */}
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="hidden md:flex items-center gap-1.5 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{currentTimelineInfo.fullDate}</span>
                </div>

                {timelineStep === 3 && hasConflict && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    CONFLICT TIME WINDOW
                  </span>
                )}
              </div>
            </div>
          </main>

          {/* Collapsed Right Panel Re-open Button */}
          {!rightPanelOpen && (
            <button
              onClick={() => setRightPanelOpen(true)}
              className="absolute right-2 top-2 z-20 p-2 rounded-lg bg-[#0b1424]/90 border border-slate-700 text-slate-300 hover:text-white shadow-xl cursor-pointer backdrop-blur-md"
              title="Open Decision Support Panel"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* RIGHT PANEL: Decision Support System (DSS) & Analytics (Optimized width to maximize map) */}
          {rightPanelOpen && (
            <aside className="w-76 xl:w-80 min-w-[290px] max-w-[330px] h-full bg-[#0b1424] border-l border-slate-800 flex flex-col z-10 shrink-0 overflow-y-auto">
              {/* Panel Header */}
              <div className="p-2.5 sm:p-3 border-b border-slate-800/80 flex items-center justify-between bg-[#0e1a30]/90 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Decision Support System
                  </span>
                </div>
                <button
                  onClick={() => setRightPanelOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Collapse DSS Panel"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2.5 sm:p-3 space-y-3 text-xs">
                {/* 1. CORRIDOR OPERATIONAL CLEARANCE CARD */}
                <div className="bg-gradient-to-br from-slate-950 via-[#0d1c33] to-[#0a182e] border border-cyan-500/40 rounded-xl p-3.5 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Compass className="w-3.5 h-3.5 text-cyan-400" />
                      Corridor Operational Status
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      TRANSIT CLEARANCE
                    </span>
                  </div>

                  <div className="my-2.5 flex items-baseline justify-between">
                    <div>
                      <div className="text-xs text-slate-400 font-mono">ACTIVE CORRIDOR</div>
                      <div className="text-base font-extrabold text-white font-mono">
                        {isRerouted ? 'Route 2 (Western Bypass)' : 'Route 1 (Direct Track)'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-mono">PASSAGE CLEARANCE</div>
                      <div className="text-sm font-bold font-mono text-emerald-400">
                        {isRerouted ? 'OPTIMAL (SAFE)' : 'ADVISORY ACTIVE'}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">
                    {isRerouted
                      ? 'Western bypass clears iceberg drift corridors and remains in navigable leads (<35% sea ice conc).'
                      : 'Direct track convergence detected. Engage Route 2 Western Bypass to avoid heavy compressive pack ice.'}
                  </p>
                </div>

                {/* 2. ESCAPEABILITY SCORE & SAFE EXIT VECTORS */}
                <div className="bg-[#0e1a30] border border-slate-800/90 rounded-xl p-3.5 space-y-2 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 uppercase tracking-wide text-[11px] flex items-center gap-1.5 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Escapeability Analysis
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      88% (HIGH ESCAPEABILITY)
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-center font-mono">
                      <span className="text-slate-400">Primary Safe Exit:</span>
                      <strong className="text-white">Bearing 295° (Drake Passage)</strong>
                    </div>
                    <div className="flex justify-between items-center font-mono">
                      <span className="text-slate-400">Hull Ice Resistance:</span>
                      <strong className="text-emerald-400">1.8 MPa (PC3 Certified)</strong>
                    </div>
                    <div className="flex justify-between items-center font-mono">
                      <span className="text-slate-400">Vanguard Scout Confirm:</span>
                      <strong className="text-cyan-300">PRV Sagar Dhruv (Clear Leads)</strong>
                    </div>
                  </div>
                </div>

                {/* 3. FORBIDDEN FUTURE ZONES */}
                <div className="bg-[#0e1a30] border border-slate-800/90 rounded-xl p-3.5 space-y-2 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 uppercase tracking-wide text-[11px] flex items-center gap-1.5 font-mono">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                      Forbidden Future Zones
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Accessibility</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-900/50 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-rose-200 truncate">Already Inaccessible</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-orange-950/40 border border-orange-900/50 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                      <span className="text-orange-200 truncate">Will Become Inaccessible</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-900/50 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-amber-200 truncate">Temporarily Accessible</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-900/50 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-emerald-200 truncate">Persistently Accessible</span>
                    </div>
                  </div>

                  {hasConflict && (
                    <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-600/70 text-[11px] text-rose-200 font-medium">
                      ⚠️ <strong>Future Route Conflict:</strong> Ice conditions expected to deteriorate along Route 1 before vessel estimated arrival. Engagement of Route 2 recommended.
                    </div>
                  )}
                </div>

                {/* 4. COUNTERFACTUAL ROUTE SIMULATOR ("What if I take another route?") */}
                <div className="bg-[#0e1a30] border border-slate-800/90 rounded-xl p-3.5 space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 uppercase tracking-wide text-[11px] flex items-center gap-1.5 font-mono">
                      <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
                      Counterfactual Route Simulator
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Trade-offs</span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    {/* Route 1 summary */}
                    <div className={`p-2 rounded-lg border ${selectedRouteId === 'route-original' ? 'bg-rose-950/50 border-rose-500/80' : 'bg-slate-900/60 border-slate-800'}`}>
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-white">Route 1 (Direct)</span>
                        <span className="text-rose-400 font-mono">380 km • 1,450 L Fuel</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
                        <span>Pack Ice Drag: 65%</span>
                        <span className="text-rose-400 font-bold">A68A CPA: 4.8 km (UNSAFE)</span>
                      </div>
                    </div>

                    {/* Route 2 summary */}
                    <div className={`p-2 rounded-lg border ${selectedRouteId === 'route-rerouted' ? 'bg-emerald-950/50 border-emerald-500/80' : 'bg-slate-900/60 border-slate-800'}`}>
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-emerald-300">Route 2 (AI Western Bypass)</span>
                        <span className="text-emerald-400 font-mono">420 km • 1,180 L Fuel</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
                        <span className="text-emerald-400 font-semibold">Saves 270L Fuel</span>
                        <span className="text-emerald-400 font-bold">A68A CPA: 38.5 km (SAFE)</span>
                      </div>
                    </div>

                    {/* Route 3 summary */}
                    <div className={`p-2 rounded-lg border ${selectedRouteId === 'route-safety' ? 'bg-sky-950/50 border-sky-500/80' : 'bg-slate-900/60 border-slate-800'}`}>
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-sky-300">Route 3 (Max Safety Offshore)</span>
                        <span className="text-sky-400 font-mono">510 km • 1,300 L Fuel</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
                        <span>Open Ocean: 100%</span>
                        <span className="text-sky-300 font-bold">A68A CPA: &gt;120 km (CLEAR)</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] text-slate-300 leading-snug">
                    <strong>Explainable AI Insight:</strong> Route 2 is 40 km longer but consumes 270 L less fuel because cruising open leads eliminates the 195 L/h heavy pack-ice drag penalty.
                  </div>
                </div>

                {/* 5. HISTORICAL ANALOGUE FINDER */}
                <div className="bg-[#0e1a30] border border-slate-800/90 rounded-xl p-3.5 space-y-2 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 uppercase tracking-wide text-[11px] flex items-center gap-1.5 font-mono">
                      <Brain className="w-3.5 h-3.5 text-indigo-400" />
                      Historical Analogue Finder
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      91% SIMILARITY
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] space-y-1 text-slate-300">
                    <div className="font-bold text-white flex justify-between font-mono">
                      <span>Voyage #17 (Nov 2021)</span>
                      <span className="text-cyan-400">MV Vasiliy Golovnin</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Encountered identical spring pack convergence in Bransfield Strait with 1.5 kt iceberg drift. Direct route resulted in 72-hour besetting; Western bypass transited safely with zero hull impact.
                    </p>
                    <div className="text-[10px] text-emerald-400 font-semibold pt-1 border-t border-slate-800 font-mono">
                      ✓ Operational Lesson: Commit to Route 2 early before corridor narrows.
                    </div>
                  </div>
                </div>

                {/* 6. MODEL UNCERTAINTY ZONE */}
                <div className="bg-[#0e1a30] border border-slate-800/90 rounded-xl p-3 space-y-1.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 uppercase tracking-wide text-[11px] flex items-center gap-1.5 font-mono">
                      <Info className="w-3.5 h-3.5 text-amber-400" />
                      Model Uncertainty Boundary
                    </span>
                    <span className="text-[10px] font-mono text-amber-400">Epistemic Error</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-snug">
                    ⚠ <strong>Outer Shelf Zone:</strong> Sentinel-1 SAR pass affected by cloud radar shadow. Trajectory uncertainty envelope expands by ±8.4 km beyond +24h. Recommend precautionary speed reduction.
                  </p>
                </div>
              </div>
            </aside>
          )}
        </div>
      ) : (
        /* DEDICATED FULL-PAGE FEATURE VIEWS */
        <main className="flex-1 flex flex-col min-h-0 w-full overflow-hidden bg-[#060b14]">
          {currentPage === 'sea-ice' && (
            <SeaIceView
              vessel={vessel}
              icebergs={icebergs}
              selectedIcebergId={selectedIcebergId}
              onSelectIceberg={setSelectedIcebergId}
              timelineStep={timelineStep}
              onNavigateToCockpit={() => setCurrentPage('cockpit')}
            />
          )}

          {currentPage === 'iceberg-tracking' && (
            <IcebergTrackingView
              vessel={vessel}
              icebergs={icebergs}
              selectedIcebergId={selectedIcebergId}
              onSelectIceberg={setSelectedIcebergId}
              timelineStep={timelineStep}
              onStepChange={setTimelineStep}
              hasConflict={hasConflict}
              isRerouted={isRerouted}
              onRecalculateRoute={handleRecalculateRoute}
              onNavigateToCockpit={() => setCurrentPage('cockpit')}
            />
          )}

          {currentPage === 'route-planning' && (
            <RoutePlanningView
              vessel={vessel}
              icebergs={icebergs}
              selectedIcebergId={selectedIcebergId}
              onSelectIceberg={setSelectedIcebergId}
              timelineStep={timelineStep}
              hasConflict={hasConflict}
              isRerouted={isRerouted}
              onRecalculateRoute={handleRecalculateRoute}
              onResetRoute={handleResetRoute}
              onNavigateToCockpit={() => setCurrentPage('cockpit')}
            />
          )}

          {currentPage === 'weather' && (
            <WeatherView onNavigateToCockpit={() => setCurrentPage('cockpit')} />
          )}

          {currentPage === 'fleet-recon' && (
            <FleetReconView
              vessel={vessel}
              onNavigateToMap={() => setCurrentPage('cockpit')}
              onNavigate={setCurrentPage}
              onNavigateToCockpit={() => setCurrentPage('cockpit')}
            />
          )}

          {currentPage === 'reports' && (
            <ReportsView
              vessel={vessel}
              isRerouted={isRerouted}
              onNavigateToCockpit={() => setCurrentPage('cockpit')}
            />
          )}

          {currentPage === 'model-performance' && (
            <ModelPerformanceView onNavigateToCockpit={() => setCurrentPage('cockpit')} />
          )}
        </main>
      )}

      {/* 3. QUICK MODAL OVERLAYS (Weather, Reports, Model Architecture) INSIDE COCKPIT */}
      {activeQuickModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-[#0b1424] border border-cyan-800/60 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1a30]">
              <div className="flex items-center gap-2.5">
                {activeQuickModal === 'weather' && <Wind className="w-5 h-5 text-cyan-400" />}
                {activeQuickModal === 'reports' && <FileText className="w-5 h-5 text-emerald-400" />}
                {activeQuickModal === 'model' && <Brain className="w-5 h-5 text-indigo-400" />}
                <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                  {activeQuickModal === 'weather' && 'Polar Meteorological & Sea-State Analysis'}
                  {activeQuickModal === 'reports' && 'Operational Passage Briefing & Export'}
                  {activeQuickModal === 'model' && 'Predictive Model Architecture & Benchmarks'}
                </h2>
              </div>
              <button
                onClick={() => setActiveQuickModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {activeQuickModal === 'reports' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <div>
                        <div className="text-sm font-bold text-white">POLAR_DSS_PASSAGE_BRIEFING.PDF</div>
                        <div className="text-[11px] text-slate-400">Generated: 18 Sep 2026 • 14:00 UTC | ISEA-44 Antarctic Expedition</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        STATUS: VERIFIED
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-400">Vessel:</span>
                        <strong className="text-white ml-2">MV Vasiliy Golovnin (PC3)</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Active Track:</span>
                        <strong className="text-emerald-400 ml-2">Route 2 (Western Bypass)</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Total Distance:</span>
                        <strong className="text-white ml-2">420 km (227 nm)</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Fuel Projected:</span>
                        <strong className="text-white ml-2">1,180 Litres (Saves 270L)</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        showToast('Passage Plan Briefing exported as POLAR_DSS_Passage_Briefing.pdf');
                        setActiveQuickModal(null);
                      }}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF Briefing</span>
                    </button>
                    <button
                      onClick={() => {
                        showToast('Sent to Bridge Wireless Printer.');
                        setActiveQuickModal(null);
                      }}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Hardcopy</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. TOAST NOTIFICATION POPUP */}
      {toastMessage && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-cyan-950/95 border border-cyan-400/60 text-cyan-200 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-cyan-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 5. DHRUV-AI POLAR COPILOT CHATBOT */}
      <PolarAiChatbot
        vessel={vessel}
        icebergs={icebergs}
        currentRoute={currentRoute}
        isRerouted={isRerouted}
        hasConflict={hasConflict}
        onRecalculateRoute={handleRecalculateRoute}
        timelineStep={timelineStep}
        onNavigateToPage={setCurrentPage}
        isOpen={isChatbotOpen}
        onToggleOpen={() => setIsChatbotOpen((prev) => !prev)}
      />

      {/* 6. POLAR EMERGENCY DECISION SUPPORT SYSTEM (EDSS) MODAL */}
      <PolarEmergencySystem
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        vessel={vessel}
        onEngageEmergencyRoute={handleEngageEmergencyRoute}
        onCancelEmergency={handleCancelEmergency}
        isEmergencyActive={isEmergencyActive}
        activeEmergencyType={activeEmergencyType}
        setActiveEmergencyType={setActiveEmergencyType}
        activeDestination={activeEmergencyDestination}
        setActiveDestination={setActiveEmergencyDestination}
      />
    </div>
  );
};
