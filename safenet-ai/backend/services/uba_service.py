"""
backend/services/uba_service.py

User Behavior Analytics — Behavioral profiling, insider threat detection,
anomaly scoring based on login times, access patterns, data volume.
"""

import time
import json
from datetime import datetime, timedelta
from collections import defaultdict


# ── Anomaly thresholds ─
THRESHOLDS = {
    "login_hour_deviation": 4,        # hours outside normal window
    "data_download_spike":  10,       # 10x normal volume
    "failed_logins":        5,        # failed attempts before alert
    "privilege_escalation": True,     # any escalation = alert
    "off_hours_access":     (22, 6),  # 10pm–6am = suspicious
    "new_device_access":    True,
    "geo_velocity":         500,      # km/h — impossible travel
}


class UBAService:
    def __init__(self, llm_service=None):
        self.llm      = llm_service
        self._profiles = {}     # user_id → profile
        self._events   = defaultdict(list)   # user_id → [events]
        self._alerts   = []

    # ── Public ───────────────────────────────────────────────────────
    def record_event(self, user_id: str, event_type: str, metadata: dict) -> dict | None:
        """Record a user activity event and check for anomalies."""
        event = {
            "user_id":    user_id,
            "type":       event_type,
            "metadata":   metadata,
            "ts":         time.time(),
            "datetime":   datetime.now().isoformat(),
            "hour":       datetime.now().hour,
        }
        self._events[user_id].append(event)
        # Keep last 500 events per user
        if len(self._events[user_id]) > 500:
            self._events[user_id] = self._events[user_id][-500:]

        # Update profile
        self._update_profile(user_id, event)

        # Check for anomalies
        return self._check_anomalies(user_id, event)

    def get_profile(self, user_id: str) -> dict:
        return self._profiles.get(user_id, {"user_id": user_id, "status": "no data"})

    def get_all_profiles(self) -> list:
        return list(self._profiles.values())

    def get_alerts(self, limit=50) -> list:
        return self._alerts[-limit:]

    def get_risk_scores(self) -> list:
        """Return risk score for all known users."""
        return [
            {"user_id": uid, "risk": p.get("risk_score", 0), "flags": p.get("flags", [])}
            for uid, p in self._profiles.items()
        ]

    # ── Profile management ───────────────────────────────────────────
    def _update_profile(self, user_id: str, event: dict):
        if user_id not in self._profiles:
            self._profiles[user_id] = {
                "user_id":     user_id,
                "event_count": 0,
                "login_hours": [],
                "devices":     set(),
                "locations":   [],
                "avg_data_mb": 0,
                "risk_score":  0,
                "flags":       [],
                "created_at":  datetime.now().isoformat(),
            }
        p = self._profiles[user_id]
        p["event_count"] += 1
        hour = event.get("hour", datetime.now().hour)
        p["login_hours"].append(hour)
        if len(p["login_hours"]) > 200:
            p["login_hours"] = p["login_hours"][-200:]
        meta = event.get("metadata", {})
        if meta.get("device_id"):
            if isinstance(p["devices"], set):
                p["devices"].add(meta["device_id"])
            else:
                p["devices"] = set(p["devices"]) | {meta["device_id"]}
        if meta.get("data_mb"):
            prev = p.get("avg_data_mb", 0)
            p["avg_data_mb"] = (prev * 0.95) + (meta["data_mb"] * 0.05)
        # Serialize set for JSON
        p["devices"] = list(p["devices"]) if isinstance(p["devices"], set) else p["devices"]

    def _check_anomalies(self, user_id: str, event: dict) -> dict | None:
        p    = self._profiles.get(user_id, {})
        meta = event.get("metadata", {})
        hour = event.get("hour", 12)
        anomaly = None

        # 1. Off-hours access
        off_start, off_end = THRESHOLDS["off_hours_access"]
        is_off_hours = hour >= off_start or hour <= off_end
        if is_off_hours and event["type"] in ("login", "data_access", "admin_action"):
            anomaly = f"Off-hours {event['type']} at {hour:02d}:00"

        # 2. Failed login spike
        recent = self._events[user_id][-10:]
        failed = sum(1 for e in recent if e["type"] == "login_failed")
        if failed >= THRESHOLDS["failed_logins"]:
            anomaly = f"Credential attack: {failed} failed logins in last 10 events"

        # 3. Data download spike
        if meta.get("data_mb", 0) > p.get("avg_data_mb", 0) * THRESHOLDS["data_download_spike"] and p.get("avg_data_mb", 0) > 0:
            anomaly = f"Data exfiltration risk: {meta['data_mb']:.1f} MB download ({THRESHOLDS['data_download_spike']}x above average)"

        # 4. New device
        devices = p.get("devices", [])
        if meta.get("device_id") and meta["device_id"] not in devices and len(devices) >= 2:
            anomaly = f"New unknown device detected: {meta.get('device_id', 'unknown')}"

        # 5. Privilege escalation
        if event["type"] == "privilege_escalation":
            anomaly = f"Privilege escalation: {meta.get('from_role','?')} → {meta.get('to_role','?')}"

        if anomaly:
            # Score increase
            p["risk_score"] = min(p.get("risk_score", 0) + 15, 100)
            if anomaly not in p.get("flags", []):
                p.setdefault("flags", []).append(anomaly)

            alert = {
                "user_id":  user_id,
                "anomaly":  anomaly,
                "severity": "HIGH" if p["risk_score"] >= 70 else "MEDIUM",
                "event":    event,
                "ts":       time.time(),
                "datetime": datetime.now().isoformat(),
            }
            self._alerts.append(alert)
            if len(self._alerts) > 500:
                self._alerts = self._alerts[-500:]

            # LLM analysis for high-risk events
            if self.llm and p["risk_score"] >= 60:
                try:
                    profile_summary = {
                        "avg_login_hour": round(sum(p.get("login_hours",[])) / max(len(p.get("login_hours",[])),1), 1),
                        "device_count":   len(p.get("devices",[])),
                        "risk_score":     p.get("risk_score",0),
                        "event_count":    p.get("event_count",0),
                    }
                    alert["llm_analysis"] = self.llm.analyze_uba(profile_summary, anomaly)
                except Exception:
                    pass
            return alert
        return None

    def simulate_events(self, n=20):
        """Inject demo UBA events for testing."""
        import random
        users = ["alice@corp.com","bob@corp.com","carol@corp.com","david@corp.com","eve@corp.com"]
        event_types = ["login","logout","data_access","file_download","admin_action","login_failed"]
        for _ in range(n):
            user  = random.choice(users)
            etype = random.choice(event_types)
            meta  = {
                "device_id": f"DEV-{random.randint(1,4):03d}",
                "data_mb":   random.uniform(0.1, 800),
                "ip":        f"10.0.0.{random.randint(1,50)}",
            }
            # Inject anomaly occasionally
            if random.random() < 0.15:
                meta["data_mb"] = random.uniform(1000, 5000)
            alert = self.record_event(user, etype, meta)
        return len(self._alerts)
