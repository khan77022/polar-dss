import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  Flame,
  Wrench,
  Activity,
  Wind,
  Snowflake,
  MapPin,
  Compass,
  Radio,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  Send,
  Copy,
  Check,
  Volume2,
  VolumeX,
  X,
  ArrowRight,
  Maximize2,
  ChevronRight,
  Info,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Waves,
  Thermometer,
  Eye,
  FileText,
  Anchor,
  HelpCircle,
} from 'lucide-react';
import { Vessel, LatLon, RouteOption } from '../types';
import {
  EmergencyType,
  EmergencySeverity,
  EMERGENCY_TYPES,
  CANDIDATE_SAFE_DESTINATIONS,
  RESCUE_AUTHORITIES,
  SafeHavenDestination,
  rankSafeDestinations,
  generateDistressMessage,
} from '../data/emergencyData';

interface PolarEmergencySystemProps {
  isOpen: boolean;
  onClose: () => void;
  vessel: Vessel;
  onEngageEmergencyRoute: (route: RouteOption, destination: SafeHavenDestination) => void;
  onCancelEmergency: () => void;
  isEmergencyActive: boolean;
  activeEmergencyType: EmergencyType;
  setActiveEmergencyType: (type: EmergencyType) => void;
  activeDestination: SafeHavenDestination | null;
  setActiveDestination: (dest: SafeHavenDestination) => void;
}

