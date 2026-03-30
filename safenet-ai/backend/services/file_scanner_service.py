"""
backend/services/file_scanner_service.py

Malware & file analysis — signature matching, behavioral heuristics,
sandbox simulation, and LLM-powered verdict.
"""

import hashlib
import re
import os
import time
from datetime import datetime

# ── Known malware hashes (MD5/SHA256 — sample set) ─
KNOWN_MALWARE_HASHES = {
    "44d88612fea8a8f36de82e1278abb02f": "Eicar test file",
    "275a021bbfb6489e54d471899f7db9d1692": "Eicar test file (SHA256 prefix)",
}

# ── Suspicious file extensions ─
SUSPICIOUS_EXTENSIONS = {
    ".exe",".dll",".bat",".cmd",".ps1",".vbs",".js",".jse",".wsf",
    ".wsh",".scr",".pif",".hta",".lnk",".jar",".com",".cpl",
}

DOCUMENT_MACRO_EXTENSIONS = {".doc",".docm",".xls",".xlsm",".xlsb",".ppt",".pptm"}

# ── Malware behavioral signatures (regex on content/strings) ─
MALWARE_SIGNATURES = [
    (r"cmd\.exe\s*/c\s*powershell",    "PowerShell dropper via CMD"),
    (r"base64\.b64decode",             "Base64 payload decoding"),
    (r"subprocess\.call\|os\.system",  "Shell command execution"),
    (r"socket\.connect",               "Network connection attempt"),
    (r"urllib\.request|requests\.get", "HTTP C2 communication"),
    (r"WScript\.Shell",                "Windows Script Host abuse"),
    (r"CreateObject.*Shell",           "VBScript/COM shell execution"),
    (r"HKEY_LOCAL_MACHINE.*Run",       "Registry persistence mechanism"),
    (r"startup.*\\.exe",               "Startup folder persistence"),
    (r"cryptowall|locky|wannacry|ryuk|revil|conti", "Known ransomware family"),
    (r"delete.*shadow\s*copy",         "Shadow copy deletion (ransomware)"),
    (r"vssadmin.*delete",              "VSS deletion (ransomware prep)"),
    (r"mimikatz|sekurlsa",             "Credential dumping tool"),
    (r"meterpreter|metasploit",        "Metasploit payload"),
    (r"cobalt.?strike",                "Cobalt Strike beacon"),
]

# ── Entropy threshold (high entropy = packed/encrypted = suspicious) ─
HIGH_ENTROPY_THRESHOLD = 7.2


class FileScannerService:
    def __init__(self, llm_service=None):
        self.llm     = llm_service
        self._scans  = []

    def scan(self, filename: str, content: bytes, filetype: str = None) -> dict:
        """Perform full file analysis."""
        start      = time.time()
        size_kb    = len(content) / 1024
        ext        = os.path.splitext(filename)[1].lower()
        ft         = filetype or ext or "unknown"

        md5        = hashlib.md5(content).hexdigest()
        sha256     = hashlib.sha256(content).hexdigest()
        entropy    = self._calculate_entropy(content)
        indicators = []
        score      = 0

        # 1. Known hash
        if md5 in KNOWN_MALWARE_HASHES:
            score += 95
            indicators.append(f"Known malware hash match: {KNOWN_MALWARE_HASHES[md5]}")

        # 2. Suspicious extension
        if ext in SUSPICIOUS_EXTENSIONS:
            score += 30
            indicators.append(f"High-risk file type: {ext}")
        elif ext in DOCUMENT_MACRO_EXTENSIONS:
            score += 15
            indicators.append(f"Office macro-capable format: {ext}")

        # 3. High entropy (packed/encrypted)
        if entropy > HIGH_ENTROPY_THRESHOLD:
            score += 25
            indicators.append(f"High entropy: {entropy:.2f} (packed/encrypted content likely)")

        # 4. Signature scanning
        try:
            text = content.decode("utf-8", errors="ignore").lower()
            for pattern, label in MALWARE_SIGNATURES:
                if re.search(pattern, text, re.I):
                    score += 20
                    indicators.append(f"Malware signature: {label}")
                    if len(indicators) >= 8:
                        break
        except Exception:
            pass

        # 5. Double extension (e.g., invoice.pdf.exe)
        if filename.count(".") > 1:
            parts = filename.split(".")
            if parts[-1].lower() in ("exe","dll","bat","cmd","ps1","vbs"):
                score += 30
                indicators.append(f"Double extension disguise: {filename}")

        # 6. Zero-byte or suspiciously small
        if len(content) == 0:
            indicators.append("Empty file")
        elif len(content) < 100 and ext in SUSPICIOUS_EXTENSIONS:
            score += 10
            indicators.append(f"Suspiciously small executable: {len(content)} bytes")

        score   = min(score, 100)
        verdict = "MALICIOUS" if score >= 65 else "SUSPICIOUS" if score >= 30 else "CLEAN"

        # LLM analysis
        llm_analysis = None
        if self.llm and score >= 25:
            try:
                llm_analysis = self.llm.analyze_file(
                    filename=filename, filetype=ft,
                    size=f"{size_kb:.1f} KB",
                    indicators=indicators[:6],
                )
            except Exception:
                pass

        result = {
            "filename":     filename,
            "filetype":     ft,
            "size_kb":      round(size_kb, 2),
            "md5":          md5,
            "sha256":       sha256[:32] + "…",
            "entropy":      round(entropy, 3),
            "score":        score,
            "verdict":      verdict,
            "indicators":   indicators[:10],
            "llm_analysis": llm_analysis,
            "scan_time_ms": round((time.time()-start)*1000, 1),
            "timestamp":    datetime.now().isoformat(),
        }
        self._scans.append(result)
        if len(self._scans) > 200:
            self._scans = self._scans[-200:]
        return result

    def get_history(self, limit=20) -> list:
        return list(reversed(self._scans[-limit:]))

    def _calculate_entropy(self, data: bytes) -> float:
        if not data:
            return 0.0
        from math import log2
        freq = {}
        for byte in data:
            freq[byte] = freq.get(byte, 0) + 1
        entropy = 0.0
        n = len(data)
        for count in freq.values():
            p = count / n
            if p > 0:
                entropy -= p * log2(p)
        return entropy
