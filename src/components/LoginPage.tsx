import React, { useState } from 'react';
import {
  Compass,
  Shield,
  Ship,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  User,
  ExternalLink,
  Globe,
  Radio,
  Navigation,
  Anchor,
} from 'lucide-react';
import { UserSession } from '../types';
import { DEMO_USER_SESSIONS } from '../data/polarData';

interface LoginPageProps {
  onLogin: (user: UserSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [selectedDemo, setSelectedDemo] = useState<string>('ncpor-operator');
  const [email, setEmail] = useState<string>('operator.polar@ncpor.gov.in');
  const [password, setPassword] = useState<string>('••••••••');
  const [expedition, setExpedition] = useState<string>('44th Indian Scientific Expedition to Antarctica (ISEA)');
  const [vessel, setVessel] = useState<string>('MV Vasiliy Golovnin (Chartered Polar Icebreaker)');
  const [showOverviewModal, setShowOverviewModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSelectDemo = (demo: (typeof DEMO_USER_SESSIONS)[0]) => {
    setSelectedDemo(demo.id);
    setEmail(demo.email);
    setExpedition(demo.expedition);
    setVessel(demo.vesselName);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const activeDemo = DEMO_USER_SESSIONS.find((d) => d.id === selectedDemo) || DEMO_USER_SESSIONS[0];
    const session: UserSession = {
      ...activeDemo,
      email: email || activeDemo.email,
      expedition: expedition || activeDemo.expedition,
      vesselName: vessel || activeDemo.vesselName,
    };

    setTimeout(() => {
      setIsLoading(false);
      onLogin(session);
    }, 500);
  };

  return (
    <div
      id="login-portal-root"
      className="min-h-screen w-full bg-[#08101e] text-slate-200 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-x-hidden font-sans"
    >
      {/* Subtle polar grid lines and ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.18),rgba(8,16,30,0))] pointer-events-none" />

      {/* Top Polar Navigation Command Header */}
      <header className="border-b border-slate-800/80 bg-[#0c1829]/95 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between gap-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-sky-400 shrink-0 shadow-xs">
            <Compass className="w-5 h-5 stroke-[2.2] text-sky-400" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight">
                POLAR-NAV
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-mono">
                DSS v4.2
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                • National Centre for Polar and Ocean Research (NCPOR)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Antarctic Maritime Navigation & Sea-Ice Decision Support System
            </p>
          </div>
        </div>

        {/* Right Status Badge & Mission Brief button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono">POLAR SAT LINK: ONLINE</span>
          </div>

          <button
            onClick={() => setShowOverviewModal(true)}
            className="text-xs text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            <span>Mission Architecture</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Mission Profile & Technical Capabilities */}
          <div className="lg:col-span-6 flex flex-col justify-between p-6 rounded-xl bg-[#0c1829] border border-slate-800/90 shadow-xl">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-[11px] font-medium text-slate-300">
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                <span>Operational Polar Navigation Gateway</span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Polar Expedition Safety Portal
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  Real-time decision support for Indian polar research vessels operating in Antarctic pack ice, marginal ice zones, and iceberg drift corridors.
                </p>
              </div>

              {/* Technical Capabilities */}
              <div className="space-y-2.5 pt-1">
                <div className="p-3 rounded-lg bg-[#08101e] border border-slate-800/80 flex items-start gap-3">
                  <div className="w-7 h-7 rounded bg-blue-500/10 border border-blue-500/30 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-white block">Indian Research Base Stations</span>
                    <span className="text-slate-400">
                      Covers coastal logistics for <strong>Bharati Station</strong> (Larsemann Hills), <strong>Maitri Station</strong> (Schirmacher Oasis), and supply depots.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#08101e] border border-slate-800/80 flex items-start gap-3">
                  <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-white block">ConvLSTM Spatiotemporal Sea-Ice Model</span>
                    <span className="text-slate-400">
                      Satellite microwave radiometry and SAR ingestion for 24h to 120h sea-ice concentration forecasts.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#08101e] border border-slate-800/80 flex items-start gap-3">
                  <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-white block">Hydrodynamic Iceberg Drift & Rerouting</span>
                    <span className="text-slate-400">
                      Predicts tabular iceberg drift corridors and recalculates safe bypass courses automatically.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Citation */}
            <div className="mt-6 pt-3.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>EXPEDITION: 44th ISEA</span>
              <span className="text-sky-400">NCPOR • MoES</span>
            </div>
          </div>

          {/* Right Column: Operator Login Card */}
          <div className="lg:col-span-6 p-6 rounded-xl bg-[#0c1829] border border-slate-800/90 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Authorized Operator Authentication</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Select a polar operations role or enter your credentials
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-sky-300 text-[10px] font-mono">
                  ACTIVE
                </span>
              </div>

              {/* 1-Click Role Access */}
              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Quick Role Selection
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {DEMO_USER_SESSIONS.map((demo) => {
                    const isSelected = selectedDemo === demo.id;
                    return (
                      <button
                        key={demo.id}
                        type="button"
                        onClick={() => handleSelectDemo(demo)}
                        className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-xs'
                            : 'bg-[#08101e] border-slate-800 text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded font-bold text-xs flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {demo.avatarInitials}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate flex items-center gap-1.5">
                              <span>{demo.name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                {demo.badge}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{demo.role}</div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Controls */}
              <form onSubmit={handleFormSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Official Email / Call Sign
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-[#08101e] border border-slate-800 rounded-md text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Security Passcode
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-[#08101e] border border-slate-800 rounded-md text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Expedition Mission
                    </label>
                    <select
                      value={expedition}
                      onChange={(e) => setExpedition(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#08101e] border border-slate-800 rounded text-xs text-white focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="44th Indian Scientific Expedition to Antarctica (ISEA)">
                        44th ISEA (Bharati & Maitri Mission)
                      </option>
                      <option value="East Antarctica Marine Transect (Prydz Bay)">
                        East Antarctica Marine Transect
                      </option>
                      <option value="Weddell Sea & Peninsula Collaborative Corridor">
                        Weddell Sea & Peninsula Corridor
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Polar Vessel
                    </label>
                    <select
                      value={vessel}
                      onChange={(e) => setVessel(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#08101e] border border-slate-800 rounded text-xs text-white focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="MV Vasiliy Golovnin (Chartered Polar Icebreaker)">
                        MV Vasiliy Golovnin (PC3 Icebreaker)
                      </option>
                      <option value="PRV Sagar Dhruv (Polar Research Vessel)">
                        PRV Sagar Dhruv (Deep Polar Class)
                      </option>
                      <option value="ORV Sagar Kanya (MoES Fleet)">
                        ORV Sagar Kanya (Oceanographic)
                      </option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  id="btn-login-submit"
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-md shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-1"
                >
                  {isLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying System Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter Polar Navigation DSS</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 text-center font-mono">
              National Centre for Polar and Ocean Research • MoES
            </div>
          </div>
        </div>
      </main>

      {/* Mission Overview Modal */}
      {showOverviewModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1829] border border-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-2xl text-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                  NCPOR Polar Operations Brief
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  AI-Driven Polar Maritime Navigation Decision Support System
                </h3>
              </div>
              <button
                onClick={() => setShowOverviewModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="p-3 bg-[#08101e] border border-slate-800 rounded">
                <span className="font-bold text-sky-300 block mb-1">🎯 Operational Scope:</span>
                Supports navigation for Indian scientific expeditions to Antarctica operating year-round permanent stations <strong>Bharati</strong> (Larsemann Hills) and <strong>Maitri</strong> (Schirmacher Oasis). Helps navigate safe channels through compressing pack ice, heavy ice floes, and drifting tabular icebergs.
              </div>

              <div className="p-3 bg-[#08101e] border border-slate-800 rounded">
                <span className="font-bold text-emerald-300 block mb-1">💡 Technical Core:</span>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>ConvLSTM Spatiotemporal Sea-Ice Model:</strong> Ingests passive microwave and SAR imagery for +24h to +120h sea-ice concentration forecasts.</li>
                  <li><strong>Hydrodynamic Iceberg Drift Tracker:</strong> Calculates uncertainty dispersion cones driven by wind vectors and ocean currents.</li>
                  <li><strong>Multi-Objective Route Optimizer:</strong> Evaluates safety, transit time, and fuel consumption to reroute vessels around dynamic hazard corridors.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowOverviewModal(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Close Overview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070f1c] px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 shrink-0">
        <div>
          National Centre for Polar and Ocean Research (NCPOR) • Ministry of Earth Sciences
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span>Security: TLS 1.3 / Restricted Maritime Access</span>
          <span>•</span>
          <span>Goa, India</span>
        </div>
      </footer>
    </div>
  );
};
