"""
backend/services/threat_intel_service.py

IP Reputation, Blacklist checks, Threat Feed integration.
Uses free/open threat intelligence sources.
"""

import requests
import ipaddress
import time
import json
from datetime import datetime, timedelta

# ── Known bad IP ranges (internal list — supplement with live feeds) ─
KNOWN_MALICIOUS_RANGES = [
    "185.220.0.0/16",   # Tor exit nodes
    "91.108.0.0/16",    # Telegram abuse
    "194.165.0.0/16",   # Known scanner range
    "45.33.0.0/16",     # Known attack infra
    "5.188.0.0/16",     # Russian bot nets
    "31.220.0.0/16",    # Known spam
    "89.248.0.0/16",    # Shadowserver scanners
    "62.210.0.0/16",    # OVH abuse range
]

# ── Public threat intelligence feeds (free tiers) ──
THREAT_FEEDS = {
    "abuseipdb":    "https://api.abuseipdb.com/api/v2/check",
    "virustotal":   "https://www.virustotal.com/api/v3/ip_addresses/{ip}",
    "ipqualityscore": "https://ipqualityscore.com/api/json/ip/{key}/{ip}",
}

# ── Suspicious ASNs ─
SUSPICIOUS_ASNS = {
    "AS14061": "DigitalOcean (common abuse)",
    "AS16276": "OVH (frequent scanner source)",
    "AS20473": "AS-CHOOPA (VPS abuse)",
    "AS14618": "Amazon AWS (potential C2)",
    "AS396982": "Google Cloud (misuse)",
    "AS8075":  "Microsoft Azure (potential C2)",
}


class ThreatIntelService:
    def __init__(self, cfg):
        self.cfg         = cfg
        self._cache      = {}   # ip → {score, reason, ts}
        self._blacklist  = set()
        self._whitelist  = {"127.0.0.1", "10.0.0.1", "192.168.1.1"}
        self._feed_cache = {}
        self._load_malicious_ranges()

    # ── Public ───────────────────────────────────────────────────────
    def score_ip(self, ip: str) -> dict:
        """Return reputation score 0-100 (higher = more dangerous)."""
        if ip in self._cache:
            cached = self._cache[ip]
            if time.time() - cached["ts"] < 3600:  # 1h TTL
                return cached

        result = self._compute_score(ip)
        result["ts"] = time.time()
        self._cache[ip] = result
        return result

    def is_blacklisted(self, ip: str) -> bool:
        if ip in self._blacklist:
            return True
        return self._in_malicious_range(ip)

    def add_to_blacklist(self, ip: str, reason="manual"):
        self._blacklist.add(ip)
        print(f"[ThreatIntel] Blacklisted {ip} — {reason}")

    def remove_from_blacklist(self, ip: str):
        self._blacklist.discard(ip)

    def get_blacklist(self) -> list:
        return list(self._blacklist)

    def enrich_event(self, event: dict) -> dict:
        """Add threat intel fields to a log event."""
        ip = event.get("ip", "")
        if not ip or ip.startswith(("10.", "192.168.", "172.")):
            event["intel"] = {"score": 0, "label": "INTERNAL", "blacklisted": False}
            return event
        score_data = self.score_ip(ip)
        event["intel"] = score_data
        if score_data.get("score", 0) >= 70:
            event["auto_blocked"] = True
            self.add_to_blacklist(ip, reason=score_data.get("label", "auto"))
        return event

    def check_domain(self, domain: str) -> dict:
        """Basic domain reputation check."""
        domain = domain.lower().strip()
        suspicious_tlds = [".xyz", ".top", ".club", ".online", ".site", ".tk", ".ml", ".ga"]
        score = 0
        reasons = []
        for tld in suspicious_tlds:
            if domain.endswith(tld):
                score += 30
                reasons.append(f"Suspicious TLD: {tld}")
                break
        # Check for typosquatting patterns
        legit_brands = ["paypal", "google", "microsoft", "amazon", "apple", "netflix", "bank"]
        for brand in legit_brands:
            if brand in domain and not domain.startswith(brand + "."):
                score += 50
                reasons.append(f"Possible typosquatting of '{brand}'")
                break
        # IP-based domain (no real hostname)
        try:
            ipaddress.ip_address(domain)
            score += 40
            reasons.append("Domain is a raw IP address")
        except ValueError:
            pass
        label = "MALICIOUS" if score >= 60 else "SUSPICIOUS" if score >= 30 else "CLEAN"
        return {"domain": domain, "score": score, "label": label, "reasons": reasons}

    # ── Internal ─────────────────────────────────────────────────────
    def _compute_score(self, ip: str) -> dict:
        score   = 0
        reasons = []
        label   = "CLEAN"

        # 1. Whitelist
        if ip in self._whitelist:
            return {"ip": ip, "score": 0, "label": "WHITELISTED", "reasons": []}

        # 2. Known blacklist
        if ip in self._blacklist:
            return {"ip": ip, "score": 95, "label": "BLACKLISTED", "reasons": ["In local blacklist"]}

        # 3. Malicious range check
        if self._in_malicious_range(ip):
            score  += 60
            reasons.append("IP in known malicious subnet")

        # 4. RFC1918 private (should never appear as attacker)
        try:
            if ipaddress.ip_address(ip).is_private:
                score += 20
                reasons.append("Private IP appearing as external source (spoofing?)")
        except ValueError:
            pass

        # 5. Repeated in known attacker list
        known = ["185.220.101.34","91.108.4.81","194.165.16.22","77.88.55.99",
                 "5.188.206.111","45.33.32.156","195.54.160.87","62.210.183.12",
                 "31.220.3.153","89.248.167.131"]
        if ip in known:
            score  += 80
            reasons.append("Known attacker IP in internal threat database")

        # 6. AbuseIPDB check (if key configured)
        if self.cfg.ABUSEIPDB_KEY:
            abuse = self._check_abuseipdb(ip)
            if abuse:
                score  += min(abuse.get("abuseConfidenceScore", 0), 40)
                if abuse.get("abuseConfidenceScore", 0) > 0:
                    reasons.append(f"AbuseIPDB confidence: {abuse['abuseConfidenceScore']}%")

        score = min(score, 100)
        label = ("CRITICAL" if score >= 80 else "HIGH" if score >= 60
                 else "SUSPICIOUS" if score >= 30 else "CLEAN")
        return {"ip": ip, "score": score, "label": label, "reasons": reasons}

    def _in_malicious_range(self, ip: str) -> bool:
        try:
            addr = ipaddress.ip_address(ip)
            for cidr in self._malicious_networks:
                if addr in cidr:
                    return True
        except ValueError:
            pass
        return False

    def _load_malicious_ranges(self):
        self._malicious_networks = []
        for cidr in KNOWN_MALICIOUS_RANGES:
            try:
                self._malicious_networks.append(ipaddress.ip_network(cidr, strict=False))
            except ValueError:
                pass

    def _check_abuseipdb(self, ip: str) -> dict:
        try:
            r = requests.get(
                THREAT_FEEDS["abuseipdb"],
                headers={"Key": self.cfg.ABUSEIPDB_KEY, "Accept": "application/json"},
                params={"ipAddress": ip, "maxAgeInDays": 90},
                timeout=5,
            )
            return r.json().get("data", {})
        except Exception:
            return {}
