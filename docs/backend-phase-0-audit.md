# Polar DSS frontend audit and backend plan

## Current architecture

The repository is a Vite + React 19 single-page application. `src/App.tsx` renders `PolarCockpitView`, which owns cockpit state and passes data to map and page components. There is no backend client, persistence layer, or server API in active use. `src/data/polarData.ts` is the sole operational data source.

## TypeScript contracts and mock structures

`src/types.ts` defines: `LatLon`, `Iceberg`, `IcebergTrajectoryPoint`, `Vessel`, `AheadVesselReport`, `RouteOption`, `NavigationAlert`, `SeaIceGridPoint`, `ChatMessage`, `TimelineState`, and `UserSession`.

`polarData.ts` exports `ICEBERGS`, three `ROUTE_*` objects, `RESEARCH_VESSEL`, `INDIAN_VESSELS`, `AHEAD_VESSELS`, `ANTARCTIC_STATIONS`, `INDIAN_POLAR_HUBS`, `INITIAL_ALERTS`, `WEATHER_DATA`, `TIMELINE_STEPS`, demo sessions, and model-performance data. The cockpit, map, fleet, route, sea-ice, and AI-chat components import those values directly.

## Entity → endpoint → future persistence mapping

| Frontend contract/data | Initial API contract | Future persistence |
| --- | --- | --- |
| `Iceberg`, tracks, corridor | `GET /icebergs`, `/{id}`, `/{id}/history`, `/{id}/trajectory` | `icebergs`, `iceberg_observations`, `trajectories`, `trajectory_points` |
| `Vessel`, `AheadVesselReport` | `GET /vessels/current`, `/vessels/ahead` | `vessels`, vessel reports/observations |
| stations and hubs | `GET /stations`, `/{id}` | `stations` |
| sea-ice grids | `GET /sea-ice/current`, `/forecast`, `/regions` | sea-ice observations/forecasts/regions |
| `WEATHER_DATA` and ocean readings | `GET /weather`, `/weather/forecast`, `/ocean` | weather observations/forecasts, ocean conditions |
| `RouteOption` | `GET /routes`, `/{id}`, `POST /routes/calculate` | routes, route waypoints, risk assessments |
| `NavigationAlert` | `GET /alerts`, `PATCH /alerts/{id}/resolve` | alerts |
| model display data | `GET /models`, `/{id}` | model metadata/performance runs |
| chatbot messages | `POST /chat` | conversations/messages (if persisted) |

All future source and prediction payloads must include a truthful status (`observed`, `forecast`, `simulated`, `predicted`, or `demo`) where applicable. Existing frontend model-performance claims must be treated as demo metadata until supported by documented validation.

## Proposed Phase 2 schema

PostGIS geometry stores geographic points/lines/polygons in SRID 4326. Phase 2 introduces `icebergs`, `iceberg_observations`, `trajectories`, and `trajectory_points`. Each keeps provenance/readiness (`source`, `source_id`, `source_type`, `observed_at`, `ingested_at`, `processing_version`, `data_status`, and confidence where meaningful). Observations can preserve generic source geometry, a centroid, a multipolygon footprint, orientation, dimensions, and extensible JSON metadata, allowing future Sentinel-1 SAR products without schema replacement. Temporal and GIST spatial indexes support historical and proximity queries.

Iceberg behavior fingerprinting remains a first-class future domain: it will derive reproducible profiles from observation and trajectory history, with feature lineage referencing these records. No ML profile or classification is stored in Phase 2.

The future interaction domain is explicitly exploratory: a later `iceberg_interaction_events` table will link two or more iceberg identities/observations and require an `event_status` that distinguishes `candidate`/`exploratory` from `confirmed` (plus provenance and review metadata). No collision, merging, or interaction assertion is implemented now.

## Implementation sequence

1. **Phase 1 (complete in this change):** FastAPI app, settings, CORS, request logging/error handling, health API, Docker/PostGIS composition, Alembic scaffold, and health test.
2. **Phase 2:** create and migrate only iceberg, observation, and trajectory tables; verify PostGIS connectivity and migration rollback.
3. **Phase 3:** expose frontend-compatible iceberg APIs and pagination/spatial filters.
4. **Phase 4 onward:** migrate demo datasets only after the Phase 3 contracts have tests; add vessels, stations, sea ice, weather, routes/risk, alerts, reports, and replaceable predictors phase by phase.

No frontend files were modified during this audit or foundation phase.
