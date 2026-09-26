# Polar DSS backend — Phases 1–2

This is the FastAPI and PostGIS foundation for the Antarctic Polar Decision Support System. It includes read-only iceberg/trajectory APIs and an opt-in synthetic demo dataset. No real satellite, SAR, or scientific observation ingestion is included.

## Run locally

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

Verify `http://localhost:8000/api/v1/health`, `http://localhost:8000/docs`, and `http://localhost:8000/redoc`.

## Run with Docker

```powershell
docker compose up --build
```

The `postgres` service is PostGIS-enabled. Apply the V1 iceberg foundation after it is running:

```powershell
cd backend
alembic upgrade head
```

The migration creates `icebergs`, `iceberg_observations`, `trajectories`, and `trajectory_points`, all with spatial/temporal query support and provenance/readiness metadata. See [the architecture audit](../docs/backend-phase-0-audit.md) for scope and future-domain decisions.

## Synthetic demo dataset

**Warning:** the seed dataset is entirely synthetic. It is for API/UI development only and must not be interpreted as satellite observations, validated forecasts, operational predictions, or scientific measurements. Every generated record uses `data_status: "demo"`, `source: "polar-dss-phase4-demo"`, and explicit synthetic-data disclaimers.

After migrations have run, seed the small deterministic dataset:

```powershell
cd backend
python -m app.seed.demo_data
```

It creates 3 icebergs (`A68A`, `A76`, `D28`), 9 synthetic observations, 6 synthetic trajectories, and 18 synthetic trajectory points. Re-running the command replaces only its own records, so it cannot create duplicates. It refuses to overwrite an existing non-demo iceberg with one of those catalog IDs.

Remove only this seed's data:

```powershell
cd backend
python -m app.seed.demo_data --reset
```

Example responses after seeding:

```text
GET /api/v1/icebergs/A68A
-> provenance.dataStatus = "demo"

GET /api/v1/icebergs/A68A/history
-> observation provenance.dataStatus = "demo"

GET /api/v1/icebergs/A68A/trajectory?trajectory_type=predicted
-> trajectoryType = "predicted", provenance.dataStatus = "demo"
```

The trajectory type describes the API shape only; its `demo` status means it is not a validated forecast or prediction. Full endpoint semantics are in [the Phase 3 API document](../docs/backend-phase-3-api.md).

## Milestone A operational demo

The vessels, stations, sea-ice, weather, and ocean APIs are read-only. Their optional operational dataset is also synthetic and carries `data_status: "demo"`; it is not vessel telemetry, an environmental measurement, or a forecast.

```powershell
cd backend
python -m app.seed.operational_demo_data
python -m app.seed.operational_demo_data --reset
```

The seed creates 2 vessels (one current, one ahead), 1 station, 1 sea-ice region with current/forecast-shaped records, and current/forecast-shaped weather and ocean records. Repeat runs replace only this seed source and are idempotent.

Available operational endpoints are `/api/v1/vessels/current`, `/api/v1/vessels/ahead`, `/api/v1/stations`, `/api/v1/stations/{id}`, `/api/v1/sea-ice/current`, `/api/v1/sea-ice/forecast`, `/api/v1/sea-ice/regions`, `/api/v1/weather/current`, `/api/v1/weather/forecast`, `/api/v1/ocean/current`, and `/api/v1/ocean/forecast`.

## Ingestion foundation (Milestone E)

Milestone E adds an offline, provider-neutral ingestion framework: source registry, persistent run audit, accepted-record lineage, validation, deterministic source-record deduplication, and dry-run support. It does **not** implement Sentinel/Copernicus downloads, SAR processing, external environmental connectors, or any other external scientific data connector.

Future connectors must normalize payloads and call the application ingestion service; they must not write scientific domain tables directly. Ingestion success only means the payload was processed. It does not independently validate the science or promote `data_status` to `observed`.

Read-only operational inspection endpoints are:

```text
GET /api/v1/ingestion/sources?active=true&source_type=...
GET /api/v1/ingestion/runs?source_id=...&status=...&dry_run=...&limit=50&offset=0
GET /api/v1/ingestion/runs/{run_id}
```

Tests create an isolated fixture source named `polar-dss-ingestion-test`, with `source_type: synthetic_test` and `data_status: demo`. It is removed after each test and is not part of the production demo seed. A dry run persists its run/audit statistics but never writes a scientific domain record.

## Sentinel-1 SAR-derived observation pathway (Milestone F)

The repository inventory was inspected before implementing this pathway. It identifies one Sentinel-1 Level-1 GRD SAFE product (`S1A_IW_GRDH_1SSH_20240629T080349_20240629T080414_054535_06A313_0EF7_COG.SAFE`) with a measurement GeoTIFF and calibration/noise XML. It does **not** provide a SAR-derived iceberg-detection dataset with detection IDs, footprint geometries, or catalog associations. No real Sentinel-1 scientific observation was ingested.

`Sentinel1Adapter` accepts an already-derived detection contract: product ID, detection record ID, acquisition time, WGS84 centroid latitude/longitude, polygon or multipolygon footprint, optional supplied catalog ID, SAR metadata (platform, polarization, acquisition mode, orbit, product type), dimensions, orientation, source-supplied status, and optional source quality/confidence. Polygon footprints are represented losslessly as `MULTIPOLYGON` to match `iceberg_observations.footprint` (EPSG:4326); the centroid is stored separately and is not a replacement for that footprint.

