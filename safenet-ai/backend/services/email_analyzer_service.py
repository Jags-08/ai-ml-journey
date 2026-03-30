"""
backend/services/email_analyzer_service.py

AI-Based Email Fraud & Phishing Detection.
NLP pattern matching + LLM analysis + link safety checks.
"""

import re
import urllib.parse
import requests
import time
from datetime import datetime

# ── NLP urgency/threat phrases ─
URGENCY_PHRASES = [
    "urgent","immediately","act now","verify now","confirm now",
    "account suspended","limited time","expires in","click here now",
    "update your information","verify your account","unusual activity",
    "security alert","your account will be","24 hours","48 hours",
    "final notice","last warning","action required","respond immediately",
]

# ── Social engineering patterns ─
SOCIAL_ENGINEERING = [
    r"dear\s+customer",           # No personalization
    r"dear\s+user",
    r"dear\s+account\s+holder",
    r"you\s+have\s+won",
    r"congratulations.*prize",
    r"nigerian\s+prince",
    r"transfer.*million",
    r"wire\s+transfer",
    r"western\s+union",
    r"gift\s+card",
    r"bitcoin.*payment",
    r"password.*expired",
    r"click.*below.*verify",
]

# ── Suspicious link patterns ─
SUSPICIOUS_LINK_PATTERNS = [
    r"bit\.ly", r"tinyurl\.com", r"t\.co", r"goo\.gl",  # URL shorteners
    r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}",              # IP-based URLs
    r"[a-z0-9]{20,}\.",                                   # Random subdomain
    r"login[-\.]",                                        # login. phishing
    r"secure[-\.]",
    r"account[-\.]",
    r"verify[-\.]",
    r"update[-\.]",
]

# ── Legitimate domains to check for typosquatting ─
LEGIT_DOMAINS = [
    "paypal.com","google.com","microsoft.com","amazon.com","apple.com",
    "netflix.com","facebook.com","instagram.com","twitter.com","linkedin.com",
    "chase.com","wellsfargo.com","bankofamerica.com","citibank.com",
]

# ── AI-generated email indicators ─
AI_INDICATORS = [
    r"i hope this (email|message) finds you",
    r"i am writing to (inform|notify|let you know)",
    r"please do not hesitate to contact",
    r"thank you for your (understanding|cooperation|attention)",
    r"best regards",                   # Generic closing
    r"kind regards",
    r"i wanted to reach out",
]


