"""
backend/middleware/rate_limit.py
In-memory rate limiter — no Redis needed for solo/small deployments
"""
from fastapi import Request, HTTPException
from collections import defaultdict
import time

# { "ip:route_group": [timestamp, timestamp, ...] }
_buckets: dict[str, list[float]] = defaultdict(list)

LIMITS = {
    "auth":        {"calls": 10,  "window": 60},   # 10 login attempts/min
    "jobs":        {"calls": 20,  "window": 60},   # 20 searches/min
    "recruiter":   {"calls": 10,  "window": 60},   # 10 recruiter lookups/min
    "gmail":       {"calls": 5,   "window": 60},   # 5 email fetches/min
    "applications":{"calls": 60,  "window": 60},   # 60 CRUD ops/min
    "default":     {"calls": 30,  "window": 60},
}

def get_route_group(path: str) -> str:
    for group in LIMITS:
        if f"/api/{group}" in path:
            return group
    return "default"

def check_rate_limit(request: Request):
    ip = request.client.host
    group = get_route_group(request.url.path)
    limit = LIMITS[group]
    key = f"{ip}:{group}"
    now = time.time()

    # Remove timestamps outside the window
    _buckets[key] = [t for t in _buckets[key] if now - t < limit["window"]]

    if len(_buckets[key]) >= limit["calls"]:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Max {limit['calls']} per {limit['window']}s."
        )

    _buckets[key].append(now)