import { useEffect, useState } from 'react';
import { polarApi, useBackend } from '../api/client';

export function useBackendHealth() {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    if (!useBackend) return;
    let active = true;
    polarApi.health().then(() => active && setOnline(true)).catch(() => active && setOnline(false));
    return () => { active = false; };
  }, []);
  return online;
}

export function BackendStatus({ online }: { online: boolean | null }) {
  if (!useBackend) return null;
  const connected = online === true;
  return <div id="backend-status" className={`fixed bottom-3 right-3 z-50 rounded border px-2 py-1 text-[10px] font-mono shadow ${connected ? 'border-emerald-700 bg-emerald-950 text-emerald-200' : 'border-rose-700 bg-rose-950 text-rose-200'}`}>
    <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
    Backend: {connected ? 'ONLINE' : online === null ? 'CHECKING' : 'OFFLINE'}
  </div>;
}
