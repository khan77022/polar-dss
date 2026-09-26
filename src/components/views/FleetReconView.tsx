import React, { useState } from 'react';
import {
  Radio,
  Ship,
  Compass,
  Waves,
  Wind,
  Thermometer,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Send,
  RefreshCw,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Flag,
  Share2,
  ArrowLeft,
  X,
} from 'lucide-react';
import { AheadVesselReport, Vessel, NavPage } from '../../types';
import { AHEAD_VESSELS } from '../../data/polarData';
import { VESSEL_IMAGES } from '../../assets/images';

interface FleetReconViewProps {
  vessel: Vessel;
  onNavigateToMap: () => void;
  onNavigate?: (page: NavPage) => void;
  onNavigateToCockpit?: () => void;
}

export const FleetReconView: React.FC<FleetReconViewProps> = ({
  vessel,
  onNavigateToMap,
  onNavigate,
  onNavigateToCockpit,
}) => {
  const [vessels, setVessels] = useState<AheadVesselReport[]>(AHEAD_VESSELS);
  const [selectedVesselId, setSelectedVesselId] = useState<string>(AHEAD_VESSELS[0].id);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [pingMessage, setPingMessage] = useState<string | null>(null);

  // Broadcast Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [broadcastNotes, setBroadcastNotes] = useState<string>('');
  const [broadcastIceConc, setBroadcastIceConc] = useState<number>(35);
  const [broadcastFloeM, setBroadcastFloeM] = useState<number>(0.8);
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);

  const selectedVessel = vessels.find((v) => v.id === selectedVesselId) || vessels[0];

  const handlePingFleet = () => {
    setIsPinging(true);
    setPingMessage(null);
    setTimeout(() => {
      setIsPinging(false);
      setPingMessage('Acoustic & Iridium AIS Mesh handshake complete. 4/4 vanguard vessels acknowledged telemetry ping with 100% packet parity.');
      setVessels((prev) =>
        prev.map((v) => ({
          ...v,
          lastReportTime: 'Just now (Live AIS Stream)',
        }))
      );
    }, 800);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastNotes.trim()) return;

    const newReport: AheadVesselReport = {
      id: `own-vessel-${Date.now()}`,
      vesselName: `${vessel.name} (Own Ship)`,
      callSign: vessel.callSign,
      flag: '🇮🇳',
      nation: 'India (ISEA-44 Flagship)',
      role: 'Expedition Command Flagship & Transport',
      polarClass: vessel.polarClass,
      currentPos: vessel.currentPos,
      distanceAheadKm: 0,
      bearingDeg: vessel.headingDeg,
      speedKts: vessel.speedKts,
      headingDeg: vessel.headingDeg,
      lastReportTime: 'Just now (Broadcasted)',
      observedSeaIceConcentration: broadcastIceConc,
      floeThicknessM: broadcastFloeM,
      leadCondition: broadcastIceConc < 40 ? 'Clear Open Leads' : 'Navigable Fractures',
      icebergSightings: {
        count: 2,
        details: 'Visual watch on A68A megaberg northern front.',
        nearestKm: 15.2,
      },
      weather: {
        airTempC: -12.4,
        windSpeedKts: 24,
        windDirection: 'NW (310°)',
        swellHeightM: 2.1,
        visibilityKm: 10,
        freezingSpray: 'Light',
      },
      vPirepNotes: broadcastNotes,
      photoUrl: VESSEL_IMAGES.vasiliyGolovnin,
      radarEchoStatus: 'Clear',
      isIndian: true,
    };

    setVessels([newReport, ...vessels]);
    setBroadcastStatus('V-PIREP successfully broadcasted across polar HF mesh to all vessels within 350 nautical miles.');
    setTimeout(() => {
      setShowBroadcastModal(false);
      setBroadcastStatus(null);
      setBroadcastNotes('');
    }, 1200);
  };

  const returnAction = onNavigateToCockpit || onNavigateToMap;

  return (
    <div id="fleet-recon-view" className="flex-1 flex flex-col p-4 sm:p-6 gap-4 overflow-y-auto bg-[#060b14] text-slate-100 max-w-7xl mx-auto w-full">
      {/* Top Banner: Real-time AIS Mesh Status */}
      <div className="bg-gradient-to-r from-[#0b1424] via-[#0e203d] to-[#0b1424] border border-cyan-800/60 rounded-xl p-4 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          {returnAction && (
            <button
              onClick={returnAction}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer shrink-0 mt-0.5"
              title="Return to Master Cockpit"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-10 h-10 rounded-lg bg-cyan-600/80 border border-cyan-400/40 flex items-center justify-center text-cyan-200 shadow-inner shrink-0">
            <Radio className="w-5 h-5 text-cyan-200 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold tracking-tight text-white font-mono">
                POLAR-MESH: Ahead-of-Route Vessel Network & V-PIREP Feed
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                4 VANGUARD SCOUTS ACTIVE
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 font-mono">
                ANTARCTIC AIS MESH
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-snug">
              Access real-time in-situ sea-ice thickness, radar iceberg sightings, and meteorological observations broadcasted directly by vessels navigating ahead of <strong>{vessel.name}</strong>.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={handlePingFleet}
            disabled={isPinging}
            className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{isPinging ? 'Pinging Fleet...' : 'Ping Vanguard Fleet'}</span>
          </button>

          <button
            onClick={() => setShowBroadcastModal(true)}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Broadcast In-Situ V-PIREP</span>
          </button>

          <button
            onClick={returnAction}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer font-mono"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>View on Map</span>
          </button>
        </div>
      </div>

      {pingMessage && (
        <div className="p-3 bg-cyan-950/60 border border-cyan-500/50 text-cyan-200 rounded-xl text-xs flex items-center gap-2 font-mono animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{pingMessage}</span>
        </div>
      )}

      {/* Main Grid: Vessel Selector Cards (Left 5 cols) & Selected Vessel Dossier (Right 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left: Vanguard Vessel Stream (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1 font-mono">
            <span className="uppercase tracking-wider text-[11px]">
              Vessels Operating Ahead Along Route
            </span>
            <span className="text-[11px] text-cyan-400">
              Sorted by Distance Ahead
            </span>
          </div>

          <div className="space-y-2.5">
            {vessels.map((v) => {
              const isSelected = v.id === selectedVesselId;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVesselId(v.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0e223d] border-cyan-500/80 shadow-lg ring-1 ring-cyan-400/50'
                      : 'bg-[#0b1424] hover:bg-[#0d1a30] border-slate-800 shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-10 rounded-lg overflow-hidden border border-slate-700 shrink-0 bg-slate-900 relative">
                        <img
                          src={v.photoUrl}
                          alt={v.vesselName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-0 right-0 text-xs px-0.5 rounded-tl bg-black/70">{v.flag}</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white leading-tight flex items-center gap-1.5 font-mono">
                          <span>{v.vesselName}</span>
                          {v.isIndian && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              INDIAN FLEET
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {v.callSign} • {v.polarClass}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-cyan-400 font-mono">
                        +{v.distanceAheadKm} km ahead
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        BRG {v.bearingDeg}° • {v.speedKts} kts
                      </div>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[11px]">
                    <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800 text-center">
                      <div className="text-[9px] text-slate-400 font-medium">Sea Ice Conc.</div>
                      <div className="font-bold text-white font-mono">
                        {v.observedSeaIceConcentration}%
                      </div>
                    </div>
                    <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800 text-center">
                      <div className="text-[9px] text-slate-400 font-medium">Floe Thickness</div>
                      <div className="font-bold text-white font-mono">
                        {v.floeThicknessM} m
                      </div>
                    </div>
                    <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800 text-center">
                      <div className="text-[9px] text-slate-400 font-medium">Iceberg Radar</div>
                      <div className="font-bold text-amber-400 font-mono">
                        {v.icebergSightings.count} Bergs
                      </div>
                    </div>
                  </div>

                  {/* V-PIREP quote preview */}
                  <p className="mt-2 text-[11px] text-slate-300 line-clamp-2 italic bg-slate-950/50 p-2 rounded border border-slate-800/70 font-mono">
                    "{v.vPirepNotes}"
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {v.lastReportTime}
                    </span>
                    <span className="font-semibold text-cyan-400">
                      Click to inspect full dossier ➔
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Vanguard Vessel Dossier (7 cols) */}
        <div className="lg:col-span-7 bg-[#0b1424] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header of selected vessel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedVessel.flag}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white font-mono">
                      {selectedVessel.vesselName}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                      {selectedVessel.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 font-mono">
                    Position: <strong className="text-slate-200">{Math.abs(selectedVessel.currentPos.lat).toFixed(2)}°S, {Math.abs(selectedVessel.currentPos.lon).toFixed(2)}°W</strong> • {selectedVessel.distanceAheadKm} km ahead on transit line
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={returnAction}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Track Vessel on Map</span>
                </button>
              </div>
            </div>

            {/* Visual Photo Card */}
            <div className="relative h-44 rounded-xl overflow-hidden border border-slate-800 shadow-inner group">
              <img
                src={selectedVessel.photoUrl}
                alt={selectedVessel.vesselName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent flex flex-col justify-end p-3.5 text-white">
                <div className="text-[10px] uppercase font-mono text-cyan-300 font-bold tracking-wider">
                  Vanguard Scout Optical & SAR Telemetry
                </div>
                <div className="text-xs font-semibold text-white/95 mt-0.5 flex items-center justify-between">
                  <span>{selectedVessel.polarClass} • In-situ Sea-Ice Assessment Watch</span>
                  <span className="font-mono text-emerald-400 font-bold">RADAR: {selectedVessel.radarEchoStatus}</span>
                </div>
              </div>
            </div>

            {/* In-situ Environmental Readings Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Waves className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Sea Ice Conc.</span>
                </div>
                <div className="text-base font-bold text-white font-mono">
                  {selectedVessel.observedSeaIceConcentration}%
                </div>
                <div className="text-[10px] text-cyan-300 font-semibold truncate mt-0.5">
                  {selectedVessel.leadCondition}
                </div>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                  <span>Air / Swell</span>
                </div>
                <div className="text-base font-bold text-white font-mono">
                  {selectedVessel.weather.airTempC}°C
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                  Swell: {selectedVessel.weather.swellHeightM} m
                </div>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Wind className="w-3.5 h-3.5 text-blue-400" />
                  <span>Surface Wind</span>
                </div>
                <div className="text-base font-bold text-white font-mono">
                  {selectedVessel.weather.windSpeedKts} kts
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                  Dir: {selectedVessel.weather.windDirection}
                </div>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Iceberg Sightings</span>
                </div>
                <div className="text-base font-bold text-amber-300 font-mono">
                  {selectedVessel.icebergSightings.count} Targets
                </div>
                <div className="text-[10px] text-amber-400 font-semibold truncate mt-0.5">
                  Nearest: {selectedVessel.icebergSightings.nearestKm} km
                </div>
              </div>
            </div>

            {/* Official Tactical Pilot Report (V-PIREP) */}
            <div className="bg-[#0e1a30] border border-cyan-900/60 rounded-xl p-3.5 text-xs text-slate-200">
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800">
                <span className="font-bold text-cyan-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5 font-mono">
                  <Ship className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Tactical Pilot Report (V-PIREP)</span>
                </span>
                <span className="font-mono text-[10px] text-cyan-400">
                  {selectedVessel.lastReportTime}
                </span>
              </div>
              <p className="leading-relaxed text-slate-300 font-mono text-[11px]">
                "{selectedVessel.vPirepNotes}"
              </p>
              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Verification: <strong className="text-slate-300">WMO Encrypted Polar AIS</strong></span>
                <span>Iceberg Watch: <strong className="text-amber-400">{selectedVessel.icebergSightings.details}</strong></span>
              </div>
            </div>
          </div>

          {/* Fleet Recommendation Summary Box */}
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-xs text-emerald-200 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white font-mono">
                Fleet Network Consensus: Western Bypass (Route 2) Validated
              </div>
              <p className="text-[11px] text-emerald-300/90 mt-0.5 leading-snug">
                Vanguard reports from both <strong>PRV Sagar Dhruv</strong> and <strong>ORV Sagar Kanya</strong> confirm that the western approach avoids the high-concentration pack ice and growler field shed by megaberg A68A.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast In-Situ V-PIREP Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b1424] rounded-xl border border-cyan-800/60 shadow-2xl max-w-lg w-full p-5 text-slate-100 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white font-mono">
                  Broadcast In-Situ V-PIREP (Fleet AIS Mesh)
                </h3>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Observed Sea Ice Concentration (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={broadcastIceConc}
                    onChange={(e) => setBroadcastIceConc(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Floe Thickness (meters)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={broadcastFloeM}
                    onChange={(e) => setBroadcastFloeM(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Tactical Observations & Navigation Notes
                </label>
                <textarea
                  rows={3}
                  value={broadcastNotes}
                  onChange={(e) => setBroadcastNotes(e.target.value)}
                  placeholder="e.g., Transiting WP-02. Fractured leads visible bearing 280°. Recommend vessels reduce speed to 10 kts."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              {broadcastStatus && (
                <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-300 font-mono text-[11px]">
                  ✓ {broadcastStatus}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer text-xs shadow-md"
                >
                  Transmit V-PIREP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
