import React, { useState } from 'react';
import {
  Ship,
  X,
  Check,
  RotateCcw,
  Sliders,
  Shield,
  Gauge,
  Fuel,
  Ruler,
  Anchor,
  Compass,
  Sparkles,
} from 'lucide-react';
import { Vessel } from '../types';
import { RESEARCH_VESSEL, INDIAN_VESSELS } from '../data/polarData';

interface VesselConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  vessel: Vessel;
  onSaveVessel: (updatedVessel: Vessel) => void;
}

const POLAR_CLASSES = [
  { id: 'PC1', label: 'PC1 — Year-round all polar waters (Heavy Icebreaker)', maxIceM: 3.5 },
  { id: 'PC2', label: 'PC2 — Year-round moderate multi-year ice conditions', maxIceM: 2.5 },
  { id: 'PC3', label: 'PC3 — Year-round second-year ice (Medium Icebreaker)', maxIceM: 1.8 },
  { id: 'PC4', label: 'PC4 — Year-round thick first-year ice', maxIceM: 1.4 },
  { id: 'PC5', label: 'PC5 — Year-round medium first-year ice', maxIceM: 1.0 },
  { id: 'PC6', label: 'PC6 — Summer/Autumn medium first-year ice', maxIceM: 0.8 },
  { id: 'PC7', label: 'PC7 — Summer/Autumn thin first-year ice', maxIceM: 0.5 },
  { id: 'Non-Ice', label: 'Open Water Only — Non-Ice Strengthened', maxIceM: 0.1 },
];

