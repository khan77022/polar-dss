import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  ShieldCheck,
  TriangleAlert,
  Compass,
  Radio,
  Snowflake,
  ExternalLink,
  RotateCcw,
  Volume2,
  VolumeX,
  Copy,
  Check,
} from 'lucide-react';
import { ChatMessage, Vessel, Iceberg, RouteOption } from '../types';
import { AHEAD_VESSELS, INDIAN_POLAR_HUBS } from '../data/polarData';
import { polarApi, useBackend } from '../api/client';

interface PolarAiChatbotProps {
  vessel: Vessel;
  icebergs: Iceberg[];
  currentRoute: RouteOption;
  isRerouted: boolean;
  hasConflict: boolean;
  onRecalculateRoute: () => void;
  timelineStep: number;
  onNavigateToPage?: (page: any) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onFocusRoute?: () => void;
  onOpenVesselConfig?: () => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-1',
    sender: 'assistant',
    timestamp: '14:30 UTC',
    text: 'Namaste! I am **ध्रुव-AI (Dhruv Navigator)**, your polar tactical navigation copilot for the 44th Indian Scientific Expedition to Antarctica (NCPOR / MoES).\n\nI continuously monitor the **ConvLSTM sea-ice forecasts**, **physics-informed iceberg drift corridors**, and live **V-PIREPs from vanguard vessels ahead** (PRV Sagar Dhruv & ORV Sagar Kanya). How can I assist your watch today?',
  },
];

