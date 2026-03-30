"""
backend/services/soar_service.py

SOAR Lite — Automated Security Orchestration, Automation & Response.
Executes pre-approved actions automatically when thresholds are crossed.
"""

import time
from datetime import datetime
from collections import defaultdict


# ── Auto-response rules ─
RULES = [
    {
        "id":      "R001",
        "name":    "Auto-block on CRITICAL C2 beacon",
        "trigger": lambda e: e.get("type") in ("C2 BEACON","RCE ATTEMPT") and e.get("sev") == "CRITICAL",
        "action":  "BLOCK_IP",
        "reason":  "Critical C2/RCE — auto-block, no human required",
    },
    {
        "id":      "R002",
        "name":    "Rate-limit on DDoS",
        "trigger": lambda e: "DDOS" in (e.get("type","").upper()) or "FLOOD" in (e.get("type","").upper()),
        "action":  "RATE_LIMIT",
        "reason":  "Volumetric attack — apply rate-limit at ingress",
    },
    {
        "id":      "R003",
        "name":    "Block on sustained brute force",
        "trigger": lambda e: e.get("type") in ("BRUTE FORCE",) and e.get("sev") in ("HIGH","CRITICAL"),
        "action":  "BLOCK_IP",
        "reason":  "Brute force threshold exceeded — auto-block source",
    },
    {
        "id":      "R004",
        "name":    "Alert-only on port scan",
        "trigger": lambda e: "SCAN" in (e.get("type","").upper()),
        "action":  "ALERT_ONLY",
        "reason":  "Port scan — log and alert, continue monitoring",
    },
    {
        "id":      "R005",
        "name":    "Alert on SQL injection attempt",
        "trigger": lambda e: "SQL" in (e.get("type","").upper()) or "INJECT" in (e.get("type","").upper()),
        "action":  "ALERT_ONLY",
        "reason":  "SQLi attempt — alert security team, review WAF rules",
    },
    {
        "id":      "R006",
        "name":    "Quarantine on SMB exploit",
        "trigger": lambda e: "SMB" in (e.get("type","").upper()) or "ETERNAL" in (e.get("m","").upper()),
        "action":  "ISOLATE_HOST",
        "reason":  "EternalBlue/SMB exploit — isolate target host immediately",
    },
]

ACTION_COLORS = {
    "BLOCK_IP":       "red",
    "RATE_LIMIT":     "amber",
    "ISOLATE_HOST":   "red",
    "DISABLE_ACCOUNT":"amber",
    "QUARANTINE_FILE":"amber",
    "ALERT_ONLY":     "ice",
}


class SOARService:
    def __init__(self, llm_service=None, blocked_ips: set = None):
        self.llm         = llm_service
        self._blocked    = blocked_ips if blocked_ips is not None else set()
        self._rate_limited = set()
        self._isolated   = set()
        self._actions    = []       # audit log

    # ── Public ───────────────────────────────────────────────────────
    def evaluate(self, event: dict) -> dict | None:
        """Evaluate an event against all SOAR rules. Execute matching rule."""
        for rule in RULES:
            try:
                if rule["trigger"](event):
                    return self._execute(rule, event)
            except Exception:
                continue
        return None

    def manual_action(self, action: str, target: str, reason: str = "manual") -> dict:
        """Execute a manual SOAR action from the dashboard."""
        entry = self._log_action(action, target, reason, rule_id="MANUAL", auto=False)
        self._apply_action(action, target)
        return entry

    def get_audit_log(self, limit=100) -> list:
        return list(reversed(self._actions[-limit:]))

    def get_blocked_ips(self) -> list:
        return list(self._blocked)

    def get_stats(self) -> dict:
        acts = self._actions
        return {
            "total_actions":  len(acts),
            "blocked_ips":    len(self._blocked),
            "rate_limited":   len(self._rate_limited),
            "isolated_hosts": len(self._isolated),
            "auto_actions":   sum(1 for a in acts if a.get("auto")),
            "manual_actions": sum(1 for a in acts if not a.get("auto")),
            "by_type": {
                t: sum(1 for a in acts if a["action"] == t)
                for t in ACTION_COLORS
            },
        }

    def unblock_ip(self, ip: str):
        self._blocked.discard(ip)

    # ── Internal ─────────────────────────────────────────────────────
    def _execute(self, rule: dict, event: dict) -> dict:
        action = rule["action"]
        target = event.get("ip", "unknown")
        # LLM confirm for critical actions
        llm_note = None
        if self.llm and action in ("BLOCK_IP","ISOLATE_HOST"):
            try:
                llm_note = self.llm.soar_decision(
                    threat_type=event.get("type","?"),
                    severity=event.get("sev","?"),
                    source=event.get("ip","?"),
                    target=event.get("dest","?"),
                )
            except Exception:
                pass
        self._apply_action(action, target)
        entry = self._log_action(action, target, rule["reason"], rule["id"], auto=True, llm=llm_note)
        entry["rule_name"] = rule["name"]
        entry["event"]     = {"type": event.get("type"), "sev": event.get("sev"), "ip": event.get("ip")}
        return entry

    def _apply_action(self, action: str, target: str):
        if action == "BLOCK_IP":
            self._blocked.add(target)
        elif action == "RATE_LIMIT":
            self._rate_limited.add(target)
        elif action == "ISOLATE_HOST":
            self._isolated.add(target)
            self._blocked.add(target)

    def _log_action(self, action, target, reason, rule_id, auto=True, llm=None) -> dict:
        entry = {
            "id":       f"ACT-{len(self._actions)+1:05d}",
            "action":   action,
            "target":   target,
            "reason":   reason,
            "rule_id":  rule_id,
            "auto":     auto,
            "color":    ACTION_COLORS.get(action, "ice"),
            "llm_note": llm,
            "ts":       time.time(),
            "datetime": datetime.now().isoformat(),
        }
        self._actions.append(entry)
        if len(self._actions) > 1000:
            self._actions = self._actions[-1000:]
        print(f"[SOAR] {entry['id']} {action} → {target} — {reason[:60]}")
        return entry
