# Phase 3 iceberg read API

All endpoints are read-only and versioned beneath `/api/v1`. They return persisted records only; an empty database produces empty pages rather than invented Antarctic observations or forecasts.

## Endpoints

| Endpoint | Query parameters | Response |
| --- | --- | --- |
| `GET /icebergs` | `min_lat`, `max_lat`, `min_lon`, `max_lon`, `risk_level`, `data_status`, `limit`, `offset` | `IcebergPage` |
| `GET /icebergs/{id}` | catalog ID path parameter | `IcebergResponse` |
| `GET /icebergs/{id}/history` | `observed_from`, `observed_to`, `data_status`, `limit`, `offset` | `ObservationPage` |
| `GET /icebergs/{id}/trajectory` | `trajectory_type`, `reference_from`, `reference_to`, `data_status`, `limit`, `offset` | `TrajectoryPage` |

Limits are bounded at 250 records. Invalid identifiers, unsupported enum values, invalid geographic bounds, and inverted temporal ranges yield HTTP 422; a valid but absent catalog ID yields HTTP 404.

## Response semantics

`IcebergResponse` uses existing frontend field names: `id` is the stable `catalog_id`, and it retains `currentPos`, `dimensionsKm`, `areaSqKm`, `driftSpeedKts`, `driftDirectionDeg`, `riskLevel`, `origin`, `calveYear`, and image fields. `databaseId` is exposed separately for database traceability.

Every returned iceberg, observation, trajectory, and trajectory point has a `provenance` object. Its `dataStatus` is one of `observed`, `forecast`, `predicted`, `simulated`, `demo`, `provisional`, or `invalid`; consumers must use it to distinguish observation readiness. A `predicted` trajectory record may still have `dataStatus: demo`, which expressly means it is not a validated operational prediction.

History derives a representative position with `ST_Centroid(position)` and returns whether an observation has a footprint. The raw shape remains in PostGIS for a future GeoJSON/SAR geometry contract. Trajectories return ordered points, including uncertainty radius and per-point provenance; no route corridor is calculated or implied.

## Query behavior

The list query uses `ST_X`/`ST_Y` against the current-position geometry and indexed columns for risk/status filtering. History uses the iceberg-to-observation foreign key and `observed_at`; trajectories use the iceberg-to-trajectory foreign key, type/reference-time filtering, then one batched point query keyed by trajectory IDs. This avoids an N+1 query pattern as historical point counts grow.

## Deliberately open decisions

- A future SAR/GeoJSON response can expose `position`, `centroid`, `footprint`, orientation, and `shape_metadata` without changing persistence. Its exact payload format is intentionally not frozen.
- `ingestedAt` is null for trajectories because the approved V1 trajectory table does not yet store it; `generatedAt` and creation time remain distinct. A future additive migration may add trajectory ingestion lineage.
- `observedTrack`, `predictedTrack`, and `corridorPolygon` are not embedded in iceberg detail responses. The dedicated history/trajectory endpoints provide their persisted equivalents; uncertainty corridor derivation is deferred.
- Behavior, interaction, risk, collision, and ML fields are intentionally absent.
