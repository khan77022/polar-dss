import React from 'react';
import { PolarCockpitView } from './components/PolarCockpitView';

export default function App() {
  return (
    <div id="polar-dss-root" className="h-screen w-screen overflow-hidden bg-[#070d18] antialiased">
      <PolarCockpitView />
    </div>
  );
}
