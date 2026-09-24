import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  id?: string;
  label: string;
  value: string;
  subtext?: string;
  badge?: {
    text: string;
    variant: 'blue' | 'green' | 'amber' | 'red' | 'gray';
  };
  icon?: LucideIcon;
}

const BADGE_STYLES = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  gray: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  label,
  value,
  subtext,
  badge,
  icon: Icon,
}) => {
  return (
    <div
      id={id}
      className="bg-white border border-slate-200 rounded-md p-3.5 shadow-2xs flex flex-col justify-between"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          {label}
        </span>
        {Icon && <Icon className="w-4 h-4 text-slate-400 stroke-[1.8]" />}
      </div>

      <div className="flex items-baseline justify-between gap-2 mt-0.5">
        <div className="text-xl font-bold text-slate-900 tracking-tight leading-none font-mono">
          {value}
        </div>
        {badge && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded border leading-none ${
              BADGE_STYLES[badge.variant] || BADGE_STYLES.gray
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>

      {subtext && (
        <div className="text-[11px] text-slate-500 mt-1.5 font-normal truncate">
          {subtext}
        </div>
      )}
    </div>
  );
};
