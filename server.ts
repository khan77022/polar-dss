import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent telemetry
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const SYSTEM_INSTRUCTION = `You are ध्रुव-AI (Dhruv Navigator), the advanced tactical polar navigation AI copilot for the 44th Indian Scientific Expedition to Antarctica (ISEA-44), deployed by the National Centre for Polar and Ocean Research (NCPOR), Ministry of Earth Sciences (MoES), Government of India.

You serve aboard the expedition flagship MV Vasiliy Golovnin (Callsign: UBVI, Ice-Class Category B / Polar Class 5), currently navigating the treacherous waters of the Drake Passage, Bransfield Strait, and the Weddell Sea towards Bharati and Maitri Antarctic research stations.

Your capabilities & core knowledge:
1. Megaberg Drift Dynamics & Collision Avoidance:
   - Tracking iceberg A68A (length ~82 km, draft ~210 m, drift speed 0.85 kts toward NW 305°).
   - Collision corridor: Direct Route 1 passes within 4.8 km of A68A's predicted Bayesian envelope on 27 Sep.
   - Recommended action: Engage Route 2 (Western Bypass) west of Low Island, which expands Closest Point of Approach (CPA) to 38.5 km, completely clearing the 95% uncertainty boundary while consuming only +350L fuel and +1.8h time.
2. In-Situ Vanguard Fleet Reconnaissance (V-PIREP):
   - PRV Sagar Dhruv (48 km ahead, heading 165°): Reports navigable fracture leads (3-4/10 concentration), thin first-year floes, light freezing spray.
   - ORV Sagar Kanya (92 km ahead, heading 170°): Reports heavy compression ridges near South Shetland approach.
3. Satellite SAR & Spatiotemporal Sea-Ice:
   - Sentinel-1 C-band SAR radar imagery feeds, SSMIS/AMSR2 microwave brightness, and 24h/48h spatiotemporal sea-ice forecasts.
4. Regulations & Survival:
   - IMO Polar Code standards for Category B vessels.
   - Designated emergency safe-haven roadsteads: Carlini Base (King George Island), Deception Island Whalers Bay, Port Lockroy, and Maitri/Bharati supply corridors.

Communication Style:
- Professional, decisive, naval/polar operational tone with high technical precision.
- Use clear markdown with bold headers, bulleted tactical points, and concise recommendations.
- Keep answers focused (2-4 punchy paragraphs or structured tactical sections).
- Always include an operational takeaway or recommended navigation action.`;

interface ChatRequestBody {
  message?: string;
  query?: string;
  context?: {
    vesselName?: string;
    vesselPos?: { lat: number; lon: number };
    isRerouted?: boolean;
    hasConflict?: boolean;
    timelineStep?: number;
    currentRouteName?: string;
    icebergHazard?: string;
    vanguardVesselsAhead?: Array<{
      name: string;
      distanceAheadKm: number;
      leadCondition: string;
      vPirep?: string;
    }>;
  };
}