const renderFormattedContent = (content: string) => {
  const formatInline = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={idx} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**') && part.length >= 2) {
        return (
          <em key={idx} className="italic text-slate-700">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={idx}
            className="px-1 py-0.5 rounded bg-blue-50 text-blue-900 font-mono text-[10px] border border-blue-200"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableRows.length === 0) return null;
    const headerRow = tableRows[0];
    const dataRows = tableRows
      .slice(1)
      .filter((r) => !r.every((c) => c.trim().match(/^:?-+:?$/)));
    const tableEl = (
      <div key={key} className="my-2 overflow-x-auto rounded-lg border border-slate-200 shadow-2xs">
        <table className="min-w-full divide-y divide-slate-200 text-[10px]">
          <thead className="bg-slate-100 font-bold text-slate-700">
            <tr>
              {headerRow.map((cell, cIdx) => (
                <th key={cIdx} className="px-2 py-1 text-left">
                  {formatInline(cell.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {dataRows.map((row, rIdx) => (
              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-2 py-1 text-slate-700">
                    {formatInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
    return tableEl;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (line.startsWith('|') && line.endsWith('|')) {
      inTable = true;
      const cells = line.slice(1, -1).split('|');
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      const tbl = flushTable(`tbl-${i}`);
      if (tbl) elements.push(tbl);
    }

    if (!line) {
      elements.push(<div key={`sp-${i}`} className="h-1" />);
      continue;
    }

    if (line === '---') {
      elements.push(<hr key={`hr-${i}`} className="border-slate-200 my-2" />);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={`h3-${i}`}
          className="font-bold text-xs text-blue-950 border-b border-slate-200 pb-1 mb-1 mt-1.5 flex items-center gap-1.5"
        >
          {formatInline(line.replace('### ', ''))}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3
          key={`h2-${i}`}
          className="font-bold text-sm text-blue-950 border-b border-slate-300 pb-1 mb-1 mt-2"
        >
          {formatInline(line.replace('## ', ''))}
        </h3>
      );
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const bulletText = line.slice(2);
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-1.5 pl-1 my-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
          <span className="flex-1 leading-snug">{formatInline(bulletText)}</span>
        </div>
      );
      continue;
    }

    const matchNum = line.match(/^(\d+)\.\s(.*)$/);
    if (matchNum) {
      elements.push(
        <div key={`oli-${i}`} className="flex items-start gap-1.5 pl-1 my-0.5">
          <span className="font-mono text-[9px] font-bold px-1 rounded bg-blue-100 text-blue-800 mt-0.5 shrink-0">
            {matchNum[1]}
          </span>
          <span className="flex-1 leading-snug">{formatInline(matchNum[2])}</span>
        </div>
      );
      continue;
    }

    elements.push(
      <p key={`p-${i}`} className="my-0.5 leading-snug text-slate-800">
        {formatInline(line)}
      </p>
    );
  }

  if (inTable) {
    const tbl = flushTable(`tbl-end`);
    if (tbl) elements.push(tbl);
  }

  return elements;
};

export const PolarAiChatbot: React.FC<PolarAiChatbotProps> = ({
  vessel,
  icebergs,
  currentRoute,
  isRerouted,
  hasConflict,
  onRecalculateRoute,
  timelineStep,
  onNavigateToPage,
  isOpen: externalIsOpen,
  onToggleOpen,
  onFocusRoute,
  onOpenVesselConfig,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const toggleOpen = () => {
    if (onToggleOpen) {
      onToggleOpen();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };
  const closeOpen = () => {
    if (onToggleOpen && externalIsOpen) {
      onToggleOpen();
    } else {
      setInternalIsOpen(false);
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isThinking]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = (id: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (id: string, text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Quick Action Prompts
  const quickPrompts = [
    {
      label: '🧠 Who Decides the Path?',
      query: 'Who decides the path and what is going on in the backend route decision engine?',
    },
    {
      label: '🌊 Is the Path on the Ice?',
      query: 'Check if this path is on the ice or land. Is the route through navigable water channels?',
    },
    {
      label: '🎯 Where is the Route?',
      query: 'Where is our navigation route on the map and what are the waypoints?',
    },
    {
      label: '🕒 Time & Chrono Check',
      query: 'What is the current UTC time, bridge time, and passage ETA?',
    },
    {
      label: '🚢 What is my Ship Size?',
      query: 'What is my ship size, dimensions, and polar class rating?',
    },
    {
      label: '⚠️ Assess A68A Threat & Bypass',
      query: 'Evaluate the collision risk of iceberg A68A on Route 1 and provide the recommended bypass.',
    },
    {
      label: '🚢 Vessels Ahead Intel (V-PIREP)',
      query: 'What are PRV Sagar Dhruv and other scout vessels ahead reporting about ice and leads on our route?',
    },
    {
      label: '⛽ Route 1 vs 2 Fuel & Safety',
      query: 'Compare the fuel burn, time, and safety trade-offs between Route 1 (Direct) and Route 2 (Western Bypass).',
    },
    {
      label: '🇮🇳 Indian Bases Status',
      query: 'What are the current logistics and sea-ice conditions at Bharati and Maitri research stations?',
    },
    {
      label: '🧠 Explain ConvLSTM AI Model',
      query: 'Explain how the ConvLSTM spatiotemporal model predicts sea-ice concentration and its validation metrics.',
    },
  ];

  // Tactical In-Browser Expert Reasoning Engine (Zero-latency fallback grounded in real state)
  const generateExpertAnswer = (userQuery: string): { text: string; actionTag?: any; actionLabel?: string } => {
    const q = userQuery.toLowerCase();

    // Who Decides the Path Query Handler
    if (
      q.includes('who decide') ||
      q.includes('who decides') ||
      q.includes('who chose') ||
      q.includes('who planned') ||
      q.includes('who made the decision') ||
      q.includes('decision maker') ||
      q.includes('decision engine') ||
      (q.includes('who') && q.includes('path')) ||
      (q.includes('who') && q.includes('route'))
    ) {
      return {
        text: `### 🧠 Who Decides the Path? (Decision Architecture)
- **Primary Authority**: The **NCPOR Expedition Directorate (Ministry of Earth Sciences, Govt. of India)** in strict accordance with the **IMO Polar Code (Resolution MSC.385(94))** and **SOLAS Chapter XIV**.
- **Operational Command**: The **Master & Ice Navigation Officer** on the bridge of **${vessel.name}** retains final navigational command.
- **Pathfinding Algorithm**: The tactical backend executes a **Multi-Objective Constrained $A^*$ Search** that evaluates:
  1. **Nautical Bathymetry**: Depth soundings must exceed $200\\,\\text{m}$ to guarantee keel clearance for our ${vessel.draftM || 8.5}m draft.
  2. **Iceberg Exclusion Envelope**: Enforces a strict $\\ge 15.0\\,\\text{km}$ Closest Point of Approach (CPA) buffer around drifting megabergs (A68A).
  3. **ConvLSTM Spatiotemporal Sea-Ice Model**: Traverses open water fracture leads within the vessel's ${vessel.polarClass.split(' ')[0]} icebreaking limit (1.5m level ice), penalizing heavy compression ridges ($>60\\%$ pack ice).
  4. **Hydrodynamic Drag & Fuel Burn**: Minimizes total fuel consumption and transit time.
- **Active Decision**: **Route 2 (Western Bypass)** was selected by the engine because Route 1 breaches the 15km A68A buffer (CPA is only 4.8 km). Route 2 diverts west through Boyd Strait into deep open water, expanding clearance to **38.5 km** and saving 270L fuel.`,
        actionTag: isRerouted ? 'corridor' : 'reroute',
        actionLabel: isRerouted ? '🎯 Focus on Active Fairway' : '⚡ Engage Route 2 (Western Bypass)',
      };
    }

    // Is the Path on the Ice Query Handler
    if (
      q.includes('on the ice') ||
      q.includes('in the ice') ||
      q.includes('over the ice') ||
      q.includes('through the ice') ||
      q.includes('land') ||
      q.includes('glacier') ||
      (q.includes('path') && q.includes('ice')) ||
      (q.includes('route') && q.includes('ice'))
    ) {
      return {
        text: `### 🌊 Marine Fairway Guarantee: Is the Path on the Ice?
- **Navigable Seawater Only**: All 3 plotted routes navigate strictly through **certified marine fairways** (Bransfield Strait, Boyd Strait, Open Bellingshausen Sea, and Marguerite Bay). Every waypoint is positioned in deep water (soundings between $200\\,\\text{m}$ and $1,200\\,\\text{m}$) and **never crosses any continental land, islands, or ice shelves**.
- **Why Satellite Imagery Looks Like White Ice**: In Antarctica, satellite base imagery shows glaciated islands (Brabant, Anvers, Adelaide) and landmasses as solid white. Earlier sparse straight-line segments passed too close to these islands. The backend navigation plot has now been updated with 12-13 dense marine fairways that curve naturally through deep oceanic troughs.
- **Navigable Sea-Ice vs Glaciers**: While the vessel never touches land ice or glaciers, it sails through **floating seasonal sea ice** (concentration 35-45%), which **${vessel.name}** easily negotiates using its **${vessel.polarClass.split(' ')[0]} icebreaker hull** (certified for up to 1.5m level ice).
- **Route 1 vs Route 2 Navigation**: Route 1 passes through the narrow Bransfield Strait (where A68A threatens collision). Route 2 routes out into the **open Bellingshausen Sea deep ocean basin** (>80km from coastal ice), which is 100% open water.`,
        actionTag: isRerouted ? 'corridor' : 'reroute',
        actionLabel: isRerouted ? '🎯 Focus on Deep-Water Track' : '⚡ Engage Route 2 (Western Bypass)',
      };
    }

    // Backend Fix & Architecture Query Handler
    if (
      q.includes('backend') ||
      q.includes('what is going on') ||
      q.includes('fix it') ||
      q.includes('how does it work') ||
      q.includes('system status')
    ) {
      return {
        text: `### ⚙️ Backend Polar Engine Status & Fix Applied
- **Backend Route Engine**: Running live on \`/api/routes\` and \`/api/routes/calculate\`. It evaluates bathymetry depth soundings, Sentinel-1 SAR iceberg drift vectors, and ConvLSTM 48h sea-ice forecast matrices.
- **Fairway Waypoint Correction Applied**: The navigation engine has updated all route waypoints to dense marine fairway channels (>200m depth) through Bransfield Strait, Boyd Strait, and the Bellingshausen Sea basin, ensuring no straight-line segment ever intersects Antarctic Peninsula glaciers or islands.
- **Vessel Dimensions Synced**: Active parameters synced to **${vessel.name}** (${vessel.lengthM}m LOA, ${vessel.beamM}m beam, ${vessel.draftM || 8.5}m draft, ${vessel.polarClass.split(' ')[0]} icebreaker).
- **Current Decision Recommendation**: **Route 2 (Western Bypass)** remains the Pareto-optimal selection, maintaining a 38.5 km clearance from A68A and saving 270L fuel.`,
        actionTag: 'corridor',
        actionLabel: '🎯 Center Map on Corrected Fairway',
      };
    }

    // Ship Size & Dimensions Query Handler
    if (
      q.includes('ship size') ||
      q.includes('vessel size') ||
      q.includes('ship details') ||
      q.includes('dimensions') ||
      q.includes('how big') ||
      q.includes('beam') ||
      q.includes('draft') ||
      q.includes('length') ||
      (q.includes('ship') && q.includes('size')) ||
      (q.includes('sip') && q.includes('size'))
    ) {
      return {
        text: `### 🚢 Vessel Specifications & Physical Dimensions
- **Vessel Name**: **${vessel.name}** (Callsign: \`${vessel.callSign}\`)
- **IMO Polar Class**: **${vessel.polarClass}** (Certified for navigation in thick first-year and second-year ice)
- **Length Overall (LOA)**: **${vessel.lengthM} meters** (${(vessel.lengthM * 3.28084).toFixed(0)} ft bow-to-stern)
- **Beam / Max Breadth**: **${vessel.beamM} meters** (${(vessel.beamM * 3.28084).toFixed(0)} ft across)
- **Operating Draft**: **${vessel.draftM || 8.5} meters** (Baseline underwater keel depth)
- **Full Load Displacement**: **${vessel.displacementTons?.toLocaleString() || '16,200'} metric tons**
- **Icebreaking Capacity**: **${vessel.icebreakingCapabilityM || 1.5} meters** level ice at continuous 3 knots
- **Service Cruising Speed**: **${vessel.speedKts} knots**
- **Fuel Consumption Rate**: **${vessel.fuelRateLPerHour} L/hour** in open lead water (~185 L/h in pack ice)
- **Operational Route**: From **${vessel.startPort}** to **${vessel.destination}**

You can configure and customize any ship dimensions, tonnage, or polar ratings using the button below.`,
        actionTag: 'edit-vessel',
        actionLabel: '⚙️ Configure Ship Details & Dimensions',
      };
    }

    if (q.includes('where is the route') || q.includes('cant see') || q.includes("can't see") || q.includes('see the route') || q.includes('show route') || q.includes('find route') || (q.includes('where') && q.includes('route'))) {
      return {
        text: `### 🎯 Active Route Corridor Orientation
- **Navigation Corridor**: The active expedition route runs through the **Bransfield Strait & Drake Passage** (-62°S to -68°S, -58°W to -68°W), connecting King George Island to Rothera and the Antarctic continental shelf.
- **Active Plot**: **${currentRoute.name}** (${isRerouted ? '420 km - Safe Bypass Corridor' : '380 km - Active A68A Conflict Zone'}).
- **Vessel Position**: **${vessel.name}** is at **${Math.abs(vessel.currentPos.lat).toFixed(2)}°S, ${Math.abs(vessel.currentPos.lon).toFixed(2)}°W** (King George / Drake Approach).
- **Interactive Action**: Click **"🎯 Center Map on Active Route"** below or click the **"🎯 FIT ROUTE"** button at the top-right of the map to lock the entire route directly in your viewport!`,
        actionTag: 'corridor',
        actionLabel: '🎯 Center Map on Active Route',
      };
    }

    if (q.includes('time') || q.includes('clock') || q.includes('date') || q.includes('chrono') || q.includes('zulu') || q.includes('utc')) {
      const now = new Date();
      const utcHours = String(now.getUTCHours()).padStart(2, '0');
      const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
      const utcSeconds = String(now.getUTCSeconds()).padStart(2, '0');
      return {
        text: `### 🕒 Tactical Chronometer & Navigation Ephemeris
- **Coordinated Universal Time (UTC / Zulu)**: **${utcHours}:${utcMinutes}:${utcSeconds} UTC** (26 Sep 2026)
- **Ship Mean Bridge Time (Zone -04 / Oscar)**: Local Drake / Bransfield operational time.
- **GNSS Receiver Status**: Dual constellation NavIC + GPS L1/L5 locked with sub-meter atomic epoch synchronization.
- **Passage Chrono**: 18h 42m estimated time of arrival (ETA) at current speed of 12.5 knots.
- **A68A Convergence Window**: Predicted intersection in **+72h (29 Sep 2026)** if Route 1 Direct is maintained.`,
        actionTag: isRerouted ? 'corridor' : 'reroute',
        actionLabel: isRerouted ? '🎯 Focus on Active Route' : '⚡ Engage Route 2 (Western Bypass)',
      };
    }

    if (q.includes('a68a') || q.includes('collision') || q.includes('threat') || q.includes('hazard') || q.includes('bypass') || q.includes('reroute')) {
      if (isRerouted) {
        return {
          text: `### ✅ Hazard Mitigated: Route 2 (Western Bypass Active)
- **Status**: The vessel **${vessel.name}** is navigating the Western Bypass corridor west of Low Island.
- **Closest Point of Approach (CPA)**: Margin expanded from 4.8 km to **38.5 km**, placing the vessel well outside the 95% Bayesian uncertainty corridor of megaberg **A68A**.
- **Vessel Ahead Report**: Scout **PRV Sagar Dhruv** (48 km ahead) confirms open water leads along this corridor with no heavy pressure ridges.
- **Polar Code Margin**: Safety margin is rated **Optimal (Low Risk)** under IMO Polar Code Category B.`,
          actionTag: 'recon',
          actionLabel: 'Inspect Vanguard Scout Positions',
        };
      } else {
        return {
          text: `### 🚨 CRITICAL NAVIGATION ALERT: Iceberg A68A Intersection
- **Hazard**: Tabular Megaberg **A68A** (${icebergs[0]?.dimensionsKm.length} km × ${icebergs[0]?.dimensionsKm.width} km, keel depth ~180m).
- **Conflict Window**: **21 Sep 2026 • 14:00 UTC** (+72h projection).
- **CPA (Closest Point of Approach)**: **4.8 km** — dangerously violates the 15 km NCPOR polar convoy safety buffer.
- **Physics Drift Analysis**: Trajectory driven by 1.4 kts north-westerly coastal outflow currents and Coriolis deflection.
- **Tactical Recommendation**: **Immediately engage Route 2 (Western Bypass)**. This adds only +35 km / +4.2h transit, saves 270L fuel by avoiding heavy brash ice drag, and eliminates collision risk entirely.`,
          actionTag: 'reroute',
          actionLabel: '⚡ Engage Route 2 Western Bypass Now',
        };
      }
    }

    if (q.includes('ahead') || q.includes('vessel') || q.includes('pirep') || q.includes('scout') || q.includes('sagar dhruv') || q.includes('mesh')) {
      const v1 = AHEAD_VESSELS[0];
      const v2 = AHEAD_VESSELS[1];
      return {
        text: `### 🛰️ Live Vanguard Vessel Reconnaissance Network (V-PIREP)
We currently have **${AHEAD_VESSELS.length} cooperative vessels** transmitting in-situ observations along our transit route:

1. **${v1.vesselName}** (${v1.nation})
   - **Position**: ${v1.distanceAheadKm} km directly ahead (Bearing ${v1.bearingDeg}°)
   - **Sea Ice**: ${v1.observedSeaIceConcentration}% concentration, floe thickness ${v1.floeThicknessM}m (**${v1.leadCondition}**)
   - **Weather**: ${v1.weather.airTempC}°C, Wind ${v1.weather.windSpeedKts} kts ${v1.weather.windDirection}, Swell ${v1.weather.swellHeightM}m
   - **V-PIREP**: *"${v1.vPirepNotes}"*

2. **${v2.vesselName}** (${v2.nation})
   - **Position**: ${v2.distanceAheadKm} km ahead, Gerlache entrance
   - **Iceberg Radar**: ${v2.icebergSightings.details} (Nearest: ${v2.icebergSightings.nearestKm} km)
   - **V-PIREP**: *"${v2.vPirepNotes}"*

The ahead network strongly confirms that **Route 2 Western Bypass is clear of pack-ice choking**, whereas the eastern direct passage is experiencing growler discharge from A68A.`,
        actionTag: 'recon',
        actionLabel: 'Open Fleet Reconnaissance Network',
      };
    }

    if (q.includes('fuel') || q.includes('compare') || q.includes('trade') || q.includes('time') || q.includes('distance')) {
      return {
        text: `### ⛽ Multi-Objective Route Trade-off Comparison

| Metric | Route 1 (Direct / Shortest) | Route 2 (Western Bypass / Optimized) | Route 3 (Deep Ocean / Maximum Safety) |
| :--- | :--- | :--- | :--- |
| **Distance** | 380 km | 420 km (+40 km) | 510 km (+130 km) |
| **Passage Time** | 32 hours | 36 hours (+4h) | 44 hours (+12h) |
| **Fuel Burn** | 1,450 Litres | **1,180 Litres (-270L / 18% savings)** | 1,300 Litres |
| **Ice Resistance** | High (Heavy pack ice & brash) | **Low (Open fracture leads)** | Low (Open ocean swell) |
| **Iceberg Conflict** | **HIGH (A68A CPA 4.8 km)** | **NONE (CPA > 38 km)** | **VERY LOW** |
| **Recommendation** | Unsafe under present drift | **⭐ RECOMMENDED (Pareto Optimal)** | High-wind storm contingency |

*Why does Route 2 burn 270L LESS fuel despite being 40 km longer?*
In Antarctic waters, cruising through 65% pack ice forces continuous full-throttle ice-breaking ramming cycles (115 L/h increases to 195 L/h). Route 2 navigates open-water leads scouted by **PRV Sagar Dhruv**, maintaining smooth steady-state propulsion at 12.5 knots.`,
        actionTag: isRerouted ? undefined : 'reroute',
        actionLabel: isRerouted ? undefined : '⚡ Select Route 2 (Optimized)',
      };
    }

    if (q.includes('bharati') || q.includes('maitri') || q.includes('base') || q.includes('station') || q.includes('dakshin') || q.includes('india')) {
      return {
        text: `### 🇮🇳 Indian Antarctic Research Stations Status Briefing

1. **Bharati Station (Larsemann Hills, Prydz Bay — 69°24'S, 76°11'E)**
   - **Commissioned**: 2012 (3rd Permanent Indian Station)
   - **Current Sea Ice**: Fast ice break-up scheduled in Prydz Bay; coastal lead 3.2 km wide.
   - **Status**: Automated satellite ground terminal active; 24 winter crew on station. Mooring fjord clear for tanker approach.

2. **Maitri Station (Schirmacher Oasis — 70°46'S, 11°44'E)**
   - **Commissioned**: 1989 (2nd Permanent Indian Station)
   - **Logistics Link**: Accessible via 100 km snow-cat convoy from the **India Bay Ice Shelf Jetty**.
   - **Status**: Operational; weather AWS reporting -18.2°C, wind 22 kts SE. Convoy corridor flagged and safe.

3. **Dakshin Gangotri (Princess Astrid Coast — 70°05'S, 12°00'E)**
   - **Established**: 1983 (1st Historic Base)
   - **Role**: Automated Weather Station (AWS) and emergency fuel caching depot. Ice shelf movement monitored via satellite interferometry.

4. **Command Staging**: All expeditions are commanded by the **National Centre for Polar and Ocean Research (NCPOR), Goa** with annual maritime staging via **Cape Town Harbour**.`,
      };
    }

    if (q.includes('convlstm') || q.includes('model') || q.includes('ai') || q.includes('satellite') || q.includes('prediction') || q.includes('accuracy')) {
      return {
        text: `### 🧠 ConvLSTM Spatiotemporal Sea-Ice Model Architecture
The POLAR-NAV system deploys a 5-layer Convolutional Long Short-Term Memory network with self-attention:
- **Input Channels**: SSMIS / AMSR2 passive microwave brightness temperatures (89 GHz / 36 GHz), Sentinel-1 C-band SAR radar backscatter, ERA5 10m wind fields, and HYCOM sea-surface temperatures.
- **Resolution**: 6.25 km polar stereographic grid covering 50°S to 78°S.
- **Validation Accuracy**:
  - 24h Mean Absolute Error (MAE): **2.8%** (RMSE 4.1%)
  - 48h MAE: **4.2%** (RMSE 6.8%)
  - Ice Edge Boundary Error: **11.4 km**
- **Physics Coupling**: Iceberg drift trajectories are coupled via a hydrodynamic momentum equation balancing Coriolis force, atmospheric sail drag, ocean current form drag, and internal pack-ice damping stress.`,
        actionTag: 'convlstm',
        actionLabel: 'View Model Validation Benchmarks',
      };
    }

    // General fallback
    return {
      text: `### 🧭 Tactical Polar Advisory — MV Vasiliy Golovnin
- **Current Position**: ${Math.abs(vessel.currentPos.lat).toFixed(2)}°S, ${Math.abs(vessel.currentPos.lon).toFixed(2)}°W
- **Active Navigation Mode**: ${isRerouted ? '✅ Route 2 Western Bypass (Clear of Hazards)' : '⚠️ Route 1 Direct (Hazard Warning Active on 21 Sep)'}
- **Vanguard Intel**: **PRV Sagar Dhruv** is 48 km ahead reporting navigable fracture leads with light freezing spray.
- **NCPOR Standing Orders**: Maintain continuous X-band radar watch for growlers and tabular fragments. If visibility falls below 2 km, reduce speed to 8 knots.

Feel free to ask me to analyze iceberg collision geometry, pull live reports from scout ships ahead, or compare fuel and route curves!`,
    };
  };

  // Send message handler
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputValue;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC',
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsThinking(true);

    try {
      const payload = {
        message: query,
        context: {
          vesselName: vessel.name,
          vesselPos: vessel.currentPos,
          polarClass: vessel.polarClass,
          lengthM: vessel.lengthM,
          beamM: vessel.beamM,
          draftM: vessel.draftM,
          displacementTons: vessel.displacementTons,
          icebreakingCapabilityM: vessel.icebreakingCapabilityM,
          speedKts: vessel.speedKts,
          fuelRateLPerHour: vessel.fuelRateLPerHour,
          isRerouted,
          hasConflict,
          timelineStep,
          currentRouteName: currentRoute.name,
          icebergHazard: icebergs[0]?.name,
          vanguardVesselsAhead: AHEAD_VESSELS.map((v) => ({
            name: v.vesselName,
            distanceAheadKm: v.distanceAheadKm,
            leadCondition: v.leadCondition,
            vPirep: v.vPirepNotes,
          })),
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Call server-side full-stack endpoint
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const replyText = data.reply || data.answer;
        if (replyText) {
          const assistantMsg: ChatMessage = {
            id: `assist-${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC',
            text: replyText,
            actionTag: data.actionTag,
            actionLabel: data.actionLabel,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setIsThinking(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Server chat call encountered error, engaging local tactical fallback:', err);
    }

    // Expert reasoning engine fallback
    setTimeout(() => {
      const expertResult = generateExpertAnswer(query);
      const assistantMsg: ChatMessage = {
        id: `assist-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC',
        text: expertResult.text,
        actionTag: expertResult.actionTag,
        actionLabel: expertResult.actionLabel,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsThinking(false);
    }, 350);
  };

  const handleActionClick = (actionTag?: string) => {
    if (actionTag === 'corridor' || actionTag === 'focus-route') {
      if (onFocusRoute) {
        onFocusRoute();
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          timestamp: 'NOW',
          text: '🎯 **Navigation Display Locked**: Main map centered and fitted to active route corridor.',
        },
      ]);
    } else if (actionTag === 'edit-vessel') {
      if (onOpenVesselConfig) {
        onOpenVesselConfig();
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          timestamp: 'NOW',
          text: '⚙️ **Vessel Configuration Dialog**: You can now customize your vessel dimensions, length, beam, draft, and polar class.',
        },
      ]);
    } else if (actionTag === 'reroute') {
      onRecalculateRoute();
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          timestamp: 'NOW',
          text: '⚡ **Tactical Action Executed**: Route 2 (Western Bypass) engaged in the primary navigation plot. CPA expanded to 38.5 km, clearing the A68A hazard corridor.',
        },
      ]);
    } else if (actionTag === 'recon' && onNavigateToPage) {
      onNavigateToPage('fleet-recon');
      closeOpen();
    } else if (actionTag === 'convlstm' && onNavigateToPage) {
      onNavigateToPage('model-performance');
      closeOpen();
    } else if (actionTag === 'sea-ice' && onNavigateToPage) {
      onNavigateToPage('sea-ice');
      closeOpen();
    } else if (actionTag === 'weather' && onNavigateToPage) {
      onNavigateToPage('weather');
      closeOpen();
    } else if (actionTag === 'iceberg' && onNavigateToPage) {
      onNavigateToPage('iceberg-tracking');
      closeOpen();
    }
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom-Right) */}
      <button
        id="polar-ai-trigger"
        onClick={toggleOpen}
        className={`fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full shadow-xl transition-all cursor-pointer ${
          isOpen
            ? 'bg-slate-900 text-white border border-slate-700'
            : 'bg-gradient-to-r from-blue-700 via-sky-600 to-cyan-600 text-white hover:shadow-2xl hover:scale-105 border border-sky-300/40'
        }`}
        title="Open ध्रुव-AI Polar Navigation Assistant"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="text-left font-sans">
          <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
            <span>ध्रुव-AI Copilot</span>
            <span className="px-1 py-0.2 rounded bg-sky-900/60 text-[9px] text-sky-200 border border-sky-400/40 font-mono">
              ISEA-44
            </span>
          </div>
          <div className="text-[10px] text-sky-100/90 leading-tight">
            {isRerouted ? 'Route 2 Active' : hasConflict ? '⚠️ 1 Collision Alert' : 'Vanguard Mesh Active'}
          </div>
        </div>
      </button>

      {/* Floating AI Chat Window */}
      {isOpen && (
        <div
          id="polar-ai-chat-window"
          className="fixed bottom-20 right-5 z-50 w-[92vw] sm:w-[460px] h-[580px] max-h-[82vh] bg-white/98 backdrop-blur-md rounded-xl border border-sky-200 shadow-2xl flex flex-col overflow-hidden font-sans text-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0c1829] via-[#0f2442] to-[#0c1829] text-white p-3.5 border-b border-sky-900 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/80 border border-sky-400/40 flex items-center justify-center text-sky-200 shadow-inner">
                <Compass className="w-4 h-4 text-sky-300 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white tracking-wide">
                    ध्रुव-AI (Dhruv Navigator)
                  </h3>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    ONLINE
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 flex items-center gap-1.5">
                  <span>NCPOR Polar Intelligence</span>
                  <span>•</span>
                  <span>ConvLSTM & Vanguard Fleet Mesh</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages(INITIAL_MESSAGES)}
                title="Reset conversation"
                className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={closeOpen}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Action Prompt Chips Carousel */}
          <div className="p-2 bg-sky-50/80 border-b border-sky-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider shrink-0 flex items-center gap-1 pl-1">
              <Sparkles className="w-3 h-3 text-blue-600" />
              Ask:
            </span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.query)}
                className="text-[11px] font-medium whitespace-nowrap bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200 hover:border-blue-300 rounded-full px-2.5 py-1 transition-all cursor-pointer shrink-0 shadow-2xs"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((m) => {
              const isAssistant = m.sender === 'assistant';
              const isSystem = m.sender === 'system';

              if (isSystem) {
                return (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px]"
                  >
                    {m.text}
                  </div>
                );
              }

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1 px-1">
                    <span className="font-semibold text-slate-500">
                      {isAssistant ? 'ध्रुव-AI' : 'Watch Officer'}
                    </span>
                    <span>•</span>
                    <span>{m.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[90%] rounded-xl p-3 leading-relaxed ${
                      isAssistant
                        ? 'bg-slate-50 border border-slate-200 text-slate-800 shadow-2xs'
                        : 'bg-blue-600 text-white font-medium shadow-xs'
                    }`}
                  >
                    <div className="space-y-1 text-[11px] leading-relaxed">
                      {isAssistant ? renderFormattedContent(m.text) : <div className="whitespace-pre-wrap">{m.text}</div>}
                    </div>

                    {/* Interactive Action Button in Chat */}
                    {m.actionLabel && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                        <button
                          onClick={() => handleActionClick(m.actionTag)}
                          className="w-full py-1.5 px-3 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{m.actionLabel}</span>
                        </button>
                      </div>
                    )}

                    {/* Assistant Message Tooling (Audio & Copy) */}
                    {isAssistant && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-mono text-[9px] text-blue-900 font-semibold flex items-center gap-1">
                          <Bot className="w-3 h-3 text-blue-600" />
                          ध्रुव-AI Tactical Mesh
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSpeak(m.id, m.text)}
                            title={speakingId === m.id ? 'Stop audio' : 'Listen to advisory'}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              speakingId === m.id
                                ? 'bg-blue-100 text-blue-700 animate-pulse'
                                : 'text-slate-400 hover:text-blue-700 hover:bg-slate-200/60'
                            }`}
                          >
                            {speakingId === m.id ? (
                              <VolumeX className="w-3.5 h-3.5" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(m.id, m.text)}
                            title="Copy advisory"
                            className="p-1 rounded text-slate-400 hover:text-blue-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                          >
                            {copiedId === m.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isThinking && (
              <div className="flex items-start gap-2 text-slate-500 text-xs">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse delay-75" />
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse delay-150" />
                  <span className="text-[11px] font-medium text-slate-600">
                    Querying ConvLSTM & Vanguard AIS Mesh...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about icebergs, ahead ships, fuel, weather..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isThinking}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
              <span>Polar Decision Support System • NCPOR Goa</span>
              <span className="font-mono text-blue-600 font-semibold">Gemini 3.8 & ConvLSTM</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