The adapter delegates to the common ingestion service, which records run/audit/lineage records and deduplicates by source registry ID + source product ID + source detection record ID + domain type. A known source catalog ID is associated only with that exact existing iceberg. When absent, the observation is persisted with `iceberg_id = null`; no proximity match or provisional long-term iceberg identity is fabricated.

The isolated `polar-dss-sar-test` fixture has `source_type: synthetic_sar_test` and `data_status: demo`; it is not seeded into the product dataset. Successful processing preserves the supplied status and does not claim independent validation. Existing iceberg-history responses expose the observation's source, source record ID, source type, processing version, timestamps, status, confidence, and footprint availability.

This milestone does not read raw SAR pixels, download Sentinel data, segment imagery, detect icebergs, train ML, associate observations across time, reconstruct/predict trajectories, or confirm interactions.

## Environmental ingestion and alignment (Milestone G)

The local source inventory was inspected. Available Antarctic-capable environmental sources are OSI-SAF AMSR2 Southern Hemisphere NetCDF (daily `ice_conc`, uncertainty, and status-flag grids); ERA5 GRIB (wind components, mean sea-level pressure, and wave variables, with source grids differing by variable); and GLORYS12 daily NetCDF sectors (surface `uo`, `vo`, `thetao`, `so`, `zos`, `mlotst`, and `sithick`). These are real source files, but this milestone does not bulk-load or claim any of their values as ingested operational records. Their source shapes and available variables define the adapter contracts.

`SeaIceSourceAdapter`, `WeatherSourceAdapter`, and `OceanSourceAdapter` map normalized source records to the existing environmental tables and use the common ingestion service for run tracking, audit, lineage, validation, and source-product-record deduplication. Sea-ice retains a WGS84 multipolygon footprint; weather and ocean use the existing WGS84 point contract. Missing source variables remain `null`. Ocean u/v components are retained in metadata; speed/direction are deterministically derived only when both components are supplied, with that derivation recorded.

`GET /api/v1/environment/context` accepts `latitude`, `longitude`, timezone-aware `timestamp`, `spatial_radius_km`, and `temporal_window_hours`. It returns available sea-ice, weather, and ocean records with transparent haversine distance and absolute time offset. It does not interpolate, estimate, rank, or score the records. Each domain is explicitly `available`, `no_matching_record`, `record_invalid`, or `source_unavailable` so absence cannot be mistaken for benign conditions.

The tests use only an isolated `polar-dss-environment-test` source (`source_type: synthetic_environment_test`, `data_status: demo`) and clean it up afterwards. No real environmental observation is claimed as ingested during this milestone. The alignment boundary supports future behavior work but does not calculate behavior features, environmental sensitivity, causal attribution, forecasts, or predictions.

## External ML-output integration

Polar-DSS does not train or run ML models. It accepts externally supplied, provenance-bearing outputs through controlled versioned endpoints:

```text
POST /api/v1/icebergs/{iceberg_id}/external-ml/trajectory
POST /api/v1/icebergs/{iceberg_id}/external-ml/behavior
```

Both require source/product/record identity, model name/version, processing provenance, a limitation statement, timezone-aware timestamps, and `dataStatus: "predicted"`. The backend rejects attempts to present an external ML output as `observed`. It persists the result through an ingestion run, audit record, and lineage identity, rejecting duplicate source outputs. Predicted trajectories remain separate from observed and forecast trajectories; behavior features are stored exactly as provider-supplied availability/value/explanation records. Successful persistence is not a claim of scientific validation or model performance.

## Test

```powershell
cd backend
pytest
```

## End-to-end development demo

The development harness composes the existing persistence boundaries; it does
not download Sentinel products or perform ML inference.  It creates the
`polar-dss-e2e` scenario around synthetic `A68A` evidence with explicit status
and provenance:

```text
dummy-sentinel-1-e2e (synthetic_sar, demo)
  -> common SAR adapter / ingestion run / lineage / A68A history
dummy-ml-e2e (synthetic_ml, predicted)
  -> external-ML trajectory and behavior endpoints
  -> operational context / route / provisional risk / alert / briefing / chat
```

After PostgreSQL/PostGIS is available and migrations have been applied, run:

```powershell
cd backend
python -m scripts.run_demo_pipeline
```

The runner is deterministic and first removes only its own two external
provider fixtures before rebuilding the isolated demo scenario.  It verifies
the FastAPI routes in-process with the same API contract a local client uses;
there is no direct domain-table write by either provider.  It reports expected
duplicate handling as success for source/product/record identities.

For the browser UI, use a separate terminal:

```powershell
cd frontend # repository root in this project
Copy-Item .env.example .env.local
# Set VITE_USE_BACKEND=true and VITE_API_BASE_URL=http://localhost:8000
npm install
npm run dev
```

The Vite server uses port `3000`, which is the backend's explicit default CORS
origin.  Backend mode displays `Backend: ONLINE` only after `/api/v1/health`
succeeds; if it does not, the application shows an unavailable state rather
than falling back to local mock chat.

All records created by this command are synthetic software-integration
fixtures. They are not Sentinel observations, scientific measurements, ML
outputs, collision findings, or navigation decisions.