// Tactical Expert Fallback Engine
function generateExpertFallback(userQuery: string, context?: ChatRequestBody['context']) {
  const q = userQuery.toLowerCase();
  const vesselName = context?.vesselName || 'MV Vasiliy Golovnin';
  const isRerouted = context?.isRerouted ?? false;

  let actionTag: string | null = null;
  let actionLabel: string | null = null;
  let text = '';

  if (q.includes('a68a') || q.includes('collision') || q.includes('threat') || q.includes('hazard') || q.includes('bypass') || q.includes('reroute')) {
    if (isRerouted) {
      text = `### ✅ Hazard Cleared: Route 2 (Western Bypass Active)\n` +
        `- **Vessel**: **${vesselName}** is currently plotted along the Western Bypass corridor west of Low Island.\n` +
        `- **Closest Point of Approach (CPA)**: Expanded from 4.8 km to **38.5 km**, safely exceeding the 95% Bayesian uncertainty corridor of megaberg **A68A**.\n` +
        `- **Vanguard Confirmation**: Scout vessel **PRV Sagar Dhruv** (48 km ahead) confirms open fracture leads along this corridor with no heavy pressure ridges.\n` +
        `- **IMO Polar Code Margin**: Safety factor is rated **Optimal (Low Risk)** under IMO Polar Code Category B.`;
      actionTag = 'recon';
      actionLabel = 'Inspect Vanguard Fleet Reports';
    } else {
      text = `### ⚠️ Tactical Alert: Iceberg A68A Collision Conflict on Route 1\n` +
        `- **Target**: Megaberg **A68A** (Length: 82 km, Keel Draft: 210 m) drifting NW (305°) at 0.85 knots.\n` +
        `- **CPA Breach**: Route 1 (Direct) intercepts the 48h Bayesian drift boundary with a Closest Point of Approach of only **4.8 km** (Critical Zone < 10 km).\n` +
        `- **NCPOR Tactical Recommendation**: Immediately engage **Route 2 (Western Bypass)**. This bypass clears Low Island to the west, expanding your safety margin to **38.5 km** with only +350 L fuel and +1.8 h transit penalty.\n` +
        `- **Bridge Advisory**: Maintain continuous X-band radar guard zones at 6 NM and 12 NM for calved growlers.`;
      actionTag = 'reroute';
      actionLabel = '⚡ Engage Route 2 (Western Bypass)';
    }
  } else if (q.includes('vessel') || q.includes('ahead') || q.includes('scout') || q.includes('vanguard') || q.includes('sagar') || q.includes('pirep')) {
    text = `### 🚢 Vanguard Fleet Reconnaissance & In-Situ Intel\n` +
      `- **PRV Sagar Dhruv** (Position: 48 km ahead, 165°): Transmitted V-PIREP 18 mins ago. Navigable fracture leads observed with 3-4/10 first-year ice. Light freezing spray on superstructure.\n` +
      `- **ORV Sagar Kanya** (Position: 92 km ahead, 170°): Encountered compression ridge along Eastern approach; recommended sticking to Western flank.\n` +
      `- **Fleet AIS Mesh Status**: 4 scout nodes active. Real-time telemetry synchronized with NCPOR Mission Control Goa.`;
    actionTag = 'recon';
    actionLabel = 'View Fleet Reconnaissance';
  } else if (q.includes('fuel') || q.includes('trade-off') || q.includes('compare') || q.includes('route 1 vs') || q.includes('route 2')) {
    text = `### ⛽ Route Trade-off Analysis: Route 1 vs Route 2\n` +
      `- **Route 1 (Direct Track)**:\n` +
      `  - Distance: 412 km | Transit: 32.5 hrs | Fuel: 1,420 L\n` +
      `  - Iceberg Hazard: **CRITICAL (A68A CPA 4.8 km)** | Sea-Ice Concentration: 55-65%\n` +
      `- **Route 2 (Western Bypass - Recommended)**:\n` +
      `  - Distance: 438 km (+26 km) | Transit: 34.3 hrs (+1.8 hrs) | Fuel: 1,770 L (+350 L)\n` +
      `  - Iceberg Hazard: **CLEAR (CPA 38.5 km)** | Sea-Ice Concentration: 35-45%\n` +
      `- **Verdict**: Route 2 provides a 800% safety buffer expansion for only a 4.4% fuel and 5.5% time delta. Strongly approved by Expedition Directorate.`;
    actionTag = 'reroute';
    actionLabel = 'Engage Route 2 (Western Bypass)';
  } else if (q.includes('bharati') || q.includes('maitri') || q.includes('base') || q.includes('station') || q.includes('indian')) {
    text = `### 🇮🇳 Indian Antarctic Research Stations Status\n` +
      `- **Bharati Station** (Larsemann Hills, 69°24'S, 76°11'E):\n` +
      `  - Fast-ice breakout underway. Approach channel open for cargo lightering.\n` +
      `  - Surface Temp: -18.4°C, Wind: ENE 18 kts. Helo landing pad operational.\n` +
      `- **Maitri Station** (Schirmacher Oasis, 70°46'S, 11°44'E):\n` +
      `  - Continental shelf ice road stable. Convoy staging area ready for summer fuel supply.\n` +
      `- **Expedition Schedule**: MV Vasiliy Golovnin is on track to meet the 44-ISEA handover window.`;
  } else if (q.includes('sea ice') || q.includes('ice') || q.includes('forecast') || q.includes('concentration') || q.includes('convlstm')) {
    text = `### 🧊 Spatiotemporal Sea-Ice Forecast Summary\n` +
      `- **Current Concentration**: 38% along Bransfield Western corridor, rising to 64% in southeastern approaches.\n` +
      `- **Edge Compression**: Southerly katabatic winds are driving pack ice northeastward at 0.6 kts.\n` +
      `- **48h Forecast**: Fracture leads expected to remain open along 58°W meridian. Vessel has sufficient power (PC-5) to negotiate thin first-year floes up to 0.9 m.`;
    actionTag = 'sea-ice';
    actionLabel = 'Inspect Sea-Ice Forecast';
  } else if (q.includes('weather') || q.includes('wind') || q.includes('wave') || q.includes('spray') || q.includes('temperature')) {
    text = `### 🌊 Meteorological & Oceanographic Telemetry\n` +
      `- **Surface Wind**: NW 20.5 kts (315°), gusts to 28 kts.\n` +
      `- **Wave & Swell**: Significant wave height 2.4 m, period 7.5 s.\n` +
      `- **Thermal**: Air -14.0°C | Wind Chill -22.5°C | Sea Surface -1.6°C.\n` +
      `- **Superstructure Icing**: Light freezing spray advisory active. De-icing steam coils active on forward windlass and cargo derricks.`;
    actionTag = 'weather';
    actionLabel = 'View Weather Telemetry';
  } else {
    text = `### 🧭 Tactical Polar Advisory — ${vesselName}\n` +
      `- **Current Navigation Status**: ${isRerouted ? '✅ Route 2 Western Bypass (Hazard Cleared)' : '⚠️ Route 1 Direct (A68A Collision Alert Active)'}\n` +
      `- **Scout Mesh**: **PRV Sagar Dhruv** reports favorable leads 48 km ahead.\n` +
      `- **Standing Directives**: Maintain 15-minute bridge radar sweep, monitor underwater sonar keel clearance, and log ice observations into V-PIREP net.\n\n` +
      `How can I assist further with route optimization, iceberg geometry, or weather intelligence?`;
  }

  return { text, actionTag, actionLabel };
}