class EmailAnalyzerService:
    def __init__(self, llm_service=None):
        self.llm = llm_service
        self._link_cache = {}

    def analyze(self, sender: str, subject: str, body: str, headers: dict = None) -> dict:
        """Full email analysis — returns verdict + breakdown."""
        score    = 0
        signals  = []
        links    = self._extract_links(body)

        # ── 1. Sender domain checks ──────────────────────────────────
        sender_domain = self._extract_domain(sender)
        domain_check  = self._check_sender_domain(sender, sender_domain)
        if domain_check["suspicious"]:
            score += domain_check["score"]
            signals.extend(domain_check["reasons"])

        # ── 2. Subject line analysis ─────────────────────────────────
        subj_score, subj_signals = self._analyze_subject(subject)
        score += subj_score; signals.extend(subj_signals)

        # ── 3. Body NLP analysis ─────────────────────────────────────
        body_score, body_signals = self._analyze_body(body)
        score += body_score; signals.extend(body_signals)

        # ── 4. Link analysis ─────────────────────────────────────────
        link_results = [self._analyze_link(l) for l in links[:5]]
        for lr in link_results:
            if lr["suspicious"]:
                score += lr["score"]
                signals.append(f"Suspicious link: {lr['url'][:60]} — {lr['reason']}")

        # ── 5. AI-generated content detection ────────────────────────
        ai_score, ai_signals = self._detect_ai_generated(body)
        score += ai_score; signals.extend(ai_signals)

        # ── 6. Header analysis ───────────────────────────────────────
        if headers:
            hdr_score, hdr_signals = self._analyze_headers(headers)
            score += hdr_score; signals.extend(hdr_signals)

        score   = min(score, 100)
        verdict = "MALICIOUS" if score >= 65 else "SUSPICIOUS" if score >= 35 else "SAFE"

        # ── 7. LLM deep analysis ─────────────────────────────────────
        llm_analysis = None
        if self.llm and score >= 30:
            try:
                llm_analysis = self.llm.analyze_email(
                    sender=sender, subject=subject,
                    body=body[:500],
                    links=[l["url"] for l in link_results],
                )
            except Exception:
                pass

        return {
            "verdict":      verdict,
            "score":        score,
            "signals":      signals[:12],
            "sender":       sender,
            "sender_domain": sender_domain,
            "subject":      subject,
            "links_found":  len(links),
            "link_results": link_results[:5],
            "ai_generated_probability": ai_score,
            "llm_analysis": llm_analysis,
            "timestamp":    datetime.now().isoformat(),
        }

    # ── Private helpers ──────────────────────────────────────────────
    def _extract_links(self, body: str) -> list:
        return re.findall(r'https?://[^\s<>"\']+', body)

    def _extract_domain(self, email_or_url: str) -> str:
        if "@" in email_or_url:
            return email_or_url.split("@")[-1].lower().strip()
        try:
            return urllib.parse.urlparse(email_or_url).netloc.lower()
        except Exception:
            return email_or_url.lower()

    def _check_sender_domain(self, sender: str, domain: str) -> dict:
        score = 0; reasons = []
        # Free email on corp communication
        free_providers = ["gmail.com","yahoo.com","hotmail.com","outlook.com","protonmail.com"]
        if any(domain == fp for fp in free_providers):
            score += 15
            reasons.append(f"Sender uses free email provider: {domain}")
        # Typosquatting
        for legit in LEGIT_DOMAINS:
            base = legit.split(".")[0]
            if base in domain and domain != legit:
                score += 55
                reasons.append(f"Possible typosquatting of {legit}: {domain}")
                break
        # Mismatch display name vs actual sender
        if "<" in sender and ">" in sender:
            display = sender.split("<")[0].strip().lower()
            actual  = sender.split("<")[1].replace(">","").strip().lower()
            act_dom = self._extract_domain(actual)
            for legit in LEGIT_DOMAINS:
                base = legit.split(".")[0]
                if base in display and act_dom != legit:
                    score += 40
                    reasons.append(f"Display name spoofs {base} but actual domain is {act_dom}")
        return {"suspicious": score > 0, "score": min(score, 60), "reasons": reasons}

    def _analyze_subject(self, subject: str) -> tuple:
        s = subject.lower()
        score = 0; signals = []
        for phrase in URGENCY_PHRASES:
            if phrase in s:
                score += 8
                signals.append(f"Urgency phrase in subject: '{phrase}'")
                if score >= 24: break
        if subject == subject.upper() and len(subject) > 5:
            score += 10; signals.append("Subject entirely in uppercase (aggressive tone)")
        if re.search(r"re:|fwd:", s):
            if any(p in s for p in ["verify","account","security"]):
                score += 15; signals.append("Fake reply/forward thread with security lure")
        return min(score, 30), signals

    def _analyze_body(self, body: str) -> tuple:
        b = body.lower()
        score = 0; signals = []
        for phrase in URGENCY_PHRASES:
            if phrase in b: score += 5
        score = min(score, 20)
        for pattern in SOCIAL_ENGINEERING:
            if re.search(pattern, b):
                score += 12
                signals.append(f"Social engineering pattern: {pattern[:40]}")
                if len(signals) >= 4: break
        # Mismatched link text vs href
        href_text_mismatches = re.findall(r'<a[^>]*href=["\']([^"\']+)["\'][^>]*>([^<]+)</a>', body, re.I)
        for href, text in href_text_mismatches:
            href_dom = self._extract_domain(href)
            text_dom = self._extract_domain(text)
            if text_dom and href_dom and text_dom != href_dom and "." in text_dom:
                score += 20; signals.append(f"Link text '{text_dom}' hides actual domain '{href_dom}'")
        return min(score, 35), signals[:6]

    def _analyze_link(self, url: str) -> dict:
        if url in self._link_cache:
            return self._link_cache[url]
        score = 0; reasons = []
        for pat in SUSPICIOUS_LINK_PATTERNS:
            if re.search(pat, url, re.I):
                score += 20; reasons.append(f"Matches suspicious pattern: {pat}")
                break
        domain = self._extract_domain(url)
        dom_check = self._check_sender_domain(domain, domain)
        if dom_check["suspicious"]:
            score += dom_check["score"]
            reasons.extend(dom_check["reasons"])
        # HTTP (not HTTPS)
        if url.startswith("http://"):
            score += 15; reasons.append("No SSL — plain HTTP link")
        result = {"url": url[:80], "score": min(score,100), "suspicious": score>=30,
                  "reason": reasons[0] if reasons else "Pattern match"}
        self._link_cache[url] = result
        return result

    def _detect_ai_generated(self, body: str) -> tuple:
        b = body.lower(); score = 0; signals = []
        matches = sum(1 for p in AI_INDICATORS if re.search(p, b))
        if matches >= 3:
            score = min(matches * 8, 25)
            signals.append(f"AI-generated email indicators: {matches} formal phrases detected")
        # Unusually consistent paragraph length (AI trait)
        paragraphs = [p for p in body.split("\n\n") if len(p) > 50]
        if len(paragraphs) >= 3:
            lengths = [len(p) for p in paragraphs]
            avg = sum(lengths) / len(lengths)
            variance = sum((l - avg) ** 2 for l in lengths) / len(lengths)
            if variance < 200 and avg > 100:
                score += 10; signals.append("Suspiciously uniform paragraph structure (possible AI origin)")
        return min(score, 25), signals

    def _analyze_headers(self, headers: dict) -> tuple:
        score = 0; signals = []
        # SPF/DKIM/DMARC failures
        auth = headers.get("Authentication-Results","").lower()
        if "spf=fail" in auth:
            score += 30; signals.append("SPF authentication FAILED — sender not authorized")
        if "dkim=fail" in auth:
            score += 25; signals.append("DKIM signature FAILED — email may be forged")
        if "dmarc=fail" in auth:
            score += 25; signals.append("DMARC policy FAILED — possible domain spoofing")
        # Reply-To mismatch
        reply_to = headers.get("Reply-To","")
        from_hdr = headers.get("From","")
        if reply_to and from_hdr:
            if self._extract_domain(reply_to) != self._extract_domain(from_hdr):
                score += 20; signals.append("Reply-To domain differs from From domain")
        return min(score, 50), signals
