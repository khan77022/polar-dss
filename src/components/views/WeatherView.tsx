import React, { useEffect, useState } from 'react';
import {
  Wind,
  Compass,
  Waves,
  Eye,
  Thermometer,
  Navigation,
  ArrowLeft,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { polarApi, useBackend, WeatherRecordDto, OceanRecordDto } from '../../api/client';
import { provenanceBadgeClass, provenanceBadgeLabel } from '../../api/hooks';

interface WeatherViewProps {
  onNavigateToCockpit?: () => void;
}

export const WeatherView: React.FC<WeatherViewProps> = ({ onNavigateToCockpit }) => {
  const [weatherRecord, setWeatherRecord] = useState<WeatherRecordDto | null>(null);
  const [oceanRecord, setOceanRecord] = useState<OceanRecordDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<string>('simulation');

  const fetchTelemetry = async () => {
    if (!useBackend) return;
    setIsLoading(true);
    try {
      const [wRes, oRes] = await Promise.allSettled([
        polarApi.weatherCurrent(),
        polarApi.oceanCurrent(),
      ]);
      if (wRes.status === 'fulfilled' && wRes.value?.items?.[0]) {
        setWeatherRecord(wRes.value.items[0]);
        setDataSource(wRes.value.items[0].provenance?.dataStatus ?? 'observed');
      }
      if (oRes.status === 'fulfilled' && oRes.value?.items?.[0]) {
        setOceanRecord(oRes.value.items[0]);
      }
    } catch (e) {
      console.error('Weather telemetry fetch failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const wVals = weatherRecord?.values;
  const oVals = oceanRecord?.values;

  const windSpeedKts = wVals?.wind_speed_kts ?? 20.5;
  const windDirDeg = wVals?.wind_direction_deg ?? 315;
  const oceanSpeedKts = oVals?.current_speed_kts ?? 1.2;
  const oceanDirDeg = oVals?.current_direction_deg ?? 40;
  const waveHeightM = wVals?.wave_height_m ?? 2.4;
  const wavePeriodS = wVals?.wave_period_s ?? 7.5;
  const visibilityKm = wVals?.visibility_km ?? 10.0;
  const airTempC = wVals?.air_temperature_c ?? -14.0;
  const sprayRisk = wVals?.freezing_spray_risk ?? 'light';

  const weatherMetrics = [
    {
      id: 'wind-speed',
      label: 'Wind Speed & Flow',
      value: `${windSpeedKts} knots`,
      subtext: `${(windSpeedKts * 1.852).toFixed(1)} km/h (${windSpeedKts > 28 ? 'Near Gale' : windSpeedKts > 16 ? 'Moderate Breeze' : 'Gentle Breeze'})`,
      icon: Wind,
      color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60',
    },
    {
      id: 'wind-direction',
      label: 'Wind Direction',
      value: `${windDirDeg}° (Bearing)`,
      subtext: 'Katabatic offshore drainage gradient',
      icon: Compass,
      color: 'text-blue-400 bg-blue-950/60 border-blue-800/60',
    },
    {
      id: 'ocean-current',
      label: 'Surface Ocean Current',
      value: `${oceanSpeedKts} knots`,
      subtext: `${(Number(oceanSpeedKts) * 0.514444).toFixed(2)} m/s • Heading ${oceanDirDeg}°`,
      icon: Navigation,
      color: 'text-teal-400 bg-teal-950/60 border-teal-800/60',
    },
    {
      id: 'wave-height',
      label: 'Significant Wave Height',
      value: `${waveHeightM} m`,
      subtext: `Period ${wavePeriodS}s (Moderate swell)`,
      icon: Waves,
      color: 'text-sky-400 bg-sky-950/60 border-sky-800/60',
    },
    {
      id: 'visibility',
      label: 'Horizon Visibility',
      value: visibilityKm >= 10 ? '> 10 km' : `${visibilityKm} km`,
      subtext: visibilityKm >= 10 ? 'Unrestricted leads horizon' : 'Restricted visibility in snow/haze',
      icon: Eye,
      color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
    },
    {
      id: 'air-temperature',
      label: 'Surface Air Temp',
      value: `${airTempC.toFixed(1)}°C`,
      subtext: `Wind chill equivalent: ${(airTempC - windSpeedKts * 0.4).toFixed(1)}°C`,
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
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${provenanceBadgeClass(dataSource)}`}>
                {provenanceBadgeLabel(dataSource)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Polar atmospheric dynamics, katabatic wind stress, wave action, and superstructure icing index.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTelemetry}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Live Telemetry</span>
          </button>
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
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
            sprayRisk === 'high' || sprayRisk === 'severe'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}>
            ADVISORY: {sprayRisk} SPRAY ICING
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Air temperature ({airTempC.toFixed(1)}°C) with {windSpeedKts} knot winds and {waveHeightM}m swell generates {sprayRisk} freezing spray on exposed foredeck and container cranes. De-icing heaters active on bridge navigation radar scanners and VHF antennas. Hull sea water intake temperature favorable above heavy anchor-ice threshold.
        </p>
      </div>

      {/* 4. Station Reference Note */}
      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center justify-between font-mono">
        <span>Station Observation Sector: <strong className="text-slate-200">Indian Antarctic Coastal Sector & Prydz Bay</strong></span>
        <span className="text-cyan-400">
          Source: {weatherRecord?.provenance?.source ?? 'WMO-89062'} • {weatherRecord?.validAt ? new Date(weatherRecord.validAt).toUTCString() : 'Active In-Situ'}
        </span>
      </div>
    </div>
  );
};
