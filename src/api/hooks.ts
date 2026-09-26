/**
 * useApiData — generic hook for loading backend data with loading / error / empty states.
 * Usage:  const { data, loading, error, reload } = useApiData(() => polarApi.weatherCurrent());
 */
import { useState, useEffect, useCallback } from 'react';

export type ApiState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string };

export function useApiData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): { state: ApiState<T>; reload: () => void } {
  const [state, setState] = useState<ApiState<T>>({ status: 'idle' });

  const load = useCallback(() => {
    setState({ status: 'loading' });
    fetcher()
      .then(data => setState({ status: 'ok', data }))
      .catch((err: unknown) =>
        setState({ status: 'error', message: err instanceof Error ? err.message : 'Request failed' }),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { state, reload: load };
}

/** Provenance badge colours matching backend dataStatus vocabulary. */
export function provenanceBadgeClass(dataStatus: string | undefined | null): string {
  switch (dataStatus) {
    case 'observed': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'predicted': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    case 'forecast': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    case 'demo':
    case 'simulated': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'provisional': return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    default: return 'bg-slate-700/40 text-slate-400 border-slate-700';
  }
}

export function provenanceBadgeLabel(dataStatus: string | undefined | null): string {
  switch (dataStatus) {
    case 'observed': return 'LIVE · OBSERVED';
    case 'predicted': return 'PREDICTED';
    case 'forecast': return 'FORECAST';
    case 'demo': return 'DEMO';
    case 'simulated': return 'SIMULATED';
    case 'provisional': return 'PROVISIONAL';
    default: return dataStatus?.toUpperCase() ?? 'UNKNOWN';
  }
}

import React from 'react';

/** Tiny loading spinner for inline use */
export const Spinner: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) =>
  React.createElement('span', {
    className: `inline-block border-2 border-current border-t-transparent rounded-full animate-spin ${className}`,
  });