export const VesselConfigModal: React.FC<VesselConfigModalProps> = ({
  isOpen,
  onClose,
  vessel,
  onSaveVessel,
}) => {
  const [formData, setFormData] = useState<Vessel>({ ...vessel });
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field: keyof Vessel, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyPreset = (presetVessel: Vessel) => {
    setFormData({
      ...presetVessel,
      draftM: presetVessel.draftM || 8.5,
      displacementTons: presetVessel.displacementTons || 16200,
      icebreakingCapabilityM: presetVessel.icebreakingCapabilityM || 1.5,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveVessel({
      ...formData,
      lengthM: Number(formData.lengthM) || 161,
      beamM: Number(formData.beamM) || 22.8,
      draftM: Number(formData.draftM) || 8.5,
      displacementTons: Number(formData.displacementTons) || 16200,
      icebreakingCapabilityM: Number(formData.icebreakingCapabilityM) || 1.5,
      speedKts: Number(formData.speedKts) || 12.5,
      fuelRateLPerHour: Number(formData.fuelRateLPerHour) || 115,
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#0b1424] border border-cyan-500/40 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:px-6 bg-gradient-to-r from-[#0d1c33] via-[#091527] to-[#0d1c33] border-b border-cyan-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shadow-md">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wide flex items-center gap-2">
                <span>Ship Dimensions & Vessel Specifications</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                  IMO Polar Code
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Configure your ship length, beam, draft, and icebreaking rating for accurate routing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Quick Presets */}
          <div>
            <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider font-mono block mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Ship Presets</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset(RESEARCH_VESSEL)}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-cyan-950/40 hover:border-cyan-500/50 transition-all text-left cursor-pointer"
              >
                <div className="font-bold text-white truncate">MV Vasiliy Golovnin</div>
                <div className="text-[10px] text-cyan-400 font-mono">161m • 22.8m Beam • PC3</div>
                <div className="text-[9px] text-slate-400 mt-0.5">Heavy Cargo & Icebreaker</div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset(INDIAN_VESSELS[1])}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-cyan-950/40 hover:border-cyan-500/50 transition-all text-left cursor-pointer"
              >
                <div className="font-bold text-white truncate">PRV Sagar Dhruv</div>
                <div className="text-[10px] text-emerald-400 font-mono">122m • 24.0m Beam • PC2</div>
                <div className="text-[9px] text-slate-400 mt-0.5">Deep Polar Research Vessel</div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset(INDIAN_VESSELS[2])}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-cyan-950/40 hover:border-cyan-500/50 transition-all text-left cursor-pointer"
              >
                <div className="font-bold text-white truncate">ORV Sagar Kanya</div>
                <div className="text-[10px] text-amber-400 font-mono">100m • 16.4m Beam</div>
                <div className="text-[9px] text-slate-400 mt-0.5">MoES Oceanographic Patrol</div>
              </button>
            </div>
          </div>

          <form id="vessel-config-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Primary Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Vessel Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-hidden"
                  placeholder="e.g. MV Vasiliy Golovnin"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Callsign / Registration
                </label>
                <input
                  type="text"
                  value={formData.callSign}
                  onChange={(e) => handleChange('callSign', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-hidden"
                  placeholder="e.g. VGN-44-IND"
                  required
                />
              </div>
            </div>

            {/* Polar Class Selection */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center justify-between">
                <span>IMO Polar Class Rating</span>
                <span className="text-cyan-400 font-mono font-bold">{formData.polarClass}</span>
              </label>
              <select
                value={
                  POLAR_CLASSES.find((c) => formData.polarClass.includes(c.id))?.id || 'PC3'
                }
                onChange={(e) => {
                  const sel = POLAR_CLASSES.find((c) => c.id === e.target.value);
                  if (sel) {
                    handleChange('polarClass', `${sel.id} (${sel.label.split('—')[1]?.trim() || ''})`);
                    handleChange('icebreakingCapabilityM', sel.maxIceM);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-hidden"
              >
                {POLAR_CLASSES.map((pc) => (
                  <option key={pc.id} value={pc.id}>
                    {pc.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Vessel Dimensions Grid */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="font-bold text-cyan-300 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                <span>Physical Ship Dimensions & Keel Parameters</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Length Overall (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="10"
                    max="450"
                    value={formData.lengthM}
                    onChange={(e) => handleChange('lengthM', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-cyan-500 focus:outline-hidden"
                    required
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 block">LOA (Bow to Stern)</span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Beam / Width (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="4"
                    max="70"
                    value={formData.beamM}
                    onChange={(e) => handleChange('beamM', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-cyan-500 focus:outline-hidden"
                    required
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Maximum Width</span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Operating Draft (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="25"
                    value={formData.draftM || 8.5}
                    onChange={(e) => handleChange('draftM', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-cyan-500 focus:outline-hidden"
                    required
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Keel Clearance</span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Displacement (Tons)
                  </label>
                  <input
                    type="number"
                    step="100"
                    min="500"
                    max="100000"
                    value={formData.displacementTons || 16200}
                    onChange={(e) => handleChange('displacementTons', parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-cyan-500 focus:outline-hidden"
                    required
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Full Load Tonnage</span>
                </div>
              </div>
            </div>

            {/* Propulsion & Fuel Consumption */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cruising Speed (kts)</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="3"
                  max="30"
                  value={formData.speedKts}
                  onChange={(e) => handleChange('speedKts', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                  <Fuel className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fuel Burn Rate (L/h)</span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="20"
                  max="1000"
                  value={formData.fuelRateLPerHour}
                  onChange={(e) => handleChange('fuelRateLPerHour', parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Level Ice Breaking (m)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="4.0"
                  value={formData.icebreakingCapabilityM || 1.5}
                  onChange={(e) => handleChange('icebreakingCapabilityM', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Ports & Transit Context */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                  <Anchor className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Start Port / Staging Hub</span>
                </label>
                <input
                  type="text"
                  value={formData.startPort}
                  onChange={(e) => handleChange('startPort', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:border-cyan-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Destination / Research Base</span>
                </label>
                <input
                  type="text"
                  value={formData.destination}
                  onChange={(e) => handleChange('destination', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:border-cyan-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => handleApplyPreset(RESEARCH_VESSEL)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 font-mono text-xs cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="vessel-config-form"
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-950 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-102"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Applied!</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Apply Vessel Specs</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
