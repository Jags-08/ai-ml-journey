"""
backend/services/call_service.py
Triggers automated voice calls via Twilio for critical alerts.

Twilio uses TwiML (XML) to define what the call says.
Docs: https://www.twilio.com/docs/voice/twiml
"""

from urllib.parse import quote


TWIML_TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew" rate="90%">
    SafeNet AI Security Alert.
    Severity: {sev}.
    Attack type: {type}.
    Source I P address: {ip}.
    Event: {m}.
    Please review the SafeNet AI dashboard immediately.
    This message will repeat once.
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Matthew" rate="90%">
    Repeating alert. Severity: {sev}. Attack type: {type}. Source I P: {ip}.
    End of SafeNet AI automated alert.
  </Say>
</Response>"""


class CallService:
    def __init__(self, cfg):
        self.sid   = cfg.TWILIO_SID
        self.token = cfg.TWILIO_TOKEN
        self.from_ = cfg.TWILIO_FROM
        self.to    = cfg.CALL_TO

    def make_call(self, event: dict) -> str:
        """Trigger a voice alert call. Returns call SID."""
        if not all([self.sid, self.token, self.from_, self.to]):
            raise ValueError("Twilio call credentials not configured in .env")

        from twilio.rest import Client
        client = Client(self.sid, self.token)

        # Build TwiML
        twiml = TWIML_TEMPLATE.format(
            sev  = event.get("sev",  "HIGH"),
            type = event.get("type", "Unknown attack").replace("_", " "),
            ip   = _speak_ip(event.get("ip", "unknown")),
            m    = event.get("m",    "Threat detected")[:120],
        )

        # Twilio needs TwiML accessible via URL — use twiml_bin or a public URL
        # For local dev: use ngrok to expose localhost + /api/alerts/twiml endpoint
        # OR use Twilio TwiML Bins: https://console.twilio.com/us1/develop/twiml-bins
        call = client.calls.create(
            twiml=twiml,
            from_=self.from_,
            to=self.to,
        )
        print(f"[Call] Initiated to {self.to} — SID: {call.sid}")
        return call.sid

    def make_test_call(self) -> str:
        return self.make_call({
            "sev": "HIGH",
            "type": "TEST ALERT",
            "ip": "185.220.101.34",
            "m": "SafeNet AI test call. All channels operational.",
        })


def _speak_ip(ip: str) -> str:
    """Convert 192.168.1.1 → 'one nine two, one six eight, one, one' for clear TTS."""
    parts = ip.split(".")
    def _say(n):
        return " ".join(list(n))
    return ", ".join(_say(p) for p in parts)