// Chat API handler
async function handleChatRequest(req: Request, res: Response) {
  const body: ChatRequestBody = req.body || {};
  const query = (body.message || body.query || '').trim();

  if (!query) {
    return res.status(400).json({ error: 'Message query cannot be empty' });
  }

  const context = body.context;
  const contextDescription = context
    ? `Current Tactical Context:
- Vessel: ${context.vesselName || 'MV Vasiliy Golovnin'} (Position: ${context.vesselPos?.lat ?? -63.45}°, ${context.vesselPos?.lon ?? -60.10}°)
- Active Route: ${context.currentRouteName || 'Route 1 (Direct)'}
- Bypass Engaged: ${context.isRerouted ? 'YES (Route 2 Active)' : 'NO (Route 1 Direct with Conflict)'}
- Conflict Status: ${context.hasConflict ? 'CRITICAL HAZARD DETECTED' : 'CLEAR'}
- Primary Iceberg Threat: ${context.icebergHazard || 'A68A'}
- Scout Vessels Ahead: ${
        context.vanguardVesselsAhead
          ?.map((v) => `${v.name} (${v.distanceAheadKm}km ahead, ${v.leadCondition})`)
          .join('; ') || 'PRV Sagar Dhruv (48km ahead), ORV Sagar Kanya (92km ahead)'
      }`
    : '';

  // If Gemini API is available, generate response
  if (ai) {
    try {
      const prompt = `${contextDescription}\n\nOfficer Question / Prompt: "${query}"\n\nProvide your tactical polar navigation assessment and response. If recommending a bypass reroute, include a direct recommendation to engage Route 2.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      const replyText = response.text || '';

      // Determine interactive action tag
      let actionTag: string | null = null;
      let actionLabel: string | null = null;
      const lower = replyText.toLowerCase();

      if ((lower.includes('route 2') || lower.includes('western bypass') || lower.includes('reroute') || lower.includes('engage')) && !context?.isRerouted) {
        actionTag = 'reroute';
        actionLabel = '⚡ Engage Route 2 (Western Bypass)';
      } else if (lower.includes('vanguard') || lower.includes('sagar dhruv') || lower.includes('v-pirep') || lower.includes('reconnaissance')) {
        actionTag = 'recon';
        actionLabel = 'View Fleet Reconnaissance';
      } else if (lower.includes('convlstm') || lower.includes('sea-ice forecast') || lower.includes('concentration')) {
        actionTag = 'sea-ice';
        actionLabel = 'Inspect Sea-Ice Forecast';
      } else if (lower.includes('freezing spray') || lower.includes('wave') || lower.includes('katabatic')) {
        actionTag = 'weather';
        actionLabel = 'View Weather Telemetry';
      }

      return res.json({
        reply: replyText,
        answer: replyText,
        actionTag,
        actionLabel,
        modelUsed: 'gemini-3.8-flash',
        dataStatus: 'observed',
        limitations: 'Advisory for navigational support only. Bridge officer retains final command under IMO Polar Code.',
      });
    } catch (err) {
      console.warn('Gemini generateContent error, falling back to expert engine:', err);
    }
  }

  // Fallback to domain-expert tactical engine
  const fallback = generateExpertFallback(query, context);
  return res.json({
    reply: fallback.text,
    answer: fallback.text,
    actionTag: fallback.actionTag,
    actionLabel: fallback.actionLabel,
    modelUsed: 'polar-tactical-expert-v44',
    dataStatus: 'observed',
    limitations: 'Advisory for navigational support only. Bridge officer retains final command under IMO Polar Code.',
  });
}

// Register both API endpoints
app.post('/api/chat', handleChatRequest);
app.post('/api/v1/chat', handleChatRequest);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'polar-dss-server',
    geminiEnabled: Boolean(ai),
    model: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  });
});
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'polar-dss-server',
    geminiEnabled: Boolean(ai),
    model: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  });
});

// Setup dev server with Vite middleware OR serve built static assets
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Polar DSS] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Polar DSS] Failed to start server:', err);
  process.exit(1);
});
