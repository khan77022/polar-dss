import React from 'react';
import {
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Compass,
  Snowflake,
  TriangleAlert,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { NavigationAlert, NavPage } from '../types';

interface AlertsPanelProps {
  alerts: NavigationAlert[];
  hasConflict: boolean;
  isRerouted: boolean;
  isRecalculating: boolean;
  onRecalculateRoute: () => void;
  onNavigate: (page: NavPage) => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  hasConflict,
  isRerouted,
  isRecalculating,
  onRecalculateRoute,
  onNavigate,
}) => {
  return (
    <div id="dashboard-side-panel" className="flex flex-col gap-3 h-full">
      {/* Dynamic Conflict / Reroute Box if active */}
      {hasConflict && !isRerouted ? (
        <div
          id="conflict-decision-card"
          className="bg-white border-2 border-rose-400 rounded-md p-3.5 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
              HIGH RISK
            </span>
            <span className="text-[10px] text-slate-500 font-mono">21 Sep • 14:00 UTC</span>
          </div>

          <h4 className="text-xs font-bold text-slate-900 leading-tight">
            Potential Iceberg Encounter
          </h4>
          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
            Predicted trajectory for <strong>A68A</strong> intersects planned route corridor. Closest point of approach: <strong>4.8 km</strong>.
          </p>

          <div className="mt-3 pt-2.5 border-t border-rose-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono">CPA Distance: 4.8 km</span>
            <button
              id="btn-recalculate-conflict"
              onClick={onRecalculateRoute}
              disabled={isRecalculating}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isRecalculating ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing conditions...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Recalculate Route</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : isRerouted ? (
        <div
          id="reroute-success-card"
          className="bg-emerald-50/70 border border-emerald-300 rounded-md p-3.5 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Route Updated
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">Bypass Active</span>
          </div>

          <div className="text-[11px] text-slate-700 mt-1 space-y-1">
            <div>
              <span className="font-semibold text-slate-900">Reason:</span> Predicted iceberg corridor intersects planned route.
            </div>
            <div className="flex justify-between text-[10px] pt-1">
              <span>Previous risk: <strong className="text-rose-600">HIGH</strong></span>
              <span>Updated risk: <strong className="text-emerald-700">LOW</strong></span>
            </div>
            <div className="text-[10px] text-slate-600">
              Additional distance: <strong className="text-slate-900">+35 km</strong> (Transit +4h)
            </div>
          </div>
        </div>
      ) : null}

      {/* Operational Alerts Card */}
      <div
        id="alerts-list-card"
        className="bg-white border border-slate-200 rounded-md p-3.5 shadow-2xs flex-1 flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
          <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
            Navigation Alerts
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {alerts.length} Active
          </span>
        </div>

        <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
          {alerts.map((alert) => {
            const isHigh = alert.severity === 'high';
            const isWarning = alert.severity === 'warning';

            return (
              <div
                key={alert.id}
                id={`alert-item-${alert.id}`}
                className="p-2 rounded border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isHigh ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isHigh ? 'text-rose-700' : isWarning ? 'text-amber-800' : 'text-blue-700'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {alert.timestamp}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-800 leading-tight">
                  {alert.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 leading-normal">
                  {alert.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions (Strictly 3 clean actions as specified) */}
      <div
        id="quick-actions-card"
        className="bg-white border border-slate-200 rounded-md p-3 shadow-2xs shrink-0"
      >
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Quick Actions
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          <button
            id="qa-btn-plan-route"
            onClick={() => onNavigate('route-planning')}
            className="w-full flex items-center justify-between px-3 py-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span>Plan Route</span>
            </div>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </button>

          <button
            id="qa-btn-view-forecast"
            onClick={() => onNavigate('sea-ice')}
            className="w-full flex items-center justify-between px-3 py-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Snowflake className="w-3.5 h-3.5 text-cyan-600" />
              <span>View Forecast</span>
            </div>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </button>

          <button
            id="qa-btn-track-icebergs"
            onClick={() => onNavigate('iceberg-tracking')}
            className="w-full flex items-center justify-between px-3 py-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <TriangleAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Track Icebergs</span>
            </div>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
