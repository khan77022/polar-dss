"""Deterministic development-only client for the external-ML HTTP contract."""
from datetime import datetime, timedelta, timezone
from typing import Any

SCENARIO = "polar-dss-e2e"
SOURCE = "dummy-ml-e2e"
PRODUCT_ID = "polar-dss-e2e-dummy-v1"
PROCESSING_VERSION = "dummy-v1"
GENERATED_AT = datetime(2026, 9, 18, 14, 30, tzinfo=timezone.utc)


def _provenance(record_id: str) -> dict[str, str]:
    return {"source": SOURCE, "sourceRecordId": record_id, "sourceProductId": PRODUCT_ID,
            "sourceType": "synthetic_ml", "processingVersion": PROCESSING_VERSION}


def trajectory_payload() -> dict[str, Any]:
    offsets = (6, 12, 24, 36, 48, 72)
    points = [{"timestamp": (GENERATED_AT + timedelta(hours=offset)).isoformat(),
               "position": {"lat": -63.85 + offset * 0.012, "lon": -56.20 - offset * 0.022},
               "uncertaintyRadiusKm": round(2.0 + offset * 0.15, 2)} for offset in offsets]
    return {"modelName": "dummy-trajectory-model", "modelVersion": PROCESSING_VERSION,
            "generatedAt": GENERATED_AT.isoformat(), "validFrom": points[0]["timestamp"],
            "validTo": points[-1]["timestamp"], "points": points, "confidence": 0.5,
            "dataStatus": "predicted", "provenance": _provenance("a68a-trajectory-001"),
            "limitations": "Synthetic deterministic integration fixture. Not ML inference, a forecast, or navigation guidance."}


def behavior_payload() -> dict[str, Any]:
    values = {"drift_velocity": (0.42, "knots"), "direction_stability": (0.81, None),
              "acceleration": (0.01, "knots/hour"), "rotation": (0.0, "degrees/hour"),
              "size_evolution": (0.0, "percent/day"), "shape_evolution": (0.0, None),
              "current_relationship": ("synthetic-demo", None), "wind_relationship": ("synthetic-demo", None),
              "seasonality": ("unavailable", None)}
    return {"modelName": "dummy-behavior-model", "modelVersion": PROCESSING_VERSION,
            "generatedAt": GENERATED_AT.isoformat(), "behaviorClass": "current-dominated",
            "features": {name: {"value": value, "availability": True, "unit": unit,
                                  "explanation": "Synthetic demo feature; not a classification result."}
                         for name, (value, unit) in values.items()}, "confidence": 0.5,
            "dataStatus": "predicted", "provenance": _provenance("a68a-behavior-001"),
            "limitations": "Synthetic deterministic integration fixture. Not ML inference or a scientific behavior classification."}


def submit(client: Any, iceberg_id: str = "A68A") -> tuple[Any, Any]:
    """Post to the public external-ML routes; a TestClient or HTTP client may be supplied."""
    trajectory = client.post(f"/api/v1/icebergs/{iceberg_id}/external-ml/trajectory", json=trajectory_payload())
    behavior = client.post(f"/api/v1/icebergs/{iceberg_id}/external-ml/behavior", json=behavior_payload())
    return trajectory, behavior
