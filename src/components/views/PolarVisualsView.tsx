import React, { useState } from 'react';
import {
  Ship,
  Snowflake,
  Eye,
  Maximize2,
  X,
  Compass,
  Anchor,
  Layers,
  Info,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Vessel, Iceberg } from '../../types';
import { AHEAD_VESSELS, ICEBERGS } from '../../data/polarData';

interface PolarVisualsViewProps {
  vessel: Vessel;
  icebergs: Iceberg[];
}

export const PolarVisualsView: React.FC<PolarVisualsViewProps> = ({
  vessel,
  icebergs,
}) => {
  const [activeTab, setActiveTab] = useState<'ships' | 'icebergs'>('ships');
  const [modalImage, setModalImage] = useState<{ url: string; title: string; subtitle: string } | null>(null);

  const shipProfiles = [
    {
      name: vessel.name,
      hindiName: 'एमवी वासिली गोलोवनिन (अभियान पोत)',
      callSign: vessel.callSign,
      role: 'Active 44th ISEA Expedition Flagship & Polar Heavy Cargo Icebreaker',
      polarClass: 'PC3 (Heavy Polar Cargo & Icebreaker)',
      lengthM: 161,
      beamM: 22.8,
      draftM: 9.0,
      displacementTonnes: '20,260 DWT',
      icebreakingPowerKw: '15,600 kW (Twin Shaft Diesel-Electric)',
      iceCapability: 'Continuous breaking of 1.5m level sea ice at 3.0 knots',
      crew: '42 Crew + 60 Indian Expedition Scientists',
      imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
      description: 'Chartered by the National Centre for Polar and Ocean Research (NCPOR) for Indian Antarctic Expeditions. Equipped with heavy container cranes, forward ice-ramming bow, and aviation flight deck for Kamov Ka-32 helicopters.',
      flag: '🇮🇳',
    },
    {
      name: 'PRV Sagar Dhruv (साग़र ध्रुव)',
      hindiName: 'भारतीय ध्रुवीय अनुसंधान पोत',
      callSign: 'VT-PRV',
      role: 'Vanguard Deep Polar Science & Lead Scout',
      polarClass: 'PC2 (Polar Icebreaker)',
      lengthM: 122,
      beamM: 24.0,
      draftM: 8.2,
      displacementTonnes: '14,500 DWT',
      icebreakingPowerKw: '18,000 kW (Azipod Propulsion)',
      iceCapability: 'Multi-year ice penetration up to 2.2m with ramming bow',
      crew: '32 Crew + 48 Scientists',
      imageUrl: 'https://images.unsplash.com/photo-1516495312341-3da8005e4e73?auto=format&fit=crop&w=1200&q=80',
      description: 'State-of-the-art national polar research vessel equipped with forward hydroacoustic ice-sensing sonar, clean polar laboratories, dynamic positioning (DP2), and automated CTD ocean rosette winches.',
      flag: '🇮🇳',
    },
    {
      name: 'ORV Sagar Kanya (साग़र कन्या)',
      hindiName: 'समुद्र विज्ञान अनुसंधान पोत',
      callSign: 'VTCG',
      role: 'Southern Ocean Hydrographic & Meteorological Patrol',
      polarClass: 'Ice-Strengthened Survey Vessel',
      lengthM: 100.3,
      beamM: 16.4,
      draftM: 5.8,
      displacementTonnes: '4,209 DWT',
      icebreakingPowerKw: '6,400 kW',
      iceCapability: 'Ice-strengthened hull for high-latitude open leads',
      crew: '28 Crew + 32 Scientists',
      imageUrl: 'https://images.unsplash.com/photo-1505705694340-019e1e335916?auto=format&fit=crop&w=1200&q=80',
      description: 'The workhorse oceanographic vessel of the Ministry of Earth Sciences (MoES), operating long-term benthic biological, geological, and atmospheric transects across the Roaring Forties and Antarctic Polar Front.',
      flag: '🇮🇳',
    },
    {
      name: 'RRS Sir David Attenborough',
      hindiName: 'ब्रिटिश अंटार्कटिक पोत',
      callSign: 'ZDLP1',
      role: 'Collaborative BAS Vanguard & Logistics Hub',
      polarClass: 'PC4 Polar Class',
      lengthM: 129,
      beamM: 24.0,
      draftM: 7.0,
      displacementTonnes: '15,000 DWT',
      icebreakingPowerKw: '16,000 kW',
      iceCapability: 'Continuous 1.0m ice breaking at 3 kts',
      crew: '30 Crew + 60 Scientists',
      imageUrl: 'https://images.unsplash.com/photo-1483181957632-8bda974cbc91?auto=format&fit=crop&w=1200&q=80',
      description: 'British Antarctic Survey flagship transiting Margueritte Bay; provides real-time acoustic lead observations to the POLAR-NAV cooperative fleet mesh.',
      flag: '🇬🇧',
    },
  ];

  const icebergProfiles = [
    {
      id: 'A68A',
      name: 'Megaberg A68A (Tabular Fragment)',
      hindiName: 'विशाल हिमखंड A68A',
      classification: 'Megaberg / Tabular Shelf Calve',
      lengthKm: 82,
      widthKm: 28,
      heightAboveWaterM: 35,
      keelDraftUnderM: 185,
      areaSqKm: 2296,
      calveOrigin: 'Larsen C Ice Shelf (July 2017)',
      driftVector: '325° (NW) at 1.4 knots',
      threatRating: 'CRITICAL HAZARD on Direct Route 1 (CPA 4.8 km on 21 Sep)',
      imageUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=80',
      physicsNote: '90% of iceberg volume is submerged underwater (~185m keel depth). It displaces deep ocean thermoclines, creating severe turbulent wake vortices and shedding hundreds of hazardous growlers into down-current channels.',
    },
    {
      id: 'A76',
      name: 'Megaberg A76 (Northern Fragment)',
      hindiName: 'विशाल हिमखंड A76',
      classification: 'Tabular Shelf Remnant',
      lengthKm: 54,
      widthKm: 20,
      heightAboveWaterM: 40,
      keelDraftUnderM: 210,
      areaSqKm: 1080,
      calveOrigin: 'Ronne Ice Shelf (May 2021)',
      driftVector: '340° (NNW) at 0.9 knots',
      threatRating: 'Monitored (Clear of Route 2 Western Corridor)',
      imageUrl: 'https://images.unsplash.com/photo-1548232979-6c557ee14752?auto=format&fit=crop&w=1200&q=80',
      physicsNote: 'Trapped in the outer Southern Ocean cyclonic drift. Sentinel-1 SAR interferometry reveals thermal stress fractures along its southern margin.',
    },
    {
      id: 'D28',
      name: 'D28 ("Moo Cow" Calve)',
      hindiName: 'हिमखंड D28 (एमरी आइस शेल्फ)',
      classification: 'Medium Tabular Floe',
      lengthKm: 30,
      widthKm: 14,
      heightAboveWaterM: 28,
      keelDraftUnderM: 140,
      areaSqKm: 420,
      calveOrigin: 'Amery Ice Shelf (September 2019)',
      driftVector: '010° (NNE) at 0.6 knots',
      threatRating: 'Low Risk (Grounded Embayment)',
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      physicsNote: 'Originally calved near Bharati Station in East Antarctica and drifted along the coastal Antarctic counter-current into the Larsen B embayment.',
    },
  ];

  return (
    <div id="polar-visuals-view" className="flex-1 flex flex-col p-4 md:p-6 gap-4 overflow-y-auto">
      {/* Header with Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Antarctic Maritime Visual Dossier & Vessel Registry</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-200">
              HIGH-RESOLUTION INTEL
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Photographic validation, hull icebreaking specifications, and megaberg underwater keel physics for the Indian Antarctic Expedition.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200/80">
          <button
            onClick={() => setActiveTab('ships')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'ships'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Ship className="w-3.5 h-3.5 text-blue-600" />
            <span>Research Vessels ({shipProfiles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('icebergs')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'icebergs'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Snowflake className="w-3.5 h-3.5 text-cyan-600" />
            <span>Monitored Megabergs ({icebergProfiles.length})</span>
          </button>
        </div>
      </div>

      {/* Ships Tab */}
      {activeTab === 'ships' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shipProfiles.map((ship, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Photo with Overlay */}
                <div className="relative h-52 overflow-hidden group">
                  <img
                    src={ship.imageUrl}
                    alt={ship.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent flex items-end justify-between p-3.5 text-white">
                    <div>
                      <div className="text-[10px] text-sky-300 font-mono font-bold uppercase">
                        {ship.polarClass}
                      </div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{ship.flag}</span>
                        <span>{ship.name}</span>
                      </h3>
                      <div className="text-[10px] text-slate-300 font-hindi">
                        {ship.hindiName}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setModalImage({
                          url: ship.imageUrl,
                          title: ship.name,
                          subtitle: `${ship.polarClass} • ${ship.role}`,
                        })
                      }
                      title="Inspect High-Res Visual"
                      className="p-1.5 rounded-md bg-slate-900/80 hover:bg-blue-600 text-white transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Specs and Description */}
                <div className="p-4 space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {ship.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500 block text-[10px]">Dimensions</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {ship.lengthM}m × {ship.beamM}m (Draft {ship.draftM}m)
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500 block text-[10px]">Displacement</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {ship.displacementTonnes}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500 block text-[10px]">Ice Propulsion</span>
                      <span className="font-bold text-blue-900 font-mono">
                        {ship.icebreakingPowerKw}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500 block text-[10px]">Ice Capability</span>
                      <span className="font-bold text-emerald-800 text-[10px]">
                        {ship.iceCapability}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Call Sign: <strong className="font-mono text-slate-700">{ship.callSign}</strong></span>
                <span>Crew Complement: <strong className="text-slate-700">{ship.crew}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Icebergs Tab */}
      {activeTab === 'icebergs' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {icebergProfiles.map((berg) => (
            <div
              key={berg.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Photo */}
                <div className="relative h-48 overflow-hidden group">
                  <img
                    src={berg.imageUrl}
                    alt={berg.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent flex items-end justify-between p-3.5 text-white">
                    <div>
                      <div className="text-[10px] text-cyan-300 font-mono font-bold uppercase">
                        {berg.classification}
                      </div>
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {berg.name}
                      </h3>
                      <div className="text-[10px] text-slate-300">
                        Origin: {berg.calveOrigin}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setModalImage({
                          url: berg.imageUrl,
                          title: berg.name,
                          subtitle: `${berg.lengthKm}km × ${berg.widthKm}km • Keel Draft ~${berg.keelDraftUnderM}m`,
                        })
                      }
                      title="Inspect High-Res Visual"
                      className="p-1.5 rounded-md bg-slate-900/80 hover:bg-blue-600 text-white transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Specs */}
                <div className="p-4 space-y-3">
                  <div className={`p-2 rounded text-[11px] font-bold ${
                    berg.id === 'A68A'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {berg.threatRating}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500 block text-[10px]">Surface Area</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {berg.areaSqKm} km²
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500 block text-[10px]">Dimensions</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {berg.lengthKm} × {berg.widthKm} km
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500 block text-[10px]">Freeboard Height</span>
                      <span className="font-bold text-blue-900 font-mono">
                        +{berg.heightAboveWaterM} m (Above)
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500 block text-[10px]">Submerged Keel Draft</span>
                      <span className="font-bold text-cyan-800 font-mono">
                        -{berg.keelDraftUnderM} m (90% Mass)
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-sky-50/60 rounded border border-sky-100 text-[11px] text-slate-700 leading-relaxed">
                    <span className="font-bold text-blue-950 block text-[10px] mb-0.5 uppercase">
                      Hydrodynamic & Draft Physics
                    </span>
                    {berg.physicsNote}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Drift Vector: <strong className="font-mono text-slate-700">{berg.driftVector}</strong></span>
                <span className="text-blue-600 font-semibold font-mono text-[10px]">Sentinel-1 SAR</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* High-Resolution Modal */}
      {modalImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden max-w-4xl w-full shadow-2xl animate-in zoom-in-95 duration-150 text-white">
            <div className="flex items-center justify-between p-3.5 bg-slate-950 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">{modalImage.title}</h3>
                <p className="text-xs text-slate-400">{modalImage.subtitle}</p>
              </div>
              <button
                onClick={() => setModalImage(null)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-hidden flex items-center justify-center bg-black">
              <img
                src={modalImage.url}
                alt={modalImage.title}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>National Centre for Polar and Ocean Research (NCPOR) Maritime Imagery Archives</span>
              <span>Validated against Sentinel Optical & SAR telemetry</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