export const PolarEmergencySystem: React.FC<PolarEmergencySystemProps> = ({
  isOpen,
  onClose,
  vessel,
  onEngageEmergencyRoute,
  onCancelEmergency,
  isEmergencyActive,
  activeEmergencyType,
  setActiveEmergencyType,
  activeDestination,
  setActiveDestination,
}) => {
  // Workflow Steps:
  // 1: 🚨 Determine Emergency Type
  // 2: 📍 Check Ship Location & Telemetry
  // 3: 🗺️ & ⚠️ Consider Multi-Criteria Safe Destinations
  // 4: 🎯 Select Safest Destination
  // 5: 🧭 Generate Emergency Route
  // 6: 📡 Alert Rescue & Authorities
  // 7: 👥 ETA + SOP Checklist
  // 8: 🚢 Guide Ship toward Safe Location
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [severity, setSeverity] = useState<EmergencySeverity>('distress');
  const [isSirenMuted, setIsSirenMuted] = useState<boolean>(true);
  const [copiedTelegraph, setCopiedTelegraph] = useState<boolean>(false);
  const [isAlertTransmitting, setIsAlertTransmitting] = useState<boolean>(false);
  const [alertTransmitted, setAlertTransmitted] = useState<boolean>(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [guidanceSimStep, setGuidanceSimStep] = useState<number>(0);

  // Initialize checklist for active emergency type
  useEffect(() => {
    const defaultList = EMERGENCY_TYPES[activeEmergencyType].defaultChecklist;
    const initialMap: Record<string, boolean> = {};
    defaultList.forEach((item) => {
      initialMap[item.id] = item.done;
    });
    setChecklist(initialMap);
  }, [activeEmergencyType]);

  // Rank candidate destinations according to chosen emergency type
  const rankedDestinations = useMemo(() => {
    return rankSafeDestinations(activeEmergencyType, CANDIDATE_SAFE_DESTINATIONS);
  }, [activeEmergencyType]);

  // Default selected destination is the top-ranked recommendation
  const currentSelectedDest: SafeHavenDestination = useMemo(() => {
    if (activeDestination) {
      const match = rankedDestinations.find((d) => d.id === activeDestination.id);
      if (match) return match;
    }
    return rankedDestinations[0] || CANDIDATE_SAFE_DESTINATIONS[0];
  }, [activeDestination, rankedDestinations]);

  // Degraded vessel speed calculation based on emergency
  const effectiveSpeedKts = useMemo(() => {
    return EMERGENCY_TYPES[activeEmergencyType].recommendedSpeedKts;
  }, [activeEmergencyType]);

  // Calculate ETA
  const transitHours = useMemo(() => {
    const hours = currentSelectedDest.distanceNm / Math.max(1, effectiveSpeedKts);
    return Math.round(hours * 10) / 10;
  }, [currentSelectedDest, effectiveSpeedKts]);

  const etaFormatted = useMemo(() => {
    const now = new Date();
    const etaDate = new Date(now.getTime() + transitHours * 3600 * 1000);
    const day = etaDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const time = etaDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day} • ${time} UTC (${transitHours}h passage)`;
  }, [transitHours]);

  // Generated IMO GMDSS distress message
  const distressTelegraph = useMemo(() => {
    return generateDistressMessage(
      {
        name: vessel.name,
        callSign: vessel.callSign,
        polarClass: vessel.polarClass,
        currentPos: vessel.currentPos,
        speedKts: effectiveSpeedKts,
      },
      activeEmergencyType,
      severity,
      currentSelectedDest,
      etaFormatted
    );
  }, [vessel, activeEmergencyType, severity, currentSelectedDest, etaFormatted, effectiveSpeedKts]);

  const handleCopyTelegraph = () => {
    navigator.clipboard.writeText(distressTelegraph);
    setCopiedTelegraph(true);
    setTimeout(() => setCopiedTelegraph(false), 2500);
  };

  const handleTransmitDistress = () => {
    setIsAlertTransmitting(true);
    setTimeout(() => {
      setIsAlertTransmitting(false);
      setAlertTransmitted(true);
    }, 1200);
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Convert emergency destination to RouteOption for the map
  const handleEngageGuidance = () => {
    const emergencyRoute: RouteOption = {
      id: `emergency-${currentSelectedDest.id}`,
      name: `🚨 EMERGENCY DIVERSION: ${currentSelectedDest.name}`,
      objective: 'safety',
      distanceKm: currentSelectedDest.distanceKm,
      timeHours: transitHours,
      fuelLiters: Math.round(transitHours * 110),
      iceRisk: currentSelectedDest.seaIce.concentrationPercent > 40 ? 'Medium' : 'Low',
      icebergRisk: 'Low',
      recommendedFor: `Immediate Emergency Haven for ${EMERGENCY_TYPES[activeEmergencyType].title}`,
      waypoints: currentSelectedDest.waypoints,
      hasConflict: false,
    };

    setActiveDestination(currentSelectedDest);
    onEngageEmergencyRoute(emergencyRoute, currentSelectedDest);
    setCurrentStep(8); // Jump to Guidance HUD
  };

  if (!isOpen) return null;

  const currentTypeInfo = EMERGENCY_TYPES[activeEmergencyType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#070e1c] border-2 border-rose-500/80 rounded-2xl shadow-2xl shadow-rose-950/60 max-w-6xl w-full h-[94vh] flex flex-col overflow-hidden text-slate-200 relative">
        {/* TOP EMERGENCY COMMAND HEADER */}
        <div className="bg-gradient-to-r from-rose-950 via-[#180a15] to-[#0a1226] border-b border-rose-600/50 p-3 sm:p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-900/50">
              <span className="text-xl animate-pulse">{currentTypeInfo.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                  {severity === 'distress' ? '🚨 MAYDAY DISTRESS' : severity === 'urgency' ? '⚠️ PAN-PAN URGENCY' : 'ℹ️ SECURITE'}
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-white font-mono uppercase tracking-wide">
                  POLAR EMERGENCY DECISION SUPPORT SYSTEM (EDSS)
                </span>
                {isEmergencyActive && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    GUIDANCE ACTIVE
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-300 font-mono mt-0.5 flex items-center gap-2">
                <span>VESSEL: <strong className="text-white">{vessel.name}</strong></span>
                <span className="text-slate-500">•</span>
                <span className="text-rose-300">ACTIVE: {currentTypeInfo.title}</span>
                <span className="text-slate-500">•</span>
                <span className="text-cyan-300">POS: {Math.abs(vessel.currentPos.lat).toFixed(2)}°S, {Math.abs(vessel.currentPos.lon).toFixed(2)}°W</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSirenMuted(!isSirenMuted)}
              className={`p-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
                isSirenMuted
                  ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                  : 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
              }`}
              title={isSirenMuted ? 'Unmute Emergency Siren' : 'Mute Emergency Siren'}
            >
              {isSirenMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-rose-400" />}
              <span className="hidden md:inline">{isSirenMuted ? 'SIREN OFF' : 'AUDIO GUARD'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Close Emergency Console (Process continues in background)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WORKFLOW STEP PROGRESS BAR */}
        <div className="bg-[#0b1424] border-b border-slate-800 px-3 py-2 overflow-x-auto scrollbar-none shrink-0">
          <div className="flex items-center gap-1 min-w-[760px] justify-between text-[11px] font-mono">
            {[
              { num: 1, label: '🚨 Emergency Type' },
              { num: 2, label: '📍 Ship Telemetry' },
              { num: 3, label: '🗺️ Safe Havens' },
              { num: 4, label: '⚠️ Criteria Matrix' },
              { num: 5, label: '🎯 Select Target' },
              { num: 6, label: '🧭 Emergency Route' },
              { num: 7, label: '📡 Alert Authorities' },
              { num: 8, label: '🚢 Guide Ship' },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <button
                  key={step.num}
                  onClick={() => setCurrentStep(step.num)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-900/60 ring-1 ring-rose-400'
                      : isPast
                      ? 'bg-slate-800 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isActive ? 'bg-white text-slate-950' : isPast ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {isPast ? '✓' : step.num}
                  </span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN INTERACTIVE WORKSPACE */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {/* STEP 1: 🚨 DETERMINE EMERGENCY TYPE */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <span className="text-xl">🧠</span>
                    <span>Step 1: Determine & Classify Vessel Emergency</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Select the active casualty or hazard to initialize specialized safe-haven scoring, route constraints, and IAMSAR protocols.
                  </p>
                </div>

                {/* Priority Selection */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto font-mono text-[10px]">
                  <span className="text-slate-400">PRIORITY:</span>
                  {(['distress', 'urgency', 'alert'] as EmergencySeverity[]).map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setSeverity(sev)}
                      className={`px-2 py-1 rounded font-bold uppercase transition-all cursor-pointer ${
                        severity === sev
                          ? sev === 'distress'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : sev === 'urgency'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sev === 'distress' ? 'DISTRESS (MAYDAY)' : sev === 'urgency' ? 'URGENCY (PAN-PAN)' : 'ALERT (SECURITE)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emergency Types Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.keys(EMERGENCY_TYPES) as EmergencyType[]).map((key) => {
                  const item = EMERGENCY_TYPES[key];
                  const isSelected = activeEmergencyType === key;
                  return (
                    <div
                      key={key}
                      onClick={() => setActiveEmergencyType(key)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gradient-to-br from-rose-950/70 via-slate-900 to-rose-950/30 border-rose-500 shadow-xl shadow-rose-950/60 ring-2 ring-rose-500/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{item.icon}</span>
                            <span className="font-bold text-sm text-white font-mono">{item.title}</span>
                          </div>
                          {isSelected && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500 text-white animate-pulse">
                              SELECTED
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed mb-2.5">
                          {item.shortDesc}
                        </p>
                        <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 text-[10px] space-y-1 mb-2 font-mono">
                          <div className="text-rose-300">
                            <strong>System Impact:</strong> {item.systemImpact}
                          </div>
                          <div className="text-cyan-300">
                            <strong>Cruising Speed:</strong> {item.recommendedSpeedKts} kts
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Required Haven:</span>
                        <span className="text-amber-300 font-semibold truncate max-w-[170px]">
                          {item.priorityFacilities[0]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons to Next Step */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono">
                  Active Emergency: <strong className="text-rose-400">{currentTypeInfo.title}</strong>
                </div>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold font-mono text-xs flex items-center gap-2 shadow-lg shadow-rose-950 cursor-pointer transition-all"
                >
                  <span>PROCEED TO SHIP TELEMETRY</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: 📍 CHECK SHIP LOCATION & TELEMETRY */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-400" />
                  <span>Step 2: Ship Current Location & Casualty Status</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Confirm the vessel's live positioning, propulsion envelope, and crew status before computing refuge vectors.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Vessel Identity & GNSS Position */}
                <div className="bg-[#0b1424] border border-cyan-800/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold font-mono text-cyan-300 uppercase">Vessel Telemetry</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-700">
                      LIVE GNSS
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Vessel Name:</span>
                      <strong className="text-white">{vessel.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Call Sign / MMSI:</span>
                      <span className="font-mono text-cyan-300">{vessel.callSign} / 419001450</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Polar Class Rating:</span>
                      <strong className="text-emerald-400 font-mono">{vessel.polarClass}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Dimensions:</span>
                      <span className="text-slate-300 font-mono">161m LOA • 22.8m Beam • 8.5m Draft</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">People On Board (POB):</span>
                      <strong className="text-white font-mono">64 Persons (38 Sci / 26 Crew)</strong>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-cyan-900/60 space-y-1.5 font-mono text-[11px]">
                    <div className="text-slate-400">Current Position:</div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="text-cyan-400">📍</span>
                      <span>{Math.abs(vessel.currentPos.lat).toFixed(4)}°S, {Math.abs(vessel.currentPos.lon).toFixed(4)}°W</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Sector: Bransfield Strait / South Shetland Maritime Approach
                    </div>
                  </div>
                </div>

                {/* Propulsion & Dynamic Envelope */}
                <div className="bg-[#0b1424] border border-amber-800/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold font-mono text-amber-300 uppercase">Emergency Propulsion Status</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-700">
                      CASUALTY ENVELOPE
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nominal Cruise Speed:</span>
                      <span className="text-slate-300 font-mono">12.5 kts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Degraded Safe Speed:</span>
                      <strong className="text-rose-400 font-mono text-sm">{effectiveSpeedKts} kts</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fuel Reserves:</span>
                      <strong className="text-emerald-400 font-mono">312,000 Litres (~110h steaming)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Steering Gear:</span>
                      <span className="text-amber-300 font-mono">Local Manual Hydraulic Actuation</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Acoustic Forward Sonar:</span>
                      <span className="text-cyan-300 font-mono">Scanning Leads 1.8 NM Ahead</span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-950/30 rounded-lg border border-amber-700/60 space-y-1 text-[11px]">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Casualty Constraint:</span>
                    </div>
                    <p className="text-slate-300 text-[10px]">
                      {currentTypeInfo.systemImpact} Must select destination with low compressive ice pack.
                    </p>
                  </div>
                </div>

                {/* Local Weather & Surrounding Sea State */}
                <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold font-mono text-cyan-300 uppercase">Surrounding Metocean State</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-700">
                      ON-SITE BUOYS
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">Air Temp</div>
                      <div className="text-sm font-bold text-cyan-300 font-mono">-14.2°C</div>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">Swell Height</div>
                      <div className="text-sm font-bold text-blue-300 font-mono">2.2m (SW)</div>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">Wind Velocity</div>
                      <div className="text-sm font-bold text-amber-300 font-mono">28 kts (WNW)</div>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">Visibility</div>
                      <div className="text-sm font-bold text-emerald-300 font-mono">9.5 km</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 leading-snug">
                    Sea-ice concentration at ship position: <strong className="text-rose-400">38%</strong> (first-year floes with brash ice).
                  </div>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs cursor-pointer border border-slate-700"
                >
                  ← BACK TO EMERGENCY TYPE
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold font-mono text-xs flex items-center gap-2 shadow-lg shadow-cyan-950 cursor-pointer transition-all"
                >
                  <span>FIND SAFE HAVENS & EVALUATE</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 & 4: 🗺️ FIND SAFE HAVENS & ⚠️ MULTI-CRITERIA MATRIX */}
          {(currentStep === 3 || currentStep === 4) && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Compass className="w-5 h-5 text-amber-400" />
                    <span>
                      {currentStep === 3
                        ? 'Step 3: Candidate Safe Havens & Refuge Ports'
                        : 'Step 4: Multi-Criteria Assessment Matrix'}
                    </span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Analyzing sea-ice concentration, metocean severity, transit distance, and emergency facility compatibility for each candidate haven.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className={`px-3 py-1 rounded-lg font-mono text-xs cursor-pointer ${
                      currentStep === 3 ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    Haven Cards
                  </button>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className={`px-3 py-1 rounded-lg font-mono text-xs cursor-pointer ${
                      currentStep === 4 ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    Comparison Matrix
                  </button>
                </div>
              </div>

              {/* VIEW A: HAVEN CARDS */}
              {currentStep === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {rankedDestinations.map((dest, idx) => {
                    const isSelected = currentSelectedDest.id === dest.id;
                    const isTopRanked = idx === 0;
                    return (
                      <div
                        key={dest.id}
                        onClick={() => setActiveDestination(dest)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-br from-[#0c2242] via-slate-900 to-[#0e1d33] border-cyan-400 shadow-xl ring-2 ring-cyan-500/50'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-lg">{dest.flag}</span>
                                <span className="font-bold text-sm text-white font-mono leading-tight">{dest.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{dest.subName}</div>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                dest.suitabilityScore >= 90
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : dest.suitabilityScore >= 75
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}>
                                SCORE: {dest.suitabilityScore}%
                              </span>
                              {isTopRanked && (
                                <span className="text-[9px] text-emerald-400 font-mono font-bold mt-0.5">
                                  ★ #1 RECOMMENDED
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Key Criteria Metrics */}
                          <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-950/80 rounded-lg border border-slate-800 font-mono text-[10px] mb-2.5">
                            <div>
                              <div className="text-slate-400">Distance:</div>
                              <div className="text-white font-bold">{dest.distanceKm} km</div>
                              <div className="text-[9px] text-slate-400">({dest.distanceNm} NM)</div>
                            </div>
                            <div>
                              <div className="text-slate-400">Sea-Ice:</div>
                              <div className={`font-bold ${
                                dest.seaIce.concentrationPercent < 20 ? 'text-emerald-400' : dest.seaIce.concentrationPercent < 45 ? 'text-amber-400' : 'text-rose-400'
                              }`}>
                                {dest.seaIce.concentrationPercent}% Conc.
                              </div>
                              <div className="text-[9px] text-slate-400">{dest.seaIce.floeThicknessM}m thk</div>
                            </div>
                            <div>
                              <div className="text-slate-400">Swell / Wind:</div>
                              <div className="text-white font-bold">{dest.weather.swellHeightM}m swell</div>
                              <div className="text-[9px] text-slate-400">{dest.weather.windSpeedKts} kts</div>
                            </div>
                          </div>

                          {/* Highlights */}
                          <div className="space-y-1 mb-3">
                            <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Emergency Facilities:</div>
                            <ul className="text-[10px] text-slate-300 space-y-0.5 list-disc list-inside">
                              {dest.facilityHighlights.slice(0, 2).map((fh, i) => (
                                <li key={i} className="truncate">{fh}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-400">Shelter: <strong>{dest.shelterType}</strong></span>
                          <span className={isSelected ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
                            {isSelected ? 'TARGET ACTIVE ✓' : 'CLICK TO SELECT'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VIEW B: FULL MULTI-CRITERIA MATRIX TABLE */}
              {currentStep === 4 && (
                <div className="bg-[#0b1424] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-[11px] text-slate-300">
                      <thead className="bg-[#0e1a30] text-cyan-300 uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="p-3">Candidate Haven</th>
                          <th className="p-3">Distance</th>
                          <th className="p-3">Sea-Ice (Conc / Thk)</th>
                          <th className="p-3">Weather / Swell</th>
                          <th className="p-3">Airfield / Runway</th>
                          <th className="p-3">Hospital / Surgical</th>
                          <th className="p-3">Shelter Type</th>
                          <th className="p-3">Safety Score</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {rankedDestinations.map((dest, idx) => {
                          const isSelected = currentSelectedDest.id === dest.id;
                          return (
                            <tr
                              key={dest.id}
                              className={`transition-colors ${
                                isSelected ? 'bg-cyan-950/40 text-white font-semibold' : 'hover:bg-slate-850'
                              }`}
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <span>{dest.flag}</span>
                                  <div>
                                    <div className="font-bold text-white">{dest.name}</div>
                                    <div className="text-[10px] text-slate-400 font-normal">{dest.subName}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <div>{dest.distanceKm} km</div>
                                <div className="text-[10px] text-slate-400">{dest.distanceNm} NM</div>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  dest.seaIce.concentrationPercent < 20 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}>
                                  {dest.seaIce.concentrationPercent}% • {dest.seaIce.floeThicknessM}m
                                </span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <div>{dest.weather.windSpeedKts} kts wind</div>
                                <div className="text-[10px] text-slate-400">{dest.weather.swellHeightM}m swell • {dest.weather.airTempC}°C</div>
                              </td>
                              <td className="p-3">
                                {dest.facilities.intercontinentalAirfield ? (
                                  <span className="text-emerald-400 font-bold">✓ C-130 Strip</span>
                                ) : dest.facilities.helicopterHangar ? (
                                  <span className="text-cyan-400">Helideck</span>
                                ) : (
                                  <span className="text-slate-500">None</span>
                                )}
                              </td>
                              <td className="p-3">
                                {dest.facilities.surgicalTheatre ? (
                                  <span className="text-emerald-400 font-bold">✓ Full Surgical</span>
                                ) : dest.facilities.hospitalTraumaBay ? (
                                  <span className="text-cyan-400">Trauma Bay</span>
                                ) : (
                                  <span className="text-slate-500">First Aid Only</span>
                                )}
                              </td>
                              <td className="p-3 text-[10px] text-slate-300">
                                {dest.shelterType}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                                  dest.suitabilityScore >= 90 ? 'text-emerald-400' : dest.suitabilityScore >= 75 ? 'text-cyan-400' : 'text-amber-400'
                                }`}>
                                  {dest.suitabilityScore}%
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => setActiveDestination(dest)}
                                  className={`px-2.5 py-1 rounded text-[10px] font-mono cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-cyan-500 text-slate-950 font-bold'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  {isSelected ? 'SELECTED' : 'SELECT'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons to Next Step */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs cursor-pointer border border-slate-700"
                >
                  ← BACK TO TELEMETRY
                </button>
                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold font-mono text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer transition-all"
                >
                  <span>CONFIRM TARGET & GENERATE ROUTE</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: 🎯 SELECT SAFEST REACHABLE DESTINATION & CONFIRM */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Step 5: Safest Reachable Haven Decision Selection</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Algorithm has selected and evaluated the optimum safe haven destination based on your vessel casualty constraints.
                </p>
              </div>

              {/* Recommended Haven Highlight Card */}
              <div className="bg-gradient-to-br from-[#0c2242] via-[#09152b] to-[#0a1122] border-2 border-emerald-500/80 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{currentSelectedDest.flag}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white font-mono">{currentSelectedDest.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500 text-slate-950 shadow-xs">
                          AI SELECTED REFUGE
                        </span>
                      </div>
                      <div className="text-xs text-slate-300">{currentSelectedDest.subName} • {currentSelectedDest.nation}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-mono">COMPOSITE SAFETY RATING</div>
                    <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                      {currentSelectedDest.suitabilityScore}% / 100
                    </div>
                  </div>
                </div>

                {/* Algorithmic Rationale */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-emerald-800/60 text-xs text-slate-200 space-y-1">
                  <div className="font-bold text-emerald-300 font-mono flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Decision Rationale for {currentTypeInfo.title}:</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {currentSelectedDest.suitabilityRationale}
                  </p>
                </div>

                {/* 4-Column Metric Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                    <div className="text-slate-400 text-[10px]">DISTANCE TO RUN</div>
                    <div className="text-base font-bold text-white">{currentSelectedDest.distanceKm} km</div>
                    <div className="text-[10px] text-cyan-300">{currentSelectedDest.distanceNm} NM</div>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                    <div className="text-slate-400 text-[10px]">ESTIMATED TIME (ETA)</div>
                    <div className="text-base font-bold text-emerald-400">{transitHours} Hours</div>
                    <div className="text-[10px] text-slate-400">@ {effectiveSpeedKts} kts safe SOG</div>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                    <div className="text-slate-400 text-[10px]">SEA ICE CONCENTRATION</div>
                    <div className="text-base font-bold text-cyan-300">{currentSelectedDest.seaIce.concentrationPercent}%</div>
                    <div className="text-[10px] text-slate-400">{currentSelectedDest.seaIce.compressionRisk} Risk</div>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                    <div className="text-slate-400 text-[10px]">SHELTER TYPE</div>
                    <div className="text-sm font-bold text-amber-300 truncate">{currentSelectedDest.shelterType}</div>
                    <div className="text-[10px] text-slate-400">{currentSelectedDest.weather.swellHeightM}m internal swell</div>
                  </div>
                </div>

                {/* Emergency Contact & Comms Guard */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-cyan-950/40 rounded-xl border border-cyan-800/40 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400">Harbor Emergency VHF: </span>
                    <strong className="text-cyan-300">{currentSelectedDest.vhfEmergencyChannel}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">SAR Authority: </span>
                    <strong className="text-white">{currentSelectedDest.sarZoneAuthority}</strong>
                  </div>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs cursor-pointer border border-slate-700"
                >
                  ← CHANGE HAVEN SELECTION
                </button>
                <button
                  onClick={() => setCurrentStep(6)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold font-mono text-xs flex items-center gap-2 shadow-lg shadow-indigo-950 cursor-pointer transition-all"
                >
                  <span>GENERATE WAYPOINT TRAJECTORY</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: 🧭 GENERATE EMERGENCY ROUTE */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-indigo-400" />
                  <span>Step 6: Tactical Emergency Waypoint Route</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Calculated collision-free diversion corridor steering through open water leads and avoiding active iceberg drift tracks.
                </p>
              </div>

              {/* Waypoint Table */}
              <div className="bg-[#0b1424] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="p-3 bg-[#0e1a30] border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-xs font-bold text-white">ROUTE: {vessel.name} ➔ {currentSelectedDest.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      LEAD PASSAGE ACTIVE
                    </span>
                  </div>
                  <div className="text-xs font-mono text-cyan-300">
                    Total: {currentSelectedDest.distanceKm} km • {transitHours}h @ {effectiveSpeedKts} kts
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px] text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Waypoint</th>
                        <th className="p-2.5">Latitude</th>
                        <th className="p-2.5">Longitude</th>
                        <th className="p-2.5">Leg Bearing</th>
                        <th className="p-2.5">Leg Speed</th>
                        <th className="p-2.5">Ice Clearance</th>
                        <th className="p-2.5">Tactical Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {currentSelectedDest.waypoints.map((wp, i) => {
                        const isStart = i === 0;
                        const isDest = i === currentSelectedDest.waypoints.length - 1;
                        return (
                          <tr key={i} className={isDest ? 'bg-emerald-950/20 text-emerald-200' : ''}>
                            <td className="p-2.5 font-bold">
                              {isStart ? 'WP-00 (Vessel Pos)' : isDest ? `WP-0${i} (Final Haven)` : `WP-0${i} (Lead Fracture)`}
                            </td>
                            <td className="p-2.5 text-white">{Math.abs(wp.lat).toFixed(4)}°S</td>
                            <td className="p-2.5 text-white">{Math.abs(wp.lon).toFixed(4)}°W</td>
                            <td className="p-2.5 text-cyan-300">{isStart ? '000°' : '224° TRUE'}</td>
                            <td className="p-2.5 text-amber-300">{effectiveSpeedKts} kts</td>
                            <td className="p-2.5 text-emerald-400">&gt;4.2 NM clear of A68A</td>
                            <td className="p-2.5 text-[10px] text-slate-400">
                              {isStart ? 'Initiate emergency heading change' : isDest ? 'Drop anchors in sheltered bay' : 'Maintain center of fracture lead'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs cursor-pointer border border-slate-700"
                >
                  ← BACK TO SELECTION
                </button>
                <button
                  onClick={() => setCurrentStep(7)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold font-mono text-xs flex items-center gap-2 shadow-lg shadow-rose-950 cursor-pointer transition-all"
                >
                  <span>PROCEED TO ALERT RESCUE AUTHORITIES</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: 📡 ALERT RESCUE AUTHORITIES & GMDSS DISPATCH */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
                  <span>Step 7: International SAR Broadcast & Authority Alerting</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Send official IAMSAR / IMO GMDSS distress telegraph via Inmarsat-C, DSC 2187.5 kHz, and Iridium Satellite.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Authority Target List */}
                <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold font-mono text-slate-200 uppercase">Emergency Dispatch Targets</span>
                    <span className="text-[10px] font-mono text-emerald-400">6 NODES ONLINE</span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {RESCUE_AUTHORITIES.map((auth) => (
                      <div key={auth.id} className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-white text-xs">{auth.name}</strong>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            {alertTransmitted ? 'ACKNOWLEDGED' : auth.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">{auth.role}</div>
                        <div className="text-[9px] font-mono text-cyan-300">
                          Primary: {auth.contactFrequencies[0]}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Transmit Action Button */}
                  <button
                    onClick={handleTransmitDistress}
                    disabled={isAlertTransmitting || alertTransmitted}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all ${
                      alertTransmitted
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                        : isAlertTransmitting
                        ? 'bg-amber-600 text-white'
                        : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-950'
                    }`}
                  >
                    {isAlertTransmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>BROADCASTING GMDSS DSC PACKETS...</span>
                      </>
                    ) : alertTransmitted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>DISTRESS PACKETS LOGGED & ACKNOWLEDGED</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>BROADCAST DISTRESS ALERT NOW</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Generated Telegraph Text Box */}
                <div className="lg:col-span-2 bg-[#0b1424] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                      <span className="text-xs font-bold font-mono text-rose-400 flex items-center gap-1.5 uppercase">
                        <FileText className="w-4 h-4" />
                        IAMSAR / GMDSS Emergency Telegraph Payload
                      </span>
                      <button
                        onClick={handleCopyTelegraph}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedTelegraph ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedTelegraph ? 'COPIED TO CLIPBOARD' : 'COPY TELEGRAPH'}</span>
                      </button>
                    </div>

                    <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-72">
                      {distressTelegraph}
                    </pre>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">
                      VHF Guard: <strong className="text-white">Channel 16 Active</strong>
                    </span>
                    <span className="text-emerald-400">
                      {alertTransmitted ? 'Transmission receipt #NCPOR-SAR-88531-2026 confirmed' : 'Awaiting manual broadcast confirmation'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  onClick={() => setCurrentStep(6)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs cursor-pointer border border-slate-700"
                >
                  ← BACK TO ROUTE
                </button>
                <button
                  onClick={() => setCurrentStep(8)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold font-mono text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer transition-all"
                >
                  <span>GO TO GUIDANCE HUD & CHECKLIST</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 8: 🚢 GUIDE SHIP TOWARD SELECTED SAFE HAVEN & SOP CHECKLIST */}
          {currentStep === 8 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Compass className="w-5 h-5 text-cyan-400" />
                    <span>Step 8: Bridge Emergency Guidance HUD & Tactical Steering</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Live navigational guidance toward {currentSelectedDest.name}. Maintain strict watch on acoustic sonar and rudder trim.
                  </p>
                </div>

                {isEmergencyActive ? (
                  <button
                    onClick={onCancelEmergency}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-rose-200 text-xs font-mono font-bold cursor-pointer transition-colors"
                  >
                    STAND DOWN / RESOLVE EMERGENCY
                  </button>
                ) : (
                  <button
                    onClick={handleEngageGuidance}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold font-mono text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer transition-all"
                  >
                    <Anchor className="w-4 h-4" />
                    <span>ENGAGE EMERGENCY GUIDANCE TO {currentSelectedDest.name.toUpperCase()}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* TACTICAL STEERING COMPASS HUD */}
                <div className="bg-[#0b1424] border border-cyan-800/60 rounded-xl p-4 flex flex-col items-center justify-between text-center space-y-3">
                  <div className="w-full flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold font-mono text-cyan-300 uppercase">Steering Course HUD</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-700">
                      WP-01 ACTIVE
                    </span>
                  </div>

                  {/* Visual Compass Rose */}
                  <div className="relative w-36 h-36 rounded-full border-4 border-slate-800 flex items-center justify-center bg-slate-950 shadow-inner my-2">
                    <div className="absolute inset-1 rounded-full border border-dashed border-slate-700" />
                    <span className="absolute top-1 text-[10px] font-mono font-bold text-rose-500">N</span>
                    <span className="absolute right-1 text-[10px] font-mono font-bold text-slate-400">E</span>
                    <span className="absolute bottom-1 text-[10px] font-mono font-bold text-slate-400">S</span>
                    <span className="absolute left-1 text-[10px] font-mono font-bold text-slate-400">W</span>

                    {/* Compass Needle */}
                    <div
                      className="w-1.5 h-24 bg-gradient-to-b from-rose-500 via-white to-slate-600 rounded-full shadow-lg transition-transform duration-500"
                      style={{ transform: 'rotate(224deg)' }}
                    />
                    <div className="w-4 h-4 rounded-full bg-cyan-400 border-2 border-slate-950 shadow-md z-10" />
                  </div>

                  <div className="space-y-1 w-full font-mono">
                    <div className="text-xs text-slate-400">COURSE TO STEER (CTS)</div>
                    <div className="text-3xl font-black text-white tracking-widest">224° <span className="text-sm font-normal text-cyan-400">TRUE</span></div>
                    <div className="text-[11px] text-emerald-400 font-bold">CROSS-TRACK ERROR: &lt;18m (ON TRACK)</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t border-slate-800 text-[10px] font-mono">
                    <div className="bg-slate-950 p-2 rounded-lg">
                      <span className="text-slate-400">Speed (SOG):</span>
                      <strong className="text-white block text-xs">{effectiveSpeedKts} kts</strong>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg">
                      <span className="text-slate-400">Distance to Go:</span>
                      <strong className="text-white block text-xs">{currentSelectedDest.distanceKm} km</strong>
                    </div>
                  </div>
                </div>

                {/* SOP EMERGENCY CREW ACTION CHECKLIST */}
                <div className="lg:col-span-2 bg-[#0b1424] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                      <div>
                        <span className="text-xs font-bold font-mono text-rose-300 uppercase flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Emergency Action Protocol Checklist ({currentTypeInfo.title})
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Follow strict polar safety code (SOLAS / Polar Code Chapter 11)
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300">
                        {Object.values(checklist).filter(Boolean).length} / {currentTypeInfo.defaultChecklist.length} COMPLETE
                      </span>
                    </div>

                    <div className="space-y-2">
                      {currentTypeInfo.defaultChecklist.map((item) => {
                        const isDone = !!checklist[item.id];
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleChecklistItem(item.id)}
                            className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                              isDone
                                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold ${
                                isDone ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-600 bg-slate-950'
                              }`}>
                                {isDone && '✓'}
                              </div>
                              <span className={`text-xs ${isDone ? 'line-through text-slate-400' : 'font-medium'}`}>
                                {item.text}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">
                              {isDone ? 'COMPLETED' : 'PENDING'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary ETA Footer */}
                  <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>PROJECTED REFUGE ARRIVAL:</span>
                      <strong className="text-emerald-400">{etaFormatted}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono cursor-pointer transition-colors"
                      >
                        VIEW ON SATELLITE MAP ➔
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  onClick={() => setCurrentStep(7)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs cursor-pointer border border-slate-700"
                >
                  ← BACK TO SAR ALERTS
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold font-mono text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer transition-all"
                >
                  <span>RETURN TO MASTER COCKPIT</span>
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
