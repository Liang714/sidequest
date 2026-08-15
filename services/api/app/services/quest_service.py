"""Quest discovery helpers.

`nearby` uses a bounding-box pre-filter (cheap, index-friendly on plain
lat/lng columns) + haversine distance in Python, instead of PostGIS
ST_DWithin — see the note in app/models/quests.py for why. Fine at MVP
scale (a city's worth of open quests); swap for a GIST/ST_DWithin query
once docs/DATABASE.md's `geog` column exists for real.
"""

import base64
import json
import math
from datetime import datetime
from uuid import UUID

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def bounding_box(lat: float, lng: float, radius_km: float) -> tuple[float, float, float, float]:
    """Returns (min_lat, max_lat, min_lng, max_lng) — a cheap pre-filter to
    apply in SQL before the precise haversine check in Python."""
    lat_delta = radius_km / 111.0  # ~111km per degree latitude
    lng_delta = radius_km / (111.0 * max(math.cos(math.radians(lat)), 0.01))
    return (lat - lat_delta, lat + lat_delta, lng - lng_delta, lng + lng_delta)


def encode_cursor(start_time: datetime, quest_id: UUID) -> str:
    raw = json.dumps({"t": start_time.isoformat(), "id": str(quest_id)}).encode()
    return base64.urlsafe_b64encode(raw).decode()


def decode_cursor(cursor: str) -> tuple[datetime, UUID]:
    raw = json.loads(base64.urlsafe_b64decode(cursor.encode()))
    return datetime.fromisoformat(raw["t"]), UUID(raw["id"])
