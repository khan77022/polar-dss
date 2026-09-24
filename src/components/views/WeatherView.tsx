import React from 'react';
import {
  Wind,
  Compass,
  Waves,
  Eye,
  Thermometer,
  Navigation,
  ArrowLeft,
  Info,
  ShieldAlert,
} from 'lucide-react';

interface WeatherViewProps {
  onNavigateToCockpit?: () => void;
}

export const WeatherView: React.FC<WeatherViewProps> = ({ onNavigateToCockpit }) => {
  const weatherMetrics = [
    {
      id: 'wind-speed',
      label: 'Wind Speed & Flow',
      value: '20.5 knots',
      subtext: '38.0 km/h (Moderate Gale)',
      icon: Wind,
      color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60',
    },
    {
      id: 'wind-direction',
      label: 'Wind Direction',
      value: 'NW • 315°',
      subtext: 'Northwesterly katabatic offshore drainage',
      icon: Compass,
      color: 'text-blue-400 bg-blue-950/60 border-blue-800/60',
    },
    {
      id: 'ocean-current',
      label: 'Surface Ocean Current',
      value: '1.2 knots',
      subtext: '0.62 m/s • Heading 040° NE',
      icon: Navigation,
      color: 'text-teal-400 bg-teal-950/60 border-teal-800/60',
    },
    {
      id: 'wave-height',
      label: 'Significant Wave Height',
      value: '2.4 m',
      subtext: 'Period 7.5s (Moderate polar swell)',
      icon: Waves,
      color: 'text-sky-400 bg-sky-950/60 border-sky-800/60',
    },
    {
      id: 'visibility',
      label: 'Horizon Visibility',
      value: '> 10 km',
      subtext: 'Unrestricted leads horizon',
      icon: Eye,
      color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
    },
    {
      id: 'air-temperature',
      label: 'Surface Air Temp',
      value: '-14.0°C',
      subtext: 'Wind chill equivalent: -22.5°C',
      icon: Thermometer,
      color: 'text-rose-400 bg-rose-950/60 border-rose-800/60',
    },
  ];

  return (
    <div id="weather-view" className="flex-1 flex flex-col p-4 sm:p-6 gap-6 overflow-y-auto max-w-6xl mx-auto w-full bg-[#060b14] text-slate-100">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div className="flex items-center gap-3">
          {onNavigateToCockpit && (
            <button
              onClick={onNavigateToCockpit}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              title="Return to Master Cockpit"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight font-mono">
                POLAR METEOROLOGICAL & SEA-STATE OBSERVATIONS
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                REAL-TIME TELEMETRY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Polar atmospheric dynamics, katabatic wind stress, wave action, and superstructure icing index.
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-cyan-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
          DEMO / OPERATIONAL SIMULATION
        </div>
      </div>

      {/* 2. Exactly 6 Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {weatherMetrics.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              id={`card-${item.id}`}
              className="bg-[#0b1424] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  {item.label}
                </span>
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-2xl font-extrabold font-mono text-white tracking-tight">
                  {item.value}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-medium font-mono">
                  {item.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Freezing Spray & Icing Advisory Box */}
      <div className="bg-[#0b1424] border border-slate-800 rounded-xl p-4 shadow-lg space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-1.5 font-mono">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Superstructure Icing & Marine Advisory
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            ADVISORY: LIGHT SPRAY ICING
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Air temperature (-14.0°C) with 20.5 knot winds and 2.4m swell generates light freezing spray on exposed foredeck and container cranes. De-icing heaters active on bridge navigation radar scanners and VHF antennas. Hull sea water intake temperature at -1.6°C (favorable, above heavy anchor-ice threshold).
        </p>
      </div>

      {/* 4. Station Reference Note */}
      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center justify-between font-mono">
        <span>Station Observation Sector: <strong className="text-slate-200">Bransfield Strait & Weddell Margin</strong></span>
        <span className="text-cyan-400">Station ID: WMO-89062 • Rotated 18 Sep 14:00 UTC</span>
      </div>
    </div>
  );
};
