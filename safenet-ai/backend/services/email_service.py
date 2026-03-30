"""
backend/services/email_service.py
Sends threat alert emails via SendGrid.

Requirements: pip install sendgrid
Docs: https://docs.sendgrid.com/api-reference/mail-send
"""

from datetime import datetime


HTML_TEMPLATE = """
<html><body style="font-family:monospace;background:#07070a;color:#e8d5a3;padding:24px;">
<h2 style="color:{color};letter-spacing:2px;">🛡 SAFENET AI — {sev} ALERT</h2>
<table style="border-collapse:collapse;width:100%;margin-top:16px;">
  <tr><td style="padding:6px 12px;color:#c9a84c;width:120px;">Severity</td>
      <td style="padding:6px 12px;color:{color};font-weight:bold;">{sev}</td></tr>
  <tr><td style="padding:6px 12px;color:#c9a84c;">Attack Type</td>
      <td style="padding:6px 12px;">{type}</td></tr>
  <tr><td style="padding:6px 12px;color:#c9a84c;">Source IP</td>
      <td style="padding:6px 12px;color:#4a9eff;">{ip}</td></tr>
  <tr><td style="padding:6px 12px;color:#c9a84c;">Destination</td>
      <td style="padding:6px 12px;color:#4a9eff;">{dest}</td></tr>
  <tr><td style="padding:6px 12px;color:#c9a84c;">Protocol</td>
      <td style="padding:6px 12px;">{p} :{port}</td></tr>
  <tr><td style="padding:6px 12px;color:#c9a84c;">Event</td>
      <td style="padding:6px 12px;">{m}</td></tr>
  <tr><td style="padding:6px 12px;color:#c9a84c;">Detected</td>
      <td style="padding:6px 12px;">{ts}</td></tr>
</table>
<p style="margin-top:20px;color:#6a8a72;font-size:11px;">
  SafeNet AI Automated Alert · Do not reply to this message.
</p>
</body></html>
"""

SEV_COLOR = {"CRITICAL": "#ff1a36", "HIGH": "#e08820", "MEDIUM": "#4a9eff"}


class EmailService:
    def __init__(self, cfg):
        self.key      = cfg.SENDGRID_KEY
        self.from_    = cfg.EMAIL_FROM
        self.to       = cfg.EMAIL_TO
        self.freq     = cfg.EMAIL_FREQ
        self._digest_buffer = []

    def send(self, event: dict):
        if self.freq == "instant":
            self._send_single(event)
        else:
            self._digest_buffer.append(event)

    def flush_digest(self):
        """Call periodically to drain digest buffer."""
        if self._digest_buffer:
            self._send_digest(self._digest_buffer.copy())
            self._digest_buffer.clear()

    def send_test(self):
        self._send_single({
            "sev":"HIGH","type":"TEST ALERT","ip":"185.220.101.34",
            "dest":"10.0.0.1","p":"TCP","port":443,
            "m":"SafeNet AI test email — channel working correctly.",
            "ts": datetime.now().isoformat(),
        })

    def _send_single(self, event: dict):
        if not all([self.key, self.from_, self.to]):
            raise ValueError("SendGrid credentials not configured in .env")

        import sendgrid
        from sendgrid.helpers.mail import Mail

        color = SEV_COLOR.get(event.get("sev","MEDIUM"), "#4a9eff")
        html  = HTML_TEMPLATE.format(color=color, **{
            k: event.get(k,"—") for k in ["sev","type","ip","dest","p","port","m","ts"]
        })

        msg = Mail(
            from_email=self.from_,
            to_emails=self.to,
            subject=f"🚨 SafeNet AI [{event.get('sev','?')}] {event.get('type','Threat')} Detected",
            html_content=html,
        )
        sg = sendgrid.SendGridAPIClient(api_key=self.key)
        resp = sg.send(msg)
        print(f"[Email] Sent to {self.to} — status {resp.status_code}")

    def _send_digest(self, events: list):
        """Bundle multiple events into one email."""
        rows = "".join(
            f"<tr><td style='padding:4px 8px;color:#c9a84c;'>{e.get('sev')}</td>"
            f"<td style='padding:4px 8px;'>{e.get('type')}</td>"
            f"<td style='padding:4px 8px;color:#4a9eff;'>{e.get('ip')}</td>"
            f"<td style='padding:4px 8px;'>{e.get('m','')[:60]}</td></tr>"
            for e in events
        )
        html = f"""<html><body style="font-family:monospace;background:#07070a;color:#e8d5a3;padding:24px;">
        <h2 style="color:#c9a84c;">SafeNet AI — Threat Digest ({len(events)} events)</h2>
        <table style="border-collapse:collapse;width:100%;margin-top:12px;">
        <tr><th style="padding:6px 8px;color:#c9a84c;text-align:left;">SEV</th>
            <th style="padding:6px 8px;color:#c9a84c;text-align:left;">TYPE</th>
            <th style="padding:6px 8px;color:#c9a84c;text-align:left;">SOURCE</th>
            <th style="padding:6px 8px;color:#c9a84c;text-align:left;">EVENT</th></tr>
        {rows}</table></body></html>"""

        import sendgrid
        from sendgrid.helpers.mail import Mail
        msg = Mail(
            from_email=self.from_,
            to_emails=self.to,
            subject=f"SafeNet AI Digest — {len(events)} Threat Events",
            html_content=html,
        )
        sg = sendgrid.SendGridAPIClient(api_key=self.key)
        sg.send(msg)
