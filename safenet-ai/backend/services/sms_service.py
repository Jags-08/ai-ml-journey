"""
backend/services/sms_service.py
Sends threat alerts via Twilio SMS.

Requirements: pip install twilio
Docs: https://www.twilio.com/docs/sms/api
"""

class SMSService:
    def __init__(self, cfg):
        self.sid   = cfg.TWILIO_SID
        self.token = cfg.TWILIO_TOKEN
        self.from_ = cfg.TWILIO_FROM
        self.to    = cfg.SMS_TO

    def send(self, event: dict) -> str:
        """Send an SMS alert for a threat event. Returns SID."""
        if not all([self.sid, self.token, self.from_, self.to]):
            raise ValueError("Twilio SMS credentials not fully configured in .env")

        from twilio.rest import Client
        client = Client(self.sid, self.token)

        body = (
            f"🚨 SafeNet AI ALERT\n"
            f"Severity : {event.get('sev','?')}\n"
            f"Type     : {event.get('type','?')}\n"
            f"Source IP: {event.get('ip','?')}\n"
            f"Event    : {event.get('m','?')[:80]}\n"
            f"Time     : {event.get('ts','?')}"
        )

        msg = client.messages.create(
            body=body,
            from_=self.from_,
            to=self.to,
        )
        print(f"[SMS] Sent to {self.to} — SID: {msg.sid}")
        return msg.sid

    def send_test(self) -> str:
        return self.send({
            "sev":"HIGH","type":"TEST ALERT","ip":"185.220.101.34",
            "m":"SafeNet AI test message — SMS channel working correctly.",
            "ts": __import__("datetime").datetime.now().isoformat(),
        })
