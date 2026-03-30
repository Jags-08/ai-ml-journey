"""
backend/services/ip_intelligence_service.py

IP Geolocation, VPN/Proxy/TOR detection, Anonymity scoring.
Uses ip-api.com (free, no key needed for basic), ipinfo.io optional.
"""

import requests
import time
import ipaddress

# ── TOR exit node list (sample — full list: https://check.torproject.org/torbulkexitlist) ─
TOR_EXIT_NODES = {
    "185.220.101.34","185.220.101.35","185.220.101.47","185.220.102.8",
    "162.247.74.74","162.247.74.201","199.87.154.255","176.10.104.240",
    "176.10.107.180","81.7.17.179","80.67.172.162","5.199.130.188",
}

# ── Known VPN provider IP ranges (ASN-based detection) ─
VPN_ASNS = {
    "AS9009": "M247 (VPN provider)",
    "AS51396": "Pfingo (VPN infra)",
    "AS62713": "PureVPN",
    "AS60068": "CDN77 / VPN",
    "AS174":   "Cogent (hosting/VPN)",
    "AS209": "CenturyLink (VPN hosting)",
}

# ── Known datacenter CIDR blocks (non-residential = suspicious) ─
DATACENTER_CIDRS = [
    "104.16.0.0/12",   # Cloudflare
    "172.64.0.0/13",   # Cloudflare
    "13.32.0.0/15",    # AWS CloudFront
    "99.84.0.0/16",    # AWS
]


class IPIntelligenceService:
    def __init__(self, cfg):
        self.cfg    = cfg
        self._cache = {}   # ip → {geo, vpn, tor, score, ts}

    # ── Public ───────────────────────────────────────────────────────
    def analyze(self, ip: str) -> dict:
        """Full IP intelligence report."""
        if ip in self._cache:
            cached = self._cache[ip]
            if time.time() - cached["ts"] < 7200:  # 2h TTL
                return cached

        result = {
            "ip": ip,
            "geo": self._geolocate(ip),
            "tor": ip in TOR_EXIT_NODES,
            "vpn": False,
            "proxy": False,
            "datacenter": self._is_datacenter(ip),
            "anonymity_score": 0,
            "anonymity_label": "RESIDENTIAL",
            "ts": time.time(),
        }

        # Anonymity scoring
        score = 0
        if result["tor"]:
            score += 80
            result["anonymity_label"] = "TOR EXIT NODE"
        if result["datacenter"]:
            score += 30
            if result["anonymity_label"] == "RESIDENTIAL":
                result["anonymity_label"] = "DATACENTER"

        # ip-api.com includes proxy/hosting detection in free tier
        geo = result["geo"]
        if geo.get("proxy"):
            result["proxy"] = True
            score += 50
            result["anonymity_label"] = "PROXY"
        if geo.get("hosting"):
            score += 20
            result["vpn"] = True
            if result["anonymity_label"] == "RESIDENTIAL":
                result["anonymity_label"] = "VPN / HOSTING"

        result["anonymity_score"] = min(score, 100)
        self._cache[ip] = result
        return result

    def get_attack_map_data(self, events: list) -> list:
        """Return geo data for attack visualization."""
        seen = {}
        for e in events:
            if not e.get("is_attack"):
                continue
            ip = e.get("ip", "")
            if ip in seen:
                seen[ip]["count"] += 1
            else:
                geo = self._geolocate(ip)
                seen[ip] = {
                    "ip": ip,
                    "lat": geo.get("lat", 0),
                    "lon": geo.get("lon", 0),
                    "country": geo.get("country", "Unknown"),
                    "city": geo.get("city", ""),
                    "isp": geo.get("isp", ""),
                    "type": e.get("type", "UNKNOWN"),
                    "sev": e.get("sev", "MEDIUM"),
                    "count": 1,
                }
        return list(seen.values())

    # ── Geolocation via ip-api.com (free, no key needed) ─────────────
    def _geolocate(self, ip: str) -> dict:
        # Skip private IPs
        try:
            if ipaddress.ip_address(ip).is_private:
                return {"country": "Internal", "city": "LAN", "isp": "Internal Network",
                        "lat": 0, "lon": 0, "proxy": False, "hosting": False}
        except ValueError:
            pass
        try:
            r = requests.get(
                f"http://ip-api.com/json/{ip}",
                params={"fields": "status,country,countryCode,regionName,city,lat,lon,isp,org,as,proxy,hosting"},
                timeout=4,
            )
            data = r.json()
            if data.get("status") == "success":
                return data
        except Exception:
            pass
        return {"country": "Unknown", "city": "", "isp": "", "lat": 0, "lon": 0,
                "proxy": False, "hosting": False}

    def _is_datacenter(self, ip: str) -> bool:
        try:
            addr = ipaddress.ip_address(ip)
            for cidr in DATACENTER_CIDRS:
                if addr in ipaddress.ip_network(cidr, strict=False):
                    return True
        except ValueError:
            pass
        return False
