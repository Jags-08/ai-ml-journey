"""
backend/services/log_generator.py
Generates realistic synthetic network log events.
Replace with a real log ingestion adapter for production.
"""

import random
import uuid
from datetime import datetime


ATTACKER_IPS = [
    "185.220.101.34","91.108.4.81","194.165.16.22","77.88.55.99",
    "5.188.206.111","45.33.32.156","195.54.160.87","62.210.183.12",
    "31.220.3.153","89.248.167.131",
]
INT_SUBNETS  = ["10.0.0.","192.168.1.","172.16.0."]
EXT_PREFIXES = ["203.0.113.","104.21.8.","66.102.3.","8.8.8.","1.1.1."]

NORMAL_EVENTS = [
    {"p":"TCP","port":443,"m":"Encrypted HTTPS session established"},
    {"p":"TCP","port":80, "m":"HTTP GET /api/v2/status — 200 OK"},
    {"p":"UDP","port":53, "m":"DNS resolution — internal.corp"},
    {"p":"TCP","port":22, "m":"Authenticated SSH session opened"},
    {"p":"UDP","port":123,"m":"NTP synchronisation request"},
    {"p":"TCP","port":25, "m":"SMTP relay — outbound mail delivered"},
    {"p":"TCP","port":3306,"m":"MySQL query from app-server-01"},
    {"p":"ICMP","port":0, "m":"Echo request from monitoring agent"},
    {"p":"HTTPS","port":443,"m":"REST API call — auth-service 200"},
    {"p":"TCP","port":5432,"m":"PostgreSQL connection pool heartbeat"},
    {"p":"TCP","port":8080,"m":"Internal health-check probe — 200 OK"},
    {"p":"UDP","port":161, "m":"SNMP poll from network-monitor"},
]

ATTACK_EVENTS = [
    {"p":"TCP","port":22,  "sev":"HIGH",    "type":"BRUTE FORCE",    "m":"SSH brute force — 847 consecutive auth failures from single IP"},
    {"p":"TCP","port":80,  "sev":"CRITICAL","type":"DDoS FLOOD",     "m":"HTTP flood attack — 12,400 req/s sustained for 90 seconds"},
    {"p":"TCP","port":0,   "sev":"MEDIUM",  "type":"PORT SCAN",      "m":"Sequential port scan detected: 1–65535 in 4.2 seconds"},
    {"p":"TCP","port":3306,"sev":"HIGH",    "type":"SQL INJECTION",  "m":"UNION SELECT payload detected — auth bypass attempt on /login"},
    {"p":"TCP","port":25,  "sev":"MEDIUM",  "type":"PHISHING RELAY", "m":"Phishing email relay via compromised SMTP — 340 messages sent"},
    {"p":"TCP","port":4444,"sev":"CRITICAL","type":"C2 BEACON",      "m":"Reverse shell callback to known C2 infrastructure — Cobalt Strike"},
    {"p":"TCP","port":21,  "sev":"HIGH",    "type":"BRUTE FORCE",    "m":"FTP credential stuffing — 1,200 attempts/min, 3 successes"},
    {"p":"UDP","port":161, "sev":"MEDIUM",  "type":"SNMP ENUM",      "m":"SNMP community string enumeration — 'public', 'private' probed"},
    {"p":"TCP","port":8080,"sev":"CRITICAL","type":"RCE ATTEMPT",    "m":"Remote code exec payload in X-Forwarded-For header — CVE-2024-1234"},
    {"p":"TCP","port":443, "sev":"HIGH",    "type":"SSL STRIPPING",  "m":"SSL downgrade attempt detected — HTTPS→HTTP redirect injection"},
    {"p":"TCP","port":445, "sev":"CRITICAL","type":"SMB EXPLOIT",    "m":"EternalBlue SMB exploit attempt — MS17-010 signature matched"},
    {"p":"TCP","port":6379,"sev":"HIGH",    "type":"REDIS ATTACK",   "m":"Unauthenticated Redis SLAVEOF — remote code execution vector"},
]


class LogGenerator:
    def __init__(self, attack_rate: float = 0.11):
        self.attack_rate = attack_rate

    def generate(self) -> dict:
        is_attack = random.random() < self.attack_rate
        now = datetime.now()
        t   = now.strftime("%H:%M:%S")
        ts  = now.isoformat()
        eid = str(uuid.uuid4())[:8]

        if is_attack:
            a = random.choice(ATTACK_EVENTS)
            ip   = random.choice(ATTACKER_IPS)
            dest = self._int_ip()
            return {
                "id": eid, "t": t, "ts": ts,
                "ip": ip, "dest": dest,
                "p": a["p"], "port": a["port"],
                "m": a["m"], "msg": a["m"],
                "sev": a["sev"], "type": a["type"],
                "is_attack": True,
                "level": "is-threat" if a["sev"] == "CRITICAL" else "is-warn",
            }
        else:
            n    = random.choice(NORMAL_EVENTS)
            ip   = self._int_ip() if random.random() < 0.5 else self._ext_ip()
            dest = self._int_ip()
            return {
                "id": eid, "t": t, "ts": ts,
                "ip": ip, "dest": dest,
                "p": n["p"], "port": n["port"],
                "m": n["m"], "msg": n["m"],
                "sev": "OK", "type": "NORMAL",
                "is_attack": False,
                "level": "",
            }

    def _int_ip(self):
        sub = random.choice(INT_SUBNETS)
        return sub + str(random.randint(1, 253))

    def _ext_ip(self):
        pfx = random.choice(EXT_PREFIXES)
        return pfx + str(random.randint(1, 253))
